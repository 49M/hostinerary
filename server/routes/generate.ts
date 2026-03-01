import { Router } from 'express';
import type { Request, Response } from 'express';
import OpenAI from 'openai';
import db from '../db.js';

const router = Router();

let _client: OpenAI | null = null;
function getClient() {
  if (!_client) _client = new OpenAI();
  return _client;
}

interface PartnerBusiness {
  id: number;
  name: string;
  category: string;
  description: string;
  address: string;
  is_indoor: number;
  is_outdoor: number;
  is_romantic: number;
  is_family_friendly: number;
  price_range_min: number;
  price_range_max: number;
  commission_percentage: number;
}

interface PropertyRow {
  name: string;
  location: string | null;
}

interface ItineraryItem {
  date?: string;
  day?: number;
  time: string;
  activity_name: string;
  description: string;
  estimated_cost: number;
  partner_name: string;
  category: string;
  address?: string;
}

interface GeneratedItinerary {
  itinerary: ItineraryItem[];
  total_estimated_cost: number;
  guest_satisfaction_score_estimate: number;
}

// Returns array of YYYY-MM-DD strings from checkIn up to (not including) checkOut
function getStayDates(checkIn: string, checkOut: string): string[] {
  const dates: string[] = [];
  const start = new Date(checkIn + 'T12:00:00');
  const end   = new Date(checkOut + 'T12:00:00');
  const cur   = new Date(start);
  while (cur < end) {
    dates.push(cur.toISOString().slice(0, 10));
    cur.setDate(cur.getDate() + 1);
  }
  return dates.length > 0 ? dates : [checkIn];
}

function formatDateLabel(dateStr: string): string {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  });
}

// Use OpenAI Responses API with web_search_preview to find real local venues
async function searchRealVenues(
  location: string,
  occasion: string,
  vibe: string,
  indoor_outdoor: string,
  weather: string,
  budget: number,
  numDays: number,
): Promise<string> {
  const client = getClient() as unknown as Record<string, unknown>;
  const responsesApi = client['responses'] as { create: (opts: unknown) => Promise<{ output_text: string }> } | undefined;
  if (!responsesApi) throw new Error('Responses API not available on this SDK version');

  const result = await responsesApi.create({
    model: 'gpt-4o',
    tools: [{ type: 'web_search_preview' }],
    input: `Search for 12–18 real, highly-rated local venues near ${location} for a ${numDays}-day ${occasion} trip.

Guest preferences: ${vibe} vibe, prefers ${indoor_outdoor} activities, ${weather} weather, total budget ~$${budget} across all ${numDays} days (~$${Math.round(budget / numDays)}/day).

Search across all categories: restaurants (breakfast, lunch, dinner), outdoor activities, cultural attractions, spas/wellness, entertainment, shopping.

For each venue include:
- Real name and category
- Why it's great (ratings, awards, specialties)
- Estimated cost per person
- Address or neighbourhood
- TripAdvisor or Google rating if you can find it

Find enough variety to fill a full ${numDays}-day programme without repeating venues.`,
  });

  return result.output_text ?? '';
}

router.post('/', async (req: Request, res: Response) => {
  try {
    const {
      property_id, guest_type, occasion, budget, vibe, indoor_outdoor, weather,
      check_in, check_out,
    } = req.body as Record<string, string | number>;

    // ── Stay dates ────────────────────────────────────────────────────────────
    const checkInStr  = String(check_in  || new Date().toISOString().slice(0, 10));
    const checkOutStr = String(check_out || new Date(Date.now() + 86400000).toISOString().slice(0, 10));
    const stayDates   = getStayDates(checkInStr, checkOutStr);
    const numDays     = stayDates.length;
    const budgetPerDay = Math.round(Number(budget) / numDays);

    // ── Fetch property ────────────────────────────────────────────────────────
    const propertyRow = property_id
      ? (db.prepare('SELECT name, location FROM properties WHERE id = ?').get(property_id) as PropertyRow | undefined)
      : null;
    const propertyLocation = propertyRow?.location ?? null;

    // ── Fetch & filter partner businesses ────────────────────────────────────
    const allPartners = (
      property_id
        ? db.prepare('SELECT * FROM partner_businesses WHERE property_id = ?').all(property_id)
        : db.prepare('SELECT * FROM partner_businesses').all()
    ) as PartnerBusiness[];

    let filtered = allPartners.filter(p => {
      if (indoor_outdoor === 'indoor'  && !p.is_indoor)  return false;
      if (indoor_outdoor === 'outdoor' && !p.is_outdoor) return false;
      if (p.price_range_min > Number(budget) * 0.65 / numDays) return false;
      if ((occasion === 'anniversary' || occasion === 'date_night') && !p.is_romantic && p.is_family_friendly) return false;
      if (occasion === 'family_trip' && !p.is_family_friendly) return false;
      return true;
    });
    if (filtered.length < 2) filtered = allPartners;

    const partnerList = filtered.map(p =>
      `• ${p.name} (${p.category}) | ${p.description} | $${p.price_range_min}–$${p.price_range_max} | ${[p.is_indoor && 'Indoor', p.is_outdoor && 'Outdoor'].filter(Boolean).join('/')} | ${p.address || 'address on file'}`
    ).join('\n');

    // ── Step 1: Discover real venues via web search ───────────────────────────
    let realVenuesContext = '';
    if (propertyLocation) {
      try {
        console.log(`🔍 Searching for real venues near ${propertyLocation} for ${numDays}-day stay…`);
        realVenuesContext = await searchRealVenues(
          propertyLocation,
          String(occasion), String(vibe), String(indoor_outdoor),
          String(weather), Number(budget), numDays,
        );
        console.log(`✓ Found real venue context (${realVenuesContext.length} chars)`);
      } catch (err) {
        console.warn('⚠️  Web venue search failed, generating from partner businesses only:', (err as Error).message);
      }
    }

    // ── Step 2: Generate structured multi-day itinerary ───────────────────────
    const daysSchedule = stayDates.map((date, i) =>
      `Day ${i + 1} (${formatDateLabel(date)}) — date field: "${date}"`
    ).join('\n');

    const systemPrompt = `You are an AI itinerary engine for a short-term rental platform.
You generate real, high-quality multi-day itineraries grounded in ACTUAL local venues.

Rules:
- Generate 4–6 activities per day, spread across the full day (morning through evening)
- Use partner businesses whenever they fit — they earn the host commission
- Fill remaining slots with REAL venues from the discovered list (never invent venue names)
- Total budget across ALL days combined must stay at or under the stated amount
- Each itinerary item MUST include "date" (YYYY-MM-DD) and "day" (1-based integer) fields
- Write specific, vivid descriptions referencing real details
- Return ONLY valid raw JSON — no markdown, no explanations

Required JSON format:
{
  "itinerary": [
    {
      "date": "YYYY-MM-DD",
      "day": 1,
      "time": "10:00 AM",
      "activity_name": "Name of activity",
      "description": "Specific description with real details",
      "estimated_cost": 45,
      "partner_name": "Exact partner name, or empty string if not a partner",
      "category": "restaurant | outdoor_activity | wellness | entertainment | cultural | shopping | other",
      "address": "Street address or neighbourhood"
    }
  ],
  "total_estimated_cost": 320,
  "guest_satisfaction_score_estimate": 85
}`;

    const userMessage = `PROPERTY: ${propertyRow?.name ?? 'Unnamed property'}${propertyLocation ? ` · ${propertyLocation}` : ''}

STAY:
${daysSchedule}
Total: ${numDays} ${numDays === 1 ? 'day' : 'days'}

GUEST DETAILS:
- Type: ${guest_type}
- Occasion: ${occasion}
- Total Budget: $${budget} across all ${numDays} days (~$${budgetPerDay}/day)
- Vibe: ${vibe}
- Indoor/Outdoor: ${indoor_outdoor}
- Weather: ${weather}

HOST PARTNER BUSINESSES — PRIORITISE THESE (they earn commission for the host):
${partnerList || 'None configured.'}

REAL LOCAL VENUES DISCOVERED NEAR THE PROPERTY:
${realVenuesContext || 'No web results — use partner businesses and well-known venues in the area.'}

Generate a complete ${numDays}-day itinerary covering every day listed above. 4–6 activities each day. Total cost across ALL days must not exceed $${budget}. Prioritise partners; fill gaps with real discovered venues. Return raw JSON only.`;

    const response = await getClient().chat.completions.create({
      model: 'gpt-4o',
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: userMessage  },
      ],
    });

    const rawContent = response.choices[0].message.content?.trim() ?? '';

    let parsed: GeneratedItinerary;
    try {
      parsed = JSON.parse(rawContent);
    } catch {
      return res.status(422).json({ error: 'AI returned invalid JSON', raw: rawContent });
    }

    if (!parsed.itinerary || !Array.isArray(parsed.itinerary)) {
      return res.status(422).json({ error: 'Invalid itinerary structure' });
    }

    // Back-fill day/date for any items the LLM missed
    parsed.itinerary.forEach((item, idx) => {
      if (!item.day)  item.day  = Math.floor(idx / 5) + 1;
      if (!item.date) item.date = stayDates[Math.min((item.day ?? 1) - 1, stayDates.length - 1)];
    });

    // ── Revenue calculation (partner matches only) ────────────────────────────
    const partnerMap = new Map(allPartners.map(p => [p.name.toLowerCase(), p]));
    let totalCommission = 0;
    for (const item of parsed.itinerary) {
      const partner = partnerMap.get(item.partner_name?.toLowerCase());
      if (partner) totalCommission += item.estimated_cost * (partner.commission_percentage / 100);
    }

    const result = db.prepare(`
      INSERT INTO generated_itineraries
        (property_id, guest_type, occasion, budget, vibe, indoor_outdoor, weather,
         itinerary_json, total_estimated_cost, total_commission, guest_satisfaction_score,
         check_in, check_out)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      property_id ?? null,
      guest_type, occasion, budget, vibe, indoor_outdoor, weather,
      JSON.stringify(parsed),
      parsed.total_estimated_cost,
      totalCommission,
      parsed.guest_satisfaction_score_estimate,
      checkInStr,
      checkOutStr,
    );

    res.json({ id: result.lastInsertRowid, ...parsed, total_commission: totalCommission });
  } catch (error) {
    console.error('Generate error:', error);
    res.status(500).json({ error: 'Failed to generate itinerary' });
  }
});

export default router;
