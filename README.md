# Loyalty Points

A simple loyalty program for small shops: give customers points on every bill and let them spend the points on rewards.

- **server/** – NestJS API, data in one SQLite file (`server/data/loyalty.db`, Node's built-in `node:sqlite`)
- **web/** – React + Vite website

## Features

- **Sign up / log in** – each shop has its own account (email + password, 7-day login token)
- **Give points** – phone + bill amount; first-time customers are created on the spot. A **Send on WhatsApp** button opens WhatsApp with the points message and the customer's wallet link
- **Customer wallet** – `/w/<link>`: the customer's points, Gold progress, rewards and history, no app or login needed
- **Counter QR** – printable poster (Settings) that opens `/join/<code>`, where customers sign up themselves and choose a PIN
- **Customer login** – `/login` with phone + 4-digit PIN opens their wallet (or a list, if they're a member of several shops). PINs are hashed; 5 wrong PINs lock that number for 15 minutes. Shops can reset a forgotten PIN; customers set a new one from their wallet link
- **Customers** – search, add, edit, delete; full history with **Undo** per entry and manual **Adjust** with a reason
- **Rewards** – create rewards and redeem them from a customer's page
- **Bonuses & tiers** – welcome bonus, birthday bonus (on their visit within a week of the birthday, once a year), and ★ Gold after a lifetime-points threshold with a points multiplier
- **Win-back** – list of customers who haven't visited in N days, each with a ready "we miss you" WhatsApp message
- **Insights** – visits per day (new vs returning), top customers, repeat rate, sales and average bill

## Run it

Needs Node.js 22.16 or newer.

```sh
npm install
npm run dev
```

Open http://localhost:5173 (the API runs on :3000).

### Production

```sh
npm run build
npm start
```

One process on http://localhost:3000 serves both the API and the website. Set `JWT_SECRET` in production (otherwise one is generated into `server/data/`), and optionally `PORT` and `DB_FILE`. Back up `server/data/` — it is the whole database.

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

The database schema upgrades itself on start (`PRAGMA user_version`), keeping existing data.
