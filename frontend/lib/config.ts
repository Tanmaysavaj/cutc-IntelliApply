/**
 * Centralized project configuration for IntelliApply
 * All external URLs, social links, and project metadata in one place.
 * Replace placeholder values with final links when available.
 */

/**
 * Deployed environment URLs.
 *
 * These are public, non-secret values. They are kept in source (rather than
 * relying solely on `NEXT_PUBLIC_*` build-time env vars) so that a deploy which
 * forgets to inject env vars still targets the real backend instead of silently
 * falling back to `http://localhost:8000`.
 */
export const deployment = {
  /** Production FastAPI backend (Render). */
  productionApiUrl: "https://cutc-intelliapply.onrender.com",
  /** Local backend used during development. */
  developmentApiUrl: "http://localhost:8000",
};

export const projectConfig = {
  name: "IntelliApply",
  tagline: "Apply smarter. Prepare better.",
  supportingTagline: "AI-powered career intelligence for smarter applications.",
  event: "CUTC Hackathon 2026",
  year: 2026,

  social: {
    github: "https://github.com/Tanmaysavaj/cutc-IntelliApply",
    linkedin: "",
    contact: "",
    documentation: "",
  },

  team: [
    {
      name: "Tanmay Savaj",
      role: "Backend & AI Engineer — Lead",
      responsibilities: "Backend architecture, AI integration, analysis pipeline and system integration.",
      image: "",
      github: "",
      linkedin: "https://www.linkedin.com/in/tanmaysavaj/",
    },
    {
      name: "Yashasvini",
      role: "UI/UX Designer",
      responsibilities: "User experience, interface design, visual system and product experience.",
      image: "",
      github: "",
      linkedin: "https://www.linkedin.com/in/yashasvini-bhanuraj-0a7a13202",
    },
    {
      name: "Samia",
      role: "Integration / QA / Product",
      responsibilities: "System integration, testing, product validation and overall quality.",
      image: "",
      github: "",
      linkedin: "https://www.linkedin.com/in/samia-a-972797397/",
    },
    {
      name: "Yeldana",
      role: "Frontend Engineer",
      responsibilities: "Frontend implementation, components, application interface and frontend integration.",
      image: "",
      github: "",
      linkedin: "https://www.linkedin.com/in/yeldanab",
    },
  ],

  legal: {
    aiDisclaimer:
      "IntelliApply provides AI-generated insights and recommendations for informational purposes only. Match scores and recommendations should not be considered guarantees of employment or hiring decisions.",
  },
};
