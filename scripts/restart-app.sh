#!/usr/bin/env bash
# SPDX-License-Identifier: GPL-3.0-or-later
# Copyright (C) 2026 Alexandru Negoita

# Simple script to restart the Photolib application

echo "🔄 Restarting Photolib..."

# Stop any running instance
echo "⏹️  Stopping current process..."
pkill -f "next start" 2>/dev/null || true

# Wait a moment for process to fully stop
sleep 2

# Load environment variables and start
echo "▶️  Starting application..."
cd "$(dirname "$0")/.." || exit 1

set -a
source .env
set +a

nohup npm start > photolib.log 2>&1 &

# Wait and check if it started
sleep 3

if pgrep -f "next start" > /dev/null; then
    echo "✅ Application started successfully"
    echo "📊 Check status: curl http://localhost:3000/api/health"
    echo "📋 View logs: tail -f photolib.log"
else
    echo "❌ Failed to start application"
    echo "📋 Check logs: tail -50 photolib.log"
    exit 1
fi
