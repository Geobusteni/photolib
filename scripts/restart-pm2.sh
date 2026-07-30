#!/usr/bin/env bash
# SPDX-License-Identifier: GPL-3.0-or-later
# Copyright (C) 2026 Alexandru Negoita

# Restart Photolib using PM2 (recommended for production)

echo "🔄 Restarting Photolib with PM2..."

cd "$(dirname "$0")/.." || exit 1

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    echo "❌ PM2 is not installed"
    echo "📦 Install with: npm install -g pm2"
    exit 1
fi

# Check if app is already running in PM2
if pm2 describe photolib &> /dev/null; then
    echo "🔄 Restarting existing PM2 process..."
    pm2 restart photolib
else
    echo "▶️  Starting new PM2 process..."
    pm2 start npm --name "photolib" -- start
    pm2 save
fi

echo ""
echo "✅ Done!"
echo "📊 Status: pm2 status"
echo "📋 Logs:   pm2 logs photolib"
