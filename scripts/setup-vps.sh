#!/usr/bin/env bash
# ============================================================
# setup-vps.sh — One-time VPS setup for career.myagentfirm.com
#
# Run ONCE when first setting up on the VPS:
#   ssh vps
#   git clone https://github.com/siddhantrangari/career-copilot.git /var/www/career-copilot
#   cd /var/www/career-copilot
#   sudo bash scripts/setup-vps.sh
# ============================================================

set -euo pipefail

APP_DIR="/var/www/career-copilot"
STATIC_DIR="/var/www/career-copilot-frontend"
NGINX_AVAILABLE="/etc/nginx/sites-available/career-copilot"
NGINX_ENABLED="/etc/nginx/sites-enabled/career-copilot"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log()  { echo -e "${GREEN}[setup]${NC} $1"; }
warn() { echo -e "${YELLOW}[warn]${NC}  $1"; }
die()  { echo -e "${RED}[error]${NC} $1"; exit 1; }

[[ $EUID -eq 0 ]] || die "Run as root: sudo bash scripts/setup-vps.sh"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  ⚙️  Career Copilot — VPS Initial Setup"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# ── Directory creation ────────────────────────────────────────────────────────
log "Creating directories..."
mkdir -p "$STATIC_DIR"
mkdir -p "$APP_DIR/data"
mkdir -p /var/log
log "  ✅ Static root: $STATIC_DIR"
log "  ✅ Data directory: $APP_DIR/data"

# ── Production .env ───────────────────────────────────────────────────────────
ENV_FILE="$APP_DIR/.env.production"
if [[ ! -f "$ENV_FILE" ]]; then
  log "Creating .env.production from example..."
  cp "$APP_DIR/.env.production.example" "$ENV_FILE"
  chmod 600 "$ENV_FILE"
  warn "⚠️  Created $ENV_FILE. Please verify API keys before deploying."
else
  log "  ✅ $ENV_FILE exists"
fi

# ── PM2 Check ────────────────────────────────────────────────────────────────
if command -v pm2 &>/dev/null; then
  log "  ✅ pm2 is installed"
else
  log "Installing pm2 globally..."
  npm install -g pm2
fi

# ── Install Nginx site configuration ─────────────────────────────────────────
log "Installing nginx configuration..."
cp "$APP_DIR/nginx/career.myagentfirm.conf" "$NGINX_AVAILABLE"

if [[ ! -L "$NGINX_ENABLED" ]]; then
  ln -sf "$NGINX_AVAILABLE" "$NGINX_ENABLED"
  log "  ✅ Nginx site enabled"
else
  log "  ✅ Nginx site already enabled"
fi

# ── Test Nginx config ────────────────────────────────────────────────────────
if nginx -t; then
  systemctl reload nginx
  log "  ✅ Nginx reloaded successfully"
else
  warn "  ⚠️  Nginx config test failed — check SSL certificate or syntax"
fi

# ── Start Isolated Database ──────────────────────────────────────────────────
log "Starting PostgreSQL container on port 5438..."
cd "$APP_DIR"
docker compose -f docker-compose.prod.yml up -d

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  ✅ Setup complete! Run deployment next:"
echo "       sudo bash scripts/deploy.sh"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
