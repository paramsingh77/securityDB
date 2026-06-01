#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${HOSTINGER_DATABASE_URL:-}" ]]; then
  echo "HOSTINGER_DATABASE_URL is required" >&2
  exit 1
fi

dump_file="${1:-}"

if [[ -z "$dump_file" || ! -f "$dump_file" ]]; then
  echo "Usage: HOSTINGER_DATABASE_URL=... $0 path/to/railway-export.dump" >&2
  exit 1
fi

pg_restore \
  --dbname="$HOSTINGER_DATABASE_URL" \
  --clean \
  --if-exists \
  --no-owner \
  --no-acl \
  "$dump_file"

echo "Restore completed into Hostinger database"

