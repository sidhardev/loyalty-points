#!/bin/bash
# One-time setup of pull-based deploys on the server. Run as ec2-user from ~/habiturn:
#   bash deploy/install-auto-deploy.sh
# First run: makes a read-only deploy key and prints it — add it on GitHub (repo → Settings → Deploy keys,
# leave "Allow write access" off), then run this again. Second run: turns this folder into a checkout of
# main and starts the 2-minute timer. deploy/.env and deploy/data are git-ignored and never touched.
set -euo pipefail

REPO="git@github.com:sidhardev/loyalty-points.git"
KEY="$HOME/.ssh/habiturn_deploy"
cd "$(dirname "$0")/.."

mkdir -p "$HOME/.ssh" && chmod 700 "$HOME/.ssh"
[ -f "$KEY" ] || ssh-keygen -q -t ed25519 -N '' -C "habiturn-server (read-only deploy)" -f "$KEY"
grep -q '^github.com ' "$HOME/.ssh/known_hosts" 2>/dev/null || ssh-keyscan -t ed25519 github.com >>"$HOME/.ssh/known_hosts" 2>/dev/null

[ -d .git ] || git init -q -b main
git remote get-url origin >/dev/null 2>&1 || git remote add origin "$REPO"
git config core.sshCommand "ssh -i $KEY -o IdentitiesOnly=yes"

if ! git fetch -q origin main 2>/dev/null; then
  echo
  echo "GitHub doesn't accept this server's key yet. Add it as a read-only deploy key:"
  echo "  https://github.com/sidhardev/loyalty-points/settings/keys/new"
  echo "  Title: habiturn-server   ·   Allow write access: OFF"
  echo
  cat "$KEY.pub"
  echo
  echo "Then run this script again."
  exit 2
fi

# First time: start from the commit that's running now, so the timer's first run deploys what came after it.
if ! git rev-parse -q --verify HEAD >/dev/null; then
  start=$(cat DEPLOYED_COMMIT 2>/dev/null || true)
  git rev-parse -q --verify "${start:-x}^{commit}" >/dev/null || start=origin/main
  git reset -q --hard "$start"
  rm -f DEPLOYED_COMMIT
  echo "Checkout set to $(git rev-parse --short HEAD)"
fi

chmod +x deploy/auto-deploy.sh
sudo cp deploy/habiturn-deploy.service deploy/habiturn-deploy.timer /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now habiturn-deploy.timer
echo "Auto-deploy is on: the server checks main every 2 minutes. Log: ~/deploy.log"
