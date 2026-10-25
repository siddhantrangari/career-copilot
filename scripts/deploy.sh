#!/usr/bin/env bash
# ============================================================
# deploy.sh — push Career Copilot OS to career.myagentfirm.com
#
# Run from the project root on your Mac:
#   bash scripts/deploy.sh
#
# There is no GitHub repo for this project yet, so it rsyncs the
# working tree. The old career-copilot deployment is left on disk
# and only stopped, so rollback is one pm2 command.
# ============================================================

set -euo pipefail

SSH_HOST="${SSH_HOST:-vps}"
APP_DIR="/var/www/career-copilot-os"
OLD_APP="career-copilot-api"
NEW_APP="career-copilot-os"

G='\033[0;32m'; B='\033[0;34m'; Y='\033[1;33m'; R='\033[0;31m'; N='\033[0m'
log()  { echo -e "${G}[deploy]${N} $1"; }
step() { echo -e "${B}[step]${N}   $1"; }
warn() { echo -e "${Y}[warn]${N}   $1"; }
die()  { echo -e "${R}[error]${N}  $1"; exit 1; }

[[ -f .env.production ]] || die ".env.production not found. Copy .env.production.example and fill it in."

START=$(date +%s)
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  🚀 career.myagentfirm.com — Career Copilot OS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# ── 1. Build the static pages from the artifacts ──────────────────────────
step "1/7 — Building web assets from /artifacts"
node scripts/build-web.js
log "✅ server/public rebuilt"

# ── 2. Sync the tree ──────────────────────────────────────────────────────
step "2/7 — Syncing to $SSH_HOST:$APP_DIR"
ssh "$SSH_HOST" "mkdir -p $APP_DIR"
rsync -az --delete \
  --exclude node_modules \
  --exclude .git \
  --exclude '.env' \
  --exclude '.DS_Store' \
  --exclude backups \
  ./ "$SSH_HOST:$APP_DIR/"
log "✅ Files synced"

# ── 3. Production env ─────────────────────────────────────────────────────
step "3/7 — Installing .env.production"
scp -q .env.production "$SSH_HOST:$APP_DIR/.env.production"
ssh "$SSH_HOST" "chmod 600 $APP_DIR/.env.production"
log "✅ .env.production installed (0600)"

# ── 4. Dependencies + schema ──────────────────────────────────────────────
step "4/7 — Installing dependencies and applying schema"
ssh "$SSH_HOST" "cd $APP_DIR && npm install --omit=dev --silent && node server/src/db/seed.js"
log "✅ Dependencies installed, schema applied, catalogue seeded"

# ── 5. Start the new app ──────────────────────────────────────────────────
step "5/7 — Starting $NEW_APP on port 4011"
ssh "$SSH_HOST" "cd $APP_DIR && (pm2 describe $NEW_APP >/dev/null 2>&1 \
  && pm2 restart $NEW_APP --update-env \
  || pm2 start ecosystem.config.cjs) && pm2 save"

for i in $(seq 1 20); do
  if ssh "$SSH_HOST" "curl -sf http://127.0.0.1:4011/api/health >/dev/null"; then
    log "✅ Backend healthy"
    break
  fi
  sleep 2
  [[ $i -eq 20 ]] && warn "Backend did not answer in 40s — check: pm2 logs $NEW_APP"
done

# ── 6. Point nginx at the new app ─────────────────────────────────────────
step "6/7 — Switching nginx to the new app"
ssh "$SSH_HOST" "cp $APP_DIR/nginx/career.myagentfirm.conf /etc/nginx/sites-available/career-copilot \
  && ln -sf /etc/nginx/sites-available/career-copilot /etc/nginx/sites-enabled/career-copilot \
  && nginx -t && systemctl reload nginx"
log "✅ nginx reloaded — career.myagentfirm.com now serves $NEW_APP"

# ── 7. Stop the superseded app ────────────────────────────────────────────
step "7/7 — Stopping the previous deployment"
ssh "$SSH_HOST" "pm2 describe $OLD_APP >/dev/null 2>&1 && pm2 stop $OLD_APP && pm2 save || echo '  (no previous app running)'"
log "✅ $OLD_APP stopped (still on disk — 'pm2 start $OLD_APP' to roll back)"

HEALTH=$(ssh "$SSH_HOST" "curl -s http://127.0.0.1:4011/api/health" || echo FAIL)
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  ✅ Deployed in $(( $(date +%s) - START ))s"
echo "  URL:    https://career.myagentfirm.com"
echo "  Health: $HEALTH"
echo "  Logs:   ssh $SSH_HOST 'pm2 logs $NEW_APP'"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
