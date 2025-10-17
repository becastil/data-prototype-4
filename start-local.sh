#!/bin/bash
cd "$(dirname "$0")/apps/web"
export DATABASE_URL="postgresql://medreporting:medreporting_dev@localhost:5432/medreporting?schema=public"
npm run dev
