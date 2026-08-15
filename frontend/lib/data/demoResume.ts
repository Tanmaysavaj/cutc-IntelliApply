/**
 * Centralized demo resume data for IntelliApply
 * Fictional candidate: Alex Chen — Software Developer
 */

export const demoResume = {
  resume_id: "demo-resume-001",
  status: "completed",
  extracted_at: "2026-08-10T14:30:00Z",
  data: {
    name: "Alex Chen",
    target_role: "Software Developer",
    location: "Toronto, ON",
    email: "alex.chen@email.com",
    hard_skills: [
      "Python",
      "JavaScript",
      "TypeScript",
      "React",
      "Node.js",
      "PostgreSQL",
      "AWS",
      "Docker",
      "REST APIs",
      "Git",
      "SQL",
      "MongoDB",
      "CI/CD",
      "Linux",
    ],
    soft_skills: [
      "Problem Solving",
      "Team Collaboration",
      "Communication",
      "Adaptability",
      "Time Management",
    ],
    work_experience: [
      {
        company: "TechFlow Solutions",
        role: "Junior Software Developer",
        duration: "May 2025 – Present",
        responsibilities: [
          "Developed and maintained RESTful APIs using Python and FastAPI",
          "Built responsive frontend components with React and TypeScript",
          "Implemented CI/CD pipelines using GitHub Actions",
          "Collaborated with cross-functional teams in Agile sprints",
        ],
      },
      {
        company: "DataPulse Analytics",
        role: "Software Engineering Intern",
        duration: "Sep 2024 – Apr 2025",
        responsibilities: [
          "Built data processing pipelines with Python and pandas",
          "Created interactive dashboards using React and D3.js",
          "Optimized PostgreSQL queries reducing response time by 40%",
          "Participated in code reviews and pair programming sessions",
        ],
      },
    ],
    education: [
      {
        institution: "University of Toronto",
        degree: "B.Sc. Computer Science, Co-op",
      },
    ],
    certifications: ["AWS Cloud Practitioner", "GitHub Actions Certified"],
    projects: [
      "IntelliApply — AI-powered career intelligence platform (CUTC Hackathon)",
      "TaskFlow — Real-time collaborative task management app using WebSockets",
      "DataViz Dashboard — Interactive data visualization tool with D3.js and React",
    ],
    keywords: [
      "Full-Stack Development",
      "Cloud Computing",
      "Data Engineering",
      "Agile",
    ],
  },
  strongest_skills: ["Python", "AWS", "REST APIs", "Docker", "React"],
  skills_to_develop: ["Kubernetes", "Terraform", "Kafka", "GraphQL", "System Design"],
};
