#!/bin/bash
set -e

echo "🚀 Starting Medical Reporting Platform..."

# Run migrations
echo "📊 Running database migrations..."
cd apps/web
npx prisma migrate deploy

# Start the application
echo "🌐 Starting Next.js server..."
npm start
