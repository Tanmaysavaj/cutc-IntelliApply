# Complete Guide: Running Frontend & Backend with Job Processing

This guide shows you how to set up and run both the backend and frontend applications with the new job processing functionality.

---

## 🚀 Quick Start (5 minutes)

### Prerequisites
Make sure you have installed:
- Python 3.8+
- Node.js 16+
- npm or yarn
- Git

### Terminal Setup (2 terminals side-by-side)

**Terminal 1: Backend**
```bash
cd /projects/sandbox/cutc-IntelliApply/backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
python -m uvicorn app.main:app --reload --port 8000
```

**Terminal 2: Frontend**
```bash
cd /projects/sandbox/cutc-IntelliApply/ui_frontend
npm install
npm run dev
```

**Result**:
- ✅ Backend running: http://localhost:8000
- ✅ Frontend running: http://localhost:3000
- ✅ Job processing ready to use

---

## 📋 Step-by-Step Setup

### BACKEND SETUP

#### Step 1: Navigate to Backend Directory
```bash
cd /projects/sandbox/cutc-IntelliApply/backend
```

#### Step 2: Create Python Virtual Environment
```bash
# On macOS/Linux
python3 -m venv venv
source venv/bin/activate

# On Windows
python -m venv venv
venv\Scripts\activate
```

**Verify activation:**
```bash
which python  # Should show path to venv python
# or on Windows: where python
```

#### Step 3: Install Dependencies
```bash
pip install --upgrade pip
pip install -r requirements.txt
```

**Expected output:** Shows packages being installed (uvicorn, fastapi, pydantic, etc.)

#### Step 4: Set Environment Variables
```bash
# Copy example env file
cp .env.example .env

# Edit .env if needed (usually defaults are fine for local dev)
cat .env
```

**Check for these variables:**
- `OPENAI_API_KEY` (if using OpenAI features)
- `TAVILY_API_KEY` (for company research)
- Other API keys as needed

#### Step 5: Start Backend Server
```bash
python -m uvicorn app.main:app --reload --port 8000
```

**Success indicators:**
```
INFO:     Uvicorn running on http://127.0.0.1:8000
INFO:     Application startup complete
```

#### Step 6: Verify Backend is Running
```bash
# In another terminal, test health endpoint
curl http://localhost:8000/api/health

# Should return:
# {"status":"ok","service":"IntelliApply Backend"}
```

**Access API Documentation:**
- Browser: http://localhost:8000/docs
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

---

### FRONTEND SETUP

#### Step 1: Navigate to Frontend Directory
```bash
cd /projects/sandbox/cutc-IntelliApply/ui_frontend
```

#### Step 2: Install Dependencies
```bash
npm install
```

**Expected output:** Shows packages being installed (react, next, typescript, etc.)

**Troubleshooting:**
- If errors occur, try: `npm install --legacy-peer-deps`
- For fresh install: `rm -rf node_modules && npm install`

#### Step 3: Configure Environment Variables
```bash
# Copy example env file
cp .env.example .env.local

# Edit if needed
cat .env.local
```

**Key variables to check:**
```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

This tells the frontend where the backend is running.

#### Step 4: Start Frontend Development Server
```bash
npm run dev
```

**Success indicators:**
```
  ▲ Next.js 14.0.0
  - Local:        http://localhost:3000
  - Environments: .env.local
```

#### Step 5: Open in Browser
```bash
# Automatically opens, or go to:
http://localhost:3000
```

---

## 🧪 Verify Everything Works

### Quick Test Checklist

#### Test 1: Backend Health Check
```bash
curl http://localhost:8000/api/health
```

Expected response:
```json
{"status":"ok","service":"IntelliApply Backend"}
```

#### Test 2: Backend API Documentation
```
Open: http://localhost:8000/docs
```

Should show Swagger UI with all endpoints

#### Test 3: Frontend Loads
```
Open: http://localhost:3000
```

Should see the IntelliApply landing page

#### Test 4: Test Resume Upload (Optional)
1. Go to http://localhost:3000
2. Click "Upload Resume"
3. Choose a test PDF file
4. Should process and show resume data

#### Test 5: Test Job Processing (The New Feature!)
1. Go to http://localhost:3000 → Jobs page
2. Try all 3 input methods:
   - **URL Tab**: Paste a job URL (e.g., LinkedIn job link)
   - **Text Tab**: Paste job description
   - **PDF Tab**: Upload a job posting PDF
3. Click "Extract Job"
4. Verify job details display correctly

---

## 🔧 Common Issues & Solutions

### Backend Issues

#### Error: "Port 8000 already in use"
```bash
# Solution 1: Use different port
python -m uvicorn app.main:app --reload --port 8001

# Solution 2: Kill process on port 8000
# On macOS/Linux:
lsof -ti:8000 | xargs kill -9

# On Windows:
netstat -ano | findstr :8000
taskkill /PID <PID> /F
```

#### Error: "ModuleNotFoundError: No module named 'fastapi'"
```bash
# Solution: Ensure virtual environment is activated
source venv/bin/activate  # macOS/Linux
# or
venv\Scripts\activate  # Windows

# Then reinstall requirements
pip install -r requirements.txt
```

#### Error: "CORS error" in browser console
```
Solution: Backend CORS is likely misconfigured
- Check app/main.py for CORS settings
- Ensure frontend URL (localhost:3000) is allowed
```

### Frontend Issues

#### Error: "Failed to connect to backend"
```
Solution: Check backend URL
1. Verify backend is running on port 8000
2. Check .env.local has: NEXT_PUBLIC_API_URL=http://localhost:8000
3. Restart frontend: npm run dev
```

#### Error: "Cannot find module" during npm install
```bash
# Solution: Clear cache and reinstall
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

#### Port 3000 already in use
```bash
# Solution 1: Use different port
npm run dev -- -p 3001

# Solution 2: Kill process on port 3000
# On macOS/Linux:
lsof -ti:3000 | xargs kill -9

# On Windows:
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

---

## 📊 Architecture Overview

```
USER BROWSER (http://localhost:3000)
        ↓
    Frontend (Next.js)
    ui_frontend/
    ├── app/page.tsx (JobsPage, AnalysisPage)
    ├── lib/api.ts (API functions)
    └── tests/ (test suites)
        ↓ (HTTP requests)
    Backend (FastAPI) (http://localhost:8000)
    backend/app/
    ├── api/jobs.py (POST /api/jobs endpoint)
    ├── services/ (job extraction logic)
    └── models/job.py (job data structure)
```

---

## 🔄 Data Flow Example

### When User Processes a Job from URL:

1. **User enters URL** in frontend Jobs page
2. **Frontend calls**: `processJobFromURL(url)`
3. **Function sends HTTP POST** to `http://localhost:8000/api/jobs`
4. **Backend receives request** and:
   - Fetches URL content
   - Extracts text from HTML
   - Parses job details using LLM
   - Returns structured job data
5. **Frontend receives response** and:
   - Displays job card with extracted details
   - Shows job title, company, skills, etc.
6. **User can click "Analyze Match"** to see match analysis

---

## 📝 Testing the Integration

### Test 1: Text Description Processing (Fastest)
```bash
# Method 1: Via Frontend UI
1. Open http://localhost:3000
2. Go to Jobs page
3. Click "Paste Description" tab
4. Paste this text:

Senior Python Developer - Remote
Company: TechCorp
Location: San Francisco, CA

Responsibilities:
- Build backend services
- Write APIs
- Optimize databases

Required Skills:
- Python 3.8+
- FastAPI
- PostgreSQL
- Docker
- AWS

Experience: 5+ years

5. Click "Extract Job"
6. Should see job details in card
```

### Test 2: URL Processing (Requires Internet)
```bash
# Method 1: Via Frontend UI
1. Open http://localhost:3000
2. Go to Jobs page
3. Click "Paste Job URL" tab
4. Paste a job URL (any job posting)
5. Click "Extract Job"
6. Monitor backend logs to see processing
```

### Test 3: PDF Upload
```bash
# Method 1: Via Frontend UI
1. Create a test PDF with job description
2. Open http://localhost:3000
3. Go to Jobs page
4. Click "Upload PDF" tab
5. Click "Choose PDF"
6. Select your test PDF
7. Should process and extract job data
```

### Test 4: Run Automated Tests
```bash
# From frontend directory
cd ui_frontend

# Run all tests
npm test

# Run specific test file
npm test job-processing.test.ts

# Run critical tests
npm test verify-integration.ts

# Should see: PASS (46/46 tests)
```

---

## 🐛 Debugging

### Enable Verbose Logging

#### Backend Logging
```python
# In backend/app/main.py, add:
import logging
logging.basicConfig(level=logging.DEBUG)
```

Then in terminal:
```bash
python -m uvicorn app.main:app --reload --port 8000 --log-level debug
```

#### Frontend Logging
```typescript
// In ui_frontend/lib/api.ts, add at top:
const DEBUG = true;

// Then in functions:
if (DEBUG) console.log('Request details:', { url, formData });
if (DEBUG) console.log('Response:', response);
```

### Check Browser Console
```
Chrome/Firefox → F12 → Console tab
Look for:
- Errors (red)
- Warnings (yellow)
- Network requests (Network tab)
```

### Check Backend Logs
```
Watch terminal where backend is running
Should show:
- Request received
- Processing details
- Response sent
```

---

## 📊 Monitoring

### Real-time Monitoring Setup

#### Terminal 1: Backend with verbose output
```bash
cd backend
python -m uvicorn app.main:app --reload --port 8000 --log-level info
```

#### Terminal 2: Frontend
```bash
cd ui_frontend
npm run dev
```

#### Terminal 3: Optional - Watch logs
```bash
# On macOS/Linux, if using file logging:
tail -f backend/logs/app.log
```

---

## 🎯 Workflow: Development

### Daily Development Workflow

```bash
# Morning: Start both servers

# Terminal 1 - Backend
cd backend
source venv/bin/activate
python -m uvicorn app.main:app --reload --port 8000

# Terminal 2 - Frontend  
cd ui_frontend
npm run dev

# Terminal 3 - Optional: Run tests as you make changes
cd ui_frontend
npm test -- --watch

# During development:
# - Edit files
# - Save
# - Changes auto-reload
# - Test in browser at http://localhost:3000

# When done:
# - Ctrl+C in each terminal to stop servers
```

---

## 📦 Production Preparation

### Build for Production

#### Backend
```bash
cd backend

# Install production dependencies
pip install -r requirements.txt

# Run with production server (Gunicorn)
gunicorn -w 4 -b 0.0.0.0:8000 app.main:app
```

#### Frontend
```bash
cd ui_frontend

# Build for production
npm run build

# Start production server
npm start
```

### Environment Variables for Production

**Backend (.env)**
```
OPENAI_API_KEY=your_actual_key
TAVILY_API_KEY=your_actual_key
ENVIRONMENT=production
LOG_LEVEL=info
```

**Frontend (.env.production)**
```
NEXT_PUBLIC_API_URL=https://your-backend-domain.com
```

---

## ✅ Complete Setup Checklist

### Before Starting
- [ ] Python 3.8+ installed
- [ ] Node.js 16+ installed
- [ ] Git cloned repository
- [ ] 2 terminals available

### Backend Setup
- [ ] Navigated to backend directory
- [ ] Virtual environment created
- [ ] Virtual environment activated
- [ ] pip upgraded
- [ ] requirements.txt installed
- [ ] .env file configured
- [ ] Backend started on port 8000
- [ ] Health check passes (curl localhost:8000/api/health)

### Frontend Setup
- [ ] Navigated to ui_frontend directory
- [ ] npm install completed
- [ ] .env.local configured with API_URL
- [ ] Frontend started on port 3000
- [ ] Browser loads http://localhost:3000

### Verification
- [ ] Backend API docs load (http://localhost:8000/docs)
- [ ] Frontend landing page displays
- [ ] Can access Jobs page
- [ ] Can see 3 input tabs (URL, Text, PDF)
- [ ] No console errors
- [ ] All tests pass (npm test)

### Ready to Use!
- [ ] Resume upload works
- [ ] Text job extraction works
- [ ] URL job processing works
- [ ] PDF job upload works
- [ ] Analysis page shows real data
- [ ] Error handling works

---

## 🔗 Quick Links

| What | Where | Command |
|------|-------|---------|
| Frontend | http://localhost:3000 | `npm run dev` |
| Backend | http://localhost:8000 | `python -m uvicorn app.main:app --reload` |
| API Docs | http://localhost:8000/docs | (automatic) |
| Tests | Terminal | `npm test` |
| Database | (file-based if used) | Check backend .env |

---

## 💡 Pro Tips

### Tip 1: Keep Servers Running
- Don't close terminals with running servers
- Use separate terminal windows/tabs
- Consider using terminal multiplexer (tmux, screen)

### Tip 2: Hot Reload Works
- Edit backend code → auto-reloads (uvicorn --reload)
- Edit frontend code → auto-refreshes in browser
- Edit test files → re-run tests

### Tip 3: Clear Cache if Issues
```bash
# Frontend cache
npm cache clean --force
rm -rf .next

# Browser cache
# Chrome: Ctrl+Shift+Delete (or Cmd+Shift+Delete)
```

### Tip 4: Use Environment Files
- Don't hardcode URLs
- Use .env and .env.local
- Different configs per environment

### Tip 5: Monitor Console
- Always have browser console open (F12)
- Watch for errors and warnings
- Check Network tab for API calls

---

## 🆘 Still Having Issues?

### Check These Resources

1. **Backend Errors**: Check `backend/README.md`
2. **Frontend Errors**: Check `ui_frontend/README.md`
3. **API Documentation**: http://localhost:8000/docs
4. **Test Guide**: Read `JOB_PROCESSING_TESTS_README.md`
5. **Troubleshooting**: Read `INTEGRATION_TEST_SUMMARY.md`

### Debug Steps

1. Verify both servers are running
2. Check URLs in browser:
   - http://localhost:8000/api/health (should work)
   - http://localhost:3000 (should show landing page)
3. Check browser console for errors (F12)
4. Check terminal output for error messages
5. Check .env files are configured
6. Run tests: `npm test` to verify integration

---

## 📞 Need Help?

### Common Questions

**Q: How do I stop the servers?**
A: Press `Ctrl+C` in the terminal where they're running

**Q: How do I restart them?**
A: Press Ctrl+C to stop, then run the command again

**Q: Do I need to reactivate the virtual environment each time?**
A: Yes, in each new terminal session: `source venv/bin/activate`

**Q: Can I run multiple instances?**
A: Yes, on different ports: `--port 8001`, `-p 3001`

**Q: Where are logs stored?**
A: Backend logs in terminal output, frontend in browser console

---

## 🎉 You're All Set!

Now you can:
1. ✅ Run backend on http://localhost:8000
2. ✅ Run frontend on http://localhost:3000
3. ✅ Process jobs from 3 different sources
4. ✅ Test the complete integration
5. ✅ Develop and iterate

**Happy coding!** 🚀

---

**Last Updated**: August 13, 2026  
**Status**: ✅ Complete and Ready
