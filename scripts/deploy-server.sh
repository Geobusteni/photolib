#!/usr/bin/env bash
# SPDX-License-Identifier: GPL-3.0-or-later
# Copyright (C) 2026 Alexandru Negoita

set -e

echo "🚀 Deploying Photolib..."
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
  echo "❌ Error: .env not found"
  echo "   1. Copy .env.example to .env"
  echo "   2. Configure DATABASE_URL (MySQL connection)"
  echo "   3. Set SESSION_SECRET (64 hex characters)"
  echo "   4. Set UPLOAD_DIR (absolute path recommended)"
  exit 1
fi

# Source .env to check required variables
set -a
source .env
set +a

# Validate required environment variables
if [ -z "$DATABASE_URL" ]; then
  echo "❌ Error: DATABASE_URL not set in .env"
  exit 1
fi

if [ -z "$SESSION_SECRET" ] || [ "$SESSION_SECRET" = "<64-hex-characters>" ]; then
  echo "❌ Error: SESSION_SECRET not configured in .env"
  echo "   Generate with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\""
  exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
  echo "❌ Error: Node.js 20 or newer is required (found: $(node -v))"
  exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm ci --omit=dev

# Generate Prisma client
echo "🔧 Generating Prisma client..."
npx prisma generate

# Run database migrations
echo "📊 Running database migrations..."
npx prisma migrate deploy

# Build application if not already built
if [ ! -d ".next" ]; then
  echo "🔨 Building application..."
  # Temporarily install dev dependencies for build
  npm install
  NODE_ENV=production npm run build
  # Remove dev dependencies
  rm -rf node_modules
  npm ci --omit=dev
fi

# Create uploads directory
UPLOAD_DIR=${UPLOAD_DIR:-./uploads}
mkdir -p "$UPLOAD_DIR"
chmod 755 "$UPLOAD_DIR"
echo "📁 Uploads directory: $UPLOAD_DIR"

# Get version
VERSION=$(node -p "require('./package.json').version" 2>/dev/null || echo "unknown")

echo ""
echo "✅ Deployment complete!"
echo "📌 Version: $VERSION"
echo ""
echo "🌐 Start the application:"
echo ""
echo "   # Option 1: Using PM2 (recommended)"
echo "   npm install -g pm2"
echo "   pm2 start npm --name photolib -- start"
echo "   pm2 save"
echo "   pm2 startup  # Follow instructions to enable on boot"
echo ""
echo "   # Option 2: Direct start"
echo "   npm start"
echo ""
echo "⚠️  First run: Visit https://yourdomain.com/setup to create admin account"
echo ""
