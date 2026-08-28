#!/usr/bin/env bash
# ==============================================================================
# OpsVale Platform — Production VPS Deployment Script
# ==============================================================================
# Usage:
#   bash deploy.sh             # Pull latest main and deploy
#   bash deploy.sh --no-pull   # Deploy current files without pulling from git
#   bash deploy.sh --seed      # Deploy and run database seed
# ==============================================================================

set -eo pipefail

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

# 4. Build application container
log_info "Building application Docker container (${APP_CONTAINER})..."
$DOCKER_COMPOSE -f $COMPOSE_FILE build app

# 5. Start/Restart services (ensure Postgres is up and healthy, swap app container)
log_info "Starting database and dependencies..."
$DOCKER_COMPOSE -f $COMPOSE_FILE up -d postgres

log_info "Deploying updated application container..."
$DOCKER_COMPOSE -f $COMPOSE_FILE up -d --no-deps app

# 6. Apply database migrations
log_info "Applying Prisma database migrations..."
$DOCKER_COMPOSE -f $COMPOSE_FILE exec -T app npx prisma migrate deploy

# 7. Optional seeding
if [[ "$*" == *"--seed"* ]]; then
    log_info "Seeding database with initial reference data..."
    $DOCKER_COMPOSE -f $COMPOSE_FILE exec -T app npx prisma db seed
fi

# 8. Health check probe
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

# 9. Clean up dangling images to save VPS disk space
log_info "Cleaning up unused Docker images..."
docker image prune -f > /dev/null 2>&1 || true

echo -e "${GREEN}"
echo "========================================================"
echo "         OpsVale Deployment Successfully Completed!     "
echo "========================================================"
echo -e "${NC}"
