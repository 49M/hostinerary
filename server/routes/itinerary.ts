import { Router } from 'express';
import type { Request, Response } from 'express';
import db from '../db.js';

const router = Router();

interface PartnerBusiness {
  id: number;
  name: string;
  commission_percentage: number;
}

interface ItineraryItem {
  time: string;
  activity_name: string;
  description: string;
  estimated_cost: number;
  partner_name: string;
  category: string;
}

interface CouponCode {
  id: number;
  code: string;
  itinerary_id: number;
  item_index: number;
  partner_name: string;
  activity_name: string;
  commission_percentage: number;
  redeemed: number;
  redeemed_at: string | null;
}

interface DBRow {
  id: number;
  guest_type: string;
  occasion: string;
  budget: number;
  vibe: string;
  indoor_outdoor: string;
  weather: string;
  itinerary_json: string;
  total_estimated_cost: number;
  total_commission: number;
  guest_satisfaction_score: number;
  created_at: string;
  check_in: string | null;
  check_out: string | null;
}

function generateCouponCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // exclude I, O to avoid confusion
  const digits = '0123456789';
  const letters = Array.from({ length: 3 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  const nums = Array.from({ length: 4 }, () => digits[Math.floor(Math.random() * digits.length)]).join('');
  return `${letters}-${nums}`;
}

function upsertCoupon(itineraryId: number, itemIndex: number, partnerName: string, activityName: string, commissionPct: number): CouponCode {
  const existing = db.prepare('SELECT * FROM coupon_codes WHERE itinerary_id = ? AND item_index = ?').get(itineraryId, itemIndex) as CouponCode | undefined;

  if (existing) {
    // Update partner details but keep the same code (guests may have already noted it)
    db.prepare('UPDATE coupon_codes SET partner_name = ?, activity_name = ?, commission_percentage = ? WHERE id = ?')
      .run(partnerName, activityName, commissionPct, existing.id);
    return db.prepare('SELECT * FROM coupon_codes WHERE id = ?').get(existing.id) as CouponCode;
  }

  // Generate a unique code
  let code = generateCouponCode();
  while (db.prepare('SELECT id FROM coupon_codes WHERE code = ?').get(code)) {
    code = generateCouponCode();
  }

  const result = db.prepare(`
    INSERT INTO coupon_codes (code, itinerary_id, item_index, partner_name, activity_name, commission_percentage)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(code, itineraryId, itemIndex, partnerName, activityName, commissionPct);

  return db.prepare('SELECT * FROM coupon_codes WHERE id = ?').get(result.lastInsertRowid) as CouponCode;
}

router.get('/', (req: Request, res: Response) => {
  const { property_id } = req.query;
  const rows = property_id
    ? db.prepare(`
        SELECT gi.id, gi.guest_type, gi.occasion, gi.budget, gi.vibe, gi.indoor_outdoor, gi.weather,
               gi.total_estimated_cost, gi.total_commission, gi.guest_satisfaction_score, gi.created_at,
               gi.property_id, gi.check_in, gi.check_out, p.name AS property_name
        FROM generated_itineraries gi
        LEFT JOIN properties p ON p.id = gi.property_id
        WHERE gi.property_id = ?
        ORDER BY gi.created_at DESC
      `).all(property_id)
    : db.prepare(`
        SELECT gi.id, gi.guest_type, gi.occasion, gi.budget, gi.vibe, gi.indoor_outdoor, gi.weather,
               gi.total_estimated_cost, gi.total_commission, gi.guest_satisfaction_score, gi.created_at,
               gi.property_id, gi.check_in, gi.check_out, p.name AS property_name
        FROM generated_itineraries gi
        LEFT JOIN properties p ON p.id = gi.property_id
        ORDER BY gi.created_at DESC
      `).all();
  res.json(rows);
});

router.get('/:id', (req: Request, res: Response) => {
  const row = db.prepare(`
    SELECT gi.*, p.name AS property_name, p.location AS property_location, p.slug AS property_slug
    FROM generated_itineraries gi
    LEFT JOIN properties p ON p.id = gi.property_id
    WHERE gi.id = ?
  `).get(req.params.id) as (DBRow & { property_name: string | null; property_location: string | null; property_slug: string | null }) | undefined;

  if (!row) return res.status(404).json({ error: 'Itinerary not found' });

  const parsed = JSON.parse(row.itinerary_json) as { itinerary: ItineraryItem[] };
  const partners = db.prepare('SELECT * FROM partner_businesses').all() as PartnerBusiness[];
  const partnerMap = new Map(partners.map(p => [p.name.toLowerCase(), p]));

  // Attach coupon codes to each item
  const coupons = db.prepare('SELECT * FROM coupon_codes WHERE itinerary_id = ?').all(row.id) as CouponCode[];
  const couponByIndex = new Map(coupons.map(c => [c.item_index, c]));

  const itineraryWithCoupons = parsed.itinerary.map((item, idx) => {
    const coupon = couponByIndex.get(idx);
    return coupon
      ? { ...item, coupon_code: coupon.code, coupon_redeemed: !!coupon.redeemed }
      : item;
  });

  const commissionBreakdown = parsed.itinerary.map((item, idx) => {
    const partner = partnerMap.get(item.partner_name?.toLowerCase());
    const coupon = couponByIndex.get(idx);
    return {
      partner_name: item.partner_name,
      activity: item.activity_name,
      estimated_cost: item.estimated_cost,
      commission_rate: partner?.commission_percentage ?? 0,
      commission_amount: partner ? item.estimated_cost * (partner.commission_percentage / 100) : 0,
      coupon_code: coupon?.code ?? null,
      coupon_redeemed: coupon ? !!coupon.redeemed : false,
    };
  });

  res.json({
    id: row.id,
    guest_type: row.guest_type,
    occasion: row.occasion,
    budget: row.budget,
    vibe: row.vibe,
    indoor_outdoor: row.indoor_outdoor,
    weather: row.weather,
    total_estimated_cost: row.total_estimated_cost,
    total_commission: row.total_commission,
    guest_satisfaction_score: row.guest_satisfaction_score,
    created_at: row.created_at,
    check_in: row.check_in,
    check_out: row.check_out,
    property_name: row.property_name,
    property_location: row.property_location,
    property_slug: row.property_slug,
    itinerary: itineraryWithCoupons,
    commission_breakdown: commissionBreakdown,
  });
});

router.patch('/:id/item', (req: Request, res: Response) => {
  const { itemIndex, partner } = req.body as {
    itemIndex: number;
    partner: { name: string; category: string; commission_percentage: number; address?: string };
  };

  const row = db.prepare('SELECT * FROM generated_itineraries WHERE id = ?').get(req.params.id) as (DBRow & { property_id: number | null }) | undefined;
  if (!row) return res.status(404).json({ error: 'Itinerary not found' });

  const parsed = JSON.parse(row.itinerary_json) as { itinerary: ItineraryItem[] };
  if (itemIndex < 0 || itemIndex >= parsed.itinerary.length) {
    return res.status(400).json({ error: 'Invalid item index' });
  }

  // Upsert partner (match by name case-insensitively)
  let partnerRow = db.prepare('SELECT * FROM partner_businesses WHERE LOWER(name) = LOWER(?)').get(partner.name) as PartnerBusiness | undefined;
  if (!partnerRow) {
    const result = db.prepare(`
      INSERT INTO partner_businesses (property_id, name, category, commission_percentage, address)
      VALUES (?, ?, ?, ?, ?)
    `).run(row.property_id ?? null, partner.name, partner.category, partner.commission_percentage, partner.address ?? null);
    partnerRow = db.prepare('SELECT * FROM partner_businesses WHERE id = ?').get(result.lastInsertRowid) as PartnerBusiness;
  } else {
    db.prepare('UPDATE partner_businesses SET category = ?, commission_percentage = ?, address = COALESCE(?, address) WHERE id = ?')
      .run(partner.category, partner.commission_percentage, partner.address ?? null, partnerRow.id);
    partnerRow = db.prepare('SELECT * FROM partner_businesses WHERE id = ?').get(partnerRow.id) as PartnerBusiness;
  }

  // Patch the item in the JSON
  parsed.itinerary[itemIndex].partner_name = partnerRow.name;

  // Generate/update coupon code for this slot
  const coupon = upsertCoupon(row.id, itemIndex, partnerRow.name, parsed.itinerary[itemIndex].activity_name, partnerRow.commission_percentage);

  // Recalculate total commission
  const allPartners = db.prepare('SELECT * FROM partner_businesses').all() as PartnerBusiness[];
  const partnerMap = new Map(allPartners.map(p => [p.name.toLowerCase(), p]));
  const totalCommission = parsed.itinerary.reduce((sum, item) => {
    const p = partnerMap.get(item.partner_name?.toLowerCase?.());
    return sum + (p ? item.estimated_cost * (p.commission_percentage / 100) : 0);
  }, 0);

  db.prepare('UPDATE generated_itineraries SET itinerary_json = ?, total_commission = ? WHERE id = ?')
    .run(JSON.stringify(parsed), totalCommission, req.params.id);

  res.json({ success: true, partner: partnerRow, total_commission: totalCommission, coupon_code: coupon.code });
});

router.post('/coupon/:code/redeem', (req: Request, res: Response) => {
  const coupon = db.prepare('SELECT * FROM coupon_codes WHERE code = ?').get(req.params.code) as CouponCode | undefined;
  if (!coupon) return res.status(404).json({ error: 'Coupon not found' });
  if (coupon.redeemed) return res.status(409).json({ error: 'Coupon already redeemed', redeemed_at: coupon.redeemed_at });

  db.prepare('UPDATE coupon_codes SET redeemed = 1, redeemed_at = CURRENT_TIMESTAMP WHERE code = ?').run(req.params.code);
  res.json({ success: true });
});

router.post('/:id/feedback', (req: Request, res: Response) => {
  const { satisfaction_rating, budget_accuracy_rating } = req.body as { satisfaction_rating: number; budget_accuracy_rating: number };

  db.prepare(`
    INSERT INTO feedback (itinerary_id, satisfaction_rating, budget_accuracy_rating)
    VALUES (?, ?, ?)
  `).run(req.params.id, satisfaction_rating, budget_accuracy_rating);

  res.status(201).json({ success: true });
});

export default router;
