#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
node -e 'if (+process.versions.node.split(".")[0] < 22) { console.error("Node.js 22+ required"); process.exit(1) }'
npm ci --no-audit --no-fund
