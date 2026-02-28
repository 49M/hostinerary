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
}

router.get('/', (_req: Request, res: Response) => {
  const rows = db.prepare(`
    SELECT id, guest_type, occasion, budget, vibe, indoor_outdoor, weather,
           total_estimated_cost, total_commission, guest_satisfaction_score, created_at
    FROM generated_itineraries
    ORDER BY created_at DESC
  `).all() as Omit<DBRow, 'itinerary_json'>[];
  res.json(rows);
});

router.get('/:id', (req: Request, res: Response) => {
  const row = db.prepare('SELECT * FROM generated_itineraries WHERE id = ?').get(req.params.id) as DBRow | undefined;

  if (!row) return res.status(404).json({ error: 'Itinerary not found' });

  const parsed = JSON.parse(row.itinerary_json) as { itinerary: ItineraryItem[] };
  const partners = db.prepare('SELECT * FROM partner_businesses').all() as PartnerBusiness[];
  const partnerMap = new Map(partners.map(p => [p.name.toLowerCase(), p]));

  const commissionBreakdown = parsed.itinerary.map(item => {
    const partner = partnerMap.get(item.partner_name?.toLowerCase());
    return {
      partner_name: item.partner_name,
      activity: item.activity_name,
      estimated_cost: item.estimated_cost,
      commission_rate: partner?.commission_percentage ?? 0,
      commission_amount: partner ? item.estimated_cost * (partner.commission_percentage / 100) : 0,
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
    ...parsed,
    commission_breakdown: commissionBreakdown,
  });
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
