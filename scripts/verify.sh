#!/usr/bin/env bash
# BrightCare OS — Dashboard pre-deploy verification
# Run this before deploying to catch issues early.
# Usage: bash scripts/verify.sh

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m'

cd "$(dirname "$0")/.."

pass=0
fail=0

step() {
  echo ""
  echo -e "${YELLOW}▶ $1${NC}"
}

ok() {
  echo -e "  ${GREEN}✓ $1${NC}"
  ((pass++))
}

err() {
  echo -e "  ${RED}✗ $1${NC}"
  ((fail++))
}

echo "BrightCare OS — Dashboard Verification"
echo "======================================="

# 1. Dependencies
step "Installing dependencies"
if npm ci --silent 2>/dev/null; then
  ok "npm ci succeeded"
else
  err "npm ci failed"
fi

# 2. TypeScript
step "Type checking"
if npm run typecheck 2>&1; then
  ok "typecheck passed"
else
  err "typecheck failed"
fi

# 3. Lint
step "Linting"
if npm run lint 2>&1; then
  ok "lint passed"
else
  err "lint failed"
fi

# 4. Build
step "Building"
if npm run build 2>&1; then
  ok "build succeeded"
else
  err "build failed"
fi

# 5. Env check
step "Checking environment"
if [ -f .env.local ] || [ -f .env ]; then
  ok ".env file exists"
else
  echo -e "  ${YELLOW}⚠ No .env.local or .env found — using defaults${NC}"
fi

# Summary
echo ""
echo "======================================="
echo -e "Results: ${GREEN}${pass} passed${NC}, ${RED}${fail} failed${NC}"

if [ "$fail" -gt 0 ]; then
  echo -e "${RED}Verification failed — fix issues before deploying.${NC}"
  exit 1
fi

echo -e "${GREEN}All checks passed — ready to deploy.${NC}"
