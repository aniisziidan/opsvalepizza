#!/usr/bin/env bash
# ==============================================================================
# OpsVale Platform — Automated PostgreSQL Offsite Cloud Backup Script
# ==============================================================================
# Dumps the production PostgreSQL database, compresses with gzip, and uploads
# to S3 / Cloudflare R2 / MinIO storage if configured.
#
# Usage:
#   bash scripts/backup-offsite.sh
# ==============================================================================

set -eo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$SCRIPT_DIR"

BACKUP_DIR="${SCRIPT_DIR}/backups"
mkdir -p "$BACKUP_DIR"

STAMP="$(date '+%Y%m%d-%H%M%S')"
BACKUP_FILE="${BACKUP_DIR}/db-${STAMP}.sql.gz"
COMPOSE_FILE="docker-compose.prod.yml"

echo "[INFO] $(date '+%Y-%m-%d %H:%M:%S') - Starting automated PostgreSQL backup..."

# 1. Generate local compressed database dump
if command -v docker-compose &>/dev/null || command -v docker &>/dev/null; then
    DOCKER_CMD="docker compose"
    if ! docker compose version &>/dev/null; then
        DOCKER_CMD="docker-compose"
    fi

    PGUSER_VAL="$($DOCKER_CMD -f $COMPOSE_FILE exec -T postgres printenv POSTGRES_USER 2>/dev/null | tr -d '[:space:]')"
    PGDB_VAL="$($DOCKER_CMD -f $COMPOSE_FILE exec -T postgres printenv POSTGRES_DB 2>/dev/null | tr -d '[:space:]')"
    PGUSER_VAL="${PGUSER_VAL:-opsvale}"
    PGDB_VAL="${PGDB_VAL:-opsvale}"

    $DOCKER_CMD -f $COMPOSE_FILE exec -T postgres pg_dump -U "$PGUSER_VAL" "$PGDB_VAL" | gzip > "$BACKUP_FILE"
else
    echo "[WARN] Docker not detected; checking pg_dump binary..."
    if command -v pg_dump &>/dev/null; then
        pg_dump "${DATABASE_URL:-postgres://opsvale:opsvale@127.0.0.1:5432/opsvale}" | gzip > "$BACKUP_FILE"
    else
        echo "[ERROR] Neither Docker nor pg_dump available."
        exit 1
    fi
fi

if [ ! -s "$BACKUP_FILE" ]; then
    echo "[ERROR] Backup file is empty or failed to create."
    rm -f "$BACKUP_FILE"
    exit 1
fi

FILESIZE=$(ls -lh "$BACKUP_FILE" | awk '{print $5}')
echo "[SUCCESS] Local backup generated: $BACKUP_FILE ($FILESIZE)"

# 2. Upload to Cloud Storage (S3 / Cloudflare R2 / MinIO) if AWS CLI or S3_BUCKET is set
if [ -n "${S3_BUCKET:-}" ]; then
    echo "[INFO] Syncing backup to remote cloud storage: s3://${S3_BUCKET}/backups/"
    
    if command -v aws &>/dev/null; then
        AWS_ARGS=()
        if [ -n "${S3_ENDPOINT:-}" ]; then
            AWS_ARGS+=(--endpoint-url "$S3_ENDPOINT")
        fi
        if [ -n "${S3_REGION:-}" ]; then
            AWS_ARGS+=(--region "$S3_REGION")
        fi
        
        aws s3 cp "$BACKUP_FILE" "s3://${S3_BUCKET}/backups/db-${STAMP}.sql.gz" "${AWS_ARGS[@]}"
        echo "[SUCCESS] Offsite backup successfully uploaded to S3/R2."
    else
        echo "[INFO] Invoking Node storage backup sync API..."
        curl -fsS -X POST \
          -H "Authorization: Bearer ${CRON_SECRET:-}" \
          "http://127.0.0.1:3010/api/cron/backup-offsite" || true
    fi
fi

# 3. Local Retention Pruning (keep last 10 local snapshots)
ls -1t "${BACKUP_DIR}"/db-*.sql.gz 2>/dev/null | tail -n +11 | xargs -r rm -f || true
echo "[INFO] Local backup retention pruning completed (kept most recent 10)."
