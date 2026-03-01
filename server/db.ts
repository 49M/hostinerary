import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, '..', 'database.sqlite');

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

// ── Core tables ─────────────────────────────────────────────────────────────

db.exec(`
  CREATE TABLE IF NOT EXISTS properties (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    location TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS partner_businesses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    property_id INTEGER REFERENCES properties(id),
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
    property_id INTEGER REFERENCES properties(id),
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

// ── Migrations: safely add property_id to existing tables ───────────────────
// ALTER TABLE ADD COLUMN is idempotent via try/catch (SQLite throws if col exists)

try { db.exec('ALTER TABLE partner_businesses ADD COLUMN property_id INTEGER REFERENCES properties(id)'); } catch { /* already exists */ }
try { db.exec('ALTER TABLE generated_itineraries ADD COLUMN property_id INTEGER REFERENCES properties(id)'); } catch { /* already exists */ }
try { db.exec('ALTER TABLE generated_itineraries ADD COLUMN check_in TEXT'); } catch { /* already exists */ }
try { db.exec('ALTER TABLE generated_itineraries ADD COLUMN check_out TEXT'); } catch { /* already exists */ }

db.exec(`
  CREATE TABLE IF NOT EXISTS chat_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    itinerary_id INTEGER NOT NULL REFERENCES generated_itineraries(id),
    role TEXT NOT NULL CHECK(role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS coupon_codes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT NOT NULL UNIQUE,
    itinerary_id INTEGER NOT NULL REFERENCES generated_itineraries(id),
    item_index INTEGER NOT NULL,
    partner_name TEXT NOT NULL,
    activity_name TEXT NOT NULL,
    commission_percentage REAL NOT NULL DEFAULT 0,
    redeemed INTEGER DEFAULT 0,
    redeemed_at TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(itinerary_id, item_index)
  );
`);

// ── Seed default property ────────────────────────────────────────────────────

const { propCount } = db.prepare('SELECT COUNT(*) as propCount FROM properties').get() as { propCount: number };

if (propCount === 0) {
  db.prepare(`
    INSERT INTO properties (name, slug, description, location)
    VALUES (?, ?, ?, ?)
  `).run(
    'Lakeside Retreat',
    'lakeside-retreat',
    'A charming lakeside property with stunning water views and easy access to local experiences.',
    'Lake Tahoe, CA',
  );
  console.log('✓ Seeded default property: Lakeside Retreat');
}

const defaultProperty = db.prepare('SELECT id FROM properties ORDER BY id ASC LIMIT 1').get() as { id: number };

// ── Seed partner businesses (if none exist) ──────────────────────────────────

const { partnerCount } = db.prepare('SELECT COUNT(*) as partnerCount FROM partner_businesses').get() as { partnerCount: number };

if (partnerCount === 0) {
  const insert = db.prepare(`
    INSERT INTO partner_businesses
      (property_id, name, category, description, address, is_indoor, is_outdoor, is_romantic, is_family_friendly, price_range_min, price_range_max, commission_percentage)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const seed = [
    ['The Vineyard Table',        'restaurant',       'Award-winning farm-to-table dining with a curated wine list and candlelit ambiance.',    '24 Harvest Lane',  1, 0, 1, 0,  80, 200, 15],
    ['Lakeside Rowing Adventures','outdoor_activity', 'Guided kayaking and paddleboard tours on the lake, perfect for sunset outings.',         '10 Lake Shore Dr', 0, 1, 1, 1,  30,  90, 12],
    ['Bloom & Petals Spa',        'wellness',         'Luxury couples spa offering massages, aromatherapy, and private soaking tubs.',          '5 Serenity Blvd',  1, 0, 1, 0, 120, 300, 18],
    ['Riverfront Jazz Lounge',    'entertainment',    'Intimate jazz bar with craft cocktails, live music nightly, and city skyline views.',     '88 River Walk',    1, 1, 1, 0,  40, 120, 10],
    ['Summit Bike Trails Co.',    'outdoor_activity', 'Mountain biking with guided trails for all skill levels and e-bike rentals.',            '1 Trail Head Rd',  0, 1, 0, 1,  25,  75, 12],
  ];

  for (const row of seed) insert.run(defaultProperty.id, ...row);
  console.log('✓ Seeded 5 partner businesses');
}

// ── Associate any orphaned partners with the default property ────────────────
db.prepare('UPDATE partner_businesses SET property_id = ? WHERE property_id IS NULL').run(defaultProperty.id);

export default db;
