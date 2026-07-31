#!/usr/bin/env bash
# SPDX-License-Identifier: GPL-3.0-or-later
# Copyright (C) 2026 Alexandru Negoita

# Simple script to restart the Photolib application

echo "🔄 Restarting Photolib..."

# Stop any running instance
echo "⏹️  Stopping current process..."
pkill -9 -f "next start" 2>/dev/null || true
pkill -9 -f "next-server" 2>/dev/null || true

# Also kill anything on port 3000
if command -v lsof &> /dev/null; then
    lsof -ti:3000 | xargs -r kill -9 2>/dev/null || true
fi

# Wait a moment for process to fully stop
sleep 2

# Verify port is free
if netstat -tlnp 2>/dev/null | grep -q :3000 || ss -tlnp 2>/dev/null | grep -q :3000; then
    echo ""
    echo "❌ ERROR: Port 3000 is still in use!"
    echo ""
    echo "Process using port 3000:"
    netstat -tlnp 2>/dev/null | grep :3000 || ss -tlnp 2>/dev/null | grep :3000 || true
    echo ""
    echo "📋 Manual fix options:"
    echo "   1. Kill by process name:    pkill -9 -f 'next-server'"
    echo "   2. Kill by port (if lsof):  lsof -ti:3000 | xargs kill -9"
    echo "   3. Kill all node:           pkill -9 node"
    echo ""
    echo "After killing, run this script again."
    exit 1
fi

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
