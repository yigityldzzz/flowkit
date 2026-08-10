#!/bin/bash
# FlowKit Deployment Script
# Run from project root: bash scripts/deploy.sh

set -e

APP_DIR="/var/www/flowkit"
DOMAIN="flowkit.digitaladexpert.de"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  FlowKit — Deploy"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check .env files exist
if [ ! -f "apps/api/.env" ]; then
  echo "ERROR: apps/api/.env missing. Copy .env.example and fill in values."
  exit 1
fi
if [ ! -f "apps/web/.env.local" ]; then
  echo "ERROR: apps/web/.env.local missing."
  exit 1
fi

# Install deps
echo "Installing dependencies..."
cd apps/api && npm install --production=false
cd ../web && npm install
cd ../..

# Build API
echo "Building API..."
cd apps/api
npm run db:generate
npm run build
cd ../..

# Build Web
echo "Building Web..."
cd apps/web
npm run build
cd ../..

# Copy to server directory
echo "Copying files..."
rsync -av --delete apps/api/dist/ $APP_DIR/api/dist/
rsync -av --delete apps/api/node_modules/ $APP_DIR/api/node_modules/
rsync -av --delete apps/api/prisma/ $APP_DIR/api/prisma/
cp apps/api/.env $APP_DIR/api/.env

rsync -av --delete apps/web/.next/ $APP_DIR/web/.next/
rsync -av --delete apps/web/public/ $APP_DIR/web/public/ 2>/dev/null || true
cp apps/web/.env.local $APP_DIR/web/.env.local
cp apps/web/package.json $APP_DIR/web/package.json
cp apps/web/next.config.js $APP_DIR/web/next.config.js

# Run migrations
echo "Running DB migrations..."
cd $APP_DIR/api && npx prisma migrate deploy
cd -

# Nginx config
echo "Configuring Nginx..."
cp nginx/flowkit.conf /etc/nginx/sites-available/flowkit
ln -sf /etc/nginx/sites-available/flowkit /etc/nginx/sites-enabled/flowkit
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

# SSL
echo "Setting up SSL..."
certbot --nginx -d $DOMAIN --non-interactive --agree-tos -m info@digitaladexpert.de

# PM2
echo "Starting services with PM2..."
pm2 delete flowkit-api 2>/dev/null || true
pm2 delete flowkit-web 2>/dev/null || true

pm2 start $APP_DIR/api/dist/index.js --name flowkit-api \
  --env production \
  --max-memory-restart 300M

pm2 start "node $APP_DIR/web/.next/standalone/server.js" --name flowkit-web \
  --env production \
  --max-memory-restart 500M

pm2 save
pm2 list

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Deployed! → https://${DOMAIN}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
