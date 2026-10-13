# Deploying Regularhood to habiturn.sidhar.me

The app is one Node server (website + API) with its data in one SQLite file. Whatever the host, it needs:

- a **disk that survives redeploys**, mounted at `/app/server/data` (database, `jwt-secret`, daily backups in `data/backups`)
- **HTTPS** on `habiturn.sidhar.me` (the camera, install-as-app and wallet links need it)
- `TRUST_PROXY=1` when it runs behind a proxy, so per-visitor limits see real IPs

> **Keep this address forever.** It is printed on shops' QR posters and inside every customer's wallet link.
> If you move to another domain later, keep `habiturn.sidhar.me` running and redirect it.

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

Then open `https://habiturn.sidhar.me/admin`.

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
4. **Settings → Networking → Custom Domain** → `habiturn.sidhar.me`. Railway shows a CNAME target.
5. Namecheap → `sidhar.me` → **Advanced DNS** → **Add New Record**:

   | Type | Host | Value | TTL |
   | --- | --- | --- | --- |
   | CNAME Record | `habiturn` | the target Railway showed | Automatic |

6. Superadmin: open a shell on the running service (Railway CLI: `railway ssh`, check Railway's docs for the current
   command) and run `node --no-warnings scripts/create-admin.mjs devsidharr@gmail.com`.

Backups land on the volume in `data/backups`; download them now and then from a shell on the service.

---

## After it's live

- Log in as a shop on `https://habiturn.sidhar.me` and print the counter QR from Settings — it now points at the real address.
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
