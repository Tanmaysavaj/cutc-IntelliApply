# Complete Testing Guide: Job Processing (3 Input Methods)

This guide walks you through testing all 3 job input methods with real data display.

---

## 🧪 Test Setup

### Prerequisites
- ✅ Backend running on http://localhost:8000
- ✅ Frontend running on http://localhost:3000
- ✅ Resume uploaded (for Analysis page testing)
- ✅ Browser console open (F12)

### Verify Setup
```bash
# In terminal, test backend
curl http://localhost:8000/api/health
# Should return: {"status":"ok","service":"IntelliApply Backend"}
```

---

## 📋 TEST 1: Text Description Input (Fastest & Most Reliable)

### Test Objective
Paste job description text and verify extracted data displays correctly.

### Test Data
Use this complete job description:

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

### Steps

1. **Open Frontend**
   - Go to http://localhost:3000
   - Navigate to **Jobs** page
   - Click **"Paste Description"** tab

2. **Paste Job Text**
   - Copy the test data above
   - Paste into the textarea
   - Verify text appears

3. **Extract Job**
   - Click **"Extract Job"** button
   - Watch for loading state
   - Backend terminal should show:
     ```
     Using job description text for job <UUID>
     Extracting job data from description for job <UUID>
     Job extraction validation passed for '<job_title>' at '<company>'
     Successfully processed job <UUID>
     INFO: 127.0.0.1:<port> - "POST /api/jobs HTTP/1.1" 200 OK
     ```

4. **Verify Extracted Data Display**
   - ✅ Job card appears below input fields
   - ✅ Shows "Software Engineering Manager"
   - ✅ Shows "Tech Innovations Inc."
   - ✅ Shows "📍 San Francisco, CA (Remote)"
   - ✅ Shows "🏠 Remote" status
   - ✅ **Required Skills** section shows:
     - Software development
     - Team leadership
     - Cloud technologies
     - Microservices
     - Python/Java/Go
     - Agile/Scrum
     - (more skills visible)
   - ✅ **Key Responsibilities** section shows:
     - Lead daily standups...
     - Conduct code reviews...
     - Mentor team members...
     - Work with product managers...
   - ✅ **"Analyze Match →"** button visible

5. **Check Browser Console**
   - Press F12 → Console tab
   - Should see **no errors**
   - Verify success notification shows

6. **Test Error Scenario: Empty Text**
   - Clear the textarea
   - Click "Extract Job"
   - Should show toast: "❌ Add a job URL or description first"
   - No API call should be made

### Expected Result
✅ **PASS**: Job card displays with all extracted data. Hardcoded table hidden.

### Actual Testing
```
Screenshot/Output:
[Paste your results here]
```

---

## 🔗 TEST 2: LinkedIn URL Input (With Auto-Normalization)

### Test Objective
Process a LinkedIn job posting URL and verify data extraction and normalization.

### Test Scenarios

#### Scenario A: Direct LinkedIn Job URL

**Test Data:**
```
https://www.linkedin.com/jobs/view/4412417453/
```

### Steps

1. **Open Frontend**
   - Go to http://localhost:3000
   - Navigate to **Jobs** page
   - Click **"Paste Job URL"** tab

2. **Paste LinkedIn URL**
   - Paste the URL above
   - Verify URL appears in input field

3. **Extract Job**
   - Click **"Extract Job"** button
   - Watch for "Processing..." state
   - Backend terminal should show:
     ```
     Using normalized URL: https://www.linkedin.com/jobs/view/4412417453/
     Fetching URL: https://www.linkedin.com/jobs/view/4412417453/
     HTTP 200 from https://www.linkedin.com/jobs/view/4412417453/
     Successfully extracted <N> characters from URL
     Successfully extracted job description from URL for job <UUID>
     Extracting job data from url for job <UUID>
     Job extraction validation passed for '<job_title>' at '<company>'
     Successfully processed job <UUID>
     INFO: 127.0.0.1:<port> - "POST /api/jobs HTTP/1.1" 200 OK
     ```

4. **Verify Extracted Data**
   - ✅ Job card appears
   - ✅ Shows extracted job title
   - ✅ Shows extracted company name
   - ✅ Shows location info
   - ✅ Shows required skills
   - ✅ Shows responsibilities
   - ✅ "Analyze Match →" button available

5. **Check Console**
   - No errors in browser console
   - Verify success notification

### Expected Result
✅ **PASS**: LinkedIn job extracted and displayed correctly.

---

#### Scenario B: LinkedIn Search Result URL (With Auto-Normalization)

**Test Data:**
```
https://www.linkedin.com/jobs/search/?currentJobId=4412417453&keywords=software%20engineer&location=remote
```

### Steps

1. **Paste Search URL**
   - Paste the LinkedIn search URL above
   - Click "Extract Job"

2. **Watch Backend Terminal**
   - Backend should show:
     ```
     Normalized LinkedIn search URL to direct job URL: https://www.linkedin.com/jobs/view/4412417453/
     Using normalized URL: https://www.linkedin.com/jobs/view/4412417453/
     ```
   - This shows normalization working!

3. **Verify Extracted Data**
   - ✅ Job card appears
   - ✅ Data extracted correctly despite search result URL
   - ✅ Same data as direct job URL test

### Expected Result
✅ **PASS**: Search result URL normalized and processed correctly.

---

#### Scenario C: Invalid/Fake URL (Error Handling)

**Test Data:**
```
https://fake-invalid-job-site-12345xyz.com/jobs/fake
```

### Steps

1. **Paste Invalid URL**
   - Paste the fake URL above
   - Click "Extract Job"

2. **Watch for Error Handling**
   - Should show: "❌ Could not extract job information from URL..."
   - Backend should reject silently
   - No job card should appear
   - Hardcoded table should still show

3. **Check Backend Terminal**
   - Should see error logs about fetching failure

### Expected Result
✅ **PASS**: Invalid URL handled gracefully with error message.

---

## 📄 TEST 3: PDF File Upload

### Test Objective
Upload a PDF with job description and verify extraction.

### Prerequisites
- Have a sample job posting PDF file
- If you don't have one, create one:
  1. Use TEST 1 job description text
  2. Copy it into Word or Google Docs
  3. Export/Save as PDF
  4. Name it: `job_posting.pdf`

### Steps

1. **Open Frontend**
   - Go to http://localhost:3000
   - Navigate to **Jobs** page
   - Click **"Upload PDF"** tab

2. **Upload Job PDF**
   - Click **"Choose PDF"** button
   - Select your job_posting.pdf file
   - File input should show file name

3. **Watch Processing**
   - Button should show "Processing..."
   - Backend terminal should show:
     ```
     Successfully extracted job description from PDF for job <UUID>
     Extracting job data from job_description_pdf for job <UUID>
     Successfully extracted text from PDF
     Job extraction validation passed for '<job_title>' at '<company>'
     Successfully processed job <UUID>
     INFO: 127.0.0.1:<port> - "POST /api/jobs HTTP/1.1" 200 OK
     ```

4. **Verify Extracted Data**
   - ✅ Job card appears
   - ✅ Shows extracted job title
   - ✅ Shows extracted company
   - ✅ Shows skills extracted from PDF text
   - ✅ Shows responsibilities extracted
   - ✅ Success notification shows: "✓ PDF processed successfully!"

5. **Check Console**
   - No errors in browser console

### Expected Result
✅ **PASS**: PDF processed and job data displayed correctly.

---

#### Error Scenario: Scanned PDF (Image-Only)

**Test Data:**
- If you have a scanned/image-only PDF

### Steps

1. **Upload Scanned PDF**
   - Click "Choose PDF"
   - Select a scanned (image-only) PDF

2. **Watch for Validation Error**
   - Backend should return: "❌ Job extraction validation failed: required_skills is empty..."
   - This indicates no text was extracted
   - No job card appears
   - Hardcoded table still shows

### Expected Result
✅ **PASS**: Scanned PDFs properly rejected with clear error message.

---

#### Error Scenario: File Too Large

**Test Data:**
- Create a large PDF > 10MB (or any file > 10MB)

### Steps

1. **Try to Upload Large File**
   - Click "Choose PDF"
   - Select a file > 10MB

2. **Watch for Size Validation**
   - Before upload starts, should show: "❌ File too large. Maximum size is 10MB"
   - No API call made

### Expected Result
✅ **PASS**: File size validation working on frontend.

---

## 🎯 TEST 4: Analyze Match with Real Job Data

### Test Objective
Verify Analysis page displays actual extracted job data (not mock data).

### Prerequisites
- ✅ Resume uploaded successfully
- ✅ Job extracted (using any of the 3 methods above)

### Steps

1. **With Job Card Displayed**
   - You should see the extracted job card from Tests 1-3
   - Click **"Analyze Match →"** button

2. **Watch Loading State**
   - Should show loading overlay: "Analyzing your match..."
   - Simulates processing (1-2 seconds)

3. **Analysis Page Loads**
   - Backend terminal should show no new requests (analysis is mock for now)
   - Page should display:
     - ✅ Real extracted **job title** (not "Business Systems Analyst")
     - ✅ Real extracted **company name** (not "Northstar Digital")
     - ✅ Real extracted **location** (not "Toronto, ON")
     - ✅ Real extracted **required skills** in "Top Strengths"
     - ✅ Real extracted **responsibilities** in "Application Advice"

4. **Verify Real Data Display**
   - Analysis hero section should show:
     ```
     CANDIDATE PROFILE: Your Resume
     vs
     JOB OPPORTUNITY: [Real job title] - [Real company] · [Real location]
     ```
   - Example:
     ```
     SOFTWARE ENGINEERING MANAGER - Tech Innovations Inc. · San Francisco, CA (Remote)
     ```

5. **Check Skills Display**
   - "Top Strengths" card shows skills from extracted job
   - Not the hardcoded "Requirements Analysis, SQL & Reporting"

### Expected Result
✅ **PASS**: Analysis page displays real extracted job data.

---

## 🔄 TEST 5: End-to-End Workflow

### Test Objective
Complete full workflow: Resume → Job → Analysis with all real data.

### Steps

1. **Start Fresh**
   - Go to http://localhost:3000
   - Fresh browser session preferred

2. **Upload Resume**
   - Go to Resume page
   - Upload a real resume PDF
   - Verify skills extracted

3. **Add Job (Text Description)**
   - Go to Jobs page
   - Paste a job description (use TEST 1 data)
   - Click "Extract Job"
   - Verify job card appears with real data

4. **Run Analysis**
   - Click "Analyze Match" on job card
   - Analysis page loads
   - Verify real job data displayed
   - See match analysis (sample for now)

5. **Go to History Page**
   - Should show the extracted job in history
   - Can click to view details

### Expected Result
✅ **PASS**: Complete end-to-end workflow with all real data.

---

## ❌ TEST 6: Error Handling & Edge Cases

### Test Case 1: Missing Required Fields

**Test Data** - Job with minimal info:
```
Entry Level Developer
ABC Corp
```

### Expected: Should fail validation
- Backend shows: "Job extraction validation failed: required_skills is empty"
- Frontend shows: "❌ Job extraction validation failed..."
- No job card appears

---

### Test Case 2: Generic Company Name

**Test Data** - Job with generic company:
```
Python Developer Position
LinkedIn
Skills: Python, JavaScript
Responsibilities: Write code
```

### Expected: Should fail validation
- Backend shows: "company_name is generic/placeholder"
- Frontend shows: "❌ Job extraction validation failed..."
- Indicates scraping page shell instead of actual job

---

### Test Case 3: Very Short Description

**Test Data:**
```
Developer wanted. Apply now.
```

### Expected: Should fail
- Backend shows: "scraped_text is too short"
- Frontend shows: "❌ Job extraction validation failed..."

---

### Test Case 4: Empty Input

**Steps:**
1. Leave input empty
2. Click "Extract Job"

**Expected:**
- Shows: "❌ Add a job URL or description first"
- No API call made

---

### Test Case 5: Whitespace Only

**Test Data:**
```
   
   
   
```

**Expected:**
- Shows: "❌ Add a job URL or description first"
- No API call made

---

## 📊 Test Results Summary

Create a table of your test results:

| Test | Input Method | Status | Notes |
|------|--------------|--------|-------|
| 1A | Text Description | PASS/FAIL | [notes] |
| 2A | LinkedIn Direct URL | PASS/FAIL | [notes] |
| 2B | LinkedIn Search URL | PASS/FAIL | [notes] |
| 3A | PDF Valid | PASS/FAIL | [notes] |
| 4 | Analysis Page Real Data | PASS/FAIL | [notes] |
| 5 | End-to-End | PASS/FAIL | [notes] |
| 6.1 | Error: Missing Fields | PASS/FAIL | [notes] |
| 6.2 | Error: Generic Company | PASS/FAIL | [notes] |
| 6.3 | Error: Short Text | PASS/FAIL | [notes] |
| 6.4 | Error: Empty Input | PASS/FAIL | [notes] |
| 6.5 | Error: Whitespace | PASS/FAIL | [notes] |

---

## 🔍 What to Look For

### Success Indicators
- ✅ Job card appears immediately after extraction
- ✅ Hardcoded table hides when job extracted
- ✅ Real job data displays (not mock data)
- ✅ All required fields populated:
  - Job title
  - Company name
  - Location
  - Skills list
  - Responsibilities list
- ✅ Success notifications appear
- ✅ No console errors
- ✅ Backend logs show successful processing

### Error Indicators (Should NOT See)
- ❌ Hardcoded table still showing after job extraction
- ❌ Mock "Business Systems Analyst" data appearing
- ❌ "Failed to process" errors
- ❌ Browser console errors
- ❌ 500 server errors in backend

---

## 🐛 Debugging Tips

### If Job Card Doesn't Appear

1. **Check Browser Console (F12)**
   - Look for error messages
   - Check Network tab → api/jobs request
   - Look at response status and data

2. **Check Backend Logs**
   - Look for "Job extraction validation failed"
   - Check error message
   - Increase logging if needed

3. **Test with Different Data**
   - Try TEST 1 job description (known good)
   - Try shorter text
   - Try longer text

4. **Verify Backend Response**
   - Should be 200 OK for success
   - 422 Unprocessable Entity for validation errors
   - Check `success` field in response

### If Mock Data Still Shows

1. **Clear Browser Cache**
   - Chrome: Ctrl+Shift+Delete (or Cmd+Shift+Delete)
   - Firefox: Ctrl+Shift+H → Clear

2. **Restart Frontend**
   - Kill: npm run dev (Ctrl+C)
   - Start: npm run dev
   - Refresh browser

3. **Check Component State**
   - Open React DevTools
   - Check `processedJobData` state
   - Should not be null/undefined after extraction

---

## ✅ Sign-Off Checklist

- [ ] Test 1: Text Description - PASS
- [ ] Test 2A: LinkedIn URL - PASS
- [ ] Test 2B: Search URL - PASS
- [ ] Test 3: PDF Upload - PASS
- [ ] Test 4: Analysis Page - PASS
- [ ] Test 5: End-to-End - PASS
- [ ] Error Handling Tests - PASS
- [ ] No Console Errors
- [ ] Backend Logs Healthy
- [ ] Real Data Displays
- [ ] Hardcoded Table Hidden

**All Tests Passed**: ☐ YES ☐ NO

**Tester Name**: _________________
**Date**: _________________
**Notes**: _________________

---

## 🎉 Next Steps

If all tests pass:
1. ✅ Push changes to feature/backend-api branch
2. ✅ Create PR for code review
3. ✅ Get approval
4. ✅ Merge to main
5. ✅ Deploy to production!

---

**Last Updated**: August 13, 2026
**Status**: Ready for Testing
