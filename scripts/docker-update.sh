#!/usr/bin/env bash
# SPDX-License-Identifier: GPL-3.0-or-later
# Copyright (C) 2026 Alexandru Negoita

set -e

echo "🔄 Updating Photolib Docker deployment..."
echo ""

# Ensure we're in the project root
cd "$(dirname "$0")/.."

# Check for Docker and Docker Compose
if ! command -v docker &> /dev/null; then
  echo "❌ Error: Docker is not installed"
  exit 1
fi

# Backup .env
if [ -f ".env" ]; then
  echo "💾 Backing up .env..."
  cp .env .env.backup
fi

# Pull latest changes
echo "📥 Pulling latest changes from repository..."
git fetch --tags
git pull

# Restore .env
if [ -f ".env.backup" ]; then
  echo "📥 Restoring .env..."
  mv .env.backup .env
fi

# Rebuild containers
echo "🔨 Rebuilding Docker containers..."
docker compose build

# Stop current containers
echo "🛑 Stopping current containers..."
docker compose down

# Start database
echo "🗄️  Starting database..."
docker compose up -d db

# Wait for database
echo "⏳ Waiting for database..."
until docker compose exec -T db pg_isready -U photolib &> /dev/null; do
  sleep 1
done

# Run migrations
echo "📊 Running database migrations..."
docker compose run --rm app npx prisma migrate deploy

# Start application
echo "🚀 Starting application..."
docker compose up -d app

# Wait for app to be ready
echo "⏳ Waiting for application to be ready..."
sleep 5

# Get version
VERSION=$(docker compose exec -T app node -p "require('./package.json').version" 2>/dev/null || echo "unknown")

echo ""
echo "✅ Update complete!"
echo "📌 Version: $VERSION"
echo ""
echo "🌐 Access via your domain (configured in RunCloud/reverse proxy)"
echo ""
echo "📋 Useful commands:"
echo "   docker compose logs -f          # View logs"
echo "   docker compose ps               # Check status"
echo ""
