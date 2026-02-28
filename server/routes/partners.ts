import { Router } from 'express';
import type { Request, Response } from 'express';
import db from '../db.js';

const router = Router();

router.get('/', (_req: Request, res: Response) => {
  const partners = db.prepare('SELECT * FROM partner_businesses ORDER BY created_at ASC').all();
  res.json(partners);
});

router.post('/', (req: Request, res: Response) => {
  const {
    name, category, description, address,
    is_indoor, is_outdoor, is_romantic, is_family_friendly,
    price_range_min, price_range_max, commission_percentage,
  } = req.body as Record<string, unknown>;

  const result = db.prepare(`
    INSERT INTO partner_businesses
      (name, category, description, address, is_indoor, is_outdoor, is_romantic, is_family_friendly, price_range_min, price_range_max, commission_percentage)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    name, category, description, address,
    is_indoor ? 1 : 0, is_outdoor ? 1 : 0,
    is_romantic ? 1 : 0, is_family_friendly ? 1 : 0,
    price_range_min, price_range_max, commission_percentage,
  );

  const partner = db.prepare('SELECT * FROM partner_businesses WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(partner);
});

export default router;
