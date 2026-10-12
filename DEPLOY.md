# Deploying Habiturn to habiturn.sidhar.me

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

**Updating** after pushing new code:

```sh
cd habiturn && git pull && cd deploy && docker compose up -d --build
```

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
