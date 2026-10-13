#!/bin/bash
# Pull-based deploy, run on the server every 2 minutes by the habiturn-deploy systemd timer.
# If GitHub's main has moved: update this checkout, and when backend files changed, rebuild and check the API.
# A failed build leaves the running container alone; a failed health check rolls back to the previous commit.
set -uo pipefail

cd "$(dirname "$0")/.." || exit 1 # the repository (~/habiturn)
exec 9>/tmp/habiturn-deploy.lock
flock -n 9 || exit 0 # a deploy is already running

LOG="$HOME/deploy.log"
log() { echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) $*" | tee -a "$LOG"; }

build() { (cd deploy && docker compose up -d --build) >>"$HOME/build.log" 2>&1; }

# The API answers a made-up join code with "not valid" once it is up.
healthy() {
  for _ in $(seq 1 30); do
    if (cd deploy && docker compose exec -T app node -e \
      "fetch('http://localhost:4000/api/public/join/healthcheck').then(r=>r.text()).then(t=>{if(!t.includes('not valid'))process.exit(1)})" \
      >/dev/null 2>&1); then
      return 0
    fi
    sleep 3
  done
  return 1
}

git fetch --quiet origin main || {
  log "fetch from GitHub failed"
  exit 1
}
old=$(git rev-parse HEAD)
new=$(git rev-parse origin/main)
[ "$old" = "$new" ] && exit 0

short="${new:0:7}"
changed=$(git diff --name-only "$old" "$new")
git reset --hard --quiet "$new"

if ! grep -qE '^(server/|Dockerfile|\.dockerignore|deploy/|package(-lock)?\.json)' <<<"$changed"; then
  log "$short: no backend changes, checkout updated"
  exit 0
fi

log "$short: deploying (was ${old:0:7})"
if build && healthy; then
  log "$short: live"
  exit 0
fi

log "$short: FAILED, rolling back to ${old:0:7} (details in ~/build.log)"
git reset --hard --quiet "$old"
if build && healthy; then
  log "${old:0:7}: restored"
else
  log "${old:0:7}: rollback did not come up healthy either, check ~/build.log"
fi
exit 1
