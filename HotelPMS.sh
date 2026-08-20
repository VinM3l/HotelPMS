#!/bin/bash
# HotelPMS Launcher — macOS / Linux

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo ""
echo "  =========================================="
echo "   🏨  Hotel PMS — Starting..."
echo "  =========================================="
echo ""

# Check Node
if ! command -v node &>/dev/null; then
    echo "  ❌ Node.js not found!"
    echo "  Install it from: https://nodejs.org"
    exit 1
fi

# Install if needed
if [ ! -d "node_modules" ]; then
    echo "  📦 First run — installing packages (~1 min)..."
    npm install || { echo "  ❌ npm install failed"; exit 1; }
    echo ""
fi

# Check .env.local
if [ ! -f ".env.local" ]; then
    echo "  ⚠️  No .env.local found!"
    echo ""
    echo "  Copy .env.example to .env.local and fill in your Supabase credentials."
    echo "  Get them from: supabase.com → your project → Settings → API"
    exit 1
fi

echo "  ✅ Starting Hotel PMS at http://localhost:5173"
echo "  Keep this window open. Press Ctrl+C to stop."
echo ""

npm run dev
