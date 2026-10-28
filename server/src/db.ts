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

/** Migration 26's queue: cities in Hindi and English (southern ones in English only), then more kinds of shops. */
const SEED_PAGES = (() => {
  const both = ['Jaipur', 'Delhi', 'Lucknow', 'Indore', 'Ahmedabad', 'Mumbai', 'Pune', 'Surat', 'Bhopal', 'Patna', 'Kanpur', 'Nagpur', 'Chandigarh', 'Ludhiana', 'Agra', 'Varanasi', 'Hyderabad'];
  const enOnly = ['Bengaluru', 'Chennai', 'Kolkata'];
  const shops: [string, string][] = [
    ['general-store', 'General store'], ['dairy-and-milk-shop', 'Dairy & milk shop'], ['cosmetics-shop', 'Cosmetics shop'],
    ['gift-shop', 'Gift shop'], ['car-wash', 'Car wash'], ['bike-service-centre', 'Bike service centre'], ['pizza-shop', 'Pizza shop'],
    ['street-food-stall', 'Street food stall'], ['nail-studio', 'Nail studio'], ['clothing-store', 'Clothing store'],
    ['dry-fruits-shop', 'Dry fruits shop'], ['jewellery-shop', 'Jewellery shop'], ['footwear-store', 'Footwear store'],
    ['book-store', 'Book store'], ['toy-shop', 'Toy shop'],
  ];
  const rows = [
    ...both.flatMap((c) => [`('${c.toLowerCase()}', 'en', '${c}', 'city')`, `('${c.toLowerCase()}', 'hi', '${c}', 'city')`]),
    ...enOnly.map((c) => `('${c.toLowerCase()}', 'en', '${c}', 'city')`),
    ...shops.flatMap(([slug, topic]) => [`('${slug}', 'en', '${topic}', 'shop')`, `('${slug}', 'hi', '${topic}', 'shop')`]),
  ];
  return `INSERT OR IGNORE INTO seo_pages (slug, lang, topic, kind) VALUES\n  ${rows.join(',\n  ')};`;
})();

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

  // 8: growth — the owner's WhatsApp number (optional), where each shop came from (first visit to the website before
  // signing up: utm source/medium/campaign, referring site, landing page), and the shop whose customer card led here.
  `
  ALTER TABLE merchants ADD COLUMN phone TEXT;
  ALTER TABLE merchants ADD COLUMN signup_source TEXT NOT NULL DEFAULT '';
  ALTER TABLE merchants ADD COLUMN signup_medium TEXT NOT NULL DEFAULT '';
  ALTER TABLE merchants ADD COLUMN signup_campaign TEXT NOT NULL DEFAULT '';
  ALTER TABLE merchants ADD COLUMN signup_ref TEXT NOT NULL DEFAULT '';
  ALTER TABLE merchants ADD COLUMN signup_landing TEXT NOT NULL DEFAULT '';
  ALTER TABLE merchants ADD COLUMN referred_by INTEGER REFERENCES merchants(id);
  `,

  // 9: AI-written SEO pages (/for/<shop type>, /hi/for/<shop type>), a log of every AI call with its tokens and cost,
  // and admin-editable settings (key → JSON value).
  `
  CREATE TABLE seo_pages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT NOT NULL, -- from the English shop type: 'salon', 'mobile-repair-shop'
    lang TEXT NOT NULL CHECK (lang IN ('en', 'hi')),
    topic TEXT NOT NULL, -- the shop type as the admin typed it, e.g. 'Salon'
    notes TEXT NOT NULL DEFAULT '', -- extra hints for the writer
    status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'draft', 'published', 'failed')),
    content TEXT, -- JSON written by the model
    title TEXT NOT NULL DEFAULT '',
    description TEXT NOT NULL DEFAULT '',
    error TEXT,
    cost_usd REAL NOT NULL DEFAULT 0, -- all generations of this page
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    generated_at TEXT,
    published_at TEXT,
    UNIQUE (slug, lang)
  );
  CREATE TABLE ai_usage (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ts TEXT NOT NULL DEFAULT (datetime('now')),
    purpose TEXT NOT NULL,
    ref_id INTEGER, -- e.g. the seo_pages row
    model TEXT NOT NULL,
    input_tokens INTEGER NOT NULL DEFAULT 0,
    output_tokens INTEGER NOT NULL DEFAULT 0, -- includes thinking tokens, which are billed as output
    cost_usd REAL NOT NULL DEFAULT 0,
    ok INTEGER NOT NULL,
    error TEXT
  );
  CREATE INDEX idx_ai_usage_ts ON ai_usage (ts);
  CREATE TABLE app_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
  `,

  // 10: the app is now called Regularhood (it was Habiturn): SEO pages already written keep their text, with the new name.
  `
  UPDATE seo_pages SET
    content = replace(content, 'Habiturn', 'Regularhood'),
    title = replace(title, 'Habiturn', 'Regularhood'),
    description = replace(description, 'Habiturn', 'Regularhood')
  WHERE content LIKE '%Habiturn%' OR title LIKE '%Habiturn%' OR description LIKE '%Habiturn%';
  `,

  // 11: what visitors do on a page — buttons clicked, homepage sections they scrolled to, and sign-ups — tied to the
  // page view they happened on. Each (view, kind, name) is kept once.
  `
  CREATE TABLE page_events (
    view_id TEXT NOT NULL,
    kind TEXT NOT NULL, -- click | section | signup
    name TEXT NOT NULL,
    ts TEXT NOT NULL,
    day TEXT NOT NULL,
    PRIMARY KEY (view_id, kind, name)
  );
  CREATE INDEX idx_page_events_day ON page_events (day);
  `,

  // 12: WhatsApp status ideas from Admin → WhatsApp status: each batch with its ready-to-paste image prompts (JSON).
  `
  CREATE TABLE status_prompts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    theme TEXT NOT NULL DEFAULT '',
    shop_type TEXT NOT NULL DEFAULT '',
    style TEXT NOT NULL,
    prompt_lang TEXT NOT NULL, -- en | hi: the language of the instructions; the text on the image is always Hindi
    ideas TEXT NOT NULL, -- [{ angle, headline, subtext, cta, scene, caption, prompt }]
    cost_usd REAL NOT NULL DEFAULT 0
  );
  `,

  // 13: Lead finder (Admin → Leads): shops found on Google Maps (Places API) that could use Regularhood, each with a
  // status, notes and an AI-written pitch; every search; and every Places call with what it cost.
  `
  CREATE TABLE lead_searches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    shop_type TEXT NOT NULL,
    area TEXT NOT NULL,
    pages INTEGER NOT NULL DEFAULT 0, -- Places calls made (20 results each)
    found INTEGER NOT NULL DEFAULT 0,
    added INTEGER NOT NULL DEFAULT 0, -- not seen in an earlier search
    cost_usd REAL NOT NULL DEFAULT 0
  );
  CREATE TABLE leads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    place_id TEXT NOT NULL UNIQUE,
    search_id INTEGER REFERENCES lead_searches(id) ON DELETE SET NULL, -- the search that first found it
    name TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT '', -- Google's type, e.g. 'Beauty Salon'
    shop_type TEXT NOT NULL DEFAULT '', -- what was searched for
    area TEXT NOT NULL DEFAULT '',
    address TEXT NOT NULL DEFAULT '',
    phone TEXT NOT NULL DEFAULT '', -- +91 98765 43210
    mobile INTEGER NOT NULL DEFAULT 0, -- 1 = looks like a mobile number, so likely on WhatsApp
    website TEXT NOT NULL DEFAULT '',
    maps_url TEXT NOT NULL DEFAULT '',
    rating REAL,
    reviews INTEGER NOT NULL DEFAULT 0,
    lat REAL,
    lng REAL,
    score INTEGER NOT NULL DEFAULT 0, -- 0-100, how good a fit (see leads.ts)
    reasons TEXT NOT NULL DEFAULT '[]', -- JSON list of why
    status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'interested', 'joined', 'not_interested')),
    notes TEXT NOT NULL DEFAULT '',
    pitch TEXT, -- JSON written by the model
    pitch_cost_usd REAL NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    contacted_at TEXT
  );
  CREATE INDEX idx_leads_status ON leads (status, score);
  CREATE TABLE places_usage (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ts TEXT NOT NULL DEFAULT (datetime('now')),
    purpose TEXT NOT NULL,
    ref_id INTEGER, -- the lead_searches row
    results INTEGER NOT NULL DEFAULT 0,
    free INTEGER NOT NULL DEFAULT 0, -- 1 = inside the month's free calls
    cost_usd REAL NOT NULL DEFAULT 0,
    ok INTEGER NOT NULL,
    error TEXT
  );
  CREATE INDEX idx_places_usage_ts ON places_usage (ts);
  `,

  // 14: WhatsApp Cloud API for the lead finder: every message sent to or received from a lead, with its delivery status
  // and what Meta charged, and per lead whether they asked not to be messaged.
  `
  CREATE TABLE wa_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lead_id INTEGER REFERENCES leads(id) ON DELETE SET NULL,
    phone TEXT NOT NULL, -- digits with country code, as WhatsApp writes it: 919876543210
    direction TEXT NOT NULL CHECK (direction IN ('out', 'in')),
    wamid TEXT UNIQUE, -- WhatsApp's message id
    kind TEXT NOT NULL, -- template | text | button | image | ...
    body TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'sent', -- out: sent | delivered | read | failed · in: received
    error TEXT,
    category TEXT, -- what Meta billed it as: marketing | utility | service ...
    cost_usd REAL NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX idx_wa_messages_lead ON wa_messages (lead_id, id);
  CREATE INDEX idx_wa_messages_phone ON wa_messages (phone, id);
  CREATE INDEX idx_wa_messages_created ON wa_messages (created_at);
  ALTER TABLE leads ADD COLUMN wa_opted_out INTEGER NOT NULL DEFAULT 0;
  ALTER TABLE leads ADD COLUMN last_inbound_at TEXT; -- their last WhatsApp message: free-form replies are allowed for 24 hours after it
  `,

  // 15: Admin → WhatsApp chats: which received messages the admin has opened, and numbers (lead or not) that asked not
  // to be messaged.
  `
  ALTER TABLE wa_messages ADD COLUMN seen INTEGER NOT NULL DEFAULT 0; -- received messages: 1 once opened in the chats
  CREATE TABLE wa_optouts (
    phone TEXT PRIMARY KEY, -- digits with country code
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  INSERT OR IGNORE INTO wa_optouts (phone)
    SELECT replace(replace(replace(phone, '+', ''), ' ', ''), '-', '') FROM leads WHERE wa_opted_out = 1 AND phone != '';
  `,

  // 16: the WhatsApp profile name people chat under, so chats show "Dev Sidhar" rather than a bare number.
  `
  CREATE TABLE wa_contacts (
    phone TEXT PRIMARY KEY, -- digits with country code
    name TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  `,

  // 17: a stamp card instead of points: "every N visits → one reward". customers.points now holds the customer's
  // stamps (visits since their last reward); a visit is an 'earn' of 1 with no amount, a reward a 'redeem' of -N with
  // no reward_id. Each customer's past bills become stamps, up to one short of the reward, so their next visit earns it.
  // The shop's cheapest reward becomes its one reward, and a phone number counts once a day.
  `
  ALTER TABLE merchants ADD COLUMN visits_needed INTEGER NOT NULL DEFAULT 5;
  ALTER TABLE merchants ADD COLUMN reward_name TEXT NOT NULL DEFAULT '';
  UPDATE merchants SET
    max_visits_per_day = 1,
    reward_name = COALESCE((SELECT name FROM rewards r WHERE r.merchant_id = merchants.id AND r.active = 1 ORDER BY r.points_cost LIMIT 1), '');
  UPDATE customers SET points = MIN(
    (SELECT COUNT(*) FROM transactions t WHERE t.customer_id = customers.id AND t.type = 'earn' AND t.reversed = 0),
    (SELECT visits_needed - 1 FROM merchants m WHERE m.id = customers.merchant_id)
  );
  `,

  // 18: SEO pages written before the stamp card describe points. They're marked stale and rewritten in place with the
  // new prompt (seo.ts), keeping their address and staying live until the new text is in.
  `
  ALTER TABLE seo_pages ADD COLUMN stale INTEGER NOT NULL DEFAULT 0;
  UPDATE seo_pages SET stale = 1 WHERE content IS NOT NULL;
  `,

  // 19: shops that bring shops: the rewards (a counter standee, ₹100 on UPI) the admin has sent, so each goes out once
  // (referrals.ts).
  `
  CREATE TABLE referral_rewards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    merchant_id INTEGER NOT NULL REFERENCES merchants(id),
    kind TEXT NOT NULL CHECK (kind IN ('standee', 'upi')),
    n INTEGER NOT NULL,
    admin_id INTEGER,
    sent_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE (merchant_id, kind, n)
  );
  `,

  // 20: shops the admin ticked to show on the homepage ("Shops using Regularhood"). None by default.
  `
  ALTER TABLE merchants ADD COLUMN on_landing INTEGER NOT NULL DEFAULT 0;
  `,

  // 21: shops can sign up with just a WhatsApp number, so email becomes optional. SQLite can't drop NOT NULL in place,
  // so the table is rebuilt with the same columns (foreign keys are off while migrations run, see migrate()).
  `
  CREATE TABLE merchants_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE,
    password_hash TEXT NOT NULL,
    points_per_100 INTEGER NOT NULL DEFAULT 10,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    join_code TEXT,
    welcome_bonus INTEGER NOT NULL DEFAULT 0,
    birthday_bonus INTEGER NOT NULL DEFAULT 0,
    gold_threshold INTEGER NOT NULL DEFAULT 1000,
    gold_multiplier REAL NOT NULL DEFAULT 1.5,
    inactive_days INTEGER NOT NULL DEFAULT 30,
    max_visits_per_day INTEGER NOT NULL DEFAULT 3,
    large_bill INTEGER NOT NULL DEFAULT 5000,
    last_seen_at TEXT,
    suspended_at TEXT,
    suspended_reason TEXT,
    phone TEXT,
    signup_source TEXT NOT NULL DEFAULT '',
    signup_medium TEXT NOT NULL DEFAULT '',
    signup_campaign TEXT NOT NULL DEFAULT '',
    signup_ref TEXT NOT NULL DEFAULT '',
    signup_landing TEXT NOT NULL DEFAULT '',
    referred_by INTEGER REFERENCES merchants(id),
    visits_needed INTEGER NOT NULL DEFAULT 5,
    reward_name TEXT NOT NULL DEFAULT '',
    on_landing INTEGER NOT NULL DEFAULT 0
  );
  INSERT INTO merchants_new (id, name, email, password_hash, points_per_100, created_at, join_code, welcome_bonus,
    birthday_bonus, gold_threshold, gold_multiplier, inactive_days, max_visits_per_day, large_bill, last_seen_at,
    suspended_at, suspended_reason, phone, signup_source, signup_medium, signup_campaign, signup_ref, signup_landing,
    referred_by, visits_needed, reward_name, on_landing)
  SELECT id, name, email, password_hash, points_per_100, created_at, join_code, welcome_bonus,
    birthday_bonus, gold_threshold, gold_multiplier, inactive_days, max_visits_per_day, large_bill, last_seen_at,
    suspended_at, suspended_reason, phone, signup_source, signup_medium, signup_campaign, signup_ref, signup_landing,
    referred_by, visits_needed, reward_name, on_landing
  FROM merchants;
  DROP TABLE merchants;
  ALTER TABLE merchants_new RENAME TO merchants;
  `,

  // 22: plans. Free shops keep up to 50 customers; Founding Shops (the first 100 that pay, lifetime or yearly) have no
  // limit. Every shop that signed up before plans existed is 'grandfathered': no limit, as the terms promised.
  // `payments` keeps every Razorpay order, paid or not.
  `
  ALTER TABLE merchants ADD COLUMN plan TEXT NOT NULL DEFAULT 'free'; -- free | grandfathered | lifetime | yearly
  ALTER TABLE merchants ADD COLUMN plan_expires_at TEXT; -- yearly only (UTC, SQLite format)
  ALTER TABLE merchants ADD COLUMN founding_no INTEGER; -- the shop's Founding Shop number, kept once given
  UPDATE merchants SET plan = 'grandfathered';
  CREATE TABLE payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    merchant_id INTEGER NOT NULL REFERENCES merchants(id),
    kind TEXT NOT NULL, -- lifetime | yearly
    amount_paise INTEGER NOT NULL,
    razorpay_order_id TEXT NOT NULL UNIQUE,
    razorpay_payment_id TEXT,
    status TEXT NOT NULL DEFAULT 'created', -- created | paid | refunded
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    paid_at TEXT
  );
  CREATE INDEX idx_payments_merchant ON payments (merchant_id);
  `,

  // 23: Founding Shop extras. Regularhood's WhatsApp number can message the shop's customers by itself (their card
  // after a visit, "reward ready", "we miss you", a Google review request after a reward); each kind can be switched
  // off. wa_messages rows sent for a shop carry its id, the customer and which automatic message it was.
  `
  ALTER TABLE merchants ADD COLUMN auto_card INTEGER NOT NULL DEFAULT 1;
  ALTER TABLE merchants ADD COLUMN auto_reward INTEGER NOT NULL DEFAULT 1;
  ALTER TABLE merchants ADD COLUMN auto_missyou INTEGER NOT NULL DEFAULT 1;
  ALTER TABLE merchants ADD COLUMN auto_review INTEGER NOT NULL DEFAULT 1;
  ALTER TABLE merchants ADD COLUMN review_url TEXT NOT NULL DEFAULT ''; -- the shop's Google review link
  ALTER TABLE merchants ADD COLUMN msg_lang TEXT NOT NULL DEFAULT 'hi'; -- automatic messages: hi | en
  ALTER TABLE wa_messages ADD COLUMN merchant_id INTEGER REFERENCES merchants(id) ON DELETE SET NULL;
  ALTER TABLE wa_messages ADD COLUMN customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL;
  ALTER TABLE wa_messages ADD COLUMN auto TEXT; -- card | reward | missyou | review
  CREATE INDEX idx_wa_messages_merchant ON wa_messages (merchant_id, created_at);
  CREATE INDEX idx_wa_messages_customer ON wa_messages (customer_id, auto);
  `,

  // 24: Admin → Plans can refund a payment through Razorpay: the refund's id and when it was made.
  `
  ALTER TABLE payments ADD COLUMN razorpay_refund_id TEXT;
  ALTER TABLE payments ADD COLUMN refunded_at TEXT;
  `,

  // 25: Admin → Playbooks: one-page Loyalty Playbooks written by Claude for a business we're pitching.
  `
  CREATE TABLE playbooks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    business TEXT NOT NULL,
    business_type TEXT NOT NULL,
    city TEXT NOT NULL,
    notes TEXT NOT NULL DEFAULT '',
    content TEXT NOT NULL -- JSON, see Playbook in playbook.ts
  );
  `,

  // 26: city pages (/city/<slug>, /hi/city/<slug>) next to the shop-type pages, and a first batch of cities and more kinds
  // of shops queued for the writer (seo.ts). Queued once, here, so a page the admin deletes stays deleted.
  `
  ALTER TABLE seo_pages ADD COLUMN kind TEXT NOT NULL DEFAULT 'shop' CHECK (kind IN ('shop', 'city'));
  ${SEED_PAGES}
  `,

  // 27: photos, videos, voice notes and documents in WhatsApp chats. Meta only keeps a received file for about 30 days,
  // so it's copied to Supabase Storage (storage.ts) when it arrives; media_id lets a failed copy be tried again later.
  `
  ALTER TABLE wa_messages ADD COLUMN media_id TEXT; -- Meta's id for the file
  ALTER TABLE wa_messages ADD COLUMN media_path TEXT; -- where it is in Supabase Storage, once copied
  ALTER TABLE wa_messages ADD COLUMN media_mime TEXT;
  ALTER TABLE wa_messages ADD COLUMN media_name TEXT; -- a document's file name
  ALTER TABLE wa_messages ADD COLUMN media_size INTEGER; -- bytes
  `,

  // 28: payments before going live were Razorpay test mode, not money: they're removed so revenue starts at ₹0, and
  // shops that aren't Founding Shops lose the number they got from them, so the first real Founding Shop is #1.
  // (The copy made before this upgrade keeps them.)
  `
  DELETE FROM payments WHERE created_at < '2026-10-29'
    AND merchant_id IN (SELECT id FROM merchants WHERE plan NOT IN ('lifetime', 'yearly'));
  UPDATE merchants SET founding_no = NULL WHERE plan NOT IN ('lifetime', 'yearly');
  `,

  // 29: watching payments from Admin → Plans. Every step of a payment (checkout opened, closed or failed, the checkout's
  // answer, each Razorpay webhook, the plan switching on, a refund, a sync with Razorpay) is kept as an event, and a
  // payment that failed says why.
  `
  ALTER TABLE payments ADD COLUMN failure_reason TEXT;
  CREATE TABLE payment_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    payment_id INTEGER REFERENCES payments(id) ON DELETE CASCADE,
    merchant_id INTEGER REFERENCES merchants(id) ON DELETE CASCADE,
    event TEXT NOT NULL, -- see PaymentEvent in billing.ts
    detail TEXT NOT NULL DEFAULT ''
  );
  CREATE INDEX idx_payment_events_payment ON payment_events (payment_id);
  CREATE INDEX idx_payment_events_time ON payment_events (created_at);
  `,

  // 30: partners who bring shops for a commission (partners.ts): business partners (billing software, distributors) and
  // individual agents. A shop that signs up from a partner's link (/?p=<code>) is theirs; the payouts the admin has sent
  // are kept so each goes out once.
  `
  CREATE TABLE partners (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT NOT NULL UNIQUE, -- public, in their link: DIVU42
    token TEXT NOT NULL UNIQUE, -- secret, their own page: /partner/<token>
    kind TEXT NOT NULL CHECK (kind IN ('agent', 'business')),
    name TEXT NOT NULL,
    business TEXT NOT NULL DEFAULT '', -- a business partner's company
    phone TEXT NOT NULL, -- WhatsApp, as readPhone writes it
    upi TEXT NOT NULL DEFAULT '',
    city TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    disabled_at TEXT -- stopped by an admin: their link no longer counts, nothing new is earned
  );
  ALTER TABLE merchants ADD COLUMN partner_id INTEGER REFERENCES partners(id);
  CREATE INDEX idx_merchants_partner ON merchants (partner_id);
  CREATE TABLE partner_payouts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    partner_id INTEGER NOT NULL REFERENCES partners(id),
    kind TEXT NOT NULL CHECK (kind IN ('active', 'payment')),
    ref_id INTEGER NOT NULL, -- 'active': the shop (merchants.id) · 'payment': payments.id
    amount_paise INTEGER NOT NULL,
    admin_id INTEGER,
    sent_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE (kind, ref_id)
  );
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
    // An existing database that's about to be upgraded is copied first (kept, never pruned), so data changed by an
    // upgrade can always be recovered. If the copy fails, nothing is upgraded.
    if (version > 0 && version < MIGRATIONS.length) {
      mkdirSync(BACKUP_DIR, { recursive: true });
      const stamp = new Date().toISOString().replace(/[:.]/g, '-');
      const file = join(BACKUP_DIR, `before-v${MIGRATIONS.length}-${stamp}.db`);
      this.sql.exec(`VACUUM INTO '${file.replace(/'/g, "''")}'`);
      console.log(`Database copied to ${file} before upgrading from v${version} to v${MIGRATIONS.length}`);
    }
    // Foreign keys are off while upgrading, so a step can rebuild a table other tables point at (SQLite ignores this
    // pragma inside a transaction, so it's set around them). A step may not leave more broken references than it found.
    this.sql.exec('PRAGMA foreign_keys = OFF');
    const brokenRefs = () => this.sql.prepare('PRAGMA foreign_key_check').all().length;
    for (let v = version; v < MIGRATIONS.length; v++) {
      this.transaction(() => {
        const before = brokenRefs();
        this.sql.exec(MIGRATIONS[v]);
        if (brokenRefs() > before) throw new Error(`Upgrade to v${v + 1} broke foreign key references`);
        this.sql.exec(`PRAGMA user_version = ${v + 1}`);
      });
    }
    this.sql.exec('PRAGMA foreign_keys = ON');
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
