#!/usr/bin/env bash
# ───────────────────────────────────────────────────────────────────────────
# Haleelo Tower — pull latest code and redeploy both apps.
# Run on the server:  bash /var/www/haleelo/deploy/scripts/deploy.sh
# Assumes the repo lives at /var/www/haleelo and .env files are already in place.
# ───────────────────────────────────────────────────────────────────────────
set -euo pipefail

ROOT=/var/www/haleelo
API=$ROOT/api
ADMIN=$ROOT/admin

echo "▶ Pulling latest code…"
cd "$ROOT"
git pull --ff-only

# ── API ────────────────────────────────────────────────────────────────────
echo "▶ Deploying API…"
cd "$API"
composer install --no-dev --optimize-autoloader
php artisan migrate --force
php artisan storage:link || true        # idempotent
php artisan config:cache
php artisan route:cache
php artisan view:cache

# ── Admin ──────────────────────────────────────────────────────────────────
echo "▶ Building admin panel…"
cd "$ADMIN"
npm ci
npm run build
pm2 reload haleelo-admin

echo "✓ Deploy complete."
