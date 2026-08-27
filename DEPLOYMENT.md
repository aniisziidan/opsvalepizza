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

## 4. Production Build & Execution

### Standalone Node.js Build
```bash
# 1. Install dependencies
npm ci

# 2. Compile standalone production build
npm run build

# 3. Start production server
NODE_ENV=production node .next/standalone/server.js
```

### Docker Deployment
```dockerfile
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json prisma ./
RUN npm ci
COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000
CMD ["node", "server.js"]
```

---

## 5. Automated Scheduled Cron Maintenance

Configure a daily cron job (via cron daemon, AWS EventBridge, or Cloudflare Workers) to trigger the upload cleanup endpoint:

```bash
# Trigger daily orphaned upload cleanup (older than 24h)
curl -X POST https://opsvale.com/api/cron/cleanup-uploads \
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
