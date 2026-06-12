#!/usr/bin/env bash
# Nightly production DB backup -> S3-compatible object storage.
# Used by .github/workflows/db-backup.yml (disabled by default).
#
# Required environment:
#   PROD_DATABASE_URL          Railway Postgres connection string (READ-ONLY use: pg_dump)
#   BACKUP_S3_ENDPOINT         e.g. https://<account>.r2.cloudflarestorage.com
#   BACKUP_S3_BUCKET           bucket name (must have server-side encryption + 30-day lifecycle)
#   BACKUP_S3_ACCESS_KEY_ID
#   BACKUP_S3_SECRET_ACCESS_KEY
set -euo pipefail

: "${PROD_DATABASE_URL:?PROD_DATABASE_URL is required}"
: "${BACKUP_S3_ENDPOINT:?BACKUP_S3_ENDPOINT is required}"
: "${BACKUP_S3_BUCKET:?BACKUP_S3_BUCKET is required}"
: "${BACKUP_S3_ACCESS_KEY_ID:?BACKUP_S3_ACCESS_KEY_ID is required}"
: "${BACKUP_S3_SECRET_ACCESS_KEY:?BACKUP_S3_SECRET_ACCESS_KEY is required}"

STAMP="$(date -u +%Y-%m-%dT%H%MZ)"
DUMP_FILE="uchqun_prod_${STAMP}.dump"

echo "Dumping production database (custom format, --no-owner)..."
pg_dump "$PROD_DATABASE_URL" -Fc --no-owner -f "$DUMP_FILE"

SIZE_BYTES=$(stat -c%s "$DUMP_FILE")
echo "Dump complete: ${DUMP_FILE} (${SIZE_BYTES} bytes)"

# Sanity floor: current healthy dumps are ~470 KB. A dump under 100 KB almost
# certainly means a partial/failed dump, not a smaller database.
if [ "$SIZE_BYTES" -lt 100000 ]; then
  echo "ERROR: dump is suspiciously small (<100 KB) — refusing to upload as a 'good' backup." >&2
  exit 1
fi

echo "Uploading to s3://${BACKUP_S3_BUCKET}/ ..."
AWS_ACCESS_KEY_ID="$BACKUP_S3_ACCESS_KEY_ID" \
AWS_SECRET_ACCESS_KEY="$BACKUP_S3_SECRET_ACCESS_KEY" \
aws s3 cp "$DUMP_FILE" "s3://${BACKUP_S3_BUCKET}/${DUMP_FILE}" \
  --endpoint-url "$BACKUP_S3_ENDPOINT"

rm -f "$DUMP_FILE"
echo "Backup uploaded and local copy removed."
