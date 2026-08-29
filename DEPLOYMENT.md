# OpsVale Wholesale Packaging Platform — Production Deployment Guide

This guide outlines the production deployment, configuration, database migrations, and operational maintenance for the **OpsVale European Wholesale Pizza Box Platform**.

---

## 1. System Requirements & Architecture

- **Node.js**: 20.x or 22.x LTS (Node.js runtime required for PDF generation & AWS SDK)
- **Database**: PostgreSQL 15+ (with connection pooling)
- **Object Storage**: AWS S3, Cloudflare R2, or MinIO (or persistent volume for local disk)
- **Email Gateway**: SMTP provider (Amazon SES, SendGrid, Mailgun, Postmark)
- **Reverse Proxy**: Nginx, Caddy, Cloudflare, or AWS ALB with HTTPS termination

---

## 2. Environment Configuration

1. Copy `.env.example` to `.env.production`:
   ```bash
   cp .env.example .env.production
   ```

2. Configure core variables:
   - `DATABASE_URL`: Set to production PostgreSQL instance.
   - `AUTH_SECRET`: Generate using `openssl rand -base64 32`.
   - `APP_URL`: Set to canonical HTTPS domain (e.g. `https://opsvale.com`).
   - `APP_ENV`: Set to `production` (enables production indexing rules in `robots.txt`).

3. Configure S3/R2 storage (Recommended for Production):
   - `STORAGE_PROVIDER="s3"`
   - `S3_BUCKET="<your-private-bucket>"`
   - `S3_REGION="eu-central-1"` (or custom endpoint for Cloudflare R2 / MinIO)
   - `S3_ACCESS_KEY_ID="<key-id>"`
   - `S3_SECRET_ACCESS_KEY="<secret-key>"`

4. Configure SMTP:
   - `SMTP_HOST`, `SMTP_PORT="465"`, `SMTP_USER`, `SMTP_PASS`, `SMTP_SECURE="true"`
   - `ADMIN_NOTIFY_EMAIL="procurement@opsvale.com"`

5. Configure Cron Secret:
   - `CRON_SECRET`: Generate a secure token to authenticate scheduled jobs.

---

## 3. Database Initialization & Migrations

Execute the consolidated Prisma migrations in your target database:

```bash
# 1. Run migrations
npx prisma migrate deploy

# 2. Seed initial reference data (European countries, corridors, and super admin)
npx prisma db seed
```

> **Default Super Admin**: Seed initializes `admin@opsvale.com` with default credentials. Immediately log in and reset the password in `/admin/settings`.

---

## 4. Build & Deploy (Continuous Deployment via GHCR)

**The image is built by GitHub Actions, not on the VPS.** See `AGENTS.md` for the full agreement.

**Flow:** branch → PR → **merge to `main`** → `.github/workflows/deploy.yml` builds the multi-stage
`Dockerfile` (Node 20 Alpine, standalone output, non-root) and pushes it to the **private GHCR package**
`ghcr.io/aniisziidan/opsvalepizza` tagged `:latest` and `:<git-sha>`.

**On the VPS** (`/opt/opsvale`):

```bash
# One-time: authenticate to the private registry (token needs read:packages)
docker login ghcr.io -u aniisziidan

# Every deploy — pulls the prebuilt image, backs up the DB, runs migrations, health-checks:
bash deploy.sh

# Roll back to a specific build:
IMAGE_TAG=<git-sha> bash deploy.sh
```

`deploy.sh` does NOT build on the server. It: pulls the GHCR image → `pg_dump` backup to `backups/`
(last 10 kept) → `prisma migrate deploy` (with a one-time auto-baseline for the original db-push
database) → `/api/health` probe. The compose file `docker-compose.prod.yml` references the GHCR image
via `image:` (override with `IMAGE_TAG`).

### Database backup & restore

Every `deploy.sh` run takes a safety-net dump **before** migrations, into `backups/db-<timestamp>.sql.gz`
(gzipped plain-SQL `pg_dump`; the 10 most recent are retained). To take an ad-hoc backup outside a deploy:

```bash
docker compose -f docker-compose.prod.yml exec -T postgres \
  pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" | gzip > "backups/db-manual-$(date +%Y%m%d-%H%M%S).sql.gz"
```

**Restore runbook** (recover from a bad migration or data loss). This overwrites current data — confirm
the target and take a fresh manual dump first if the DB is still reachable.

```bash
# 1. Stop the app so nothing writes during the restore (leave postgres running).
docker compose -f docker-compose.prod.yml stop app

# 2. Pick the backup to restore (newest shown first).
ls -1t backups/db-*.sql.gz

# 3. Drop & recreate the schema, then load the dump. The plain-SQL dumps do NOT
#    include DROP statements, so reset the public schema first to avoid conflicts.
docker compose -f docker-compose.prod.yml exec -T postgres \
  psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
  -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"

gunzip -c backups/db-<timestamp>.sql.gz | \
  docker compose -f docker-compose.prod.yml exec -T postgres \
  psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"

# 4. Bring the app back up. The restored dump already carries the Prisma
#    migration history, so `migrate deploy` on the next deploy is a no-op.
docker compose -f docker-compose.prod.yml up -d app

# 5. Verify.
curl -fsS http://127.0.0.1:3010/api/health
```

`$POSTGRES_USER` / `$POSTGRES_DB` come from `.env.production`; if unset in your shell, substitute the
values from that file (defaults: `opsvale_prod` / `opsvale_db`).

### TLS / reverse proxy

The app listens on `127.0.0.1:3010` and expects TLS to be terminated in front of it. Two options:

- **Host-level proxy (default):** run Nginx/Caddy/Cloudflare on the host, terminate HTTPS, and proxy
  to `127.0.0.1:3010`. Set `TRUST_PROXY=true` so forwarded client IPs are honored.
- **Bundled Caddy (opt-in):** the compose file ships an `opsvale-caddy` service (automatic HTTPS via
  Let's Encrypt) behind the `proxy` profile. Set `DOMAIN` in `.env.production`, point DNS at the VPS,
  then start it explicitly:

  ```bash
  docker compose -f docker-compose.prod.yml --profile proxy up -d
  ```

  It is not started by `deploy.sh`, so it never conflicts with an existing host proxy on :80/:443.

---

## 5. Automated Scheduled Cron Maintenance

Configure daily cron jobs (via cron daemon, AWS EventBridge, or Cloudflare Workers) to trigger the maintenance endpoints. Both require the bearer token and **fail closed in production** — if `CRON_SECRET` is unset, the endpoints return 401 rather than running unauthenticated.

```bash
# Trigger daily orphaned upload cleanup (older than 24h)
curl -X POST https://opsvale.com/api/cron/cleanup-uploads \
  -H "Authorization: Bearer <YOUR_CRON_SECRET>"

# Trigger analytics data-retention purge (GDPR). Deletes events/sessions older than
# ANALYTICS_RETENTION_DAYS (default 365) / SESSION_RETENTION_DAYS (default 180).
curl -X POST https://opsvale.com/api/cron/prune-analytics \
  -H "Authorization: Bearer <YOUR_CRON_SECRET>"

# Trigger website-health / conversion anomaly detection. Recomputes the analytics
# health alerts over a rolling 7-day window and pushes actionable ones (traffic
# surge/decline, high exit drop-off) to the notification center. Deduped by
# incidentKey, so an hourly schedule is safe. Recommended: hourly.
curl -X POST https://opsvale.com/api/cron/detect-anomalies \
  -H "Authorization: Bearer <YOUR_CRON_SECRET>"
```

---

## 6. Pre-Launch Verification Checklist

1. **Security Headers**:
   - `curl -I https://opsvale.com`
   - Verify `Content-Security-Policy`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`.
   - Verify `Strict-Transport-Security` is active over HTTPS.
2. **Indexing Rules**:
   - Verify `https://opsvale.com/robots.txt` disallows `/admin/`, `/proposals/`, and `/api/`.
3. **Database Health**:
   - Open `/admin/settings` -> Infrastructure Diagnostics tab -> verify PostgreSQL connection status & latency.
4. **Storage Verification**:
   - Submit a test quote request with file attachment -> verify file download works via `/api/admin/files/<id>`.
5. **Proposal PDF Generation**:
   - Open any dispatched proposal -> click "Download Official PDF" -> verify vector PDF streams correctly.
