#!/usr/bin/env bash
# Brings the FINB preview back after a sandbox reset, then starts the dev server.
#
# The Arena sandbox restores the working tree but wipes `node_modules/` and can
# leave the local branch pointer behind the pushed tip. This script repairs both,
# then hands off to `npm run dev` (0.0.0.0:5173 → live preview).
#
# Usage:  bash scripts/preview.sh
set -euo pipefail

BRANCH="arena/91cdd2b6-finb"
cd "$(dirname "$0")/.."

echo "→ fetching origin/$BRANCH"
git fetch origin "$BRANCH" --prune --quiet

echo "→ fast-forwarding $BRANCH (working tree kept)"
if git merge --ff-only "origin/$BRANCH" >/dev/null 2>&1; then
  echo "  at $(git log --oneline -1)"
else
  echo "  ✗ $BRANCH and origin/$BRANCH have diverged — resolve manually (files are untouched)."
  exit 1
fi

if [ ! -d node_modules/.bin ]; then
  echo "→ installing dependencies (node_modules was wiped by the reset)"
  npm ci --no-audit --no-fund
else
  echo "→ node_modules present, skipping install"
fi

echo "→ starting dev server on 0.0.0.0:5173"
exec npm run dev
