# Loyalty Points

A simple loyalty program for small shops: give customers points on every bill and let them spend the points on rewards.

- **server/** – NestJS API, data in one SQLite file (`server/data/loyalty.db`, Node's built-in `node:sqlite`)
- **web/** – React + Vite website

## Features

- **Sign up / log in** – each shop has its own account (email + password, 7-day login token)
- **Give points** – enter the customer's phone and bill amount; first-time customers are created on the spot
- **Customers** – search, add, and see each customer's balance and full history
- **Rewards** – create rewards (e.g. "Free coffee – 100 points") and redeem them from a customer's page
- **Dashboard & settings** – totals, recent activity, and how many points every ₹100 earns

## Run it

Needs Node.js 22.5 or newer.

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
