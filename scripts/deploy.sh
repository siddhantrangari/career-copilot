#!/usr/bin/env bash
# ============================================================
# deploy.sh — Production deploy script for career.myagentfirm.com
#
# Run on the VPS:
#   cd /var/www/career-copilot
#   sudo bash scripts/deploy.sh
# ============================================================

set -euo pipefail

APP_DIR="/var/www/career-copilot"
STATIC_DIR="/var/www/career-copilot-frontend"
ENV_FILE="$APP_DIR/.env.production"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

log()    { echo -e "${GREEN}[deploy]${NC} $1"; }
step()   { echo -e "${BLUE}[step]${NC}   $1"; }
warn()   { echo -e "${YELLOW}[warn]${NC}  $1"; }
die()    { echo -e "${RED}[error]${NC} $1"; exit 1; }

DEPLOY_START=$(date +%s)

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  🚀 career.myagentfirm.com — Deploy"
echo "  $(date '+%Y-%m-%d %H:%M:%S %Z')"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

[[ $EUID -eq 0 ]] || die "Run as root: sudo bash scripts/deploy.sh"
[[ -d "$APP_DIR/.git" ]] || die "Not a git repo: $APP_DIR. Run setup-vps.sh first."
[[ -f "$ENV_FILE" ]] || die ".env.production not found at $ENV_FILE"

cd "$APP_DIR"

# ── Step 1: Git Pull ─────────────────────────────────────────────────────────
step "1/6 — git pull"
git pull origin main
COMMIT=$(git rev-parse --short HEAD)
log "✅ At commit: $COMMIT"

# ── Step 2: Build Frontend ───────────────────────────────────────────────────
step "2/6 — Build frontend"
cd "$APP_DIR/client"
npm install
npm run build
log "✅ Frontend built successfully"

mkdir -p "$STATIC_DIR"
rsync -a --delete "$APP_DIR/client/dist/" "$STATIC_DIR/"
log "✅ Frontend dist deployed to $STATIC_DIR"

cd "$APP_DIR"

# ── Step 3: Install Server Dependencies ──────────────────────────────────────
step "3/6 — Install server dependencies"
cd "$APP_DIR/server"
npm install --omit=dev
cd "$APP_DIR"
log "✅ Server dependencies installed"

# ── Step 4: Database Health & Startup ────────────────────────────────────────
step "4/6 — Checking PostgreSQL container"
docker compose -f docker-compose.prod.yml up -d
log "✅ PostgreSQL running on port 5438"

# ── Step 5: Start / Restart Backend via PM2 ──────────────────────────────────
step "5/6 — Restarting backend API"
if pm2 describe career-copilot-api &>/dev/null; then
  pm2 restart career-copilot-api --update-env
  log "✅ Restarted career-copilot-api via pm2"
else
  pm2 start ecosystem.config.cjs
  pm2 save
  log "✅ Started career-copilot-api via pm2"
fi

# Wait for backend to be ready
log "Waiting for backend API to respond on port 4005..."
for i in $(seq 1 20); do
  if curl -sf http://127.0.0.1:4005/api/health &>/dev/null; then
    log "✅ Backend ready (${i}s)"
    break
  fi
  sleep 2
  if [[ $i -eq 20 ]]; then
    warn "Backend API did not respond in 40s. Checking logs..."
    pm2 logs career-copilot-api --lines 20 --nostream || true
    break
  fi
done

# ── Step 6: Reload Nginx ─────────────────────────────────────────────────────
step "6/6 — Reloading Nginx"
if nginx -t 2>/dev/null; then
  systemctl reload nginx
  log "✅ Nginx reloaded"
else
  warn "⚠️  Nginx config test failed — skipping reload. Run: sudo nginx -t"
fi

# ── Health Check ─────────────────────────────────────────────────────────────
HEALTH=$(curl -sf http://127.0.0.1:4005/api/health 2>/dev/null || echo "FAIL")
if echo "$HEALTH" | grep -q '"status":"ok"'; then
  log "✅ Backend health check passed: $HEALTH"
else
  warn "⚠️  Health check returned: $HEALTH"
fi

DEPLOY_END=$(date +%s)
ELAPSED=$((DEPLOY_END - DEPLOY_START))

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  ✅ Deploy complete in ${ELAPSED}s"
echo "  Commit:  $COMMIT"
echo "  URL:     https://career.myagentfirm.com"
echo "  Logs:    pm2 logs career-copilot-api"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
