#!/bin/sh
set -e

echo "============================================"
echo "  MK Academy Backend - starting up..."
echo "============================================"

export DATABASE_URL="${DATABASE_URL:-postgresql://postgres:postgres@localhost:5432/mk_academy?schema=public}"

echo "-> DATABASE_URL: $DATABASE_URL"
echo "-> Boot command: npm run start:prod"
echo ""

exec npm run start:prod
