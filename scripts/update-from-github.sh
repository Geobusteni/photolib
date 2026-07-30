#!/usr/bin/env bash
# SPDX-License-Identifier: GPL-3.0-or-later
# Copyright (C) 2026 Alexandru Negoita

set -e

# Configuration
REPO="Geobusteni/photolib"
ARTIFACT_NAME="photolib-deploy"
PACKAGE_FILE="photolib-deploy.tar.gz"

echo "📥 Photolib Production Update Script"

# Check for gh CLI
if ! command -v gh &> /dev/null; then
    echo "❌ Error: GitHub CLI (gh) is not installed."
    echo "   Install it with: sudo apt install gh"
    echo "   Then login with: gh auth login"
    exit 1
fi

# Check for authentication
if ! gh auth status &> /dev/null; then
    echo "❌ Error: gh is not authenticated."
    echo "   Run: gh auth login"
    exit 1
fi

echo "🔍 Finding latest successful build..."
# We try to use --status success, but if it fails (older gh versions), we fallback to filtering with jq
if ! RUN_ID=$(gh run list --repo "$REPO" --workflow "Build and Package" --status success --limit 1 --json databaseId --jq '.[0].databaseId' 2>/dev/null); then
    RUN_ID=$(gh run list --repo "$REPO" --workflow "Build and Package" --limit 10 --json databaseId,status,conclusion --jq '.[] | select(.status=="completed" and .conclusion=="success") | .databaseId' | head -n 1)
fi

if [ -z "$RUN_ID" ]; then
    echo "❌ Error: No successful build runs found in $REPO"
    exit 1
fi

echo "📥 Downloading artifact from run $RUN_ID..."
gh run download "$RUN_ID" --repo "$REPO" --name "$ARTIFACT_NAME"

# The artifact is uploaded as a zip by GitHub Actions, but our workflow 
# produces a tar.gz inside that zip if not careful. 
# Actually upload-artifact@v4 zips the path.
# In our workflow we did: 
#   run: tar -czf photolib-deploy.tar.gz -C deploy .
#   path: photolib-deploy.tar.gz
# So gh run download will result in photolib-deploy.tar.gz file (in the current dir)

if [ ! -f "$PACKAGE_FILE" ]; then
    # Sometimes gh download creates a directory with the name of the artifact
    if [ -d "$ARTIFACT_NAME" ] && [ -f "$ARTIFACT_NAME/$PACKAGE_FILE" ]; then
        mv "$ARTIFACT_NAME/$PACKAGE_FILE" .
        rm -rf "$ARTIFACT_NAME"
    fi
fi

if [ ! -f "$PACKAGE_FILE" ]; then
    echo "❌ Error: $PACKAGE_FILE not found after download."
    exit 1
fi

echo "📦 Extracting package..."
tar -xzf "$PACKAGE_FILE"
rm "$PACKAGE_FILE"

echo "🔧 Checking for .env..."
if [ ! -f ".env" ]; then
    echo "⚠️  .env not found. Copying .env.example..."
    cp .env.example .env
    echo ""
    echo "❌ Error: .env file needs to be configured before proceeding."
    echo "   Please edit .env with your production credentials:"
    echo "   - DATABASE_URL (MySQL connection string)"
    echo "   - SESSION_SECRET (random 32+ character string)"
    echo "   - STORAGE_PATH (where to store uploaded photos)"
    echo ""
    echo "   Then run this script again."
    exit 1
fi

echo "📊 Running database migrations..."
# Load environment variables from .env for Prisma
set -a
source .env
set +a
npx prisma migrate deploy

echo "🔄 Restarting service..."
if command -v systemctl &> /dev/null && systemctl is-active --quiet photolib; then
    sudo systemctl restart photolib
    echo "✅ Service restarted."
elif command -v pm2 &> /dev/null && pm2 describe photolib &> /dev/null; then
    pm2 restart photolib
    echo "✅ PM2 process restarted."
else
    echo "⚠️  Could not automatically restart service. Please restart it manually."
fi

echo ""
echo "✅ Update complete!"
