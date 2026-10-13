import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, unlinkSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

// One SQLite file (Node's built-in driver). Each shop only ever sees rows with its own merchant_id.
// The schema is upgraded step by step (PRAGMA user_version), so existing data is kept.

const FILE = process.env.DB_FILE || 'data/loyalty.db';

// A copy of the database is made once a day into BACKUP_DIR (default: data/backups); the last 14 are kept.
const BACKUP_DIR = process.env.BACKUP_DIR || join(dirname(FILE), 'backups');
const KEEP_BACKUPS = 14;

export const randomToken = (bytes = 12) => randomBytes(bytes).toString('base64url');

const MIGRATIONS: string[] = [
  // 1: first version
  `
  CREATE TABLE IF NOT EXISTS merchants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    points_per_100 INTEGER NOT NULL DEFAULT 10,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    merchant_id INTEGER NOT NULL REFERENCES merchants(id),
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    points INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE (merchant_id, phone)
  );
  CREATE TABLE IF NOT EXISTS rewards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    merchant_id INTEGER NOT NULL REFERENCES merchants(id),
    name TEXT NOT NULL,
    points_cost INTEGER NOT NULL,
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    merchant_id INTEGER NOT NULL REFERENCES merchants(id),
    customer_id INTEGER NOT NULL REFERENCES customers(id),
    type TEXT NOT NULL CHECK (type IN ('earn', 'redeem')),
    points INTEGER NOT NULL,
    amount REAL,
    reward_id INTEGER REFERENCES rewards(id),
    note TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  `,

  // 2: bonuses, tiers, wallet links, join codes, undo. Points become signed (+ in, - out).
  `
  ALTER TABLE merchants ADD COLUMN join_code TEXT;
  ALTER TABLE merchants ADD COLUMN welcome_bonus INTEGER NOT NULL DEFAULT 0;
  ALTER TABLE merchants ADD COLUMN birthday_bonus INTEGER NOT NULL DEFAULT 0;
  ALTER TABLE merchants ADD COLUMN gold_threshold INTEGER NOT NULL DEFAULT 1000;
  ALTER TABLE merchants ADD COLUMN gold_multiplier REAL NOT NULL DEFAULT 1.5;
  ALTER TABLE merchants ADD COLUMN inactive_days INTEGER NOT NULL DEFAULT 30;

  ALTER TABLE customers ADD COLUMN wallet_token TEXT;
  ALTER TABLE customers ADD COLUMN birthday TEXT;
  ALTER TABLE customers ADD COLUMN last_visit TEXT;
  ALTER TABLE customers ADD COLUMN lifetime_points INTEGER NOT NULL DEFAULT 0;
  ALTER TABLE customers ADD COLUMN birthday_bonus_year INTEGER;

  CREATE TABLE transactions_v2 (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    merchant_id INTEGER NOT NULL REFERENCES merchants(id),
    customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('earn', 'redeem', 'bonus', 'adjust')),
    points INTEGER NOT NULL,
    amount REAL,
    reward_id INTEGER REFERENCES rewards(id),
    note TEXT,
    reversal_of INTEGER,
    reversed INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  INSERT INTO transactions_v2 (id, merchant_id, customer_id, type, points, amount, reward_id, note, created_at)
    SELECT id, merchant_id, customer_id, type, CASE WHEN type = 'redeem' THEN -points ELSE points END,
           amount, reward_id, note, created_at
    FROM transactions;
  DROP TABLE transactions;
  ALTER TABLE transactions_v2 RENAME TO transactions;

  UPDATE customers SET
    lifetime_points = (SELECT COALESCE(SUM(points), 0) FROM transactions t WHERE t.customer_id = customers.id AND t.type = 'earn'),
    last_visit = (SELECT MAX(created_at) FROM transactions t WHERE t.customer_id = customers.id AND t.type = 'earn');
  `,

  // 3: customer login with phone + PIN, and lockout after repeated wrong PINs.
  `
  ALTER TABLE customers ADD COLUMN pin_hash TEXT;
  CREATE TABLE pin_attempts (
    phone TEXT PRIMARY KEY, -- last 10 digits
    failures INTEGER NOT NULL DEFAULT 0,
    locked_until TEXT
  );
  `,

  // 4: bill QR codes the customer scans to claim points, and a member-card code the shop scans.
  `
  CREATE TABLE claims (
    code TEXT PRIMARY KEY,
    merchant_id INTEGER NOT NULL REFERENCES merchants(id),
    amount REAL NOT NULL,
    expires_at TEXT NOT NULL,
    customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
    result TEXT, -- JSON of the earn result, for the shop's screen
    claimed_at TEXT
  );
  ALTER TABLE customers ADD COLUMN card_code TEXT;
  `,

  // 5: safety limits, rewards the customer claims from their wallet with a code, and an activity log.
  `
  ALTER TABLE merchants ADD COLUMN max_visits_per_day INTEGER NOT NULL DEFAULT 3; -- per customer, rolling 24 hours; 0 = no limit
  ALTER TABLE merchants ADD COLUMN large_bill INTEGER NOT NULL DEFAULT 5000; -- bills above this ask to confirm and are logged; 0 = off
  CREATE TABLE redeem_codes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    merchant_id INTEGER NOT NULL REFERENCES merchants(id),
    customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    reward_id INTEGER NOT NULL REFERENCES rewards(id),
    code TEXT NOT NULL, -- 4 digits, unique among the shop's open codes
    expires_at TEXT NOT NULL,
    used_at TEXT
  );
  CREATE TABLE activity (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    merchant_id INTEGER NOT NULL REFERENCES merchants(id),
    actor TEXT NOT NULL, -- 'shop' or 'customer'
    action TEXT NOT NULL,
    detail TEXT NOT NULL,
    customer_id INTEGER,
    customer_name TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  `,

  // 6: superadmin — platform owners (created from the server's terminal), shop suspension, support notes,
  // one-time password reset links, and a log of every admin action.
  `
  ALTER TABLE merchants ADD COLUMN last_seen_at TEXT;
  ALTER TABLE merchants ADD COLUMN suspended_at TEXT;
  ALTER TABLE merchants ADD COLUMN suspended_reason TEXT;
  CREATE TABLE admins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE admin_notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    merchant_id INTEGER NOT NULL REFERENCES merchants(id),
    admin_id INTEGER NOT NULL REFERENCES admins(id),
    note TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE admin_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    admin_id INTEGER NOT NULL REFERENCES admins(id),
    merchant_id INTEGER,
    action TEXT NOT NULL,
    detail TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE password_resets (
    token_hash TEXT PRIMARY KEY, -- sha256 of the token in the link; the token itself is never stored
    merchant_id INTEGER NOT NULL REFERENCES merchants(id),
    expires_at TEXT NOT NULL,
    used_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  `,

  // 7: website visits — the site's own privacy-friendly tracker (no cookies, no IP addresses). One row per page view;
  // vid is a random id the browser renews daily, sid lasts one tab. dur/scroll arrive when the page is left.
  `
  CREATE TABLE page_views (
    id TEXT PRIMARY KEY,
    ts TEXT NOT NULL, -- ISO time the page opened (UTC)
    day TEXT NOT NULL, -- YYYY-MM-DD (UTC)
    path TEXT NOT NULL,
    title TEXT NOT NULL,
    ref TEXT NOT NULL, -- referrer host, '' = direct
    ref_url TEXT NOT NULL,
    utm_source TEXT NOT NULL,
    utm_medium TEXT NOT NULL,
    utm_campaign TEXT NOT NULL,
    country TEXT NOT NULL,
    tz TEXT NOT NULL,
    lang TEXT NOT NULL,
    device TEXT NOT NULL,
    browser TEXT NOT NULL,
    os TEXT NOT NULL,
    vid TEXT NOT NULL,
    sid TEXT NOT NULL,
    ret INTEGER NOT NULL,
    dur INTEGER, -- ms the page was visible
    scroll INTEGER -- deepest scroll, %
  );
  CREATE INDEX idx_page_views_day ON page_views (day);
  `,
];

const INDEXES = `
CREATE INDEX IF NOT EXISTS idx_customers_merchant ON customers (merchant_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_customers_wallet ON customers (wallet_token);
CREATE UNIQUE INDEX IF NOT EXISTS idx_merchants_join ON merchants (join_code);
CREATE UNIQUE INDEX IF NOT EXISTS idx_customers_card ON customers (card_code);
CREATE INDEX IF NOT EXISTS idx_redeem_codes ON redeem_codes (merchant_id, code);
CREATE INDEX IF NOT EXISTS idx_activity ON activity (merchant_id, created_at);
CREATE INDEX IF NOT EXISTS idx_tx_merchant ON transactions (merchant_id, created_at);
CREATE INDEX IF NOT EXISTS idx_tx_customer ON transactions (customer_id, created_at);
`;

@Injectable()
export class Db implements OnModuleDestroy {
  readonly sql: DatabaseSync;
  private backupTimer: NodeJS.Timeout;

  constructor() {
    mkdirSync(dirname(FILE), { recursive: true });
    this.sql = new DatabaseSync(FILE);
    this.sql.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
    this.migrate();
    this.backup();
    this.backupTimer = setInterval(() => this.backup(), 6 * 3_600_000);
    this.backupTimer.unref();
  }

  /** Today's backup, if there isn't one yet: a consistent copy even while the app is running. */
  backup() {
    try {
      mkdirSync(BACKUP_DIR, { recursive: true });
      const file = join(BACKUP_DIR, `loyalty-${new Date().toISOString().slice(0, 10)}.db`);
      if (existsSync(file)) return;
      this.sql.exec(`VACUUM INTO '${file.replace(/'/g, "''")}'`);
      const old = readdirSync(BACKUP_DIR)
        .filter((f) => /^loyalty-\d{4}-\d{2}-\d{2}\.db$/.test(f))
        .sort()
        .slice(0, -KEEP_BACKUPS);
      for (const f of old) unlinkSync(join(BACKUP_DIR, f));
    } catch (error) {
      console.error('Database backup failed:', error);
    }
  }

  private migrate() {
    const { user_version: version } = this.sql.prepare('PRAGMA user_version').get() as { user_version: number };
    for (let v = version; v < MIGRATIONS.length; v++) {
      this.transaction(() => {
        this.sql.exec(MIGRATIONS[v]);
        this.sql.exec(`PRAGMA user_version = ${v + 1}`);
      });
    }
    // Rows from before wallet links / join codes existed get theirs here.
    for (const { id } of this.sql.prepare('SELECT id FROM customers WHERE wallet_token IS NULL').all() as { id: number }[]) {
      this.sql.prepare('UPDATE customers SET wallet_token = ? WHERE id = ?').run(randomToken(), id);
    }
    for (const { id } of this.sql.prepare('SELECT id FROM customers WHERE card_code IS NULL').all() as { id: number }[]) {
      this.sql.prepare('UPDATE customers SET card_code = ? WHERE id = ?').run(randomToken(9), id);
    }
    for (const { id } of this.sql.prepare('SELECT id FROM merchants WHERE join_code IS NULL').all() as { id: number }[]) {
      this.sql.prepare('UPDATE merchants SET join_code = ? WHERE id = ?').run(randomToken(6), id);
    }
    this.sql.exec(INDEXES);
  }

  /** Runs several statements as one unit: all of them happen, or none do. Nested calls join the outer one. */
  transaction<T>(work: () => T): T {
    if (this.sql.isTransaction) return work();
    this.sql.exec('BEGIN');
    try {
      const result = work();
      this.sql.exec('COMMIT');
      return result;
    } catch (error) {
      this.sql.exec('ROLLBACK');
      throw error;
    }
  }

  onModuleDestroy() {
    clearInterval(this.backupTimer);
    this.sql.close();
  }
}
