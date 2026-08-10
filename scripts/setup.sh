#!/bin/bash
# FlowKit VPS Setup Script — Ubuntu 22.04
# Run as root: bash setup.sh

set -e

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  FlowKit — VPS Setup"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# ── System update
apt update && apt upgrade -y
apt install -y curl git unzip ufw nginx certbot python3-certbot-nginx

# ── Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
echo "Node $(node -v) installed"

# ── PM2
npm install -g pm2
pm2 startup systemd -u www-data --hp /var/www
echo "PM2 installed"

# ── PostgreSQL
apt install -y postgresql postgresql-contrib
systemctl enable postgresql
systemctl start postgresql
echo "PostgreSQL installed"

# ── Create database + user
DB_PASS=$(openssl rand -base64 24 | tr -dc 'a-zA-Z0-9' | head -c 32)
sudo -u postgres psql <<SQL
CREATE USER flowkit WITH PASSWORD '${DB_PASS}';
CREATE DATABASE flowkitdb OWNER flowkit;
GRANT ALL PRIVILEGES ON DATABASE flowkitdb TO flowkit;
SQL
echo "Database created. Password: ${DB_PASS}"
echo "DATABASE_URL=postgresql://flowkit:${DB_PASS}@localhost:5432/flowkitdb" >> /root/flowkit.env

# ── Project directory
mkdir -p /var/www/flowkit
chown www-data:www-data /var/www/flowkit
echo "Project dir: /var/www/flowkit"

# ── Firewall
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable
echo "Firewall configured"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Setup complete!"
echo "  DB credentials saved to /root/flowkit.env"
echo "  Next: run deploy.sh"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
