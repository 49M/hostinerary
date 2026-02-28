import { Router } from 'express';
import type { Request, Response } from 'express';
import db from '../db.js';

const router = Router();

interface Property {
  id: number;
  name: string;
  slug: string;
  description: string;
  location: string;
  created_at: string;
}

function makeSlug(name: string): string {
  const base = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const exists = (s: string) => !!db.prepare('SELECT id FROM properties WHERE slug = ?').get(s);
  if (!exists(base)) return base;
  let i = 2;
  while (exists(`${base}-${i}`)) i++;
  return `${base}-${i}`;
}

// List all properties with counts
router.get('/', (_req: Request, res: Response) => {
  const rows = db.prepare(`
    SELECT p.*,
      (SELECT COUNT(*) FROM partner_businesses  WHERE property_id = p.id) AS partner_count,
      (SELECT COUNT(*) FROM generated_itineraries WHERE property_id = p.id) AS itinerary_count
    FROM properties p
    ORDER BY p.created_at DESC
  `).all();
  res.json(rows);
});

// Get property by slug (for guest form — public)
router.get('/slug/:slug', (req: Request, res: Response) => {
  const row = db.prepare('SELECT * FROM properties WHERE slug = ?').get(req.params.slug) as Property | undefined;
  if (!row) return res.status(404).json({ error: 'Property not found' });
  res.json(row);
});

// Get property detail with partners and recent itineraries
router.get('/:id', (req: Request, res: Response) => {
  const property = db.prepare('SELECT * FROM properties WHERE id = ?').get(req.params.id) as Property | undefined;
  if (!property) return res.status(404).json({ error: 'Property not found' });

  const partners = db.prepare(
    'SELECT * FROM partner_businesses WHERE property_id = ? ORDER BY created_at ASC'
  ).all(req.params.id);

  const itineraries = db.prepare(`
    SELECT id, guest_type, occasion, budget, vibe, indoor_outdoor, weather,
           total_estimated_cost, total_commission, guest_satisfaction_score, created_at
    FROM generated_itineraries
    WHERE property_id = ?
    ORDER BY created_at DESC
    LIMIT 20
  `).all(req.params.id);

  res.json({ ...property, partners, itineraries });
});

// Create property
router.post('/', (req: Request, res: Response) => {
  const { name, description, location } = req.body as Record<string, string>;
  const slug = makeSlug(name);

  const result = db.prepare(`
    INSERT INTO properties (name, slug, description, location)
    VALUES (?, ?, ?, ?)
  `).run(name, slug, description ?? '', location ?? '');

  const property = db.prepare('SELECT * FROM properties WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(property);
});

export default router;
