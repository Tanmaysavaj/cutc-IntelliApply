# 🧪 RUN TESTS NOW - Quick Start Guide

**Ready to test the new features?** Follow this guide! ⚡

---

## ⚡ 5-Minute Quick Start

### Step 1: Start Backend (Terminal 1)
```bash
cd /projects/sandbox/cutc-IntelliApply/backend
python -m uvicorn app.main:app --reload --port 8000
```

**Wait for:**
```
INFO:     Uvicorn running on http://127.0.0.1:8000
INFO:     Application startup complete
```

### Step 2: Start Frontend (Terminal 2)
```bash
cd /projects/sandbox/cutc-IntelliApply/ui_frontend
npm run dev
```

**Wait for:**
```
  ▲ Next.js 14.x.x
  - Local:        http://localhost:3000
```

### Step 3: Open Browser
```
http://localhost:3000
```

### Step 4: Run First Test
Follow **TEST 1** from `TEST_PERSISTENCE_AND_REDIRECT.md`:
1. Upload a resume
2. Refresh page (Ctrl+R)
3. Resume data should still show ✅

---

## 🎯 Test Sequence (Complete Testing)

### Test Order (Recommended):
```
1. TEST 1: Resume Persistence (5 min) ✅ Start here
   ↓
2. TEST 2: Job Persistence (5 min)
   ↓
3. TEST 3: Both Data Persist (5 min)
   ↓
4. TEST 4: Auto-Redirect (3 min)
   ↓
5. TEST 5: Auto-Redirect URL (3 min)
   ↓
6. TEST 6: Auto-Redirect PDF (3 min)

Total Time: ~25 minutes
```

---

## 📋 Testing Checklist

### Pre-Test Setup
- [ ] Backend running on port 8000
- [ ] Frontend running on port 3000
- [ ] Browser open to http://localhost:3000
- [ ] DevTools open (F12)
- [ ] Have test files ready

### During Testing
- [ ] Follow test steps exactly
- [ ] Watch browser and backend logs
- [ ] Check DevTools localStorage
- [ ] Record pass/fail for each test
- [ ] Note any errors or issues

### After Each Test
- [ ] Check browser console (F12)
- [ ] Check DevTools Local Storage
- [ ] Verify data integrity
- [ ] Record result in summary

---

## 🚀 Quick Test Command Summary

**For Terminal 1 (Backend):**
```bash
cd /projects/sandbox/cutc-IntelliApply/backend && \
python -m uvicorn app.main:app --reload --port 8000
```

**For Terminal 2 (Frontend):**
```bash
cd /projects/sandbox/cutc-IntelliApply/ui_frontend && \
npm run dev
```

**Browser:**
```
http://localhost:3000
```

---

## 📊 Test Results Quick Reference

| # | Test | Duration | Expected Result |
|---|------|----------|-----------------|
| 1 | Resume Persist | 5 min | Data survives refresh ✅ |
| 2 | Job Persist | 5 min | Data survives nav ✅ |
| 3 | Both Persist | 5 min | Both load after refresh ✅ |
| 4 | Auto-Redirect | 3 min | Page auto-redirects ✅ |
| 5 | Redirect+URL | 3 min | URL extraction redirects ✅ |
| 6 | Redirect+PDF | 3 min | PDF extraction redirects ✅ |

**Total:** 6 tests, ~25 minutes, 100% pass rate expected ✅

---

## 🔍 DevTools Quick Reference

**Open DevTools:** F12 (Windows/Linux) or Cmd+Option+I (Mac)

**Check localStorage:**
```
DevTools → Application → Local Storage → http://localhost:3000
```

**Look for keys:**
- ✅ `intelliapply_resume`
- ✅ `intelliapply_job`
- ✅ `intelliapply_job_metadata`

**Run in Console:**
```javascript
// Quick check
const resume = JSON.parse(localStorage.getItem('intelliapply_resume'));
const job = JSON.parse(localStorage.getItem('intelliapply_job'));
console.log('Resume exists:', !!resume);
console.log('Job exists:', !!job);
```

---

## ✅ Success Indicators

### TEST 1 & 2 & 3 (Data Persistence)
✅ **PASS if:**
- Data visible after refresh
- localStorage keys exist
- Console shows: `✓ Loaded resume from storage`
- No console errors

❌ **FAIL if:**
- Data disappears after refresh
- localStorage keys missing
- Console errors appear

### TEST 4 & 5 & 6 (Auto-Redirect)
✅ **PASS if:**
- Job extraction succeeds
- Success notification appears
- After ~1.5 seconds: Page redirects to Analysis
- Analysis page shows job data
- No console errors

❌ **FAIL if:**
- No redirect happens
- Redirect happens too fast/slow
- Analysis page is empty
- Console errors appear

---

## 🎬 What You'll See

### During Resume Upload
```
1. Click "Upload Resume"
2. Select PDF
3. Watch backend logs: "Processing resume..."
4. See resume data displayed (skills, experience)
5. Success: "Resume parsed successfully!"
6. ✅ Data visible
```

### During Job Extraction
```
1. Go to Jobs page
2. Click "Paste Description" tab
3. Paste job text
4. Click "Extract Job"
5. Watch backend logs: "Extracting job data..."
6. See job card appear (title, company, skills)
7. Success: "✓ Job extracted successfully!"
8. After 1.5 seconds: Page auto-redirects to Analysis
9. ✅ Job data ready for analysis
```

### After Page Refresh
```
1. Browser loads
2. App starts
3. Console shows: "✓ Loaded resume from storage"
4. Console shows: "✓ Loaded job from storage"
5. Resume data displays
6. Job data displays
7. ✅ Everything still there!
```

---

## 📝 Simple Test Notes Template

```
═══════════════════════════════════════════════
           TEST SESSION NOTES
═══════════════════════════════════════════════

Date: _______________
Time: _______________
Tester: ______________

TEST 1 (Resume Persist):
Status: [ ] PASS [ ] FAIL
Issues: ___________________________________

TEST 2 (Job Persist):
Status: [ ] PASS [ ] FAIL
Issues: ___________________________________

TEST 3 (Both Persist):
Status: [ ] PASS [ ] FAIL
Issues: ___________________________________

TEST 4 (Auto-Redirect):
Status: [ ] PASS [ ] FAIL
Issues: ___________________________________

TEST 5 (Redirect+URL):
Status: [ ] PASS [ ] FAIL
Issues: ___________________________________

TEST 6 (Redirect+PDF):
Status: [ ] PASS [ ] FAIL
Issues: ___________________________________

═══════════════════════════════════════════════

Overall: [ ] ALL PASS [ ] SOME FAILED

Ready for Production: [ ] YES [ ] NO

═══════════════════════════════════════════════
```

---

## 🆘 If Something Goes Wrong

### Issue: Services Won't Start
```
Solution:
1. Check ports 8000 and 3000 are free
2. Kill old processes if needed
3. Restart services
4. Wait for startup messages
```

### Issue: Data Not Saving
```
Solution:
1. Check DevTools → Console for errors
2. Open DevTools → Local Storage
3. Are the keys there?
4. If not, check browser is not in private mode
```

### Issue: Auto-Redirect Not Working
```
Solution:
1. Check job extraction succeeded
2. Check browser console for JS errors
3. Wait full 1.5 seconds
4. Check Analysis page is accessible
```

---

## ⏱️ Time Estimate

- **Setup time:** 2-3 minutes
- **Test 1 time:** 5 minutes
- **Test 2 time:** 5 minutes
- **Test 3 time:** 5 minutes
- **Test 4 time:** 3 minutes
- **Test 5 time:** 3 minutes
- **Test 6 time:** 3 minutes

**Total:** ~27 minutes

---

## 🎯 What You Need

✅ **Minimum:**
- 2 terminals
- 1 browser
- This guide
- 25 minutes

✅ **Optimal:**
- 2 terminals
- 1 browser with DevTools
- Testing guide (`TEST_PERSISTENCE_AND_REDIRECT.md`)
- 25-30 minutes
- Notepad for results

---

## 🚀 START NOW!

```
Ready? Follow these steps:

1. Open Terminal 1 → Start Backend
2. Open Terminal 2 → Start Frontend
3. Open Browser → http://localhost:3000
4. Open `TEST_PERSISTENCE_AND_REDIRECT.md`
5. Run TEST 1 (Resume Persistence)
6. Continue through all 6 tests
7. Document results
8. Done! ✅
```

**Estimated time to first result:** 10 minutes  
**Estimated time to all results:** 30 minutes  
**Difficulty level:** Easy (just follow the guide)

---

## 📞 Need Help?

**If stuck:**
1. Check DevTools console for errors (F12)
2. Check backend terminal for errors
3. Read troubleshooting in `TEST_PERSISTENCE_AND_REDIRECT.md`
4. Check `DATA_PERSISTENCE_AND_REDIRECT.md` for technical details

---

## ✨ You've Got This!

Everything is set up and ready. Just follow the tests step-by-step and document the results. All features should work perfectly! 🎉

**Let's test it!** ⚡

---

**Testing Guide:** RUN_TESTS_NOW.md  
**Full Testing:** TEST_PERSISTENCE_AND_REDIRECT.md  
**Feature Details:** DATA_PERSISTENCE_AND_REDIRECT.md  
**Status:** ✅ READY TO TEST
