#!/usr/bin/env bash
# SPDX-License-Identifier: GPL-3.0-or-later
# Copyright (C) 2026 Alexandru Negoita

set -e

echo "🏗️  Building Photolib for production..."
echo ""

# Ensure we're in the project root
cd "$(dirname "$0")/.."

# Check for required files
if [ ! -f "package.json" ]; then
  echo "❌ Error: package.json not found. Are you in the project root?"
  exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
  echo "❌ Error: Node.js 20 or newer is required (found: $(node -v))"
  exit 1
fi

# Clean previous builds
echo "🧹 Cleaning previous builds..."
rm -rf .next
rm -rf node_modules

# Install production dependencies
echo "📦 Installing production dependencies..."
npm ci --omit=dev

# Temporarily install dev dependencies for build
echo "📦 Installing build dependencies..."
npm install

# Generate Prisma client
echo "🔧 Generating Prisma client..."
npx prisma generate

# Build the application
echo "🔨 Building Next.js application..."
NODE_ENV=production npm run build

# Remove dev dependencies after build
echo "🧹 Removing dev dependencies..."
rm -rf node_modules
npm ci --omit=dev

echo ""
echo "✅ Build complete!"
echo ""
echo "📦 Ready to deploy:"
echo "   - .next/ (built application)"
echo "   - node_modules/ (production dependencies only)"
echo "   - All other application files"
echo ""
echo "⚠️  Before deploying to server:"
echo "   1. Create MySQL database in your hosting panel"
echo "   2. Copy .env.example to .env on server"
echo "   3. Configure DATABASE_URL, SESSION_SECRET, UPLOAD_DIR"
echo "   4. Run 'npx prisma migrate deploy' on server"
echo "   5. Create uploads directory on server"
echo "   6. Start with 'npm start' or PM2"
echo ""
