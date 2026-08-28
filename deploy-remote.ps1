# OpsVale — One-Click Remote VPS Deployment (PowerShell)
# Usage:
#   .\deploy-remote.ps1
#   .\deploy-remote.ps1 -Host "root@187.77.93.216" -Dir "/opt/opsvale"

param (
    [string]$VpsHost = "root@187.77.93.216",
    [string]$RemoteDir = "/opt/opsvale",
    [switch]$SkipPush = $false
)

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "       OpsVale Remote VPS One-Click Deployer            " -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan

# 1. Check git status
if (-not $SkipPush) {
    Write-Host "[1/3] Checking Git status and pushing changes..." -ForegroundColor Yellow
    $status = git status --porcelain
    if ($status) {
        Write-Host "Uncommitted local changes detected. Committing..." -ForegroundColor DarkYellow
        git add -A
        $msg = Read-Host "Enter commit message (or press enter for default 'chore: update production build')"
        if (-not $msg) { $msg = "chore: update production build" }
        git commit -m $msg
    }
    Write-Host "Pushing commits to origin/main..." -ForegroundColor Yellow
    git push origin main
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[ERROR] Git push failed. Please resolve git issues before deploying." -ForegroundColor Red
        exit 1
    }
    Write-Host "[OK] Git push complete." -ForegroundColor Green
}

# 2. Trigger remote deployment on VPS
Write-Host "[2/3] Connecting to VPS ($VpsHost) and executing deploy.sh..." -ForegroundColor Yellow
$remoteCmd = "cd $RemoteDir && if [ ! -f deploy.sh ]; then git pull origin main; fi && chmod +x deploy.sh && bash deploy.sh"

ssh -t $VpsHost $remoteCmd

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n[SUCCESS] OpsVale deployed successfully on $VpsHost!" -ForegroundColor Green
} else {
    Write-Host "`n[ERROR] Remote deployment encountered an error (exit code $LASTEXITCODE)." -ForegroundColor Red
}
