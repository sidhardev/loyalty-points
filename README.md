# Regularhood

Turn walk-ins into regulars. A simple loyalty program for neighbourhood shops: a stamp card on the customer's phone
number — every few visits, a free reward. Live at [www.regularhood.in](https://www.regularhood.in) (formerly Habiturn,
at habiturn.sidhar.me, which now redirects there).

- **server/** – NestJS API, data in one SQLite file (`server/data/loyalty.db`, Node's built-in `node:sqlite`)
- **web/** – React + Vite website

## Features

A digital stamp card: **every N visits → one reward** (e.g. every 5 visits → free chai). A customer is just a phone
number — no names, QR codes, points, PINs or sign-up.

- **Sign up / log in** – each shop has its own account (email + password, 7-day login token). The first screen asks
  for the one rule: how many visits, and what the customer gets
- **Add visit** – the shop's home screen is a keypad: type the customer's number (known numbers are suggested after 4
  digits) and tap **Add visit**. New numbers become customers on the spot. One visit per number per day counts
- **Reward** – on the Nth visit the screen turns orange: **Give Free chai now** → **Given**, and the card starts again.
  "Not now" keeps it waiting for next time
- **Send card on WhatsApp** – opens WhatsApp with the customer's progress and their card link (Hindi or English, set
  in Settings)
- **Customer card** – `/w/<link>`: their stamps, what's left to the reward and their visits; English / हिंदी, no app
  or login. Old counter-poster QRs (`/join/<code>`) show the shop's rule; old bill QR and PIN login links explain
  there's nothing to scan any more
- **Undo** – "Wrong number? Undo" right after a visit, and Undo on any visit or reward in a customer's history
- **Customers** – search by number, "Reward waiting", and "Not seen in N days" with a ready "we miss you" WhatsApp
- **Activity log and export** – Settings: rewards given, undos, deletes and changes; customers and visit history as CSV
- **Installable app (PWA)** – the shop app and each customer card can be added to the home screen
- **English / हिंदी everywhere** – the homepage, the shop app (switch in the top bar or Settings → Account) and the
  customer card; the choice is remembered on that phone
- **Counter poster and share image** – Settings: an A4 poster and a WhatsApp status / Instagram image with the shop's
  rule ("Every 5 visits → Free chai") and "just tell your phone number at the counter". No QR codes

Shops from before the stamp card keep their customers: each customer's past bills became stamps (up to one short of
the reward, so their next visit earns it), and the shop's cheapest reward became its one reward.

## Superadmin

`/admin` is the platform owner's panel: every shop's health (active / sleeping / new / never started / paused), a
"needs a call" list of shops that went quiet or never set up their card, and per-shop numbers (their card rule,
customers, visits and rewards given, customers who came back, rewards waiting). Support actions: a one-time password
reset link (24 hours), pausing a shop (no logins or new visits — customers' cards still open) and notes. Every admin action is in the admin log. Admins see counts and
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
| GET / PATCH | `/api/me` | shop details / update `{ name, phone, visitsNeeded, rewardName, inactiveDays }` |
| POST | `/api/visits` | `{ phone, tz }` → one visit (once a day per number); `{ already, isNew, visitId, customer }` |
| POST | `/api/customers/:id/reward` | the shop handed over the reward; the card starts again |
| POST | `/api/transactions/:id/undo` | take back one visit or reward |
| GET | `/api/today?tz=330` | today's visits and rewards |
| GET | `/api/customers` | list (`?q=` search, `?filter=reward` or `inactive`) |
| GET | `/api/customers/suggest?digits=` | known numbers starting with these digits (4+) |
| GET / PATCH / DELETE | `/api/customers/:id` | customer with visit history / change number `{ phone }` / delete with history |
| GET | `/api/share` | customers and referrals, for the share image |
| GET | `/api/activity?limit=200` | activity log |
| GET | `/api/export/customers.csv`, `/api/export/transactions.csv` | spreadsheet downloads |
| GET | `/api/public/wallet/:token` | the customer's stamp card (no login) |
| GET | `/api/public/wallet/:token/manifest` | per-card app manifest for "Add to Home Screen" |
| GET | `/api/public/join/:code` | the shop's rule, for old counter-poster QR codes (no login) |

The database schema upgrades itself on start (`PRAGMA user_version`), keeping existing data.
