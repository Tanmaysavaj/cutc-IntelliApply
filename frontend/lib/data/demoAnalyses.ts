/**
 * Centralized demo analyses data for IntelliApply
 * One analysis per demo job, with consistent scoring relative to Alex Chen's resume
 */

export interface DemoAnalysis {
  id: string;
  job_id: string;
  job_title: string;
  company_name: string;
  location: string;
  date: string;
  overall_score: number;
  recommendation: "apply" | "strong_apply" | "review" | "low_match";
  score_breakdown: {
    hard_skills: number;
    soft_skills: number;
    experience: number;
    education: number;
    responsibilities: number;
  };
  strengths: string[];
  gaps: string[];
  summary: string;
  why_you_match: string[];
  skill_gaps: Array<{
    skill: string;
    importance: "required" | "preferred";
    reason: string;
    recommendation: string;
  }>;
  resume_improvements: string[];
  interview_focus: string[];
  application_recommendation: {
    recommendation: string;
    reason: string;
  };
}

export const demoAnalyses: DemoAnalysis[] = [
  {
    id: "demo-analysis-001",
    job_id: "demo-job-001",
    job_title: "Backend Developer",
    company_name: "Shopify",
    location: "Toronto, ON",
    date: "2026-08-10T15:00:00Z",
    overall_score: 91,
    recommendation: "strong_apply",
    score_breakdown: {
      hard_skills: 93,
      soft_skills: 88,
      experience: 85,
      education: 95,
      responsibilities: 92,
    },
    strengths: [
      "Python",
      "REST APIs",
      "PostgreSQL",
      "Docker",
      "Git",
      "CI/CD",
      "AWS",
    ],
    gaps: ["Kubernetes", "GraphQL", "Redis"],
    summary:
      "Strong alignment with this Backend Developer role. Your Python and REST API experience directly matches core requirements. Docker and CI/CD proficiency demonstrate production-readiness. Your internship work with PostgreSQL optimization shows practical database skills that Shopify values.",
    why_you_match: [
      "Direct experience building REST APIs with Python and FastAPI matches the core requirement",
      "PostgreSQL optimization experience (40% improvement) demonstrates database proficiency",
      "Docker and CI/CD pipeline experience shows deployment readiness",
      "AWS Cloud Practitioner certification validates cloud knowledge",
      "Co-op experience in Agile teams aligns with Shopify's development culture",
    ],
    skill_gaps: [
      {
        skill: "Kubernetes",
        importance: "preferred",
        reason: "Shopify uses Kubernetes for container orchestration at scale",
        recommendation:
          "Complete a Kubernetes fundamentals course; deploy a sample app to minikube",
      },
      {
        skill: "GraphQL",
        importance: "preferred",
        reason: "Shopify's Storefront API uses GraphQL extensively",
        recommendation:
          "Build a small GraphQL API with Apollo Server to demonstrate understanding",
      },
    ],
    resume_improvements: [
      "Quantify API performance metrics (requests/sec, latency) in your TechFlow experience",
      "Add a bullet about handling concurrent requests or scaling considerations",
      "Mention specific CI/CD tools (GitHub Actions) and deployment targets",
      "Include the PostgreSQL optimization metric prominently — 40% improvement is impressive",
      "Add Shopify-specific keywords like 'e-commerce', 'merchant-facing', or 'platform services'",
    ],
    interview_focus: [
      "Describe a time you designed a RESTful API from scratch. What decisions did you make about routing, authentication, and error handling?",
      "How would you approach database query optimization for a high-traffic endpoint?",
      "Tell me about your CI/CD pipeline setup. How do you ensure quality before deploying to production?",
      "How do you handle backward-compatible API changes when multiple clients depend on your service?",
      "Describe a challenging debugging experience in a distributed system. How did you trace the issue?",
    ],
    application_recommendation: {
      recommendation: "strong_apply",
      reason:
        "You match 6 of 6 required skills and have relevant production experience. This is a strong fit — apply with confidence and emphasize your API development and database optimization work.",
    },
  },
  {
    id: "demo-analysis-002",
    job_id: "demo-job-002",
    job_title: "Software Engineer",
    company_name: "IBM",
    location: "Ottawa, ON",
    date: "2026-08-09T11:20:00Z",
    overall_score: 82,
    recommendation: "apply",
    score_breakdown: {
      hard_skills: 85,
      soft_skills: 82,
      experience: 78,
      education: 90,
      responsibilities: 80,
    },
    strengths: ["Python", "JavaScript", "SQL", "Docker", "Linux", "Git", "TypeScript", "React"],
    gaps: ["Terraform", "Enterprise architecture patterns"],
    summary:
      "Good match for this Software Engineer position. Your full-stack skills align well with IBM's cloud-native development needs. TypeScript and React experience are strong preferred qualifications. Your co-op background provides relevant collaborative experience.",
    why_you_match: [
      "All 6 required skills (Python, JavaScript, SQL, Docker, Linux, Git) are in your profile",
      "TypeScript and React experience matches preferred skills for frontend work",
      "AWS certification demonstrates cloud platform knowledge transferable to IBM Cloud",
      "Co-op and internship experience shows ability to work in enterprise environments",
      "Strong communication and collaboration skills align with IBM's team culture",
    ],
    skill_gaps: [
      {
        skill: "Terraform",
        importance: "preferred",
        reason: "IBM uses infrastructure-as-code for cloud deployments",
        recommendation:
          "Create a basic Terraform config that provisions AWS resources; document it on GitHub",
      },
      {
        skill: "MongoDB",
        importance: "preferred",
        reason: "Some IBM projects use NoSQL databases for flexible schemas",
        recommendation:
          "Build a small project using MongoDB with Node.js to demonstrate familiarity",
      },
    ],
    resume_improvements: [
      "Highlight experience with enterprise-scale systems or large codebases",
      "Add metrics about team size and collaboration scope",
      "Mention any experience with documentation or developer tooling",
      "Include keywords like 'cloud-native', 'microservices', and 'enterprise'",
      "Emphasize your Linux proficiency with specific examples",
    ],
    interview_focus: [
      "How do you approach building a new feature in an unfamiliar codebase?",
      "Describe your experience with cloud platforms. How would you deploy a containerized application?",
      "Tell me about a time you had to collaborate across teams to deliver a feature.",
      "How do you ensure code quality in a fast-paced development environment?",
      "What's your approach to writing technical documentation?",
    ],
    application_recommendation: {
      recommendation: "apply",
      reason:
        "You match all required skills and most preferred qualifications. Apply and highlight your full-stack cloud experience and collaborative work style.",
    },
  },
  {
    id: "demo-analysis-003",
    job_id: "demo-job-003",
    job_title: "Software Developer",
    company_name: "Microsoft",
    location: "Vancouver, BC",
    date: "2026-08-08T09:45:00Z",
    overall_score: 74,
    recommendation: "review",
    score_breakdown: {
      hard_skills: 72,
      soft_skills: 80,
      experience: 68,
      education: 85,
      responsibilities: 72,
    },
    strengths: ["TypeScript", "React", "Node.js", "Git", "SQL"],
    gaps: ["Azure", "System Design", "C#", "Microservices architecture"],
    summary:
      "Moderate match for this role. Your frontend skills with TypeScript and React are strong, but the position requires Azure expertise and system design experience at a level beyond your current background. The 2-4 year experience requirement is slightly above your tenure.",
    why_you_match: [
      "TypeScript and React proficiency matches core frontend requirements",
      "Node.js experience provides full-stack capability",
      "Git and SQL are well-established skills in your profile",
      "Problem-solving and team collaboration skills are strong",
      "CS degree from U of T meets education requirements",
    ],
    skill_gaps: [
      {
        skill: "Azure",
        importance: "preferred",
        reason: "This role builds Azure developer tools — platform familiarity is essential",
        recommendation:
          "Get Azure Fundamentals (AZ-900) certification; build a project deployed to Azure",
      },
      {
        skill: "System Design",
        importance: "preferred",
        reason: "The role involves designing microservices architecture",
        recommendation:
          "Study distributed systems patterns; practice system design interviews",
      },
      {
        skill: "C#",
        importance: "preferred",
        reason: "Many Microsoft internal tools are built with C# and .NET",
        recommendation:
          "Complete a C# fundamentals course and build one small project",
      },
    ],
    resume_improvements: [
      "Add any experience with cloud platform development or tooling",
      "Highlight system design decisions you've made, even at small scale",
      "Mention any mentoring or leadership experience to show growth trajectory",
      "Include TypeScript-specific projects with complexity (state management, type safety)",
      "Add Azure or Microsoft-related keywords if you have any exposure",
    ],
    interview_focus: [
      "How would you design a developer tool that serves millions of users?",
      "Describe your experience with TypeScript. How do you leverage the type system?",
      "How do you approach building responsive, accessible web interfaces?",
      "Tell me about a time you worked across multiple time zones or with remote teams.",
      "What's your approach to breaking down a large feature into smaller deliverables?",
    ],
    application_recommendation: {
      recommendation: "review",
      reason:
        "You meet core technical requirements but lack Azure and system design experience the role emphasizes. Consider applying after gaining cloud platform exposure, or if you can demonstrate transferable architecture skills.",
    },
  },
  {
    id: "demo-analysis-004",
    job_id: "demo-job-004",
    job_title: "Full Stack Developer",
    company_name: "Wealthsimple",
    location: "Toronto, ON",
    date: "2026-08-11T16:30:00Z",
    overall_score: 88,
    recommendation: "apply",
    score_breakdown: {
      hard_skills: 90,
      soft_skills: 85,
      experience: 84,
      education: 92,
      responsibilities: 88,
    },
    strengths: [
      "React",
      "TypeScript",
      "Node.js",
      "PostgreSQL",
      "REST APIs",
      "Git",
      "Python",
      "AWS",
      "Docker",
    ],
    gaps: ["Redis", "GraphQL", "On-call experience"],
    summary:
      "Excellent match for this Full Stack Developer role. Your React/TypeScript frontend skills combined with Python/Node.js backend experience cover both ends of the stack. PostgreSQL and REST API proficiency directly match requirements. Financial tech context would be new but your adaptability is strong.",
    why_you_match: [
      "All 6 required skills are present in your profile with hands-on experience",
      "Full-stack experience at TechFlow demonstrates ability to work across the stack",
      "Python and AWS listed as preferred skills — you have both plus certification",
      "CI/CD pipeline experience matches their development workflow needs",
      "Toronto location and remote flexibility align perfectly",
    ],
    skill_gaps: [
      {
        skill: "Redis",
        importance: "preferred",
        reason: "Wealthsimple uses Redis for caching and session management",
        recommendation:
          "Add Redis caching to one of your existing projects; document performance gains",
      },
      {
        skill: "GraphQL",
        importance: "preferred",
        reason: "Some internal APIs at Wealthsimple use GraphQL",
        recommendation:
          "Build a simple GraphQL layer over one of your REST APIs to show adaptability",
      },
    ],
    resume_improvements: [
      "Add any fintech or data-sensitive application experience",
      "Highlight testing practices — Wealthsimple values high test coverage",
      "Mention accessibility work in your React projects",
      "Include any experience with real-time data or WebSocket features",
      "Quantify the scale of systems you've worked on (users, requests, data volume)",
    ],
    interview_focus: [
      "How do you approach building a feature that touches both frontend and backend?",
      "Describe your testing strategy for a full-stack feature. What do you test at each layer?",
      "How would you handle a production incident at 2 AM? Walk me through your process.",
      "Tell me about a time you optimized a slow database query. What was your approach?",
      "How do you ensure accessibility in your React components?",
    ],
    application_recommendation: {
      recommendation: "apply",
      reason:
        "Strong alignment across all required skills with relevant full-stack production experience. Apply and emphasize your combined frontend and backend capabilities.",
    },
  },
  {
    id: "demo-analysis-005",
    job_id: "demo-job-005",
    job_title: "Data Engineer",
    company_name: "TD Bank",
    location: "Toronto, ON",
    date: "2026-08-07T13:15:00Z",
    overall_score: 65,
    recommendation: "review",
    score_breakdown: {
      hard_skills: 62,
      soft_skills: 75,
      experience: 58,
      education: 80,
      responsibilities: 60,
    },
    strengths: ["Python", "SQL", "AWS", "Docker", "Linux"],
    gaps: ["Kafka", "Spark", "Terraform", "Airflow", "Snowflake", "ETL pipelines"],
    summary:
      "Partial match for this Data Engineer role. Your Python and SQL skills provide a foundation, and your AWS certification is relevant. However, the role requires specialized data engineering tools (Kafka, Spark, Airflow) and ETL pipeline experience that goes beyond your current profile.",
    why_you_match: [
      "Python proficiency provides the programming foundation for data engineering",
      "SQL and PostgreSQL optimization experience demonstrates data skills",
      "AWS certification shows cloud platform familiarity",
      "Docker and Linux experience align with deployment requirements",
      "Data processing internship at DataPulse shows relevant interest",
    ],
    skill_gaps: [
      {
        skill: "Kafka",
        importance: "preferred",
        reason: "TD Bank uses event-driven architectures for real-time data processing",
        recommendation:
          "Set up a local Kafka cluster; build a producer/consumer application in Python",
      },
      {
        skill: "Spark",
        importance: "preferred",
        reason: "Large-scale data processing at TD requires distributed computing",
        recommendation:
          "Complete a PySpark course; process a large dataset and document the pipeline",
      },
      {
        skill: "Terraform",
        importance: "preferred",
        reason: "Infrastructure-as-code is standard for cloud data platform management",
        recommendation:
          "Create Terraform configs for AWS data services (S3, Redshift, Lambda)",
      },
    ],
    resume_improvements: [
      "Expand on the DataPulse data processing work with specific tools and scale",
      "Add any experience with batch or streaming data pipelines",
      "Mention data quality or validation work if applicable",
      "Include keywords like 'ETL', 'data pipeline', 'data warehouse'",
      "Highlight the pandas experience with volume metrics",
    ],
    interview_focus: [
      "Describe a data pipeline you've built. What were the data sources and destinations?",
      "How would you handle data quality issues in a large-scale pipeline?",
      "What's your approach to optimizing SQL queries for large datasets?",
      "How do you ensure data pipeline reliability and handle failures?",
      "Tell me about your experience with cloud-based data services.",
    ],
    application_recommendation: {
      recommendation: "review",
      reason:
        "You have foundational skills but lack specialized data engineering tools. Consider this role after gaining Kafka/Spark experience, or apply if you can demonstrate strong learning velocity and relevant data work.",
    },
  },
  {
    id: "demo-analysis-006",
    job_id: "demo-job-006",
    job_title: "DevOps Engineer",
    company_name: "Coinbase",
    location: "Remote — Canada",
    date: "2026-08-06T10:00:00Z",
    overall_score: 52,
    recommendation: "low_match",
    score_breakdown: {
      hard_skills: 48,
      soft_skills: 70,
      experience: 42,
      education: 75,
      responsibilities: 45,
    },
    strengths: ["Docker", "CI/CD", "AWS", "Linux", "Python"],
    gaps: [
      "Kubernetes",
      "Terraform",
      "Go",
      "Ansible",
      "Prometheus",
      "Grafana",
      "Production infrastructure management",
    ],
    summary:
      "Low match for this DevOps Engineer role. While you have Docker, CI/CD, and AWS foundations, this position requires deep Kubernetes, Terraform, and infrastructure expertise at a senior level (3-5 years). The role focuses on platform engineering rather than application development.",
    why_you_match: [
      "Docker experience provides a starting point for container orchestration",
      "CI/CD pipeline experience shows automation understanding",
      "AWS Cloud Practitioner certification demonstrates platform awareness",
      "Linux proficiency is foundational for DevOps work",
      "Python can be used for infrastructure automation scripts",
    ],
    skill_gaps: [
      {
        skill: "Kubernetes",
        importance: "required",
        reason: "Managing K8s clusters in production is the primary responsibility",
        recommendation:
          "This requires months of hands-on experience; consider a dedicated DevOps learning path first",
      },
      {
        skill: "Terraform",
        importance: "required",
        reason: "Infrastructure-as-code with Terraform is a core daily task",
        recommendation:
          "Start with Terraform Associate certification path; build progressively complex infrastructure",
      },
      {
        skill: "Production infrastructure",
        importance: "required",
        reason: "3-5 years of managing production systems is expected",
        recommendation:
          "Gain more DevOps experience before targeting senior infrastructure roles",
      },
    ],
    resume_improvements: [
      "This role may be a stretch at your current experience level",
      "Focus on building DevOps skills over the next 1-2 years",
      "Consider targeting Junior DevOps or SRE roles as a stepping stone",
      "Document any infrastructure or deployment automation you've done",
      "Get hands-on with Kubernetes and Terraform in personal projects",
    ],
    interview_focus: [
      "How would you design a CI/CD pipeline for a microservices architecture?",
      "Describe your experience managing containerized applications in production.",
      "How do you approach infrastructure monitoring and alerting?",
      "What's your strategy for handling a production outage?",
      "How do you implement infrastructure-as-code in your projects?",
    ],
    application_recommendation: {
      recommendation: "low_match",
      reason:
        "This role requires 3-5 years of dedicated DevOps/infrastructure experience that goes significantly beyond your current profile. Focus on building these skills through more junior DevOps opportunities first.",
    },
  },
];

/** Get the canonical latest analysis (Shopify - highest score, most recent) */
export const latestDemoAnalysis = demoAnalyses[0];

/** Get analysis by job ID */
export function getDemoAnalysisForJob(jobId: string): DemoAnalysis | undefined {
  return demoAnalyses.find((a) => a.job_id === jobId);
}
