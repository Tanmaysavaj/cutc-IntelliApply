# 🧪 Test Data Persistence & Auto-Redirect Features

**Status:** Ready for Testing  
**Date:** August 13, 2026  
**Features to Test:** 2 (Data Persistence + Auto-Redirect)

---

## 📋 Pre-Test Checklist

Before you start testing, verify:

- [ ] Backend running on `http://localhost:8000`
- [ ] Frontend running on `http://localhost:3000` 
- [ ] Changes are pulled from `feature/backend-api` branch
- [ ] Browser console open (F12) to check for errors
- [ ] Browser DevTools available (for localStorage inspection)

---

## 🚀 Setup: Start Services

**Terminal 1: Backend**
```bash
cd /projects/sandbox/cutc-IntelliApply/backend
python -m uvicorn app.main:app --reload --port 8000
```

**Terminal 2: Frontend**
```bash
cd /projects/sandbox/cutc-IntelliApply/ui_frontend
npm run dev
```

**Browser:** Open `http://localhost:3000`

---

## 📝 TEST 1: Resume Data Persistence

**Objective:** Verify resume data survives page refresh

### Steps:

1. **Upload Resume**
   - Click "Upload Resume" button
   - Select a sample PDF file
   - Wait for "Resume parsed successfully!" notification
   - See resume data displayed (skills, experience, education)

2. **Verify Data Stored**
   - Open DevTools (F12)
   - Go to Application → Local Storage → http://localhost:3000
   - Look for key: `intelliapply_resume`
   - You should see JSON data with resume information
   - ✅ **PASS if:** Key exists and contains resume JSON

3. **Refresh Page**
   - Press Ctrl+R (or Cmd+R on Mac) to refresh
   - Wait for page to load

4. **Verify Data Persisted**
   - Resume section should still show:
     - ✅ Uploaded filename
     - ✅ Skills (hard and soft)
     - ✅ Work experience
     - ✅ Education
     - ✅ Certifications
   - Check browser console for: `✓ Loaded resume from storage` message
   - ✅ **PASS if:** All resume data displays without re-uploading

### Expected Console Output:
```
✓ Resume saved to localStorage
✓ Loaded resume from storage
```

### Success Indicator:
```
✅ Resume data persists after refresh
✅ Can see skills, experience, education after refresh
✅ No need to re-upload resume
```

---

## 📝 TEST 2: Job Data Persistence

**Objective:** Verify job data survives page navigation

### Steps:

1. **Extract a Job (Text Description)**
   - Click "Jobs" in navigation
   - Click "Paste Description" tab
   - Paste a job description (or use sample text)
   - Click "Extract Job"
   - Wait for success notification

2. **Verify Job Displays**
   - Job card should show:
     - ✅ Job title
     - ✅ Company name
     - ✅ Location
     - ✅ Required skills
     - ✅ Responsibilities

3. **Verify Data Stored**
   - Open DevTools (F12)
   - Go to Application → Local Storage
   - Look for these keys:
     - `intelliapply_job` (main job data)
     - `intelliapply_job_metadata` (metadata)
   - Both should exist and contain JSON
   - ✅ **PASS if:** Both keys exist with data

4. **Navigate Away**
   - Click "History" in navigation
   - Page should change to History

5. **Navigate Back**
   - Click "Jobs" in navigation
   - You're back on Jobs page

6. **Verify Job Data Still There**
   - Job card should still display with:
     - ✅ Same job title
     - ✅ Same company
     - ✅ Same skills
     - ✅ Same responsibilities
   - Check console for: `✓ Loaded job from storage`
   - ✅ **PASS if:** Job data displays without re-extraction

### Expected Console Output:
```
✓ Job data saved to localStorage
✓ Loaded job from storage
```

### Success Indicator:
```
✅ Job data persists when navigating pages
✅ Can see job details after navigating back
✅ No need to re-extract job
```

---

## 📝 TEST 3: Full Refresh with Both Data

**Objective:** Verify both resume and job data survive full page refresh

### Steps:

1. **Upload Resume**
   - Follow steps from TEST 1, step 1-2
   - Verify resume displays

2. **Extract Job**
   - Click "Jobs"
   - Extract a job (any method: text/URL/PDF)
   - Verify job displays

3. **Full Page Refresh**
   - Press Ctrl+R to refresh entire page
   - Wait for page to fully load

4. **Verify Both Data Loaded**
   - Resume page should show resume data when clicked
   - Jobs page should show job data when clicked
   - Both should load from storage without API calls
   - Check console for both load messages:
     - `✓ Loaded resume from storage`
     - `✓ Loaded job from storage`

5. **Test Analysis Page**
   - Click "Analysis" in navigation
   - Both resume and job data should be available
   - Should be able to see match analysis
   - ✅ **PASS if:** All data displays correctly

### Success Indicator:
```
✅ Both resume and job data load after full refresh
✅ Analysis page has access to both datasets
✅ No data loss on refresh
```

---

## 📝 TEST 4: Auto-Redirect After Job Extraction

**Objective:** Verify automatic redirect to Analysis page after job extraction

### Steps:

1. **Go to Jobs Page**
   - Click "Jobs" in navigation
   - Make sure you're on Jobs page

2. **Extract a Job**
   - Click "Paste Description" tab
   - Paste job description (or use text/URL/PDF)
   - Click "Extract Job"
   - **Watch what happens:**
     - See "✓ Job extracted successfully!" notification
     - After ~1.5 seconds, page should automatically redirect

3. **Verify Auto-Redirect**
   - Page should automatically switch to "Analysis" page
   - Verify navigation link highlights "Analysis"
   - ✅ **PASS if:** Page redirects automatically (not manually)

4. **Verify Data Available on Analysis Page**
   - Job data should display (title, company, skills, etc.)
   - Can see match analysis section
   - ✅ **PASS if:** Job data immediately available for analysis

### Expected Behavior:
```
1. Click "Extract Job"
   ↓
2. See success notification
   ↓
3. Wait ~1.5 seconds
   ↓
4. Automatically redirected to Analysis page
   ↓
5. Job data ready for analysis ✅
```

### Success Indicator:
```
✅ Auto-redirect works (no manual navigation)
✅ Redirect happens after success notification
✅ Analysis page immediately shows job data
✅ Delay is ~1.5 seconds (noticeable but not annoying)
```

---

## 📝 TEST 5: Auto-Redirect with URL Input

**Objective:** Verify auto-redirect works with all input methods

### Steps:

1. **Go to Jobs Page**
   - Click "Jobs" in navigation

2. **Extract from URL**
   - Click "Paste Job URL" tab
   - Paste LinkedIn URL: `https://www.linkedin.com/jobs/view/4412417453/`
   - Click "Extract Job"

3. **Watch for Redirect**
   - Should see: "✓ Job extracted successfully!"
   - After ~1.5 seconds: Auto-redirect to Analysis
   - ✅ **PASS if:** Redirects automatically

### Expected Result:
```
✅ URL extraction works
✅ Auto-redirect works with URL
✅ Analysis page shows extracted job
```

---

## 📝 TEST 6: Auto-Redirect with PDF Upload

**Objective:** Verify auto-redirect works with PDF upload

### Steps:

1. **Go to Jobs Page**
   - Click "Jobs" in navigation

2. **Upload PDF**
   - Click "Upload PDF" tab
   - Select a PDF file with job description
   - Click "Upload PDF"

3. **Watch for Redirect**
   - Should see success notification
   - After ~1.5 seconds: Auto-redirect to Analysis
   - ✅ **PASS if:** Redirects automatically

4. **On Analysis Page**
   - Job data from PDF should display
   - Can analyze match
   - ✅ **PASS if:** PDF job data available

### Expected Result:
```
✅ PDF extraction works
✅ Auto-redirect works with PDF
✅ Analysis page shows extracted job from PDF
```

---

## 🔍 Browser DevTools Inspection

### Check localStorage Content

Open DevTools (F12) and run in Console:

```javascript
// Check resume data
const resume = JSON.parse(localStorage.getItem('intelliapply_resume'));
console.log('Resume:', resume);

// Check job data
const job = JSON.parse(localStorage.getItem('intelliapply_job'));
console.log('Job:', job);

// Check job metadata
const metadata = JSON.parse(localStorage.getItem('intelliapply_job_metadata'));
console.log('Metadata:', metadata);

// Get storage stats
const keys = Object.keys(localStorage);
console.log('All keys:', keys);
console.log('Total keys:', keys.length);
```

### Expected Output:
```javascript
Resume: { resume_id: "...", status: "completed", data: {...} }
Job: { job_title: "...", company_name: "...", ... }
Metadata: { job_id: "...", extracted_at: "...", ... }
All keys: ["intelliapply-theme", "intelliapply_resume", "intelliapply_job", "intelliapply_job_metadata"]
Total keys: 4
```

---

## ✅ Test Results Template

Use this to record your test results:

```
═══════════════════════════════════════════════════════════════
                    TEST RESULTS SUMMARY
═══════════════════════════════════════════════════════════════

Test Date: _____________________
Tester Name: ___________________
Branch: feature/backend-api

TEST 1: Resume Data Persistence
Status: [ ] PASS  [ ] FAIL
Notes: ____________________________________

TEST 2: Job Data Persistence
Status: [ ] PASS  [ ] FAIL
Notes: ____________________________________

TEST 3: Full Refresh with Both Data
Status: [ ] PASS  [ ] FAIL
Notes: ____________________________________

TEST 4: Auto-Redirect After Extraction
Status: [ ] PASS  [ ] FAIL
Notes: ____________________________________

TEST 5: Auto-Redirect with URL Input
Status: [ ] PASS  [ ] FAIL
Notes: ____________________________________

TEST 6: Auto-Redirect with PDF Upload
Status: [ ] PASS  [ ] FAIL
Notes: ____________________________________

═══════════════════════════════════════════════════════════════

Browser Console Errors: [ ] NONE  [ ] YES (describe)
_________________________________________________________________

localStorage Data: [ ] VERIFIED  [ ] NOT FOUND

Overall Result: [ ] ALL PASS ✅  [ ] SOME FAILED ❌

Comments/Issues: _________________________________________________
_________________________________________________________________

Ready for Production: [ ] YES  [ ] NO

═══════════════════════════════════════════════════════════════
```

---

## 🐛 Troubleshooting

### Issue: Data Not Persisting After Refresh

**Check:**
1. Open DevTools → Application → Local Storage
2. Are the `intelliapply_*` keys present?
3. If NO:
   - Check browser console for errors (F12 → Console)
   - Verify browser allows localStorage (not in private mode)
   - Try clearing browser cache and re-extracting data
4. If YES:
   - Check if data is valid JSON
   - Try importing the storage utility and calling `loadResume()`

### Issue: Auto-Redirect Not Working

**Check:**
1. Did job extraction succeed? (Check notification)
2. Open DevTools → Console for JavaScript errors
3. Check if `window.location.href` redirect is firing
4. Try refreshing page manually to test redirect destination

### Issue: Only One Data Type Persists

**If only resume persists but not job:**
1. Verify job extraction succeeded (check notification)
2. Check if job is in localStorage (DevTools)
3. Check extractAndSaveJob function was called
4. Look for errors in browser console

**If only job persists but not resume:**
1. Verify resume upload succeeded
2. Check if resume is in localStorage (DevTools)
3. Check handleUpload function was called
4. Look for errors in browser console

### Issue: Redirect Happening Too Fast/Slow

**Current timing:** 1.5 seconds (1500ms)

**To adjust:** Edit `ui_frontend/app/page.tsx`

Find this line:
```typescript
setTimeout(() => {
  window.location.href = '/?page=analysis';
}, 1500);  // ← Change this number (in milliseconds)
```

**Examples:**
- `1000` = 1 second (faster)
- `2000` = 2 seconds (slower)
- `1500` = 1.5 seconds (current)

---

## 📊 Test Metrics

| Test | Importance | Status | Notes |
|------|-----------|--------|-------|
| Resume Persistence | 🔴 Critical | [ ] | Must work |
| Job Persistence | 🔴 Critical | [ ] | Must work |
| Both Persist | 🟠 Important | [ ] | Comprehensive test |
| Auto-Redirect | 🟠 Important | [ ] | UX improvement |
| All Input Methods | 🟡 Nice-to-have | [ ] | Consistency |

---

## 🎯 Success Criteria

**All tests PASS if:**
- ✅ Resume data survives refresh
- ✅ Job data survives navigation
- ✅ Both persist together
- ✅ Auto-redirect to Analysis works
- ✅ All input methods redirect correctly
- ✅ No console errors
- ✅ localStorage contains expected keys

**Ready for Production if:**
- ✅ All 6 tests pass
- ✅ No data loss observed
- ✅ Auto-redirect timing feels natural
- ✅ No errors in console

---

## 🚀 After Testing

### If All Tests Pass ✅

1. **Update task list:** Mark tasks 5 & 6 as complete
2. **Prepare for merge:**
   - All features working
   - Ready to merge feature/backend-api → main
   - Can deploy to production

### If Any Test Fails ❌

1. **Document the failure:**
   - Which test failed?
   - What was expected vs actual?
   - Any console errors?

2. **Debug:**
   - Check browser DevTools
   - Review storage.ts code
   - Check page.tsx changes

3. **Report findings:**
   - I can help fix any issues
   - May need code updates
   - Re-test after fixes

---

## 💡 Pro Tips

1. **Keep DevTools Open**
   - DevTools → Application → Local Storage
   - Watch storage keys update as you extract data

2. **Watch Browser Console**
   - DevTools → Console
   - Should see storage log messages (✓ saved, ✓ loaded)

3. **Test All Branches**
   - Test resume persistence
   - Test job persistence
   - Test both together
   - Test with page refresh
   - Test with navigation

4. **Test All Input Methods**
   - Text description input
   - URL input (LinkedIn)
   - PDF file upload
   - All should redirect

5. **Check Timing**
   - 1.5 second delay should feel natural
   - Should see notification before redirect
   - Should have time to notice the redirect

---

**Ready to test? Start with TEST 1!**

---

**Testing Guide Created:** August 13, 2026  
**Status:** Ready for Manual Testing  
**Features:** Data Persistence + Auto-Redirect  
**Expected Result:** All tests should PASS ✅
