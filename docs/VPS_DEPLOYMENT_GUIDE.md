# OpsVale European Wholesale Packaging — VPS Deployment Guide

This runbook provides step-by-step instructions for deploying the **OpsVale B2B Platform** to a production Linux VPS (Ubuntu 22.04 / 24.04 LTS on Hetzner, DigitalOcean, Linode, AWS EC2, or Scaleway).

---

## 📋 Architecture Overview

The production stack consists of 3 isolated Docker containers orchestrated via `docker-compose.prod.yml`:
1. **`opsvale-caddy`**: Automated Let's Encrypt TLS reverse proxy with HTTP/2, HTTP/3, and Brotli compression.
2. **`opsvale-app`**: Multi-stage standalone Next.js 15 Node.js Alpine container.
3. **`opsvale-postgres`**: PostgreSQL 16 Alpine database with health checks and persistent volume storage.

---

## 🛠️ Prerequisites

- A Linux VPS with at least **2 vCPU** and **4GB RAM**.
- A domain or subdomain with DNS `A` / `AAAA` records pointing to your VPS public IPv4/IPv6 (e.g., `opsvale.eu`).
- SSH key access to the server.

---

## 🚀 Step-by-Step Installation

### 1. Server Hardening & Docker Installation

SSH into your server and run:

```bash
# Update base system packages
sudo apt update && sudo apt upgrade -y

# Configure UFW Firewall (SSH, HTTP, HTTPS)
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable

# Install Docker & Docker Compose Plugin
sudo apt install -y ca-certificates curl gnupg lsb-release
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Enable Docker on boot
sudo systemctl enable docker
sudo systemctl start docker
```

---

### 2. Clone Repository & Setup Environment

```bash
# Create application directory
sudo mkdir -p /opt/opsvale
sudo chown -R $USER:$USER /opt/opsvale
cd /opt/opsvale

# Clone repository
git clone https://github.com/your-org/opsvale-pizzabox.git .

# Create production environment configuration
cp .env.example .env.production
nano .env.production
```

#### Production `.env.production` Checklist:

```ini
# Domain & App
DOMAIN=opsvale.eu
NEXTAUTH_URL=https://opsvale.eu
AUTH_SECRET=generate_strong_64_character_hex_string_here
APP_ENV=production
NODE_ENV=production

# Database Credentials
POSTGRES_USER=opsvale_prod
POSTGRES_PASSWORD=generate_strong_db_password_here
POSTGRES_DB=opsvale_db

# Statutory Entity Details (European TMG & GDPR Compliance)
COMPANY_LEGAL_NAME="OpsVale European Distribution B.V."
COMPANY_TRADING_NAME="OpsVale Wholesale Packaging"
COMPANY_REGISTERED_ADDRESS="Industrieweg 44, 3044 GS Rotterdam, Netherlands"
COMPANY_REGISTRATION_NUMBER="KvK 88392019 (Rotterdam)"
COMPANY_VAT_ID="NL883920190B01"
COMPANY_MANAGING_DIRECTOR="Managing Board OpsVale B.V."
LEGAL_CONTACT_EMAIL="legal@opsvale.eu"
LEGAL_PHONE="+31 10 400 9200"

# Evidence Claims
EVIDENCE_FSC_CERTIFIED="false"
EVIDENCE_FOOD_GRADE_1935_2004="true"
EVIDENCE_EU_STORAGE_ONLY="true"
```

---

### 3. Deploy Containers & Run Initial Database Migration

```bash
# Build and start all 3 containers in background
docker compose -f docker-compose.prod.yml up -d --build

# Run database migrations inside the app container
docker compose -f docker-compose.prod.yml exec app npx prisma migrate deploy

# Seed baseline pricing tiers and initial admin account
docker compose -f docker-compose.prod.yml exec app npx prisma db seed
```

---

### 4. Verify Deployment Health

Check container status and logs:

```bash
# Verify container statuses
docker compose -f docker-compose.prod.yml ps

# Check Caddy SSL provisioning logs
docker compose -f docker-compose.prod.yml logs -f caddy

# Query application health probe
curl -I https://opsvale.eu/api/health
```

Expected output for `/api/health`:
```json
{
  "status": "healthy",
  "timestamp": "2026-08-27T...",
  "version": "1.0.0",
  "checks": {
    "database": { "status": "up", "latencyMs": 3 },
    "storage": { "status": "up", "type": "local" }
  },
  "system": {
    "uptimeSeconds": 120,
    "memoryRssMb": 92
  }
}
```

---

### 5. Automated Daily PostgreSQL Backups (Cron Job)

Create a daily backup script `/opt/opsvale/scripts/backup.sh`:

```bash
#!/bin/bash
BACKUP_DIR="/opt/opsvale/backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
mkdir -p $BACKUP_DIR

docker exec opsvale-postgres pg_dump -U opsvale_prod opsvale_db | gzip > "$BACKUP_DIR/db_$TIMESTAMP.sql.gz"

# Retain backups for 14 days
find $BACKUP_DIR -type f -name "*.sql.gz" -mtime +14 -delete
```

Make executable and add to crontab:

```bash
chmod +x /opt/opsvale/scripts/backup.sh
(crontab -l 2>/dev/null; echo "0 3 * * * /opt/opsvale/scripts/backup.sh") | crontab -
```

---

### 6. Zero-Downtime Updates

To deploy new code updates:

```bash
cd /opt/opsvale
git pull origin main
docker compose -f docker-compose.prod.yml build app
docker compose -f docker-compose.prod.yml up -d --no-deps app
docker compose -f docker-compose.prod.yml exec app npx prisma migrate deploy
```
