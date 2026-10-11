import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

// One SQLite file (Node's built-in driver). Each shop only ever sees rows with its own merchant_id.

const FILE = process.env.DB_FILE || 'data/loyalty.db';

const SCHEMA = `
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

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

-- Every change to a customer's points, so balances can always be explained.
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

CREATE INDEX IF NOT EXISTS idx_customers_merchant ON customers (merchant_id);
CREATE INDEX IF NOT EXISTS idx_tx_merchant ON transactions (merchant_id, created_at);
CREATE INDEX IF NOT EXISTS idx_tx_customer ON transactions (customer_id, created_at);
`;

@Injectable()
export class Db implements OnModuleDestroy {
  readonly sql: DatabaseSync;

  constructor() {
    mkdirSync(dirname(FILE), { recursive: true });
    this.sql = new DatabaseSync(FILE);
    this.sql.exec(SCHEMA);
  }

  /** Runs several statements as one unit: all of them happen, or none do. */
  transaction<T>(work: () => T): T {
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
