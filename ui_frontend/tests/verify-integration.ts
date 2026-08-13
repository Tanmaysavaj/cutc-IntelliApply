/**
 * Integration Verification Script
 * Runs critical tests to verify frontend-backend integration before production
 * Can be run in Node.js or browser console
 */

import {
  processJobFromDescription,
  processJobFromPDF,
  processJobFromURL,
  processJobWithFallback,
  checkHealth,
  type JobProcessingResponse,
  type ErrorResponse,
} from '@/lib/api';

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  details?: string;
}

// ============ CRITICAL TESTS ============

export const criticalTests = {
  /**
   * TEST 1: Backend connectivity
   * CRITICAL: If this fails, backend is not accessible
   */
  async test_BackendConnectivity(): Promise<TestResult> {
    try {
      const health = await checkHealth();
      return {
        name: 'Backend Connectivity',
        passed: !!health.status,
        details: `Backend health: ${health.status}`,
      };
    } catch (error) {
      return {
        name: 'Backend Connectivity',
        passed: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },

  /**
   * TEST 2: Text description processing with valid input
   * CRITICAL: Core feature must work
   */
  async test_ValidTextDescription(): Promise<TestResult> {
    try {
      const description = `
        Software Engineer Position
        Company: TechCorp
        Location: San Francisco, CA
        Remote: Yes
        
        Responsibilities:
        - Develop scalable applications
        - Code reviews and mentoring
        - Architecture design
        
        Required Skills:
        - Python
        - React
        - AWS
        - PostgreSQL
        - Docker
        
        Preferred Skills:
        - Kubernetes
        - GraphQL
        
        Experience: 5+ years
        Salary: $150,000 - $200,000
      `;

      const response = await processJobFromDescription(description);

      if (!response.success) {
        return {
          name: 'Valid Text Description Processing',
          passed: false,
          error: 'Job extraction failed',
        };
      }

      const data = response.data.data;
      const missingFields = [];

      if (!data.job_title) missingFields.push('job_title');
      if (!data.company_name) missingFields.push('company_name');
      if (!Array.isArray(data.required_skills) || data.required_skills.length === 0) {
        missingFields.push('required_skills');
      }
      if (!Array.isArray(data.key_responsibilities) || data.key_responsibilities.length === 0) {
        missingFields.push('key_responsibilities');
      }

      if (missingFields.length > 0) {
        return {
          name: 'Valid Text Description Processing',
          passed: false,
          error: `Missing fields: ${missingFields.join(', ')}`,
        };
      }

      return {
        name: 'Valid Text Description Processing',
        passed: true,
        details: `Extracted: "${data.job_title}" at ${data.company_name}`,
      };
    } catch (error) {
      return {
        name: 'Valid Text Description Processing',
        passed: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },

  /**
   * TEST 3: Empty input validation
   * CRITICAL: Error handling for invalid input
   */
  async test_EmptyInputValidation(): Promise<TestResult> {
    try {
      await processJobFromDescription('');
      return {
        name: 'Empty Input Validation',
        passed: false,
        error: 'Should have thrown error for empty input',
      };
    } catch (error) {
      return {
        name: 'Empty Input Validation',
        passed: true,
        details: 'Empty input correctly rejected',
      };
    }
  },

  /**
   * TEST 4: Whitespace-only input validation
   * CRITICAL: Edge case handling
   */
  async test_WhitespaceOnlyValidation(): Promise<TestResult> {
    try {
      await processJobFromDescription('   \n\t  ');
      return {
        name: 'Whitespace-Only Input Validation',
        passed: false,
        error: 'Should have thrown error for whitespace-only input',
      };
    } catch (error) {
      return {
        name: 'Whitespace-Only Input Validation',
        passed: true,
        details: 'Whitespace-only input correctly rejected',
      };
    }
  },

  /**
   * TEST 5: URL validation (invalid URL)
   * CRITICAL: Error handling for bad URLs
   */
  async test_InvalidURLHandling(): Promise<TestResult> {
    try {
      const response = await processJobFromURL('https://nonexistent-invalid-domain-xyz-12345.fake/job');

      if (!response.success) {
        return {
          name: 'Invalid URL Handling',
          passed: true,
          details: 'Invalid URL correctly rejected',
        };
      }

      return {
        name: 'Invalid URL Handling',
        passed: false,
        error: 'Should have rejected invalid URL',
      };
    } catch (error) {
      return {
        name: 'Invalid URL Handling',
        passed: true,
        details: 'Invalid URL correctly threw error',
      };
    }
  },

  /**
   * TEST 6: Response structure validation
   * CRITICAL: Must return correct structure
   */
  async test_ResponseStructure(): Promise<TestResult> {
    try {
      const description = `
        Product Manager Role
        Company: StartupXYZ
        Location: New York
        
        Responsibilities:
        - Define roadmap
        - Conduct research
        - Collaborate with teams
        
        Required Skills:
        - Product management
        - Data analysis
        - Communication
        
        Experience: 3+ years
      `;

      const response = await processJobFromDescription(description);

      // Check response structure
      const requiredTopLevel = ['success', 'job_id', 'status', 'extraction', 'data'];
      const missingTopLevel = requiredTopLevel.filter(
        (field) => !(field in response)
      );

      if (missingTopLevel.length > 0) {
        return {
          name: 'Response Structure Validation',
          passed: false,
          error: `Missing top-level fields: ${missingTopLevel.join(', ')}`,
        };
      }

      // Check data structure
      const requiredData = ['job_id', 'status', 'processed_at', 'data'];
      const missingData = requiredData.filter((field) => !(field in response.data));

      if (missingData.length > 0) {
        return {
          name: 'Response Structure Validation',
          passed: false,
          error: `Missing data fields: ${missingData.join(', ')}`,
        };
      }

      // Check job data structure
      const requiredJobData = ['job_title', 'company_name', 'required_skills', 'key_responsibilities'];
      const jobData = response.data.data;
      const missingJobData = requiredJobData.filter(
        (field) => !(field in jobData)
      );

      if (missingJobData.length > 0) {
        return {
          name: 'Response Structure Validation',
          passed: false,
          error: `Missing job data fields: ${missingJobData.join(', ')}`,
        };
      }

      return {
        name: 'Response Structure Validation',
        passed: true,
        details: 'Response structure is correct',
      };
    } catch (error) {
      return {
        name: 'Response Structure Validation',
        passed: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },

  /**
   * TEST 7: Skill extraction validation
   * CRITICAL: Must extract skills correctly
   */
  async test_SkillExtraction(): Promise<TestResult> {
    try {
      const description = `
        Full Stack Developer
        Required Skills:
        - JavaScript/TypeScript
        - React
        - Node.js
        - MongoDB
        - Docker
        - AWS
        
        Preferred Skills:
        - GraphQL
        - Kubernetes
      `;

      const response = await processJobFromDescription(description);

      if (!response.success) {
        return {
          name: 'Skill Extraction Validation',
          passed: false,
          error: 'Job extraction failed',
        };
      }

      const skills = response.data.data.required_skills;

      if (!Array.isArray(skills) || skills.length === 0) {
        return {
          name: 'Skill Extraction Validation',
          passed: false,
          error: 'No skills extracted',
        };
      }

      if (!skills.every((s) => typeof s === 'string')) {
        return {
          name: 'Skill Extraction Validation',
          passed: false,
          error: 'Skills are not all strings',
        };
      }

      return {
        name: 'Skill Extraction Validation',
        passed: true,
        details: `Extracted ${skills.length} skills: ${skills.slice(0, 3).join(', ')}...`,
      };
    } catch (error) {
      return {
        name: 'Skill Extraction Validation',
        passed: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },

  /**
   * TEST 8: Responsibility extraction validation
   * CRITICAL: Must extract responsibilities correctly
   */
  async test_ResponsibilityExtraction(): Promise<TestResult> {
    try {
      const description = `
        Senior Analyst Position
        
        Key Responsibilities:
        - Analyze business requirements
        - Design technical solutions
        - Lead implementation projects
        - Mentor junior analysts
        - Present findings to stakeholders
      `;

      const response = await processJobFromDescription(description);

      if (!response.success) {
        return {
          name: 'Responsibility Extraction Validation',
          passed: false,
          error: 'Job extraction failed',
        };
      }

      const responsibilities = response.data.data.key_responsibilities;

      if (!Array.isArray(responsibilities) || responsibilities.length === 0) {
        return {
          name: 'Responsibility Extraction Validation',
          passed: false,
          error: 'No responsibilities extracted',
        };
      }

      if (!responsibilities.every((r) => typeof r === 'string')) {
        return {
          name: 'Responsibility Extraction Validation',
          passed: false,
          error: 'Responsibilities are not all strings',
        };
      }

      return {
        name: 'Responsibility Extraction Validation',
        passed: true,
        details: `Extracted ${responsibilities.length} responsibilities`,
      };
    } catch (error) {
      return {
        name: 'Responsibility Extraction Validation',
        passed: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },

  /**
   * TEST 9: Fallback behavior with multiple sources
   * CRITICAL: Fallback must respect priority order
   */
  async test_FallbackBehavior(): Promise<TestResult> {
    try {
      const description = 'Senior Developer, TechCorp, 5+ years required';
      const url = 'https://example.com/jobs/developer';

      const response = await processJobWithFallback(description, undefined, url);

      if (!response.success) {
        return {
          name: 'Fallback Behavior',
          passed: false,
          error: 'Job extraction failed',
        };
      }

      if (response.extraction.source !== 'description') {
        return {
          name: 'Fallback Behavior',
          passed: false,
          error: `Wrong source used: ${response.extraction.source}. Expected: description`,
        };
      }

      return {
        name: 'Fallback Behavior',
        passed: true,
        details: 'Correct fallback priority: description used over URL',
      };
    } catch (error) {
      return {
        name: 'Fallback Behavior',
        passed: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },

  /**
   * TEST 10: No sources provided error
   * CRITICAL: Must reject when no source provided
   */
  async test_NoSourcesError(): Promise<TestResult> {
    try {
      await processJobWithFallback();
      return {
        name: 'No Sources Error Handling',
        passed: false,
        error: 'Should have thrown error when no sources provided',
      };
    } catch (error) {
      return {
        name: 'No Sources Error Handling',
        passed: true,
        details: 'Correctly rejects when no sources provided',
      };
    }
  },

  /**
   * TEST 11: Optional fields handling
   * IMPORTANT: Optional fields should not break extraction
   */
  async test_OptionalFieldsHandling(): Promise<TestResult> {
    try {
      const minimalDescription = `
        Junior Developer
        Company: TechCorp
        Required Skills: JavaScript, React
        Responsibilities: Build components, write tests
      `;

      const response = await processJobFromDescription(minimalDescription);

      if (!response.success) {
        return {
          name: 'Optional Fields Handling',
          passed: false,
          error: 'Extraction failed for minimal job posting',
        };
      }

      // Optional fields may or may not be present
      const data = response.data.data;
      const hasOptionalFields = [
        'location',
        'remote_status',
        'salary_range',
        'experience_level',
      ].filter((field) => data[field as keyof typeof data]);

      return {
        name: 'Optional Fields Handling',
        passed: true,
        details: `Extraction successful. Optional fields found: ${hasOptionalFields.length || 'none'}`,
      };
    } catch (error) {
      return {
        name: 'Optional Fields Handling',
        passed: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },

  /**
   * TEST 12: Job ID generation
   * CRITICAL: Each response must have unique job_id
   */
  async test_JobIDGeneration(): Promise<TestResult> {
    try {
      const description = 'Test job for ID generation';

      const response1 = await processJobFromDescription(description);
      const response2 = await processJobFromDescription(description);

      if (!response1.success || !response2.success) {
        return {
          name: 'Job ID Generation',
          passed: false,
          error: 'Extraction failed',
        };
      }

      if (!response1.job_id || !response2.job_id) {
        return {
          name: 'Job ID Generation',
          passed: false,
          error: 'job_id missing from response',
        };
      }

      if (response1.job_id === response2.job_id) {
        return {
          name: 'Job ID Generation',
          passed: false,
          error: 'Same job_id for different requests (should be unique)',
        };
      }

      return {
        name: 'Job ID Generation',
        passed: true,
        details: 'Unique job_ids generated for each request',
      };
    } catch (error) {
      return {
        name: 'Job ID Generation',
        passed: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },
};

// ============ TEST RUNNER ============

export async function runCriticalTests(): Promise<{
  passed: number;
  failed: number;
  total: number;
  results: TestResult[];
}> {
  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║          Critical Integration Tests                    ║');
  console.log('║     (Must Pass Before Production Deployment)          ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');

  const testList = Object.entries(criticalTests).map(([name, fn]) => ({ name, fn }));
  const results: TestResult[] = [];
  let passed = 0;
  let failed = 0;

  for (const { name, fn } of testList) {
    try {
      const result = await fn();
      results.push(result);

      const status = result.passed ? '✓ PASS' : '✗ FAIL';
      console.log(`${status} | ${result.name}`);
      if (result.details) {
        console.log(`      └─ ${result.details}`);
      }
      if (result.error) {
        console.log(`      └─ ERROR: ${result.error}`);
      }

      if (result.passed) {
        passed++;
      } else {
        failed++;
      }
    } catch (error) {
      console.error(`✗ EXCEPTION | ${name}`);
      console.error(`      └─ ${error}`);
      failed++;
      results.push({
        name,
        passed: false,
        error: String(error),
      });
    }
  }

  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║                  Test Summary                          ║');
  console.log('╠════════════════════════════════════════════════════════╣');
  console.log(
    `║ Passed:  ${String(passed).padEnd(48)}║`
  );
  console.log(
    `║ Failed:  ${String(failed).padEnd(48)}║`
  );
  console.log(
    `║ Total:   ${String(testList.length).padEnd(48)}║`
  );
  console.log('╠════════════════════════════════════════════════════════╣');

  if (failed === 0) {
    console.log('║                 ✓ ALL TESTS PASSED                    ║');
    console.log('║           Ready for Production Deployment             ║');
  } else {
    console.log('║              ✗ TESTS FAILED - FIX ISSUES              ║');
    console.log('║           Do NOT deploy to production yet             ║');
  }

  console.log('╚════════════════════════════════════════════════════════╝\n');

  return {
    passed,
    failed,
    total: testList.length,
    results,
  };
}

// Export for Node.js usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { runCriticalTests, criticalTests };
}
