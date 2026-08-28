#!/usr/bin/env bash
# ==============================================================================
# OpsVale — One-Click Remote VPS Deployment (Bash)
# Usage:
#   bash deploy-remote.sh
#   VPS_HOST="root@187.77.93.216" REMOTE_DIR="/opt/opsvale" bash deploy-remote.sh
# ==============================================================================

set -eo pipefail

VPS_HOST="${VPS_HOST:-root@187.77.93.216}"
REMOTE_DIR="${REMOTE_DIR:-/opt/opsvale}"

CYAN='\033[0;36m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${CYAN}========================================================"
echo -e "       OpsVale Remote VPS One-Click Deployer            "
echo -e "========================================================${NC}"

echo -e "${YELLOW}[1/3] Pushing latest local commits to origin/main...${NC}"
if [[ -n $(git status --porcelain) ]]; then
    echo "Local changes detected. Committing..."
    git add -A
    git commit -m "chore: deploy update $(date '+%Y-%m-%d %H:%M:%S')"
fi
git push origin main

echo -e "${YELLOW}[2/3] Connecting to VPS (${VPS_HOST}) and triggering deploy.sh...${NC}"
ssh -t "${VPS_HOST}" "cd ${REMOTE_DIR} && if [ ! -f deploy.sh ]; then git pull origin main; fi && chmod +x deploy.sh && bash deploy.sh"

echo -e "${GREEN}[SUCCESS] Remote deployment complete!${NC}"
