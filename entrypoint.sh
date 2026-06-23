#!/bin/sh
set -e

echo "============================================"
echo "  MK Academy Backend - starting up..."
echo "============================================"

export DATABASE_URL="${DATABASE_URL:-file:/app/data/prod.db}"

echo "-> DATABASE_URL: $DATABASE_URL"
echo "-> Boot command: npm run start:prod"
echo ""

exec npm run start:prod
