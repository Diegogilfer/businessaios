# First Steps — Get Started in 10 Minutes

## 1️⃣ Download & Setup (3 minutes)

```bash
# Download
unzip BusinessAIOS_Backend_v1.0.0_PRODUCTION_READY.zip
cd BusinessAIOS_v080

# Setup (auto-installs everything)
bash setup.sh

# This will:
# ✅ Create Python venv
# ✅ Install all dependencies
# ✅ Install Playwright browsers
# ✅ Create .env file
```

## 2️⃣ Configure (2 minutes)

```bash
# Edit .env with your credentials
nano .env

# You need AT MINIMUM:
SUPABASE_URL=your-supabase-url
SUPABASE_KEY=your-supabase-key
GEMINI_API_KEY=your-gemini-key
```

For full setup, see `.env.example` in the ZIP.

## 3️⃣ Start (1 minute)

```bash
python main.py

# You should see:
# ✅ AUTONOMOUS LOOP active
# ✅ RAG + SEMANTIC SEARCH enabled
# ✅ SCHEDULING active (next scan @ 2 AM UTC)
# ✅ WEBHOOKS ready
# ✅ ANALYTICS live
```

## 4️⃣ Test (4 minutes)

### Open Swagger UI
```
http://localhost:8000/docs
```

### Run Basic Tests
```bash
# Health check
curl http://localhost:8000/health

# Create a test tenant
curl -X POST http://localhost:8000/saas/tenants \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","email":"test@example.com","plan":"free"}'

# Get analytics
curl http://localhost:8000/analytics/health
```

---

## 🎯 What's Running Now?

- ✅ **API Server** — 50+ endpoints ready
- ✅ **Database** — Connected to Supabase
- ✅ **Scheduler** — Daily tasks @ 2 AM & 6 AM UTC
- ✅ **WebSocket** — Real-time updates
- ✅ **Analytics** — System monitoring
- ✅ **Webhooks** — Ready for notifications

---

## 💡 Next Steps (Pick One)

### Option A: Learn the System
1. Read `README_FINAL.md` (10 min)
2. Check out `ARCHITECTURE.md` (20 min)
3. Try API commands in `QUICK_REFERENCE.md` (15 min)

### Option B: Deploy to Production
1. Follow `DEPLOYMENT_GUIDE.md`
2. Choose platform (Railway, Docker, AWS)
3. Deploy in 30 minutes

### Option C: Start Monetizing
1. Read `MONETIZATION.md` (10 min)
2. Pick a revenue model
3. Create landing page
4. Launch beta

---

## 🆘 If Something Breaks

### Issue: Port 8000 in use
```bash
lsof -i :8000
kill -9 <PID>
python main.py
```

### Issue: Module not found
```bash
pip install -r requirements.txt --force-reinstall
python main.py
```

### Issue: Database connection fails
```bash
# Check .env
echo $SUPABASE_URL

# Check PostgreSQL
psql $DATABASE_URL
```

For more help, see `QUICK_REFERENCE.md` Troubleshooting section.

---

## 📚 Documentation Map

- **README_FINAL.md** — What is this? (start here)
- **QUICK_REFERENCE.md** — Copy-paste commands
- **DEPLOYMENT_GUIDE.md** — How to deploy
- **MONETIZATION.md** — How to make money
- **ARCHITECTURE.md** — How it works
- **INDEX.md** — Full project map

---

## ✅ Quick Validation Checklist

After setup, verify:

- [ ] `python main.py` starts without errors
- [ ] `curl http://localhost:8000/health` returns 200
- [ ] `curl http://localhost:8000/docs` opens Swagger UI
- [ ] You can see `/scheduling/status` shows scheduler running
- [ ] You can create a tenant via API

**All green?** You're ready to deploy or monetize. 🚀

---

**Diego, go. Start here. 10 minutes and you have everything running.**

