# Loyalty Points

A simple loyalty program for small shops: give customers points on every bill and let them spend the points on rewards.

- **server/** – NestJS API, data in one SQLite file (`server/data/loyalty.db`, Node's built-in `node:sqlite`)
- **web/** – React + Vite website

## Features

- **Sign up / log in** – each shop has its own account (email + password, 7-day login token)
- **Give points** – phone + bill amount; first-time customers are created on the spot. A **Send on WhatsApp** button opens WhatsApp with the points message and the customer's wallet link
- **Bill QR** – the shop types the bill and shows a QR; the customer scans it with their phone camera (`/c/<code>`) and the points land in their wallet — one tap if their card is saved on that phone, otherwise phone number (+ name if they're new, which also signs them up). Codes work once and expire after 3 minutes; the shop's screen switches to "Points added" by itself
- **Scan card** – the wallet's **My card** button shows a member QR; the shop scans it in Give points instead of typing the number (needs the camera, so the app must be opened over https or on localhost)
- **Customer wallet** – `/w/<link>`: the customer's points, Gold progress, rewards and history, no app or login needed. Progress is shown in rupees ("Shop for ₹600 more → Free Coffee"), with confetti when a reward unlocks, Gold is reached or a reward is handed over
- **Reward codes** – the customer taps **Get it** on a reward in their wallet and gets a 4-digit code (10 minutes); the shop types it in Give points → **Reward code**, sees who and what, and confirms. Points are only taken then, and the wallet updates by itself
- **English / हिंदी** – customer pages (wallet, bill QR, join, login) switch language with one tap; the choice is remembered on that phone. The shop's screens stay English
- **Forgot PIN** – cards opened on a phone are remembered, so `/login` lists them to open without a PIN (and set a new one)
- **Safety** – a limit on how many times one customer can get points in 24 hours (default 3), and a "are you sure?" check for bills above an amount (default ₹5,000). Both in Settings
- **Activity log** – Settings → Activity log: undos, adjustments, deletes, edits, PIN resets, setting and reward changes, redeemed codes, blocked and large bills, with who did it (shop or customer)
- **Export** – Settings → Your data: customers and full points history as CSV (opens in Excel / Google Sheets)
- **Installable app (PWA)** – the shop app and each customer wallet can be added to the home screen; a wallet installed this way opens straight to that wallet. Works offline as far as opening the app (the API is never cached)
- **Counter QR** – printable poster (Settings) that opens `/join/<code>`, where customers sign up themselves and choose a PIN
- **Customer login** – `/login` with phone + 4-digit PIN opens their wallet (or a list, if they're a member of several shops). PINs are hashed; 5 wrong PINs lock that number for 15 minutes. Shops can reset a forgotten PIN; customers set a new one from their wallet link
- **Customers** – search, add, edit, delete; full history with **Undo** per entry and manual **Adjust** with a reason
- **Rewards** – create rewards and redeem them from a customer's page
- **Bonuses & tiers** – welcome bonus, birthday bonus (on their visit within a week of the birthday, once a year), and ★ Gold after a lifetime-points threshold with a points multiplier
- **Win-back** – list of customers who haven't visited in N days, each with a ready "we miss you" WhatsApp message
- **Insights** – visits per day (new vs returning), top customers, repeat rate, sales and average bill

## Superadmin

`/admin` is the platform owner's panel: every shop's health (active / sleeping / new / never started / paused), a
"needs a call" list of shops that went quiet, and per-shop numbers (customers, bills, sales, how much returning
customers spent). Support actions: a one-time password reset link (24 hours), pausing a shop (no logins, joins or
bill QRs — customer wallets still open) and notes. Every admin action is in the admin log. Admins see counts and
totals only, never customers' names or phone numbers.

Admins are created only on the server — never from the website:

```sh
npm run create-admin -w server -- you@example.com
```

It asks for the password (hidden, at least 12 characters). Run it again to set a new password.

## Run it

Needs Node.js 22.16 or newer.

**One command** (or double-click `start.bat` on Windows):

```sh
npm install   # first time only
npm start
```

Open **http://localhost:4000**. `npm start` builds the website and API and runs them as one server on port 4000.

**While changing code** (live reload):

```sh
npm run dev
```

Also open http://localhost:4000 — the website dev server forwards `/api` to the API on port 4001.

**Putting it online:** see [DEPLOY.md](DEPLOY.md) (VPS with Docker + automatic HTTPS, or Railway). The database is copied
to `data/backups` once a day (last 14 kept). Behind a proxy, set `TRUST_PROXY=1`.

Set `JWT_SECRET` in production (otherwise one is generated into `server/data/`), and optionally `PORT` and `DB_FILE`. Back up `server/data/` — it is the whole database.

## API

All routes except signup/login need `Authorization: Bearer <token>`.

| Method | Path | |
| --- | --- | --- |
| POST | `/api/auth/signup` | `{ name, email, password }` → `{ token, merchant }` |
| POST | `/api/auth/login` | `{ email, password }` → `{ token, merchant }` |
| GET / PATCH | `/api/me` | shop details / update `{ name, pointsPer100 }` |
| GET | `/api/dashboard` | totals and recent activity |
| GET / POST | `/api/customers` | list (`?q=` search) / add `{ name, phone }` |
| GET | `/api/customers/:id` | customer with history |
| POST | `/api/points/earn` | `{ phone, amount, name? }` |
| POST | `/api/points/redeem` | `{ customerId, rewardId }` |
| GET / POST | `/api/rewards` | list / add `{ name, pointsCost }` |
| DELETE | `/api/rewards/:id` | remove a reward |
| PATCH / DELETE | `/api/customers/:id` | edit `{ name, phone, birthday }` / delete with history |
| POST | `/api/customers/:id/adjust` | `{ points, reason }` (negative removes) |
| POST | `/api/transactions/:id/undo` | reverse one entry |
| GET | `/api/customers?filter=inactive` | customers who haven't visited recently |
| GET | `/api/insights?days=30&tz=330` | daily visits, top customers, repeat rate |
| GET | `/api/public/wallet/:token` | customer wallet (no login) |
| GET / POST | `/api/public/join/:code` | counter QR sign-up `{ name, phone, pin, birthday? }` (no login) |
| POST | `/api/public/wallet/:token/pin` | set or change the customer's PIN |
| POST | `/api/public/login` | `{ phone, pin }` → `{ wallets }` |
| POST | `/api/customers/:id/reset-pin` | shop clears a forgotten PIN |
| POST | `/api/claims` | `{ amount }` → bill QR `{ code, expiresAt }` |
| GET / DELETE | `/api/claims/:code` | `waiting` / `claimed` (with the earn result) / `expired` · cancel |
| GET | `/api/customers/scan?code=` | scanned member card (`lp-card:…`) or wallet link → customer |
| GET / POST | `/api/public/claim/:code` | bill QR details / claim `{ walletToken }` or `{ phone, name? }` (no login) |
| GET | `/api/public/wallet/:token/manifest` | per-wallet app manifest for "Add to Home Screen" |
| POST | `/api/public/wallet/:token/redeem` | `{ rewardId }` → 4-digit reward code (no login) |
| GET / POST | `/api/redeem-codes/:code` | see whose code it is / redeem it |
| GET | `/api/activity?limit=200` | activity log |
| GET | `/api/export/customers.csv`, `/api/export/transactions.csv` | spreadsheet downloads |

The database schema upgrades itself on start (`PRAGMA user_version`), keeping existing data.
