#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${RAILWAY_DATABASE_URL:-}" ]]; then
  echo "RAILWAY_DATABASE_URL is required" >&2
  exit 1
fi

output="${1:-railway-export-$(date +%Y%m%d-%H%M%S).dump}"

pg_dump "$RAILWAY_DATABASE_URL" \
  --format=custom \
  --no-owner \
  --no-acl \
  --file="$output"

echo "Export created: $output"

