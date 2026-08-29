#!/usr/bin/env bash
# ==============================================================================
# OpsVale Platform — Production VPS Deployment Script
# ==============================================================================
# This script PULLS a prebuilt image from GHCR (built by GitHub Actions) instead
# of building on the VPS. The server never runs npm/next build → fast deploys.
#
# Usage:
#   bash deploy.sh                 # Pull latest git + latest GHCR image, deploy
#   bash deploy.sh --no-pull       # Skip git pull; still pulls the GHCR image
#   bash deploy.sh --seed          # Also run the database seed
#   IMAGE_TAG=<sha> bash deploy.sh # Deploy/roll back to a specific image tag
#
# One-time GHCR auth (private package): either run `docker login ghcr.io` once,
# or export GHCR_USER + GHCR_TOKEN (a PAT with read:packages) before running.
# ==============================================================================

set -eo pipefail

IMAGE="ghcr.io/aniisziidan/opsvalepizza"
export IMAGE_TAG="${IMAGE_TAG:-latest}"

# Automatically resolve and change to project root directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Text colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

COMPOSE_FILE="docker-compose.prod.yml"
APP_CONTAINER="opsvale-app"
HEALTH_URL="http://127.0.0.1:3010/api/health"

log_info() {
    echo -e "${BLUE}[INFO]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

echo -e "${CYAN}"
echo "========================================================"
echo "         OpsVale Production Deployment Engine           "
echo "========================================================"
echo -e "${NC}"

# 1. Check prerequisites
if ! command -v docker &> /dev/null; then
    log_error "Docker is not installed. Please install Docker first."
    exit 1
fi

# Detect docker compose vs docker-compose
if docker compose version &> /dev/null; then
    DOCKER_COMPOSE="docker compose"
elif command -v docker-compose &> /dev/null; then
    DOCKER_COMPOSE="docker-compose"
else
    log_error "Docker Compose is not installed."
    exit 1
fi

# 2. Pull latest code first (unless --no-pull flag is provided)
if [[ "$*" != *"--no-pull"* ]]; then
    if [ -d ".git" ]; then
        log_info "Fetching latest code from git repository..."
        git fetch origin main || log_warn "Git fetch failed, continuing with local code."
        git pull origin main || log_warn "Git pull failed or local changes exist, continuing with local code."
    fi
else
    log_info "Skipping git pull (--no-pull specified)."
fi

# 3. Check / Auto-initialize environment configuration
if [ ! -f ".env.production" ]; then
    if [ -f ".env" ]; then
        log_warn ".env.production not found, copying existing .env..."
        cp .env .env.production
    elif [ -f ".env.example" ]; then
        log_warn ".env.production not found. Initializing from .env.example with secure random secrets..."
        cp .env.example .env.production
        
        # Generate secure random secrets
        RANDOM_AUTH=$(openssl rand -base64 32 2>/dev/null || head -c 32 /dev/urandom | base64)
        RANDOM_CRON=$(openssl rand -hex 16 2>/dev/null || head -c 16 /dev/urandom | od -A n -t x1 | tr -d ' ')
        RANDOM_DB_PASS=$(openssl rand -hex 12 2>/dev/null || head -c 12 /dev/urandom | od -A n -t x1 | tr -d ' ')
        
        # Update placeholders in .env.production
        sed -i "s|AUTH_SECRET=\".*\"|AUTH_SECRET=\"${RANDOM_AUTH}\"|g" .env.production
        sed -i "s|CRON_SECRET=\".*\"|CRON_SECRET=\"${RANDOM_CRON}\"|g" .env.production
        sed -i "s|APP_ENV=\".*\"|APP_ENV=\"production\"|g" .env.production
        sed -i "s|APP_URL=\".*\"|APP_URL=\"https://opsvale.com\"|g" .env.production
        sed -i "s|TRUST_PROXY=\".*\"|TRUST_PROXY=\"true\"|g" .env.production
        
        # Append production DB credentials if not present
        if ! grep -q "POSTGRES_USER=" .env.production; then
            echo "POSTGRES_USER=opsvale_prod" >> .env.production
            echo "POSTGRES_PASSWORD=${RANDOM_DB_PASS}" >> .env.production
            echo "POSTGRES_DB=opsvale_db" >> .env.production
        fi
        
        log_success "Initialized .env.production with secure production credentials."
    else
        log_error "Neither .env.production, .env, nor .env.example found!"
        exit 1
    fi
fi

# Ensure Resend API Key is configured for live customer email delivery
if ! grep -q "RESEND_API_KEY=" .env.production 2>/dev/null; then
    log_info "Adding Resend configuration placeholders to .env.production..."
    echo 'RESEND_API_KEY=""' >> .env.production
    echo 'EMAIL_FROM="\"OpsVale Customer Service\" <customerservice@opsvale.com>"' >> .env.production
fi

# 4. Authenticate to GHCR (only if creds are provided; otherwise assume an
#    existing `docker login ghcr.io` session persisted in ~/.docker/config.json)
if [ -n "${GHCR_TOKEN:-}" ] && [ -n "${GHCR_USER:-}" ]; then
    log_info "Logging in to GHCR as ${GHCR_USER}..."
    echo "${GHCR_TOKEN}" | docker login ghcr.io -u "${GHCR_USER}" --password-stdin
fi

# 5. Pull the prebuilt image (built & pushed by GitHub Actions)
log_info "Pulling image ${IMAGE}:${IMAGE_TAG} from GHCR..."
if ! $DOCKER_COMPOSE -f $COMPOSE_FILE pull app; then
    log_error "Failed to pull ${IMAGE}:${IMAGE_TAG}. Is the package private and are you logged in?"
    log_error "Run 'docker login ghcr.io' once, or export GHCR_USER + GHCR_TOKEN."
    exit 1
fi

# 6. Start/Restart services (ensure Postgres is up and healthy, swap app container)
log_info "Starting database and dependencies..."
$DOCKER_COMPOSE -f $COMPOSE_FILE up -d postgres

log_info "Deploying updated application container (${APP_CONTAINER})..."
$DOCKER_COMPOSE -f $COMPOSE_FILE up -d --no-deps app

# 7. Back up the database BEFORE any schema change (safety net; keeps last 10)
PGUSER_VAL="$($DOCKER_COMPOSE -f $COMPOSE_FILE exec -T postgres printenv POSTGRES_USER 2>/dev/null | tr -d '[:space:]')"
PGDB_VAL="$($DOCKER_COMPOSE -f $COMPOSE_FILE exec -T postgres printenv POSTGRES_DB 2>/dev/null | tr -d '[:space:]')"
PGUSER_VAL="${PGUSER_VAL:-opsvale}"
PGDB_VAL="${PGDB_VAL:-opsvale}"

BACKUP_DIR="${SCRIPT_DIR}/backups"
mkdir -p "$BACKUP_DIR"
STAMP="$(date '+%Y%m%d-%H%M%S')"
log_info "Backing up database before schema changes..."
if $DOCKER_COMPOSE -f $COMPOSE_FILE exec -T postgres pg_dump -U "$PGUSER_VAL" "$PGDB_VAL" > "${BACKUP_DIR}/db-${STAMP}.sql" 2>/dev/null && [ -s "${BACKUP_DIR}/db-${STAMP}.sql" ]; then
    gzip -f "${BACKUP_DIR}/db-${STAMP}.sql"
    log_success "Database backup saved: backups/db-${STAMP}.sql.gz"
    # Retain only the 10 most recent backups
    ls -1t "${BACKUP_DIR}"/db-*.sql.gz 2>/dev/null | tail -n +11 | xargs -r rm -f
else
    rm -f "${BACKUP_DIR}/db-${STAMP}.sql"
    log_warn "Database backup could not be created — continuing, but proceed with caution."
fi

# 8. Apply database migrations (versioned & reviewable — replaces `db push`)
#    One-time auto-baseline: a database that already has application tables but
#    no Prisma migration history (i.e. it was first created with `db push`) is
#    marked as already at the baseline, so migrate deploy does NOT try to
#    recreate existing tables. Fresh/empty databases skip this and are built
#    normally by migrate deploy.
log_info "Applying database migrations..."
BASELINE_MIGRATION="0_init"
HAS_HISTORY="$($DOCKER_COMPOSE -f $COMPOSE_FILE exec -T postgres psql -U "$PGUSER_VAL" -d "$PGDB_VAL" -tAc "SELECT to_regclass('public._prisma_migrations')" 2>/dev/null | tr -d '[:space:]')"
HAS_TABLES="$($DOCKER_COMPOSE -f $COMPOSE_FILE exec -T postgres psql -U "$PGUSER_VAL" -d "$PGDB_VAL" -tAc "SELECT to_regclass('public.\"AdminUser\"')" 2>/dev/null | tr -d '[:space:]')"

if [ -z "$HAS_HISTORY" ] && [ -n "$HAS_TABLES" ]; then
    log_warn "Existing database without migration history detected — baselining once..."
    $DOCKER_COMPOSE -f $COMPOSE_FILE exec -T app npx prisma migrate resolve --applied "$BASELINE_MIGRATION" \
        || log_warn "Baseline step reported an issue (it may already be baselined)."
fi

$DOCKER_COMPOSE -f $COMPOSE_FILE exec -T app npx prisma migrate deploy

# 9. Optional seeding
if [[ "$*" == *"--seed"* ]]; then
    log_info "Seeding database with initial reference data..."
    $DOCKER_COMPOSE -f $COMPOSE_FILE exec -T app npx prisma db seed
fi

# 10. Health check probe
log_info "Verifying application health probe at ${HEALTH_URL}..."
MAX_RETRIES=15
RETRY_COUNT=0
HEALTHY=false

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    RETRY_COUNT=$((RETRY_COUNT+1))
    if curl -s -f "$HEALTH_URL" &> /dev/null; then
        HEALTHY=true
        break
    fi
    echo -n "."
    sleep 2
done
echo ""

if [ "$HEALTHY" = true ]; then
    log_success "Application is HEALTHY and responding to traffic!"
else
    log_warn "Health check did not respond within 30s. Checking container logs:"
    $DOCKER_COMPOSE -f $COMPOSE_FILE logs --tail=20 app
fi

# 11. Clean up dangling images to save VPS disk space
log_info "Cleaning up unused Docker images..."
docker image prune -f > /dev/null 2>&1 || true

echo -e "${GREEN}"
echo "========================================================"
echo "         OpsVale Deployment Successfully Completed!     "
echo "========================================================"
echo -e "${NC}"
