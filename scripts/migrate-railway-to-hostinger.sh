#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${RAILWAY_DATABASE_URL:-}" ]]; then
  echo "RAILWAY_DATABASE_URL is required" >&2
  exit 1
fi

if [[ -z "${HOSTINGER_DATABASE_URL:-}" ]]; then
  echo "HOSTINGER_DATABASE_URL is required" >&2
  exit 1
fi

timestamp="$(date +%Y%m%d-%H%M%S)"
dump_file="railway-export-${timestamp}.dump"

pg_dump "$RAILWAY_DATABASE_URL" \
  --format=custom \
  --no-owner \
  --no-acl \
  --file="$dump_file"

pg_restore \
  --dbname="$HOSTINGER_DATABASE_URL" \
  --clean \
  --if-exists \
  --no-owner \
  --no-acl \
  "$dump_file"

psql "$HOSTINGER_DATABASE_URL" \
  --file=database/migrations/002_legacy_indexes_and_audit.sql

echo "Migration complete: $dump_file"

