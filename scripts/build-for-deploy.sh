#!/usr/bin/env bash
# SPDX-License-Identifier: GPL-3.0-or-later
# Copyright (C) 2026 Alexandru Negoita

set -e

echo "🏗️  Building Photolib for deployment..."
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
echo "📦 Installing dependencies..."
npm ci --omit=dev

# Install dev dependencies needed for build
echo "📦 Installing build dependencies..."
npm install --save-dev

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
echo "📦 Deployable files:"
echo "   - .next/ (built application)"
echo "   - node_modules/ (production dependencies only)"
echo "   - public/ (static assets)"
echo "   - package.json & package-lock.json"
echo "   - prisma/ (for migrations on server)"
echo ""
echo "⚠️  Remember to:"
echo "   1. Copy .env.example to .env on the server"
echo "   2. Configure DATABASE_URL, SESSION_SECRET, and UPLOAD_DIR"
echo "   3. Run 'npx prisma migrate deploy' on the server"
echo "   4. Create the uploads directory"
echo ""
