# OpsVale European Wholesale Packaging — VPS Deployment Guide

This runbook provides step-by-step instructions for deploying the **OpsVale B2B Platform** to a production Linux VPS (Ubuntu 22.04 / 24.04 LTS on Hetzner, DigitalOcean, Linode, AWS EC2, or Scaleway).

---

## 📋 Architecture Overview

The production stack is orchestrated via `docker-compose.prod.yml`:
1. **`opsvale-caddy`**: Automated Let's Encrypt TLS reverse proxy. **Opt-in** — it lives behind the
   `proxy` compose profile, so start it with `--profile proxy`. Omit it if TLS is terminated by a
   host-level proxy (Nginx/Cloudflare) forwarding to `127.0.0.1:3010`.
2. **`opsvale-app`**: Multi-stage standalone Next.js 15 Node.js Alpine container (binds `127.0.0.1:3010`).
3. **`opsvale-postgres`**: PostgreSQL 16 Alpine database with health checks and persistent volume storage.

> **Note:** the canonical deploy path pulls a prebuilt image from GHCR via `bash deploy.sh` (which
> also backs up the DB and runs `prisma migrate deploy`). The VPS never builds the image — see
> `AGENTS.md` / `DEPLOYMENT.md`. The manual `docker compose` commands below are for first-time bootstrap.

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
# Start app + postgres (+ Caddy TLS proxy via the opt-in profile). Drop `--profile proxy`
# if you terminate TLS with a host-level proxy instead.
docker compose -f docker-compose.prod.yml --profile proxy up -d

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

### Application maintenance crons

Schedule the two bearer-secured maintenance endpoints. Both **fail closed** — they return 401 in
production unless `CRON_SECRET` is set in `.env.production` and passed as the bearer token.

```bash
# Daily: orphaned upload cleanup + GDPR analytics retention purge
(crontab -l 2>/dev/null; cat <<'CRON'
15 3 * * * curl -fsS -X POST -H "Authorization: Bearer <YOUR_CRON_SECRET>" http://127.0.0.1:3010/api/cron/cleanup-uploads
30 3 * * * curl -fsS -X POST -H "Authorization: Bearer <YOUR_CRON_SECRET>" http://127.0.0.1:3010/api/cron/prune-analytics
CRON
) | crontab -
```

---

### 6. Updates (pull the prebuilt image — never build on the VPS)

Code updates are built by **GitHub Actions** on merge to `main` and pushed to GHCR; the VPS only
pulls. **Do not** run `docker compose build` on the server — it contradicts the canonical pipeline in
`AGENTS.md` and the Architecture note above. To roll a new build out:

```bash
cd /opt/opsvale
# Pulls the latest GHCR image, backs up the DB, runs `prisma migrate deploy`, health-checks:
bash deploy.sh

# Pin/roll back to a specific build instead of :latest:
IMAGE_TAG=<git-sha> bash deploy.sh
```

`deploy.sh` restarts only the `app` service against the new image; `postgres` (and the opt-in `caddy`
proxy) keep running. See `DEPLOYMENT.md` §4 for the full flow.
