# 🚀 Quick Test Reference Card

## ⚡ TL;DR - Start Here

### What's Been Fixed
✅ **Hardcoded table now HIDES** when job is extracted (line 381: `{!processedJobData &&`)  
✅ **Real job card now DISPLAYS** with extracted data (line 347: `{processedJobData &&`)  
✅ **Error messages display** with backend validation details  
✅ **All 3 input methods** connected to backend: Text → URL → PDF  

### What to Test
1. **Text Input** - Paste job description → See real data
2. **URL Input** - Paste LinkedIn URL → See real data  
3. **PDF Upload** - Upload job PDF → See real data
4. **Error Handling** - Invalid inputs → See error messages
5. **Analysis Page** - Real job shows up in analysis

---

## 🖥️ Server Setup (Copy & Paste)

### Terminal 1: Backend
```bash
cd /projects/sandbox/cutc-IntelliApply/backend
python -m uvicorn app.main:app --reload --port 8000
```

**Wait for:**
```
INFO:     Uvicorn running on http://127.0.0.1:8000
INFO:     Application startup complete
```

### Terminal 2: Frontend
```bash
cd /projects/sandbox/cutc-IntelliApply/ui_frontend
npm run dev
```

**Wait for:**
```
  ▲ Next.js 14.x.x
  - Local:        http://localhost:3000
```

### Then Open Browser
```
http://localhost:3000
```

---

## ✅ Test Checklist

### Pre-Test Checks
- [ ] Backend running on http://localhost:8000/api/health (should return `{"status":"ok","service":"IntelliApply Backend"}`)
- [ ] Frontend running on http://localhost:3000
- [ ] Browser console open (F12)
- [ ] Backend terminal visible to see logs

### Test 1: Text Description
- [ ] Go to Jobs page → "Paste Description" tab
- [ ] Paste the test job description (see below)
- [ ] Click "Extract Job"
- [ ] **Verify:**
  - ❌ Hardcoded table is GONE
  - ✅ Real job card appears with "Software Engineering Manager"
  - ✅ Skills and responsibilities display
  - ✅ Message shows: "✓ Job extracted successfully!"
  - ✅ No red errors in console (F12)

### Test 2: URL Input  
- [ ] Go to Jobs page → "Paste Job URL" tab
- [ ] Paste: `https://www.linkedin.com/jobs/view/4412417453/`
- [ ] Click "Extract Job"
- [ ] **Verify:**
  - ❌ Hardcoded table is GONE
  - ✅ Real job card appears
  - ✅ Success message shows
  - ✅ No console errors

### Test 3: PDF Upload
- [ ] Go to Jobs page → "Upload PDF" tab
- [ ] Choose a test PDF with job description
- [ ] Click "Upload PDF"
- [ ] **Verify:**
  - ❌ Hardcoded table is GONE
  - ✅ Real job card appears
  - ✅ Success message shows
  - ✅ No console errors

### Test 4: Error Scenarios
- [ ] Empty input → See error message
- [ ] Invalid URL → See error message  
- [ ] Bad PDF → See validation error
- [ ] File > 10MB → See size error

### Test 5: Analysis Page
- [ ] Extract a job
- [ ] Click "Analyze Match"
- [ ] Verify real job data shows (not "Business Systems Analyst")

### Test 6: End-to-End
- [ ] Upload resume
- [ ] Extract job (any method)
- [ ] Analyze match
- [ ] No errors throughout

---

## 📋 Test Job Description (Copy & Paste)

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

---

## 🔍 Expected Backend Logs

### When Text Job Processes Successfully
```
Using job description text for job <UUID>
Extracting job data from description for job <UUID>
Job extraction validation passed for 'Software Engineering Manager' at 'Tech Innovations Inc.'
Successfully processed job <UUID>
INFO: 127.0.0.1:<port> - "POST /api/jobs HTTP/1.1" 200 OK
```

### When Job Extraction Fails
```
Job extraction validation failed: required_skills is empty
Job extraction validation failed for job <UUID>: Job extraction validation failed...
INFO: 127.0.0.1:<port> - "POST /api/jobs HTTP/1.1" 422 Unprocessable Entity
```

---

## 🎯 Success Criteria

| Item | Expected |
|------|----------|
| Hardcoded table visibility | HIDDEN after job extracted |
| Real job card | DISPLAYS extracted data |
| Job title | "Software Engineering Manager" (or actual title) |
| Company | "Tech Innovations Inc." (or actual company) |
| Skills | Required skills displayed as chips |
| Responsibilities | Key responsibilities listed |
| Success notification | "✓ Job extracted successfully!" |
| Error notification | "❌ [error message]" |
| Console errors | ❌ NONE (use F12 to check) |
| All 3 methods | Text, URL, PDF all work |

---

## 🐛 Troubleshooting

### Issue: "Failed to connect to backend"
**Check:**
- Backend running on port 8000? (check terminal)
- NEXT_PUBLIC_API_URL in .env.local?
- Try: `curl http://localhost:8000/api/health`

### Issue: Hardcoded table still shows after extraction
**Check:**
- Refresh page (Ctrl+R)
- Check line 381 in ui_frontend/app/page.tsx has `{!processedJobData &&`
- Check browser console for errors

### Issue: "Job extraction validation failed: required_skills is empty"
**This is EXPECTED for:**
- Text files (not job postings)
- PDFs with no job details
- Invalid URLs

**To fix:** Use the test job description above

### Issue: Console shows red errors
**Check:**
- Network tab (F12) - see the API response
- Backend terminal - see what error was returned
- Note the error and check TROUBLESHOOTING section

---

## 📝 Recording Results

After each test, note:
- ✅ Test passed (what worked)
- ❌ Test failed (what didn't work)
- 🔍 Issues found (browser/backend errors)
- 💡 Notes for team

Example:
```
Test 1: Text Input
✅ PASS - Hardcoded table hidden, real job displayed
✅ Success message showed
✅ No console errors
```

---

## 🚀 After Testing

### If All Tests Pass ✅
1. All 6 tests passed
2. No console errors
3. All 3 input methods work
4. Ready to commit

**Next Steps:**
```bash
cd /projects/sandbox/cutc-IntelliApply
git add MANUAL_TESTING_INSTRUCTIONS.md QUICK_TEST_REFERENCE.md
git commit -m "docs: add comprehensive testing guides"
git push origin feature/backend-api
```

### If Tests Fail ❌
1. Note which test failed
2. Check error messages (browser F12 or backend terminal)
3. Debug issue
4. Re-test after fix

---

## 📊 Final Verification

```
✅ Test 1: Text Input - PASS/FAIL
✅ Test 2: URL Input - PASS/FAIL
✅ Test 3: PDF Upload - PASS/FAIL
✅ Test 4: Error Scenarios - PASS/FAIL
✅ Test 5: Analysis Page - PASS/FAIL
✅ Test 6: End-to-End - PASS/FAIL

Overall Status: _____________
Ready to Merge: [ ] YES [ ] NO
```

---

## 🎓 Code Locations (if you need to debug)

| What | File | Line |
|-----|------|------|
| Real job display | ui_frontend/app/page.tsx | 347 |
| Hardcoded table conditional | ui_frontend/app/page.tsx | 381 |
| API functions | ui_frontend/lib/api.ts | 105+ |
| Error handling | ui_frontend/lib/api.ts | 110-145 |
| Backend endpoint | backend/app/api/jobs.py | - |

---

**Ready to test? Follow the Server Setup section above and start with Test 1!**

Last Updated: August 13, 2026  
Status: ✅ Ready for Manual Testing
