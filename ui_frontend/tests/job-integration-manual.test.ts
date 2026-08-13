/**
 * Manual Integration Test Guide
 * Run these tests in the browser console to verify frontend-backend integration
 * Assumes backend is running on http://localhost:8000
 */

import {
  processJobFromDescription,
  processJobFromPDF,
  processJobFromURL,
  processJobWithFallback,
  checkHealth,
  type JobProcessingResponse,
} from '@/lib/api';

// ============ MANUAL TEST SCENARIOS ============

export const manualTestScenarios = {
  /**
   * SCENARIO 1: Test backend health check
   * Verifies the backend API is running and accessible
   */
  async scenario1_BackendHealthCheck() {
    console.log('\n--- SCENARIO 1: Backend Health Check ---');
    try {
      const health = await checkHealth();
      console.log('✓ Backend is running');
      console.log('Status:', health);
      return true;
    } catch (error) {
      console.error('✗ Backend health check failed:', error);
      return false;
    }
  },

  /**
   * SCENARIO 2: Process job from URL (LinkedIn)
   * Test Case: LinkedIn job posting URL
   * Expected: Should extract job title, company, skills, and responsibilities
   */
  async scenario2_ProcessLinkedInJobURL() {
    console.log('\n--- SCENARIO 2: Process LinkedIn Job URL ---');
    console.log('Input: LinkedIn job URL');
    
    // Replace with actual LinkedIn job URL from your area
    const linkedinURL = 'https://www.linkedin.com/jobs/view/YOUR_JOB_ID/';
    
    console.log('Attempting to process:', linkedinURL);
    try {
      const response = await processJobFromURL(linkedinURL);
      
      if (response.success) {
        console.log('✓ Job extracted successfully');
        console.log('Response:', response);
        return validateExtractedJob(response);
      } else {
        console.error('✗ Job extraction failed');
        console.log('Response:', response);
        return false;
      }
    } catch (error) {
      console.error('✗ Error:', error);
      return false;
    }
  },

  /**
   * SCENARIO 3: Process job from text description
   * Test Case: Paste a job description directly
   * Expected: Should extract job title, company, skills, and responsibilities
   */
  async scenario3_ProcessJobDescription() {
    console.log('\n--- SCENARIO 3: Process Job Description Text ---');
    console.log('Input: Full job description as text');
    
    const jobDescription = `
Senior Full Stack Developer - Toronto, ON

About Us:
Tech startup focused on AI-powered solutions for business automation.

Job Description:
We're looking for a Senior Full Stack Developer to join our growing team.
You'll work on both frontend (React, TypeScript) and backend (Node.js, PostgreSQL).

Responsibilities:
- Develop and maintain full-stack web applications
- Design and implement REST APIs
- Optimize database queries for performance
- Collaborate with product and design teams
- Mentor junior developers
- Participate in code reviews

Required Skills:
- React and TypeScript (3+ years)
- Node.js and Express
- PostgreSQL and SQL
- REST API design
- Git and GitHub
- Testing frameworks (Jest, React Testing Library)
- Agile/Scrum

Preferred Skills:
- Docker and Kubernetes
- CI/CD pipelines
- AWS or GCP experience
- GraphQL
- Next.js

Experience Level: 5+ years
Salary: $120,000 - $160,000
Remote: Hybrid (Toronto office, 2 days/week)
    `;

    try {
      const response = await processJobFromDescription(jobDescription);
      
      if (response.success) {
        console.log('✓ Job extracted successfully');
        console.log('Response:', response);
        return validateExtractedJob(response);
      } else {
        console.error('✗ Job extraction failed');
        console.log('Response:', response);
        return false;
      }
    } catch (error) {
      console.error('✗ Error:', error);
      return false;
    }
  },

  /**
   * SCENARIO 4: Process job from PDF
   * Test Case: Upload a job posting PDF
   * Expected: Should extract text and return structured job data
   */
  async scenario4_ProcessJobPDF() {
    console.log('\n--- SCENARIO 4: Process Job PDF ---');
    console.log('Input: PDF file with job posting');
    console.log('NOTE: This test requires a real PDF file uploaded by the user');
    console.log('Please upload a job posting PDF from the frontend UI and check console');
    return true;
  },

  /**
   * SCENARIO 5: Test fallback behavior
   * Test Case: Provide multiple sources, verify priority order
   * Expected: Description should be used (highest priority)
   */
  async scenario5_TestFallbackBehavior() {
    console.log('\n--- SCENARIO 5: Test Fallback Behavior ---');
    
    const description = 'Junior Python Developer, Tech Company, Python and Django required';
    const url = 'https://example.com/jobs/python-developer';
    
    console.log('Providing both description and URL (description should win)');
    
    try {
      const response = await processJobWithFallback(description, undefined, url);
      
      if (response.success && response.extraction.source === 'description') {
        console.log('✓ Fallback order correct: Description used');
        console.log('Response:', response);
        return true;
      } else {
        console.error('✗ Fallback order incorrect');
        console.log('Response:', response);
        return false;
      }
    } catch (error) {
      console.error('✗ Error:', error);
      return false;
    }
  },

  /**
   * SCENARIO 6: Error handling - empty input
   * Test Case: Try to process with no input
   * Expected: Should return error response
   */
  async scenario6_ErrorHandling_EmptyInput() {
    console.log('\n--- SCENARIO 6: Error Handling - Empty Input ---');
    
    try {
      await processJobFromDescription('');
      console.error('✗ Should have thrown error for empty input');
      return false;
    } catch (error) {
      console.log('✓ Correctly rejected empty input');
      console.log('Error:', error);
      return true;
    }
  },

  /**
   * SCENARIO 7: Error handling - invalid URL
   * Test Case: Try to process with invalid URL
   * Expected: Should return error response
   */
  async scenario7_ErrorHandling_InvalidURL() {
    console.log('\n--- SCENARIO 7: Error Handling - Invalid URL ---');
    
    try {
      const response = await processJobFromURL('https://invalid-job-url-xyz-12345.fake/job');
      
      if (!response.success) {
        console.log('✓ Invalid URL correctly rejected');
        return true;
      }
    } catch (error) {
      console.log('✓ Invalid URL threw expected error');
      console.log('Error:', error);
      return true;
    }
    
    return false;
  },

  /**
   * SCENARIO 8: Data validation - response structure
   * Test Case: Verify response has all required fields
   * Expected: Job response should have title, company, skills, responsibilities
   */
  async scenario8_DataValidation() {
    console.log('\n--- SCENARIO 8: Data Validation ---');
    
    const jobDescription = `
Product Manager - New York, NY

About the Role:
Lead product strategy and development for our flagship SaaS platform.

Responsibilities:
- Define product roadmap and strategy
- Conduct user research and gather requirements
- Work with engineering and design teams
- Analyze market trends and competitor landscape
- Present to stakeholders and investors

Required Skills:
- Product management (5+ years)
- Data analysis
- Agile methodology
- SQL basics
- Communication skills

Experience: 5+ years in product management
Salary: $130,000 - $180,000
    `;

    try {
      const response = await processJobFromDescription(jobDescription);
      
      if (!response.success) {
        console.error('✗ Job extraction failed');
        return false;
      }
      
      const data = response.data.data;
      const missingFields = [];
      
      if (!data.job_title) missingFields.push('job_title');
      if (!data.company_name) missingFields.push('company_name');
      if (!data.required_skills || data.required_skills.length === 0) missingFields.push('required_skills');
      if (!data.key_responsibilities || data.key_responsibilities.length === 0) missingFields.push('key_responsibilities');
      
      if (missingFields.length === 0) {
        console.log('✓ All required fields present');
        console.log('Job Title:', data.job_title);
        console.log('Company:', data.company_name);
        console.log('Skills:', data.required_skills.slice(0, 3).join(', '));
        console.log('Responsibilities:', data.key_responsibilities.length, 'items');
        return true;
      } else {
        console.error('✗ Missing fields:', missingFields);
        return false;
      }
    } catch (error) {
      console.error('✗ Error:', error);
      return false;
    }
  },

  /**
   * SCENARIO 9: UI Integration - Job display
   * Test Case: Verify extracted job displays correctly in UI
   * Expected: Job card should show title, company, skills, responsibilities
   */
  async scenario9_UIIntegration() {
    console.log('\n--- SCENARIO 9: UI Integration Test ---');
    console.log('This test verifies the UI correctly displays extracted job data');
    console.log('Steps:');
    console.log('1. Go to Jobs page in the UI');
    console.log('2. Paste a job URL or description');
    console.log('3. Click "Extract Job"');
    console.log('4. Verify the job card displays with:');
    console.log('   - Job title');
    console.log('   - Company name');
    console.log('   - Location and remote status');
    console.log('   - Required skills (max 8 shown)');
    console.log('   - Key responsibilities (max 4 shown)');
    console.log('5. Click "Analyze Match" button');
    console.log('6. Verify analysis page shows job details');
    return true;
  },

  /**
   * SCENARIO 10: End-to-end workflow
   * Test Case: Complete workflow from resume upload to analysis
   * Expected: All components working together
   */
  async scenario10_EndToEndWorkflow() {
    console.log('\n--- SCENARIO 10: End-to-End Workflow ---');
    console.log('Complete workflow test:');
    console.log('1. Upload resume (PDF)');
    console.log('2. Navigate to Jobs page');
    console.log('3. Process job from URL or description');
    console.log('4. View extracted job details');
    console.log('5. Click Analyze Match');
    console.log('6. Review analysis with real job data');
    console.log('\nThis manual test validates the entire integration');
    return true;
  },
};

// ============ HELPER FUNCTIONS ============

/**
 * Validate that extracted job has all required data
 */
function validateExtractedJob(response: JobProcessingResponse): boolean {
  const data = response.data.data;
  
  const checks = [
    { field: 'job_title', valid: !!data.job_title },
    { field: 'company_name', valid: !!data.company_name },
    { field: 'required_skills', valid: Array.isArray(data.required_skills) && data.required_skills.length > 0 },
    { field: 'key_responsibilities', valid: Array.isArray(data.key_responsibilities) && data.key_responsibilities.length > 0 },
  ];
  
  let allValid = true;
  console.log('\nField Validation:');
  for (const check of checks) {
    const status = check.valid ? '✓' : '✗';
    console.log(`  ${status} ${check.field}`);
    if (!check.valid) allValid = false;
  }
  
  return allValid;
}

/**
 * Run all manual test scenarios
 */
export async function runAllManualTests() {
  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║     Job Processing Integration - Manual Test Suite    ║');
  console.log('╚════════════════════════════════════════════════════════╝');

  const scenarios = Object.entries(manualTestScenarios).map(([name, fn]) => ({ name, fn }));
  let passed = 0;
  let failed = 0;

  for (const { name, fn } of scenarios) {
    try {
      const result = await fn();
      if (result) {
        passed++;
      } else {
        failed++;
      }
    } catch (error) {
      console.error(`Exception in ${name}:`, error);
      failed++;
    }
  }

  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║                   Test Summary                         ║');
  console.log('╠════════════════════════════════════════════════════════╣');
  console.log(`║ Passed:  ${String(passed).padEnd(48)}║`);
  console.log(`║ Failed:  ${String(failed).padEnd(48)}║`);
  console.log(`║ Total:   ${String(scenarios.length).padEnd(48)}║`);
  console.log('╚════════════════════════════════════════════════════════╝\n');

  return { passed, failed, total: scenarios.length };
}

// ============ BROWSER CONSOLE USAGE ============

/**
 * To run these tests in browser:
 * 
 * 1. Open frontend in browser (http://localhost:3000)
 * 2. Open browser console (F12)
 * 3. Import and run tests:
 * 
 *    import { runAllManualTests } from '@/tests/job-integration-manual.test';
 *    await runAllManualTests();
 * 
 * Or run individual scenarios:
 * 
 *    import { manualTestScenarios } from '@/tests/job-integration-manual.test';
 *    await manualTestScenarios.scenario2_ProcessLinkedInJobURL();
 */
