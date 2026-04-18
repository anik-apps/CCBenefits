#!/usr/bin/env bash
set -euo pipefail

# Update Playwright visual regression baselines using a Linux Docker container.
# This ensures baselines match CI font rendering (Ubuntu/FreeType).
#
# Prerequisites:
#   - Docker running
#   - Test stack running: docker compose -f docker-compose.test.yml up -d
#
# Usage:
#   ./scripts/update-snapshots.sh

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Extract Playwright version from lock file (actual resolved version)
PW_VERSION=$(node -e "
  const lock = require('$PROJECT_ROOT/tests/e2e/package-lock.json');
  const ver = lock.packages['node_modules/@playwright/test'].version;
  console.log(ver);
")

echo "Using Playwright v${PW_VERSION} Docker image"
echo "Make sure the test stack is running: docker compose -f docker-compose.test.yml up -d"
echo ""

# Detect OS for Docker networking
# macOS: --network host doesn't work — use host.docker.internal
# Linux: --network host works natively
if [[ "$(uname -s)" == "Darwin" ]]; then
  DOCKER_NETWORK_ARGS=""
  EFFECTIVE_BASE_URL="http://host.docker.internal:8080"
  echo "macOS detected: using host.docker.internal for Docker networking"
else
  DOCKER_NETWORK_ARGS="--network host"
  EFFECTIVE_BASE_URL="http://localhost:8080"
  echo "Linux detected: using --network host"
fi

docker run --rm \
  --user "$(id -u):$(id -g)" \
  $DOCKER_NETWORK_ARGS \
  -v "$PROJECT_ROOT/tests/e2e:/work" \
  -w /work \
  -e BASE_URL="${BASE_URL:-$EFFECTIVE_BASE_URL}" \
  "mcr.microsoft.com/playwright:v${PW_VERSION}" \
  bash -c "export HOME=/tmp/pw-home && mkdir -p \$HOME && npm ci && npx playwright test --update-snapshots"

echo ""
echo "Baselines updated. Review changes in tests/e2e/*-snapshots/ and commit."
