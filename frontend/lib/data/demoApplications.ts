/**
 * Centralized demo applications data for IntelliApply Application Hub
 * 5 realistic applications with varying statuses, internally consistent with
 * existing demo jobs, analyses, and resume data.
 */

import { demoJobs } from "./demoJobs";
import { demoAnalyses } from "./demoAnalyses";
import { demoResume } from "./demoResume";

export type ApplicationStatus =
  | "SAVED"
  | "APPLIED"
  | "SCREENING"
  | "INTERVIEW"
  | "OFFER"
  | "REJECTED"
  | "WITHDRAWN";

export interface ApplicationTimelineEvent {
  date: string;
  label: string;
}

export interface ApplicationCoverLetter {
  title: string;
  content: string;
}

export interface DemoApplication {
  id: string;
  jobId: string;
  analysisId: string;
  company: string;
  title: string;
  location: string;
  status: ApplicationStatus;
  matchScore: number;
  appliedDate: string | null;
  interviewDate: string | null;
  createdAt: string;
  resume: {
    fileName: string;
    name: string;
    targetRole: string;
  };
  coverLetter: ApplicationCoverLetter | null;
  job: typeof demoJobs[0];
  analysis: typeof demoAnalyses[0];
  interviewPrep: {
    technicalQuestions: string[];
    behavioralQuestions: string[];
    topicsToReview: string[];
  };
  notes: string;
  timeline: ApplicationTimelineEvent[];
}

export const demoApplications: DemoApplication[] = [
  {
    id: "demo-app-001",
    jobId: "demo-job-001",
    analysisId: "demo-analysis-001",
    company: "Shopify",
    title: "Backend Developer",
    location: "Toronto, ON",
    status: "INTERVIEW",
    matchScore: 91,
    appliedDate: "2026-08-10",
    interviewDate: "2026-08-20",
    createdAt: "2026-08-08",
    resume: {
      fileName: "Alex_Chen_Resume_v4.pdf",
      name: demoResume.data.name,
      targetRole: demoResume.data.target_role,
    },
    coverLetter: {
      title: "Shopify_Backend_Cover_Letter",
      content: `Dear Hiring Manager,

I am writing to express my strong interest in the Backend Developer position at Shopify. With my experience building scalable REST APIs using Python and FastAPI, combined with my passion for e-commerce technology, I believe I would be a valuable addition to your engineering team.

During my time at TechFlow Solutions, I developed and maintained RESTful APIs that served thousands of daily requests. I implemented CI/CD pipelines using GitHub Actions and deployed services using Docker containers. My internship at DataPulse Analytics gave me hands-on experience optimizing PostgreSQL queries, achieving a 40% reduction in response times — a skill directly relevant to Shopify's high-traffic platform.

I am particularly drawn to Shopify's mission of making commerce better for everyone. The opportunity to build backend services that power millions of merchants worldwide excites me. My AWS Cloud Practitioner certification and experience with cloud deployments align well with your infrastructure requirements.

I would welcome the opportunity to discuss how my skills in Python, REST APIs, PostgreSQL, and Docker can contribute to Shopify's continued growth.

Thank you for considering my application.

Best regards,
Alex Chen`,
    },
    job: demoJobs[0],
    analysis: demoAnalyses[0],
    interviewPrep: {
      technicalQuestions: [
        "Explain how you would design a REST API for a high-traffic e-commerce platform.",
        "How have you used AWS services in your previous projects?",
        "How would you containerize and deploy a Python backend service?",
        "Describe your approach to database query optimization.",
        "How do you handle API versioning and backward compatibility?",
      ],
      behavioralQuestions: [
        "Tell me about a challenging technical problem you solved.",
        "Describe a time you worked under tight deadlines.",
        "Tell me about a project you are most proud of.",
      ],
      topicsToReview: [
        "Python",
        "REST API Design",
        "PostgreSQL",
        "Docker",
        "AWS",
        "CI/CD Pipelines",
        "Kubernetes basics",
      ],
    },
    notes: "Recruiter mentioned the interview will focus on backend architecture and AWS. Prepare system design examples. The team uses Python 3.11 with FastAPI.",
    timeline: [
      { date: "2026-08-08", label: "Job Saved" },
      { date: "2026-08-09", label: "Resume Analyzed — 91% Match" },
      { date: "2026-08-10", label: "Application Submitted" },
      { date: "2026-08-13", label: "Recruiter Screen Scheduled" },
      { date: "2026-08-15", label: "Screening Complete" },
      { date: "2026-08-16", label: "Interview Scheduled — Aug 20" },
    ],
  },
  {
    id: "demo-app-002",
    jobId: "demo-job-002",
    analysisId: "demo-analysis-002",
    company: "IBM",
    title: "Software Engineer",
    location: "Ottawa, ON",
    status: "APPLIED",
    matchScore: 82,
    appliedDate: "2026-08-09",
    interviewDate: null,
    createdAt: "2026-08-07",
    resume: {
      fileName: "Alex_Chen_Resume_v4.pdf",
      name: demoResume.data.name,
      targetRole: demoResume.data.target_role,
    },
    coverLetter: {
      title: "IBM_Software_Engineer_Cover_Letter",
      content: `Dear Hiring Team,

I am excited to apply for the Software Engineer position at IBM. My background in full-stack development with Python, JavaScript, and cloud technologies makes me a strong candidate for your cloud-native development team.

At TechFlow Solutions, I have been building responsive frontend components with React and TypeScript while developing backend services with Python. This full-stack experience directly aligns with IBM's need for engineers who can work across the entire application stack.

My AWS Cloud Practitioner certification demonstrates my commitment to cloud computing, and I am eager to expand this knowledge to IBM Cloud. I thrive in collaborative environments and have experience working in Agile teams during both my co-op and full-time positions.

I am particularly interested in IBM's enterprise solutions and the opportunity to contribute to developer tools that serve millions of users worldwide.

Thank you for your consideration.

Sincerely,
Alex Chen`,
    },
    job: demoJobs[1],
    analysis: demoAnalyses[1],
    interviewPrep: {
      technicalQuestions: [
        "How do you approach building a new feature in an unfamiliar codebase?",
        "Describe your experience deploying containerized applications.",
        "How do you ensure code quality in a fast-paced environment?",
        "What's your approach to writing technical documentation?",
        "How would you design a cloud-native microservices application?",
      ],
      behavioralQuestions: [
        "Tell me about a time you collaborated across teams to deliver a feature.",
        "Describe a situation where you had to learn a new technology quickly.",
        "How do you handle disagreements in code reviews?",
      ],
      topicsToReview: [
        "Python",
        "JavaScript/TypeScript",
        "Docker",
        "Cloud Platforms",
        "Agile Methodologies",
        "Enterprise Architecture",
      ],
    },
    notes: "Applied through IBM careers portal. Position is fully remote. Team works across multiple time zones.",
    timeline: [
      { date: "2026-08-07", label: "Job Saved" },
      { date: "2026-08-08", label: "Resume Analyzed — 82% Match" },
      { date: "2026-08-09", label: "Application Submitted" },
    ],
  },
  {
    id: "demo-app-003",
    jobId: "demo-job-004",
    analysisId: "demo-analysis-004",
    company: "Wealthsimple",
    title: "Full Stack Developer",
    location: "Toronto, ON",
    status: "SCREENING",
    matchScore: 88,
    appliedDate: "2026-08-11",
    interviewDate: null,
    createdAt: "2026-08-10",
    resume: {
      fileName: "Alex_Chen_Resume_v4.pdf",
      name: demoResume.data.name,
      targetRole: demoResume.data.target_role,
    },
    coverLetter: {
      title: "Wealthsimple_FullStack_Cover_Letter",
      content: `Dear Wealthsimple Team,

I am writing to apply for the Full Stack Developer position. With hands-on experience in React, TypeScript, Node.js, and PostgreSQL, I am confident in my ability to contribute to your financial products team.

My current role at TechFlow Solutions has given me production experience across the full stack — from building responsive React interfaces to developing RESTful APIs and optimizing database queries. I am particularly excited about the fintech space and the opportunity to build products that democratize access to financial services.

I look forward to discussing how my skills align with Wealthsimple's engineering needs.

Best,
Alex Chen`,
    },
    job: demoJobs[3],
    analysis: demoAnalyses[3],
    interviewPrep: {
      technicalQuestions: [
        "How do you approach building a feature that touches both frontend and backend?",
        "Describe your testing strategy for a full-stack feature.",
        "How would you handle a production incident at 2 AM?",
        "Tell me about a time you optimized a slow database query.",
        "How do you ensure accessibility in your React components?",
      ],
      behavioralQuestions: [
        "Describe a time you had to balance speed with quality.",
        "How do you prioritize tasks when working on multiple features?",
        "Tell me about working in a fast-paced startup environment.",
      ],
      topicsToReview: [
        "React",
        "TypeScript",
        "Node.js",
        "PostgreSQL",
        "REST APIs",
        "Financial Technology",
        "Accessibility",
      ],
    },
    notes: "Referral from university connection. Screening call expected within the week. Prepare for culture fit questions about financial products.",
    timeline: [
      { date: "2026-08-10", label: "Job Saved" },
      { date: "2026-08-10", label: "Resume Analyzed — 88% Match" },
      { date: "2026-08-11", label: "Application Submitted" },
      { date: "2026-08-14", label: "Screening Call Scheduled" },
    ],
  },
  {
    id: "demo-app-004",
    jobId: "demo-job-003",
    analysisId: "demo-analysis-003",
    company: "Microsoft",
    title: "Software Developer",
    location: "Vancouver, BC",
    status: "SAVED",
    matchScore: 74,
    appliedDate: null,
    interviewDate: null,
    createdAt: "2026-08-12",
    resume: {
      fileName: "Alex_Chen_Resume_v4.pdf",
      name: demoResume.data.name,
      targetRole: demoResume.data.target_role,
    },
    coverLetter: null,
    job: demoJobs[2],
    analysis: demoAnalyses[2],
    interviewPrep: {
      technicalQuestions: [
        "How would you design a developer tool that serves millions of users?",
        "Describe your experience with TypeScript and the type system.",
        "How do you approach building responsive, accessible web interfaces?",
        "What's your approach to breaking down a large feature?",
        "How do you handle cross-timezone collaboration?",
      ],
      behavioralQuestions: [
        "Tell me about a time you mentored someone or led a project.",
        "How do you prioritize learning new technologies?",
        "Describe handling conflicting priorities from different stakeholders.",
      ],
      topicsToReview: [
        "TypeScript",
        "React",
        "Azure Basics",
        "System Design",
        "Microservices",
        "Node.js",
      ],
    },
    notes: "Interesting role but requires Azure experience. Consider getting AZ-900 certification before applying. Check if the team accepts candidates with AWS background.",
    timeline: [
      { date: "2026-08-12", label: "Job Saved" },
      { date: "2026-08-12", label: "Resume Analyzed — 74% Match" },
    ],
  },
  {
    id: "demo-app-005",
    jobId: "demo-job-005",
    analysisId: "demo-analysis-005",
    company: "TD Bank",
    title: "Data Engineer",
    location: "Toronto, ON",
    status: "REJECTED",
    matchScore: 65,
    appliedDate: "2026-08-07",
    interviewDate: null,
    createdAt: "2026-08-05",
    resume: {
      fileName: "Alex_Chen_Resume_v4.pdf",
      name: demoResume.data.name,
      targetRole: demoResume.data.target_role,
    },
    coverLetter: {
      title: "TD_Data_Engineer_Cover_Letter",
      content: `Dear Hiring Manager,

I am applying for the Data Engineer position at TD Bank. While my primary experience is in software development, I have relevant skills in Python, SQL, and AWS that align with the data engineering domain.

During my internship at DataPulse Analytics, I built data processing pipelines with Python and pandas and optimized PostgreSQL queries. I am eager to expand into dedicated data engineering and believe TD Bank's data platform would provide excellent growth opportunities.

Thank you for your consideration.

Best regards,
Alex Chen`,
    },
    job: demoJobs[4],
    analysis: demoAnalyses[4],
    interviewPrep: {
      technicalQuestions: [
        "Describe a data pipeline you've built.",
        "How would you handle data quality issues in a large-scale pipeline?",
        "What's your approach to optimizing SQL queries for large datasets?",
        "How do you ensure data pipeline reliability?",
        "Tell me about your experience with cloud-based data services.",
      ],
      behavioralQuestions: [
        "How do you approach learning specialized tools quickly?",
        "Describe working with data scientists or business analysts.",
        "How do you handle feedback about skill gaps?",
      ],
      topicsToReview: [
        "Python",
        "SQL",
        "AWS Data Services",
        "ETL Concepts",
        "Data Quality",
        "Pipeline Architecture",
      ],
    },
    notes: "Received rejection email on Aug 12. Feedback: looking for candidates with more specialized data engineering experience (Kafka, Spark). Good learning opportunity — focus on building data engineering skills.",
    timeline: [
      { date: "2026-08-05", label: "Job Saved" },
      { date: "2026-08-06", label: "Resume Analyzed — 65% Match" },
      { date: "2026-08-07", label: "Application Submitted" },
      { date: "2026-08-12", label: "Application Rejected" },
    ],
  },
];

/** Get a demo application by ID */
export function getDemoApplication(id: string): DemoApplication | undefined {
  return demoApplications.find((app) => app.id === id);
}

/** Get a demo application by job ID */
export function getDemoApplicationByJobId(jobId: string): DemoApplication | undefined {
  return demoApplications.find((app) => app.jobId === jobId);
}

/** Get applications filtered by status */
export function getDemoApplicationsByStatus(status: ApplicationStatus): DemoApplication[] {
  return demoApplications.filter((app) => app.status === status);
}

/** All possible statuses for filtering */
export const APPLICATION_STATUSES: ApplicationStatus[] = [
  "SAVED",
  "APPLIED",
  "SCREENING",
  "INTERVIEW",
  "OFFER",
  "REJECTED",
  "WITHDRAWN",
];

/** Status display configuration */
export const STATUS_CONFIG: Record<ApplicationStatus, { label: string; className: string }> = {
  SAVED: { label: "Saved", className: "status-saved" },
  APPLIED: { label: "Applied", className: "status-applied" },
  SCREENING: { label: "Screening", className: "status-screening" },
  INTERVIEW: { label: "Interview", className: "status-interview" },
  OFFER: { label: "Offer", className: "status-offer" },
  REJECTED: { label: "Rejected", className: "status-rejected" },
  WITHDRAWN: { label: "Withdrawn", className: "status-withdrawn" },
};
