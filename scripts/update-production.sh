#!/usr/bin/env bash
# SPDX-License-Identifier: GPL-3.0-or-later
# Copyright (C) 2026 Alexandru Negoita

set -e

echo "🔄 Updating Photolib..."
echo ""

# Ensure we're in the project root
cd "$(dirname "$0")/.."

# Check for required files
if [ ! -f "package.json" ]; then
  echo "❌ Error: package.json not found. Are you in the project root?"
  exit 1
fi

# Check if .env exists
if [ ! -f ".env" ]; then
  echo "⚠️  Warning: .env not found. Make sure to configure it after update."
fi

# Backup .env if it exists
if [ -f ".env" ]; then
  echo "💾 Backing up .env..."
  cp .env .env.backup
fi

# Pull latest changes from git
echo "📥 Pulling latest changes from repository..."
git fetch --tags
git pull

# Restore .env
if [ -f ".env.backup" ]; then
  echo "📥 Restoring .env..."
  mv .env.backup .env
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm ci --omit=dev

# Generate Prisma client
echo "🔧 Generating Prisma client..."
npx prisma generate

# Check for pending migrations
echo "📊 Checking for database migrations..."
if npx prisma migrate status | grep -q "Database schema is up to date"; then
  echo "✅ Database is up to date"
else
  echo "⚠️  Pending migrations found. Running migrations..."
  npx prisma migrate deploy
fi

# Rebuild the application
echo "🔨 Rebuilding application..."
# Temporarily install dev dependencies
npm install
NODE_ENV=production npm run build
# Remove dev dependencies
rm -rf node_modules
npm ci --omit=dev

# Get current version
VERSION=$(node -p "require('./package.json').version" 2>/dev/null || echo "unknown")

echo ""
echo "✅ Update complete!"
echo "📌 Version: $VERSION"
echo ""
echo "🔄 Restart the application to apply changes:"
echo ""
echo "   # If using PM2:"
echo "   pm2 restart photolib"
echo ""
echo "   # If using systemd:"
echo "   sudo systemctl restart photolib"
echo ""
echo "   # If running manually:"
echo "   # Stop the current process and run: npm start"
echo ""
