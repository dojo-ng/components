#!/usr/bin/env bash
# Dojo NG components — local pre-commit gate: type-check, lint, and the fast logic unit tests.
# Fail-fast: the first failing step stops the commit. Browser and bench suites are NOT run here
# (they need a browser); CI runs the full matrix. Wire this into a clone via .hg/hgrc — see the
# README ("Pre-commit hook").
set -euo pipefail

# Run from the components workspace root regardless of where the hook fires.
cd "$(dirname "$0")/.."

echo "→ type-check + build (tsc -b)"
npm run build

echo "→ lint (eslint)"
npm run lint

echo "→ logic unit tests (vitest)"
npm run test:unit

echo "✓ pre-commit checks passed"
