#!/usr/bin/env bash
# SPDX-License-Identifier: GPL-3.0-or-later
# Copyright (C) 2026 Alexandru Negoita

set -e

echo "🐳 Deploying Photolib with Docker..."
echo ""

# Ensure we're in the project root
cd "$(dirname "$0")/.."

# Check for Docker and Docker Compose
if ! command -v docker &> /dev/null; then
  echo "❌ Error: Docker is not installed"
  exit 1
fi

if ! docker compose version &> /dev/null; then
  echo "❌ Error: Docker Compose is not installed or not available"
  exit 1
fi

# Check if .env exists
if [ ! -f ".env" ]; then
  echo "⚠️  .env not found. Creating from template..."
  if [ -f ".env.docker" ]; then
    cp .env.docker .env
    echo "✅ Created .env from .env.docker"
    echo ""
    echo "🔧 IMPORTANT: Edit .env and set:"
    echo "   - DB_PASSWORD (secure password for PostgreSQL)"
    echo "   - SESSION_SECRET (64 random hex characters)"
    echo ""
    read -p "Press Enter after configuring .env, or Ctrl+C to exit..."
  else
    echo "❌ Error: .env.docker template not found"
    exit 1
  fi
fi

# Validate required environment variables
source .env
if [ -z "$SESSION_SECRET" ] || [ "$SESSION_SECRET" = "change-this-to-64-random-hex-characters" ]; then
  echo "❌ Error: SESSION_SECRET not configured in .env"
  echo "   Generate with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\""
  exit 1
fi

if [ -z "$DB_PASSWORD" ] || [ "$DB_PASSWORD" = "change-this-to-a-secure-password" ]; then
  echo "❌ Error: DB_PASSWORD not configured in .env"
  exit 1
fi

# Build containers
echo "🔨 Building Docker containers..."
echo "   This may take several minutes on first build..."
docker compose build --no-cache || {
  echo ""
  echo "⚠️  Build failed. This is often due to Docker cache corruption."
  echo "   Trying again with clean cache..."
  docker builder prune -f
  docker compose build --no-cache
}

# Start database first
echo "🗄️  Starting database..."
docker compose up -d db

# Wait for database to be healthy
echo "⏳ Waiting for database to be ready..."
until docker compose exec -T db pg_isready -U photolib &> /dev/null; do
  sleep 1
done
echo "✅ Database is ready"

# Run migrations
echo "📊 Running database migrations..."
docker compose run --rm app npx prisma migrate deploy

# Start application
echo "🚀 Starting application..."
docker compose up -d app

# Wait for app to be healthy
echo "⏳ Waiting for application to be ready..."
sleep 5
until docker compose ps app | grep -q "healthy" 2>/dev/null || docker compose ps app | grep -q "running"; do
  sleep 2
done

# Get the version
VERSION=$(docker compose exec -T app node -p "require('./package.json').version" 2>/dev/null || echo "unknown")

echo ""
echo "✅ Deployment complete!"
echo "📌 Version: $VERSION"
echo ""
echo "🌐 Container running on port ${PORT:-3000}"
echo "   👉 Access via your domain (configured in RunCloud/reverse proxy)"
echo "   🔧 Direct access (local testing only): http://localhost:${PORT:-3000}"
echo ""
echo "📋 Useful commands:"
echo "   docker compose logs -f          # View logs"
echo "   docker compose ps               # Check status"
echo "   docker compose stop             # Stop containers"
echo "   docker compose down             # Stop and remove containers"
echo "   docker compose exec app sh      # Shell into app container"
echo ""
echo "📁 Data locations:"
echo "   - Database: Docker volume 'photolib-db-data'"
echo "   - Uploads: Docker volume 'photolib-uploads'"
echo ""
echo "⚠️  First run: Visit your domain/setup to create admin account"
echo ""
