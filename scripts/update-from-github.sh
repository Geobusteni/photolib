#!/usr/bin/env bash
# SPDX-License-Identifier: GPL-3.0-or-later
# Copyright (C) 2026 Alexandru Negoita

set -e

# Configuration
REPO="Geobusteni/photolib"
ARTIFACT_NAME="photolib-deploy"
PACKAGE_FILE="photolib-deploy.tar.gz"
FORCE_UPDATE=false
FORCE_SCHEMA=false

# Parse arguments
for arg in "$@"; do
    case $arg in
        --force)
            FORCE_UPDATE=true
            ;;
        --force-schema)
            FORCE_SCHEMA=true
            ;;
        --help)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --force          Re-download and re-deploy even if already on latest version"
            echo "  --force-schema   Force schema sync even if database has data (DANGEROUS)"
            echo "  --help           Show this help message"
            echo ""
            echo "Examples:"
            echo "  $0                    # Normal update (safe)"
            echo "  $0 --force            # Force re-deploy same version"
            echo "  $0 --force-schema     # Reset database schema (LOSES DATA)"
            exit 0
            ;;
        *)
            echo "Unknown option: $arg"
            echo "Run '$0 --help' for usage information"
            exit 1
            ;;
    esac
done

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

# Check if this version is already deployed
DEPLOYED_VERSION_FILE=".deployed-version"
if [ "$FORCE_UPDATE" = false ] && [ -f "$DEPLOYED_VERSION_FILE" ]; then
    DEPLOYED_RUN_ID=$(cat "$DEPLOYED_VERSION_FILE")
    if [ "$DEPLOYED_RUN_ID" = "$RUN_ID" ]; then
        echo "✅ Already running latest version (build $RUN_ID)"
        echo "   Use --force to re-download and re-deploy anyway."
        exit 0
    fi
    echo "📌 Current version: build $DEPLOYED_RUN_ID"
    echo "📌 Latest version:  build $RUN_ID"
elif [ "$FORCE_UPDATE" = true ]; then
    echo "🔨 Force update requested, skipping version check..."
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

# Make scripts executable
chmod +x scripts/*.sh 2>/dev/null || true

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

# Verify DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "❌ Error: DATABASE_URL is not set in .env file"
    echo "   Current .env contents:"
    cat .env
    exit 1
fi

# Show redacted connection string for debugging (hide password)
REDACTED_URL=$(echo "$DATABASE_URL" | sed 's/:[^:@]*@/:***@/')
echo "🔗 Database URL (redacted): $REDACTED_URL"

# Check if prisma.config.ts exists
if [ ! -f "prisma.config.ts" ]; then
    echo "⚠️  Warning: prisma.config.ts not found"
fi

echo "🔧 Checking database state..."

# Parse DATABASE_URL to get connection details
DB_HOST=$(echo "$DATABASE_URL" | sed -n 's/.*@\([^:]*\):.*/\1/p')
DB_PORT=$(echo "$DATABASE_URL" | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
DB_NAME=$(echo "$DATABASE_URL" | sed -n 's/.*\/\([^?]*\).*/\1/p')
DB_USER=$(echo "$DATABASE_URL" | sed -n 's/.*:\/\/\([^:]*\):.*/\1/p')
DB_PASS=$(echo "$DATABASE_URL" | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p')

# Check if database has any tables with data
MYSQL_CMD="mysql -h$DB_HOST -P$DB_PORT -u$DB_USER -p$DB_PASS $DB_NAME -N -s"
TABLE_COUNT=$($MYSQL_CMD -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = '$DB_NAME' AND table_type = 'BASE TABLE';" 2>/dev/null || echo "0")

if [ "$TABLE_COUNT" -gt 0 ]; then
    # Database has tables - check if any have data
    USER_COUNT=$($MYSQL_CMD -e "SELECT COUNT(*) FROM User;" 2>/dev/null || echo "0")
    PROJECT_COUNT=$($MYSQL_CMD -e "SELECT COUNT(*) FROM Project;" 2>/dev/null || echo "0")

    if [ "$USER_COUNT" -gt 0 ] || [ "$PROJECT_COUNT" -gt 0 ]; then
        echo "⚠️  Database contains data:"
        echo "   - Users: $USER_COUNT"
        echo "   - Projects: $PROJECT_COUNT"
        echo ""
        echo "💡 Tip: Create a backup before schema changes:"
        echo "   mysqldump -u$DB_USER -p$DB_PASS $DB_NAME > backup-\$(date +%Y%m%d-%H%M%S).sql"
        echo ""

        if [ "$FORCE_SCHEMA" = true ]; then
            echo "⚠️  WARNING: --force-schema flag detected!"
            echo "⚠️  This will RESET the schema and may LOSE DATA!"
            echo ""
            read -p "Type 'YES' to continue: " confirm
            if [ "$confirm" != "YES" ]; then
                echo "❌ Aborted."
                exit 1
            fi
            echo "🔧 Force syncing schema (with potential data loss)..."
            npx prisma db push --accept-data-loss
        else
            echo "ℹ️  Attempting safe schema migration..."
            echo "   This will add new tables/columns but preserve existing data."
            echo ""
            # Try to push without accept-data-loss first (safe migrations only)
            if npx prisma db push; then
                echo "✅ Schema updated safely."
            else
                echo ""
                echo "❌ Schema changes require data loss or manual migration."
                echo "   Options:"
                echo "   1. Run with --force-schema to force sync (LOSES DATA)"
                echo "   2. Manually review and apply schema changes"
                echo "   3. Create and run custom migration SQL"
                exit 1
            fi
        fi
    else
        echo "ℹ️  Database has tables but no data. Safe to sync schema."
        npx prisma db push --accept-data-loss
    fi
else
    echo "ℹ️  Database is empty. Creating initial schema..."
    npx prisma db push --accept-data-loss
fi

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

# Save deployed version
echo "$RUN_ID" > "$DEPLOYED_VERSION_FILE"
echo "💾 Saved deployed version: $RUN_ID"

echo ""
echo "✅ Update complete!"
