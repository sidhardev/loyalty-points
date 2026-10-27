# Deploying Regularhood to regularhood.in

The app is one Node server (website + API) with its data in one SQLite file. Whatever the host, it needs:

- a **disk that survives redeploys**, mounted at `/app/server/data` (database, `jwt-secret`, daily backups in `data/backups`)
- **HTTPS** on `regularhood.in` (the camera, install-as-app and wallet links need it)
- `TRUST_PROXY=1` when it runs behind a proxy, so per-visitor limits see real IPs

> **Keep this address forever.** It is printed on shops' QR posters and inside every customer's wallet link.
> The site moved from `habiturn.sidhar.me` to `www.regularhood.in` (Vercel sends `regularhood.in` to www). The old
> address stays attached to Vercel and redirects every page to the same path on the new one (`vercel.json`), so printed posters and old links keep working.
> The API keeps its own host (`api-habiturn.sidhar.me`), which visitors never see.

---

## Option A — a VPS (recommended: cheapest, full control)

Any Ubuntu 22.04/24.04 VPS with 1 GB RAM is enough (Hetzner, DigitalOcean, Hostinger…).

**1. DNS on Namecheap** — Domain List → `sidhar.me` → **Manage** → **Advanced DNS** → **Add New Record**:

| Type | Host | Value | TTL |
| --- | --- | --- | --- |
| A Record | `habiturn` | your VPS's IPv4 address | Automatic |

**2. On the VPS** (as a user with sudo):

```sh
# Docker
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER   # then log out and back in

# The app
git clone https://github.com/sidhardev/loyalty-points.git habiturn   # private repo: use a GitHub deploy key or token
cd habiturn/deploy
mkdir -p data && sudo chown 1000:1000 data          # the app runs as user 1000 inside the container
echo "JWT_SECRET=$(openssl rand -hex 32)" > .env     # keeps logins valid across restarts; never commit it
docker compose up -d --build
```

Open ports 80 and 443 in the VPS firewall if it has one (`sudo ufw allow 80,443/tcp`).
Caddy gets the HTTPS certificate by itself once the DNS record points at the VPS (can take a few minutes).

**3. Your superadmin** (asks for the password, hidden):

```sh
docker compose exec app node --no-warnings scripts/create-admin.mjs devsidharr@gmail.com
```

Then open `https://regularhood.in/admin`.

**Updating — automatic.** Pushing to `main` is the whole deploy:

| What | Where | How |
| --- | --- | --- |
| Checks | GitHub Actions (`.github/workflows/ci.yml`) | Every push and pull request: website build, API build, Docker image build. |
| Website | Vercel | Builds `main` by itself. |
| API | This server | `habiturn-deploy.timer` runs `deploy/auto-deploy.sh` every 2 minutes. If `main` moved and backend files changed (`server/`, `Dockerfile`, `deploy/`, `package*.json`), it rebuilds and checks the API answers. A failed build leaves the running container alone; a failed check rolls back to the previous commit. |

The server reads the repo with a read-only **deploy key** — no AWS keys or open ports for GitHub. One-time setup on the
server (prints the key to add under GitHub → repo → Settings → Deploy keys, write access off; run it again after):

```sh
cd ~/habiturn && bash deploy/install-auto-deploy.sh
```

Day to day:

```sh
tail -n 20 ~/deploy.log                                   # what was deployed, when, and any rollbacks
~/habiturn/deploy/auto-deploy.sh                          # deploy now instead of waiting for the timer
systemctl list-timers habiturn-deploy.timer               # when it runs next
```

To go back to an older version, revert the commit on GitHub (`git revert <sha>` and push); the server deploys the revert.

**Backups** — the app writes one copy a day to `deploy/data/backups/` and keeps 14. They are on the same
server, so copy them off now and then, from your own computer:

```sh
scp -r user@your-vps-ip:habiturn/deploy/data/backups ./habiturn-backups
```

---

## Option B — Railway (easiest, auto-deploys from GitHub)

1. New Project → **Deploy from GitHub repo** → `sidhardev/loyalty-points`. Railway builds the `Dockerfile`.
2. On the service: **Volumes** → add a volume mounted at **`/app/server/data`**. (Without it every deploy wipes the data.)
3. **Variables**: `TRUST_PROXY` = `1`, `JWT_SECRET` = a long random string (e.g. from `openssl rand -hex 32`).
4. **Settings → Networking → Custom Domain** → `regularhood.in`. Railway shows a CNAME target.
5. Namecheap → `sidhar.me` → **Advanced DNS** → **Add New Record**:

   | Type | Host | Value | TTL |
   | --- | --- | --- | --- |
   | CNAME Record | `habiturn` | the target Railway showed | Automatic |

6. Superadmin: open a shell on the running service (Railway CLI: `railway ssh`, check Railway's docs for the current
   command) and run `node --no-warnings scripts/create-admin.mjs devsidharr@gmail.com`.

Backups land on the volume in `data/backups`; download them now and then from a shell on the service.

---

## After it's live

- Log in as a shop on `https://regularhood.in` and print the counter QR from Settings — it now points at the real address.
- On a phone: open a wallet link and try **Add to home screen**; try **Give points → Scan card** (camera works on HTTPS).
- The local test data on your computer is not copied — the server starts with an empty database.

## AI-written SEO pages (optional)

Admin → **SEO pages** writes a page for each kind of shop (`/for/gym`, `/hi/for/gym`) with Google Gemini, a few a day,
and `/sitemap.xml` lists them as they're published. It needs a Gemini API key on the server (never in the website):

```
echo "GEMINI_API_KEY=your-key-here" >> deploy/.env   # on the server, next to JWT_SECRET
cd deploy && docker compose up -d                  # restart so the app sees it
```

Then open `/admin#/seo`, press **Add 30 suggested** (or type your own kinds of shops), and set pages per day, the
start time and the monthly budget. Costs are tracked per call; writing stops for the month when the budget is reached.
On Vercel, `/for/*`, `/hi/for/*` and `/sitemap.xml` are forwarded to the server (see `vercel.json`).

## Lead finder (optional)

Admin → **Leads** finds shops on Google Maps that could use Regularhood and writes a pitch for each with Gemini. It needs
a Google Maps key with **Places API (New)** turned on in Google Cloud: paste it on that page (stored encrypted), or put
`GOOGLE_MAPS_API_KEY=...` in `deploy/.env`. The page tracks every search and pitch with its cost; set Google's current
Text Search Enterprise price, the free searches per month and a monthly budget there (searches stop at the budget).

### Sending through the WhatsApp API

The same page can message leads through Meta's WhatsApp Cloud API. Set it up in the **WhatsApp API** card:

1. **Number:** the Phone number ID and WhatsApp Business Account ID (Meta app → WhatsApp → API setup), in the card or
   as `WHATSAPP_PHONE_NUMBER_ID` / `WHATSAPP_WABA_ID` in `deploy/.env`.
2. **Access token:** a permanent system-user token with `whatsapp_business_messaging` and `whatsapp_business_management`
   (the 24-hour test token expires). Or `WHATSAPP_TOKEN=...` in `deploy/.env`.
3. **Webhook:** paste the Callback URL (`https://www.regularhood.in/api/whatsapp/webhook`) and the Verify token shown in
   the card into Meta app → WhatsApp → Configuration, subscribe to `messages`, and save the **app secret** (app →
   Settings → Basic) in the card or as `WHATSAPP_APP_SECRET`. Replies and delivery updates are ignored without it.
4. **Template:** "Create the intro template" sends a Hindi or Hinglish marketing template to Meta for review; once it's
   approved, Load templates → Use.

A shop that hasn't written to us can only get that template. When the owner taps "yes" or replies, the AI pitch with the
sign-up link is sent by itself, and free messages are allowed for 24 hours; "not now" or STOP stops all messages to
that number. The card has a daily cap (keep it low on a new number: blocks and reports lower its quality rating), the
price per message from Meta's rate card, and a monthly budget.

**Photos, videos and documents in the chats** are kept in Supabase Storage, because Meta deletes a received file after
about 30 days. In `deploy/.env` set `SUPABASE_URL=https://<project>.supabase.co` and `SUPABASE_SECRET_KEY=` the
project's secret key (Project Settings → API Keys; the legacy `service_role` key works too, the publishable/anon one
doesn't). The private `whatsapp-media` bucket is made on the first file (`SUPABASE_BUCKET` changes the name). Files up to
50 MB are kept (the free plan's limit); without Supabase they still arrive, show as "not saved yet", and are copied when
the chat is next opened, as long as Meta still has them.
