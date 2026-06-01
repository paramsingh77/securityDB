#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${HOSTINGER_DATABASE_URL:-}" ]]; then
  echo "HOSTINGER_DATABASE_URL is required" >&2
  exit 1
fi

psql "$HOSTINGER_DATABASE_URL" \
  --file=database/migrations/002_legacy_indexes_and_audit.sql

echo "Hostinger migrations applied"

