# 🧪 Manual Testing Instructions - Job UI Display

This document provides step-by-step instructions to manually test the job processing UI with real extracted data.

---

## ✅ Prerequisites - Setup Check

Before you start testing, ensure:

1. **You are on the correct branch:**
   ```bash
   git branch
   # Should show: * feature/backend-api
   ```

2. **Backend dependencies installed:**
   ```bash
   cd /projects/sandbox/cutc-IntelliApply/backend
   pip install -r requirements.txt
   ```

3. **Frontend dependencies installed:**
   ```bash
   cd /projects/sandbox/cutc-IntelliApply/ui_frontend
   npm install  # Already done - can verify with: ls node_modules | wc -l
   ```

---

## 🚀 STEP 1: Start Both Servers

### Terminal 1: Backend Server

```bash
cd /projects/sandbox/cutc-IntelliApply/backend
python -m uvicorn app.main:app --reload --port 8000
```

**Wait for this output:**
```
INFO:     Uvicorn running on http://127.0.0.1:8000
INFO:     Application startup complete
```

### Terminal 2: Frontend Server

```bash
cd /projects/sandbox/cutc-IntelliApply/ui_frontend
npm run dev
```

**Wait for this output:**
```
> next dev
  ▲ Next.js 14.x.x
  - Local:        http://localhost:3000
```

### Terminal 3 (Optional): Monitor Backend Logs

Keep the backend terminal visible to see extraction logs as tests run.

---

## 🌐 STEP 2: Open Browser

Open your browser and navigate to:
```
http://localhost:3000
```

You should see the IntelliApply landing page.

---

## 📋 TEST 1: Text Description Input

### Objective
Verify that pasting a job description extracts data and displays it correctly (instead of showing hardcoded mock data).

### Test Steps

1. **Navigate to Jobs Page**
   - Click "Jobs" in the navigation menu
   - You should see 3 tabs: "Paste Job URL", "Paste Description", "Upload PDF"

2. **Select "Paste Description" Tab**
   - Click the "Paste Description" tab

3. **Paste Test Job Description**
   - Copy and paste this complete job description:

```
Software Engineering Manager - Remote
Company: Tech Innovations Inc.
Location: San Francisco, CA (Remote)

About the Role:
Lead and mentor a team of 5-8 software engineers. Oversee the development of our cloud platform serving 100K+ users.

Key Responsibilities:
- Lead daily standups and weekly planning sessions
- Conduct code reviews and technical interviews
- Mentor team members on best practices and career growth
- Work with product managers to define technical requirements
- Manage sprint planning and capacity allocation
- Ensure code quality and system reliability
- Participate in on-call rotation for critical issues

Required Skills:
- 7+ years of software development experience
- 2+ years of team leadership experience
- Strong knowledge of cloud technologies (AWS/GCP/Azure)
- Experience with microservices architecture
- Proficiency in Python, Java, or Go
- Excellent communication and collaboration skills
- Experience with Agile/Scrum methodologies
- Strong problem-solving abilities

Preferred Skills:
- Experience managing distributed teams
- Knowledge of Kubernetes and containerization
- Background in system design and scalability
- Open source contribution history

Education:
Bachelor's degree in Computer Science or related field

Experience Level: Senior (7+ years)
Salary: $180,000 - $240,000
Benefits: Unlimited PTO, Health Insurance, 401k, Stock Options
```

4. **Click "Extract Job" Button**
   - Button should show loading state
   - Browser console should not show errors (F12 to open)

5. **Verify Backend Processing**
   - In Terminal 1 (Backend), you should see:
   ```
   Using job description text for job <UUID>
   Extracting job data from description for job <UUID>
   Job extraction validation passed for 'Software Engineering Manager' at 'Tech Innovations Inc.'
   Successfully processed job <UUID>
   INFO: 127.0.0.1:<port> - "POST /api/jobs HTTP/1.1" 200 OK
   ```

6. **Verify Frontend Display**
   - ✅ **Hardcoded table should HIDE** (the "Business Systems Analyst" section disappears)
   - ✅ **Real job card should appear** with:
     - Job Title: "Software Engineering Manager"
     - Company: "Tech Innovations Inc."
     - Location: "San Francisco, CA (Remote)"
     - Required Skills section with extracted skills
     - Key Responsibilities section
   - ✅ **Success notification should show:** "✓ Job extracted successfully!"
   - ✅ **No console errors** (check browser F12)

### Expected Result
✅ **PASS** - Real extracted job data displays, hardcoded section is hidden

---

## 📎 TEST 2: URL Input - LinkedIn Job

### Objective
Verify that extracting a job from a LinkedIn URL displays real extracted data.

### Test Steps

1. **Navigate to Jobs Page**
   - Click "Jobs" in navigation

2. **Select "Paste Job URL" Tab**
   - Click the "Paste Job URL" tab

3. **Paste LinkedIn Job URL**
   - Copy and paste this LinkedIn job link:
   ```
   https://www.linkedin.com/jobs/view/4412417453/
   ```
   - (Or use any valid LinkedIn job posting URL)

4. **Click "Extract Job" Button**
   - Button should show loading state
   - This may take 5-10 seconds (fetching URL)

5. **Verify Backend Processing**
   - In Terminal 1 (Backend), you should see:
   ```
   Normalized LinkedIn search URL to direct job URL: https://www.linkedin.com/jobs/view/4412417453/
   Using normalized URL: https://www.linkedin.com/jobs/view/4412417453/
   Fetching URL: https://www.linkedin.com/jobs/view/4412417453/
   HTTP 200 from https://www.linkedin.com/jobs/view/4412417453/
   Successfully extracted <X> characters from URL
   Successfully extracted job description from URL for job <UUID>
   Extracting job data from url for job <UUID>
   Job extraction validation passed for '<job_title>' at '<company>'
   Successfully processed job <UUID>
   INFO: 127.0.0.1:<port> - "POST /api/jobs HTTP/1.1" 200 OK
   ```

6. **Verify Frontend Display**
   - ✅ **Hardcoded table should HIDE**
   - ✅ **Real job card should appear** with:
     - Actual job title from LinkedIn
     - Actual company name
     - Location and other details
   - ✅ **Success notification:** "✓ Job extracted successfully!"
   - ✅ **No console errors**

### Expected Result
✅ **PASS** - Real LinkedIn job data displays

---

## 📄 TEST 3: PDF Upload

### Objective
Verify that uploading a PDF with a job description extracts and displays data correctly.

### Prerequisites
Create a test PDF with a job description:

```
Senior Backend Engineer - New York, NY

About Us:
We're building the next generation of cloud infrastructure.

Position Overview:
We're looking for an experienced Backend Engineer to lead the development of our microservices platform.

Key Responsibilities:
- Design and implement scalable APIs
- Optimize database queries for performance
- Lead code reviews and mentor junior engineers
- Collaborate with DevOps to improve deployment pipelines
- Participate in on-call rotation

Required Skills:
- 5+ years backend development experience
- Proficiency in Python, Go, or Rust
- Experience with PostgreSQL and Redis
- Kubernetes and Docker expertise
- Experience with Apache Kafka or RabbitMQ
- Strong system design knowledge

Preferred Skills:
- Experience with Prometheus and Grafana
- Background in distributed systems
- Open source contributions
- Experience with gRPC

Compensation:
- Salary: $200,000 - $260,000
- Equity: 0.5% - 1.5%
- Full benefits package
```

**Ways to create the PDF:**
- Use Google Docs → Download as PDF
- Use Word → Save as PDF
- Use any online text-to-PDF converter

### Test Steps

1. **Navigate to Jobs Page**
   - Click "Jobs" in navigation

2. **Select "Upload PDF" Tab**
   - Click the "Upload PDF" tab

3. **Click "Choose File" Button**
   - Select your test PDF

4. **Click "Upload PDF" Button**
   - Should show loading state

5. **Verify Backend Processing**
   - In Terminal 1 (Backend), you should see:
   ```
   Successfully extracted job description from PDF for job <UUID>
   Extracting job data from job_description_pdf for job <UUID>
   Job extraction validation passed for '<job_title>' at '<company>'
   Successfully processed job <UUID>
   INFO: 127.0.0.1:<port> - "POST /api/jobs HTTP/1.1" 200 OK
   ```

6. **Verify Frontend Display**
   - ✅ **Hardcoded table should HIDE**
   - ✅ **Real job card should appear** with extracted data
   - ✅ **Success notification:** "✓ PDF processed successfully!"
   - ✅ **No console errors**

### Expected Result
✅ **PASS** - Real PDF job data displays

---

## ❌ TEST 4: Error Scenarios

### Objective
Verify that error messages display correctly when extraction fails.

### Test 4A: Empty Text Input

1. **Go to "Paste Description" tab**
2. **Leave text empty**
3. **Click "Extract Job"**
4. **Expected Error Message:** "❌ [error from backend]"
5. **Hardcoded table should SHOW** (as fallback)

### Test 4B: Invalid URL

1. **Go to "Paste Job URL" tab**
2. **Paste invalid URL:** `https://invalid-domain-12345.com/jobs/9999`
3. **Click "Extract Job"**
4. **Expected:** Error message showing why URL couldn't be processed
5. **Hardcoded table should SHOW** (as fallback)

### Test 4C: Corrupted or Text PDF

1. **Create a simple text file (not a real job posting)**
2. **Convert to PDF**
3. **Upload it**
4. **Backend should show:**
   ```
   Job extraction validation failed: required_skills is empty
   ```
5. **Frontend should show:** "❌ Job extraction validation failed: required_skills is empty"
6. **Hardcoded table should SHOW** (as fallback)

### Test 4D: Oversized File

1. **Go to "Upload PDF" tab**
2. **Try to upload a file larger than 10MB**
3. **Expected:** Error message: "File too large. Maximum size is 10MB"
4. **Hardcoded table should SHOW**

### Expected Result
✅ **PASS** - All error scenarios show appropriate error messages

---

## 📊 TEST 5: Analysis Page

### Objective
Verify that after extracting a job, the Analysis page shows the real extracted job data.

### Test Steps

1. **Extract a job** using Test 1 (text description)
   - Verify job card appears

2. **Click "Analyze Match" button** on the job card
   - Should navigate to Analysis page

3. **On Analysis page, verify:**
   - ✅ Job title is displayed
   - ✅ Job details (skills, responsibilities) are shown
   - ✅ Job is NOT the hardcoded "Business Systems Analyst"
   - ✅ Data matches what was extracted

4. **Back to Jobs page**
   - Previous job card should still be visible

5. **Refresh page (Ctrl+R or Cmd+R)**
   - Job data should persist or behave appropriately

### Expected Result
✅ **PASS** - Analysis page displays real extracted job data

---

## 🔄 TEST 6: End-to-End Workflow

### Objective
Complete workflow from resume upload through job matching.

### Test Steps

1. **Upload Resume** (if not already done)
   - Go to home page
   - Click "Upload Resume"
   - Upload a sample PDF resume
   - Wait for "Successfully processed resume"

2. **Extract a Job**
   - Go to Jobs page
   - Use any of the 3 methods (URL, Text, PDF) to extract a job
   - Verify real job data displays

3. **Analyze Match**
   - Click "Analyze Match"
   - Should navigate to Analysis page
   - Should show match analysis between resume and job

4. **Verify Data Flow**
   - ✅ Resume data is accessible on Analysis page
   - ✅ Job data is accessible on Analysis page
   - ✅ Matching analysis is performed
   - ✅ No console errors

### Expected Result
✅ **PASS** - Complete workflow works end-to-end

---

## ✅ Verification Checklist

After all tests, verify:

### Frontend UI
- [ ] Hardcoded "Business Systems Analyst" table is HIDDEN after extraction
- [ ] Real job card DISPLAYS with extracted data
- [ ] Success notifications show: "✓ Job extracted successfully!"
- [ ] Error notifications show: "❌ [specific error]"
- [ ] No ❌ or 🔴 errors in browser console (F12)

### Backend Processing
- [ ] Backend logs show extraction validation passed
- [ ] HTTP 200 responses for successful extractions
- [ ] HTTP 422 responses with validation errors for failed extractions
- [ ] No Python exceptions or tracebacks in terminal

### All 3 Input Methods
- [ ] Text input extracts and displays real data
- [ ] URL input extracts and displays real data
- [ ] PDF input extracts and displays real data
- [ ] Error handling works for all 3 methods

### Error Handling
- [ ] Empty inputs show error messages
- [ ] Invalid inputs show appropriate errors
- [ ] Fallback mock table shows when extraction fails
- [ ] File size validation works (max 10MB)
- [ ] File type validation works (PDF only for PDF upload)

### Integration
- [ ] Frontend communicates with backend successfully
- [ ] No CORS errors
- [ ] API responses are handled correctly
- [ ] Error responses are properly formatted

---

## 📊 Test Results Summary

| Test | Status | Notes |
|------|--------|-------|
| Test 1: Text Input | [ ] PASS / [ ] FAIL | |
| Test 2: URL Input | [ ] PASS / [ ] FAIL | |
| Test 3: PDF Upload | [ ] PASS / [ ] FAIL | |
| Test 4: Error Scenarios | [ ] PASS / [ ] FAIL | |
| Test 5: Analysis Page | [ ] PASS / [ ] FAIL | |
| Test 6: End-to-End | [ ] PASS / [ ] FAIL | |
| **Overall** | [ ] PASS / [ ] FAIL | |

---

## 🐛 If Tests Fail

### Check Browser Console (F12)
- Look for red error messages
- Check Network tab to see API calls
- Note any error details

### Check Backend Terminal
- Look for Python exceptions
- Check if request was received
- Look for validation error messages

### Common Issues

**Issue: "Failed to connect to backend"**
- Verify backend is running on port 8000
- Check browser console Network tab
- Verify NEXT_PUBLIC_API_URL in .env.local

**Issue: "Hardcoded table still shows after extraction"**
- Verify ui_frontend/app/page.tsx has the fix (line ~237-248)
- Check if processedJobData state is being set
- Refresh page (might be caching)

**Issue: "Error message doesn't display"**
- Check if error response includes `error` field
- Verify API functions return `ErrorResponse` type
- Check console for errors

**Issue: "PDF doesn't process"**
- Verify file is valid PDF (not corrupted)
- Check file size is under 10MB
- Ensure PDF has readable text (not image-only)

---

## 🎯 Next Steps After Testing

### If All Tests Pass ✅
1. Review all changes
2. Commit any remaining changes
3. Push to feature/backend-api branch
4. Create Pull Request (if not already created)
5. Request team review
6. Merge to main after approval

### If Tests Fail ❌
1. Note which tests failed
2. Check the error details
3. Debug using the troubleshooting section
4. Fix the issue
5. Re-run the failed test
6. Once fixed, proceed with deployment

---

## 📝 Test Notes

Use this space to record your test results and observations:

```
Test Date: _______________
Tester: ___________________

Test 1 Notes:
_________________________________
_________________________________

Test 2 Notes:
_________________________________
_________________________________

Test 3 Notes:
_________________________________
_________________________________

Test 4 Notes:
_________________________________
_________________________________

Test 5 Notes:
_________________________________
_________________________________

Test 6 Notes:
_________________________________
_________________________________

Overall Status: _______________
Issues Found: __________________
Ready to Merge: [ ] Yes [ ] No
```

---

## 🚀 Final Submission

Once all tests pass:

1. **Mark task as complete**
2. **Push to feature/backend-api**
3. **Create/update PR with test results**
4. **Share results with team**
5. **Ready for production deployment**

---

**Last Updated:** August 13, 2026  
**Status:** Ready for Manual Testing  
**All Infrastructure:** ✅ In Place

