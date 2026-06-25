#!/bin/bash
# BusinessAIOS v1.0.0 — Automated Setup Script

set -e

echo "╔════════════════════════════════════════════════════════╗"
echo "║   BusinessAIOS v1.0.0 — Automated Setup                ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""

# 1. Python venv
echo "1️⃣  Creating Python virtual environment..."
python3 -m venv venv
source venv/bin/activate

# 2. Dependencies
echo "2️⃣  Installing dependencies..."
pip install --upgrade pip
pip install -r requirements.txt

# 3. Playwright
echo "3️⃣  Installing Playwright browsers..."
python -m playwright install chromium

# 4. Environment
echo "4️⃣  Creating .env file..."
if [ ! -f .env ]; then
    cp .env.example .env
    echo "   ✅ .env created. EDIT IT with your credentials!"
else
    echo "   ℹ️  .env already exists"
fi

# 5. Database (local Postgres)
echo "5️⃣  Checking PostgreSQL..."
if command -v psql &> /dev/null; then
    echo "   ✅ PostgreSQL installed"
else
    echo "   ⚠️  PostgreSQL not found. Install: brew install postgresql (Mac) or apt-get install postgresql (Linux)"
fi

# 6. Summary
echo ""
echo "╔════════════════════════════════════════════════════════╗"
echo "║   ✅ Setup Complete!                                   ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""
echo "📋 Next steps:"
echo "1. Edit .env with your API credentials"
echo "2. Run database schema: SUPABASE_URL=... python setup_db.py"
echo "3. Start: python main.py"
echo "4. Visit: http://localhost:8000/docs"
echo ""
