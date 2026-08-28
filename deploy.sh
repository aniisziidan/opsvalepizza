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

# 2. Check environment configuration
if [ ! -f ".env.production" ]; then
    if [ -f ".env" ]; then
        log_warn ".env.production not found, using .env instead."
        cp .env .env.production
    else
        log_error "Neither .env.production nor .env found! Please create .env.production."
        exit 1
    fi
fi

# 3. Pull latest code (unless --no-pull flag is provided)
if [[ "$*" != *"--no-pull"* ]]; then
    if [ -d ".git" ]; then
        log_info "Fetching latest code from git repository..."
        git fetch origin main || log_warn "Git fetch failed, continuing with local code."
        git pull origin main || log_warn "Git pull failed or local changes exist, continuing with local code."
    fi
else
    log_info "Skipping git pull (--no-pull specified)."
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
