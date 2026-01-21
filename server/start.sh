#!/bin/sh
set -e

echo "🚀 Starting Poker Tracker Pro..."
echo "📊 Environment: $NODE_ENV"
echo "🔌 Port: $PORT"

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
  echo "❌ ERROR: DATABASE_URL is not set!"
  exit 1
fi

echo "✅ DATABASE_URL is set"

# Run Prisma migrations
echo "🔄 Running database migrations..."
npx prisma migrate deploy

if [ $? -ne 0 ]; then
  echo "❌ ERROR: Prisma migrations failed!"
  exit 1
fi

echo "✅ Migrations completed successfully"

# Start the server
echo "🚀 Starting server..."
node dist/index.js
