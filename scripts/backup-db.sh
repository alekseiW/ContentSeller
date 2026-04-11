#!/usr/bin/env bash
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-./backups}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/guidehub_${TIMESTAMP}.sql.gz"

mkdir -p "$BACKUP_DIR"

echo "Starting database backup..."
docker exec guidehub-postgres pg_dump -U "${POSTGRES_USER:-postgres}" -d guidehub | gzip > "$BACKUP_FILE"

echo "Backup saved to: $BACKUP_FILE"
echo "Size: $(du -h "$BACKUP_FILE" | cut -f1)"

# Keep only last 10 backups
ls -t "${BACKUP_DIR}"/guidehub_*.sql.gz 2>/dev/null | tail -n +11 | xargs -r rm -f
echo "Old backups cleaned. Remaining: $(ls "${BACKUP_DIR}"/guidehub_*.sql.gz 2>/dev/null | wc -l)"
