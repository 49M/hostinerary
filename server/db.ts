import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, '..', 'database.sqlite');

const db = new Database(DB_PATH);

db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS partner_businesses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    description TEXT,
    address TEXT,
    is_indoor INTEGER DEFAULT 1,
    is_outdoor INTEGER DEFAULT 0,
    is_romantic INTEGER DEFAULT 0,
    is_family_friendly INTEGER DEFAULT 1,
    price_range_min INTEGER DEFAULT 0,
    price_range_max INTEGER DEFAULT 200,
    commission_percentage REAL DEFAULT 10,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS generated_itineraries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guest_type TEXT,
    occasion TEXT,
    budget INTEGER,
    vibe TEXT,
    indoor_outdoor TEXT,
    weather TEXT,
    itinerary_json TEXT NOT NULL,
    total_estimated_cost REAL,
    total_commission REAL,
    guest_satisfaction_score INTEGER,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS feedback (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    itinerary_id INTEGER,
    satisfaction_rating INTEGER,
    budget_accuracy_rating INTEGER,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (itinerary_id) REFERENCES generated_itineraries(id)
  );
`);

const { count } = db.prepare('SELECT COUNT(*) as count FROM partner_businesses').get() as { count: number };

if (count === 0) {
  const insert = db.prepare(`
    INSERT INTO partner_businesses
      (name, category, description, address, is_indoor, is_outdoor, is_romantic, is_family_friendly, price_range_min, price_range_max, commission_percentage)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const seed = [
    ['The Vineyard Table',       'restaurant',       'Award-winning farm-to-table dining with a curated wine list and candlelit ambiance.',     '24 Harvest Lane',   1, 0, 1, 0,  80, 200, 15],
    ['Lakeside Rowing Adventures','outdoor_activity', 'Guided kayaking and paddleboard tours on the lake, perfect for sunset outings.',          '10 Lake Shore Dr',  0, 1, 1, 1,  30,  90, 12],
    ['Bloom & Petals Spa',        'wellness',         'Luxury couples spa offering massages, aromatherapy, and private soaking tubs.',           '5 Serenity Blvd',   1, 0, 1, 0, 120, 300, 18],
    ['Riverfront Jazz Lounge',    'entertainment',    'Intimate jazz bar with craft cocktails, live music nightly, and city skyline views.',      '88 River Walk',     1, 1, 1, 0,  40, 120, 10],
    ['Summit Bike Trails Co.',    'outdoor_activity', 'Mountain biking adventures with guided trails for all skill levels and e-bike rentals.',  '1 Trail Head Rd',   0, 1, 0, 1,  25,  75, 12],
  ];

  for (const row of seed) insert.run(...row);
  console.log('✓ Seeded 5 partner businesses');
}

export default db;
