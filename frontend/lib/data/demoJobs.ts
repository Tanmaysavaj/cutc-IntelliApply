/**
 * Centralized demo jobs data for IntelliApply
 * 6 realistic job opportunities with varying match levels
 */

export interface DemoJob {
  id: string;
  job_title: string;
  company_name: string;
  company_website: string | null;
  location: string;
  remote_status: string;
  required_skills: string[];
  preferred_skills: string[];
  experience_level: string;
  education_requirements: string;
  salary_range: string | null;
  key_responsibilities: string[];
  posting_age_days: number;
}

export const demoJobs: DemoJob[] = [
  {
    id: "demo-job-001",
    job_title: "Backend Developer",
    company_name: "Shopify",
    company_website: "https://shopify.com",
    location: "Toronto, ON",
    remote_status: "Hybrid",
    required_skills: ["Python", "REST APIs", "PostgreSQL", "Docker", "Git", "CI/CD"],
    preferred_skills: ["AWS", "Kubernetes", "GraphQL", "Redis"],
    experience_level: "1-3 years",
    education_requirements: "B.Sc. Computer Science or equivalent",
    salary_range: "$85,000 – $110,000",
    key_responsibilities: [
      "Design and build scalable backend services",
      "Develop and maintain RESTful APIs for e-commerce platform",
      "Write unit and integration tests with high code coverage",
      "Participate in architecture discussions and code reviews",
      "Deploy and monitor services in cloud environments",
    ],
    posting_age_days: 3,
  },
  {
    id: "demo-job-002",
    job_title: "Software Engineer",
    company_name: "IBM",
    company_website: "https://ibm.com",
    location: "Ottawa, ON",
    remote_status: "Remote",
    required_skills: ["Python", "JavaScript", "SQL", "Docker", "Linux", "Git"],
    preferred_skills: ["TypeScript", "React", "AWS", "MongoDB", "Terraform"],
    experience_level: "1-2 years",
    education_requirements: "B.Sc. in Computer Science or related field",
    salary_range: "$80,000 – $100,000",
    key_responsibilities: [
      "Develop cloud-native applications for enterprise clients",
      "Build and maintain full-stack features using modern frameworks",
      "Collaborate with product managers and designers on feature specs",
      "Contribute to internal developer tools and documentation",
      "Troubleshoot and resolve production issues",
    ],
    posting_age_days: 5,
  },
  {
    id: "demo-job-003",
    job_title: "Software Developer",
    company_name: "Microsoft",
    company_website: "https://microsoft.com",
    location: "Vancouver, BC",
    remote_status: "Hybrid",
    required_skills: ["TypeScript", "React", "Node.js", "Git", "SQL"],
    preferred_skills: ["Azure", "GraphQL", "Kubernetes", "System Design", "C#"],
    experience_level: "2-4 years",
    education_requirements: "B.Sc. Computer Science or equivalent experience",
    salary_range: "$95,000 – $130,000",
    key_responsibilities: [
      "Build features for Azure cloud developer tools",
      "Develop responsive web interfaces with React and TypeScript",
      "Design and implement microservices architecture",
      "Mentor junior developers and conduct code reviews",
      "Work with global teams across multiple time zones",
    ],
    posting_age_days: 7,
  },
  {
    id: "demo-job-004",
    job_title: "Full Stack Developer",
    company_name: "Wealthsimple",
    company_website: "https://wealthsimple.com",
    location: "Toronto, ON",
    remote_status: "Remote",
    required_skills: ["React", "TypeScript", "Node.js", "PostgreSQL", "REST APIs", "Git"],
    preferred_skills: ["Python", "AWS", "Docker", "Redis", "GraphQL"],
    experience_level: "1-3 years",
    education_requirements: "Degree in CS or equivalent practical experience",
    salary_range: "$90,000 – $115,000",
    key_responsibilities: [
      "Build and maintain user-facing financial product features",
      "Develop API endpoints and database schema for new products",
      "Implement responsive, accessible UIs with React",
      "Participate in on-call rotations and incident response",
      "Write comprehensive tests and maintain CI/CD pipelines",
    ],
    posting_age_days: 2,
  },
  {
    id: "demo-job-005",
    job_title: "Data Engineer",
    company_name: "TD Bank",
    company_website: "https://td.com",
    location: "Toronto, ON",
    remote_status: "Hybrid",
    required_skills: ["Python", "SQL", "AWS", "Docker", "Linux"],
    preferred_skills: ["Kafka", "Spark", "Terraform", "Airflow", "Snowflake"],
    experience_level: "2-4 years",
    education_requirements: "B.Sc. in Computer Science, Data Science, or related field",
    salary_range: "$88,000 – $115,000",
    key_responsibilities: [
      "Design and build data pipelines for analytics and reporting",
      "Develop ETL processes for large-scale data ingestion",
      "Optimize query performance and data storage costs",
      "Implement data quality frameworks and monitoring",
      "Collaborate with data scientists and business analysts",
    ],
    posting_age_days: 10,
  },
  {
    id: "demo-job-006",
    job_title: "DevOps Engineer",
    company_name: "Coinbase",
    company_website: "https://coinbase.com",
    location: "Remote — Canada",
    remote_status: "Remote",
    required_skills: ["Docker", "Kubernetes", "AWS", "CI/CD", "Linux", "Terraform"],
    preferred_skills: ["Python", "Go", "Ansible", "Prometheus", "Grafana"],
    experience_level: "3-5 years",
    education_requirements: "B.Sc. in Computer Science or equivalent",
    salary_range: "$110,000 – $145,000",
    key_responsibilities: [
      "Manage and scale Kubernetes clusters in production",
      "Design and implement infrastructure-as-code with Terraform",
      "Build and maintain CI/CD pipelines for microservices",
      "Implement monitoring, alerting, and incident response",
      "Ensure security compliance across cloud environments",
    ],
    posting_age_days: 14,
  },
];
