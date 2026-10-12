import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

// One SQLite file (Node's built-in driver). Each shop only ever sees rows with its own merchant_id.
// The schema is upgraded step by step (PRAGMA user_version), so existing data is kept.

const FILE = process.env.DB_FILE || 'data/loyalty.db';

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
];

const INDEXES = `
CREATE INDEX IF NOT EXISTS idx_customers_merchant ON customers (merchant_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_customers_wallet ON customers (wallet_token);
CREATE UNIQUE INDEX IF NOT EXISTS idx_merchants_join ON merchants (join_code);
CREATE INDEX IF NOT EXISTS idx_tx_merchant ON transactions (merchant_id, created_at);
CREATE INDEX IF NOT EXISTS idx_tx_customer ON transactions (customer_id, created_at);
`;

@Injectable()
export class Db implements OnModuleDestroy {
  readonly sql: DatabaseSync;

  constructor() {
    mkdirSync(dirname(FILE), { recursive: true });
    this.sql = new DatabaseSync(FILE);
    this.sql.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
    this.migrate();
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
    this.sql.close();
  }
}
