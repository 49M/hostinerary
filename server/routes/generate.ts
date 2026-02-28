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

interface ItineraryItem {
  time: string;
  activity_name: string;
  description: string;
  estimated_cost: number;
  partner_name: string;
  category: string;
}

interface GeneratedItinerary {
  itinerary: ItineraryItem[];
  total_estimated_cost: number;
  guest_satisfaction_score_estimate: number;
}

router.post('/', async (req: Request, res: Response) => {
  try {
    const { property_id, guest_type, occasion, budget, vibe, indoor_outdoor, weather } = req.body as Record<string, string | number>;

    const allPartners = (property_id
      ? db.prepare('SELECT * FROM partner_businesses WHERE property_id = ?').all(property_id)
      : db.prepare('SELECT * FROM partner_businesses').all()
    ) as PartnerBusiness[];

    let filtered = allPartners.filter(p => {
      if (indoor_outdoor === 'indoor' && !p.is_indoor) return false;
      if (indoor_outdoor === 'outdoor' && !p.is_outdoor) return false;
      if (p.price_range_min > Number(budget) * 0.65) return false;
      if ((occasion === 'anniversary' || occasion === 'date_night') && !p.is_romantic && p.is_family_friendly) return false;
      if (occasion === 'family_trip' && !p.is_family_friendly) return false;
      return true;
    });

    // Fall back to all partners if filtering is too aggressive
    if (filtered.length < 2) filtered = allPartners;

    const partnerList = filtered.map(p =>
      `• ${p.name} (${p.category}): ${p.description} | Price range: $${p.price_range_min}–$${p.price_range_max} | ${[p.is_indoor && 'Indoor', p.is_outdoor && 'Outdoor'].filter(Boolean).join('/')}`
    ).join('\n');

    const systemPrompt = `You are an AI itinerary optimization engine for short-term rental hosts.
You must generate a structured timeline-based itinerary that:
- Respects the user's total budget
- Matches the guest type and occasion
- Uses the provided partner businesses where possible
- Maximizes guest satisfaction
- Returns ONLY valid JSON in the specified format.
Do not return explanations.
Do not return markdown.
Return raw JSON only.

Required JSON format:
{
  "itinerary": [
    {
      "time": "2:00 PM",
      "activity_name": "Name",
      "description": "Short explanation",
      "estimated_cost": 40,
      "partner_name": "Business Name",
      "category": "restaurant"
    }
  ],
  "total_estimated_cost": 120,
  "guest_satisfaction_score_estimate": 85
}`;

    const userMessage = `Guest Constraints:
- Guest Type: ${guest_type}
- Occasion: ${occasion}
- Total Budget: $${budget}
- Preferred Vibe: ${vibe}
- Indoor/Outdoor Preference: ${indoor_outdoor}
- Current Weather: ${weather}

Available Partner Businesses:
${partnerList}

Generate a complete day itinerary (4–6 activities) using the partner businesses above. Stay within the total budget. Return raw JSON only.`;

    const response = await getClient().chat.completions.create({
      model: 'gpt-4o',
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
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

    // Revenue calculation
    const partnerMap = new Map(allPartners.map(p => [p.name.toLowerCase(), p]));
    let totalCommission = 0;
    for (const item of parsed.itinerary) {
      const partner = partnerMap.get(item.partner_name?.toLowerCase());
      if (partner) {
        totalCommission += item.estimated_cost * (partner.commission_percentage / 100);
      }
    }

    const result = db.prepare(`
      INSERT INTO generated_itineraries
        (property_id, guest_type, occasion, budget, vibe, indoor_outdoor, weather, itinerary_json, total_estimated_cost, total_commission, guest_satisfaction_score)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      property_id ?? null,
      guest_type, occasion, budget, vibe, indoor_outdoor, weather,
      JSON.stringify(parsed),
      parsed.total_estimated_cost,
      totalCommission,
      parsed.guest_satisfaction_score_estimate,
    );

    res.json({
      id: result.lastInsertRowid,
      ...parsed,
      total_commission: totalCommission,
    });
  } catch (error) {
    console.error('Generate error:', error);
    res.status(500).json({ error: 'Failed to generate itinerary' });
  }
});

export default router;
