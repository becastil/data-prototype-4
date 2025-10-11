#!/bin/bash
set -e

echo "📦 Installing dependencies..."
npm ci

echo "🔨 Generating Prisma Client..."
cd apps/web
npx prisma generate

echo "🏗️ Building application..."
cd ../..
npm run build

echo "✅ Build complete!"
