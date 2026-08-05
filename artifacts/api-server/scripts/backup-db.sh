#!/bin/bash
# Run before any schema migration: cp prisma/dev.db prisma/dev.db.bak.<timestamp>
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
SRC="$(dirname "$0")/../prisma/dev.db"
DEST="$(dirname "$0")/../prisma/dev.db.bak.${TIMESTAMP}"

if [ -f "$SRC" ]; then
  cp "$SRC" "$DEST"
  echo "✅ Backup saved to $DEST"
else
  echo "⚠️  No dev.db found at $SRC — skipping backup"
fi
