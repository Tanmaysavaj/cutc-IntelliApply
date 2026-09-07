/**
 * Browser-storage inventory, consent state and a complete erase.
 *
 * This module is the single factual source behind the Data & Permissions page.
 * It is deliberately written as data rather than prose so the page cannot drift
 * from what the app actually stores: every key listed here is a key the code
 * really writes, and `clearEverything` walks this same list.
 *
 * Note on terminology: IntelliApply sets **no cookies**. Session and application
 * state live in localStorage and IndexedDB. Consent is still required for the
 * non-essential parts, so the UI talks about "browser storage" rather than
 * copying a cookie-banner template that would be factually wrong here.
 */

/**
 * - `essential`  — required to deliver the thing you actively asked for (parsing the
 *                  resume you uploaded, keeping you signed in).
 * - `preference` — records a display choice and holds no personal data.
 * - `functional` — convenience caches of your personal results. This is the only
 *                  group the opt-out below governs, and turning it off really does
 *                  stop the writes rather than just hiding them.
 */
export type StoragePurpose = "essential" | "preference" | "functional";

export const PURPOSE_LABELS: Record<StoragePurpose, string> = {
  essential: "Essential",
  preference: "Preference",
  functional: "Optional",
};

export type StorageMedium = "localStorage" | "indexedDB";

export type StorageItem = {
  key: string;
  medium: StorageMedium;
  label: string;
  /** What is actually kept, in plain language. */
  contains: string;
  purpose: StoragePurpose;
  /** Why it exists — used verbatim in the UI. */
  reason: string;
};

/**
 * Everything IntelliApply writes to the browser.
 *
 * "essential" items are required for the app to function at all or are a direct
 * result of an action the user took (uploading a resume). "functional" items only
 * improve convenience and are what the preference toggle controls.
 */
export const STORAGE_INVENTORY: StorageItem[] = [
  {
    key: "intelliapply_resume",
    medium: "localStorage",
    label: "Parsed resume",
    contains:
      "The structured version of your resume — name, contact details, skills, experience, education, projects.",
    purpose: "essential",
    reason: "Lets you move between screens and reload the page without re-uploading your resume.",
  },
  {
    key: "resume_pdf (intelliapply_db)",
    medium: "indexedDB",
    label: "Your uploaded PDF",
    contains: "The original resume PDF file exactly as you selected it.",
    purpose: "essential",
    reason: "Needed to re-run an analysis or compare a new resume against a previous one.",
  },
  {
    key: "intelliapply_job / intelliapply_job_metadata",
    medium: "localStorage",
    label: "Extracted job posting",
    contains:
      "The job title, company, location, requirements and responsibilities, plus where it came from (URL, pasted text or PDF).",
    purpose: "essential",
    reason: "The analysis compares your resume against this, so it has to persist between screens.",
  },
  {
    key: "intelliapply_last_analysis",
    medium: "localStorage",
    label: "Most recent analysis",
    contains: "Your latest match score, strengths, gaps and recommendations.",
    purpose: "functional",
    reason: "Shows your last result immediately instead of re-running the analysis on every visit.",
  },
  {
    key: "intelliapply_analysis_history",
    medium: "localStorage",
    label: "Analysis history",
    contains: "A record of past analyses — job title, company, score and date.",
    purpose: "functional",
    reason: "Powers the History and Analytics screens.",
  },
  {
    key: "intelliapply_applications / intelliapply_app_notes",
    medium: "localStorage",
    label: "Applications and notes",
    contains: "Applications you track and any notes you write against them.",
    purpose: "functional",
    reason: "Keeps your application workspace between visits.",
  },
  {
    key: "intelliapply-theme",
    medium: "localStorage",
    label: "Appearance preference",
    contains: "Whether you chose light or dark mode. No personal data.",
    purpose: "preference",
    reason: "Remembers your choice so the app does not flash the wrong theme on load.",
  },
  {
    key: "intelliapply_storage_consent",
    medium: "localStorage",
    label: "Your storage choice",
    contains: "Whether you accepted or declined non-essential storage, and when.",
    purpose: "essential",
    reason: "Records your decision so you are not asked again on every visit.",
  },
  {
    key: "sb-* (only when sign-in is enabled)",
    medium: "localStorage",
    label: "Sign-in session",
    contains: "A Supabase session token, if you choose to create an account and sign in.",
    purpose: "essential",
    reason: "Keeps you signed in. Written by the Supabase client, not by IntelliApply directly.",
  },
];

/** Where data goes once it leaves the browser, and why. */
export type Processor = {
  name: string;
  role: string;
  data: string;
};

export const PROCESSORS: Processor[] = [
  {
    name: "IntelliApply API (Render)",
    role: "Our own backend. Receives your resume and the job posting, runs the analysis and returns the result.",
    data: "Your resume PDF and its parsed text, plus the job posting you provide.",
  },
  {
    name: "OpenRouter (Google Gemini)",
    role: "The AI model that reads your resume and the job posting to produce the match analysis.",
    data: "The text of your resume and the job description.",
  },
  {
    name: "Tavily",
    role: "Web search used to research the company attached to a job posting.",
    data: "The company name and, where available, its website domain. Your resume is never sent.",
  },
  {
    name: "WHOIS lookup",
    role: "Checks a company domain's registration to help flag suspicious postings.",
    data: "Only the company's domain name.",
  },
  {
    name: "Supabase",
    role: "Accounts and sign-in, and storing your resume against your account if you are signed in.",
    data: "Your email address and, when signed in, your parsed resume.",
  },
  {
    name: "Cloudflare",
    role: "Serves the application itself.",
    data: "Standard request information required to deliver a web page.",
  },
];

/* ─── consent ─── */

export const CONSENT_KEY = "intelliapply_storage_consent";

export type ConsentChoice = "accepted" | "essential-only";

export type ConsentRecord = {
  choice: ConsentChoice;
  decidedAt: string;
};

export function readConsent(): ConsentRecord | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(CONSENT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ConsentRecord>;
    if (parsed.choice !== "accepted" && parsed.choice !== "essential-only") return null;
    return { choice: parsed.choice, decidedAt: parsed.decidedAt ?? "" };
  } catch {
    return null;
  }
}

export function writeConsent(choice: ConsentChoice): ConsentRecord {
  const record: ConsentRecord = { choice, decidedAt: new Date().toISOString() };
  try {
    window.localStorage.setItem(CONSENT_KEY, JSON.stringify(record));
  } catch {
    // Storage can be unavailable (private mode, quota). The app still works; the
    // notice will simply appear again next visit.
  }
  return record;
}

/**
 * Whether the optional convenience caches may be written.
 *
 * Defaults to allowed until the user actively opts out. That is a deliberate
 * choice rather than an oversight: every one of these values stays inside the
 * user's own browser, none of it is transmitted anywhere, and there is no
 * analytics, advertising or third-party tracking storage in this app. Defaulting
 * to off would silently break History and Analytics for anyone who dismissed the
 * notice without reading it. The opt-out is real — see `saveLastAnalysis` and
 * `addToHistory` in storage.ts, which both consult this.
 */
export function functionalStorageAllowed(): boolean {
  return readConsent()?.choice !== "essential-only";
}

/* ─── erase ─── */

/** Every localStorage key the app writes, excluding the consent record itself. */
const LOCAL_KEYS_TO_CLEAR = [
  "intelliapply_resume",
  "intelliapply_job",
  "intelliapply_job_metadata",
  "intelliapply_last_analysis",
  "intelliapply_analysis_history",
  "intelliapply_applications",
  "intelliapply_app_notes",
  "intelliapply-theme",
];

export const INDEXED_DB_NAME = "intelliapply_db";

export type EraseResult = {
  localKeysRemoved: number;
  indexedDbDeleted: boolean;
  consentCleared: boolean;
};

/**
 * Deletes everything IntelliApply has put in this browser.
 *
 * The pre-existing `clearAllData()` in storage.ts only removed the resume and job
 * keys, leaving analysis history, applications, notes and the stored PDF behind —
 * so it could not honestly back a "delete my data" control. This clears all of it,
 * including the IndexedDB database holding the uploaded file.
 */
export async function clearEverything(options: { includeConsent?: boolean } = {}): Promise<EraseResult> {
  let localKeysRemoved = 0;

  for (const key of LOCAL_KEYS_TO_CLEAR) {
    try {
      if (window.localStorage.getItem(key) !== null) {
        window.localStorage.removeItem(key);
        localKeysRemoved++;
      }
    } catch {
      // Ignore and continue: a single failing key must not abort the erase.
    }
  }

  // Supabase session keys are prefixed and vary by project ref.
  try {
    for (const key of Object.keys(window.localStorage)) {
      if (key.startsWith("sb-")) {
        window.localStorage.removeItem(key);
        localKeysRemoved++;
      }
    }
  } catch {
    /* ignore */
  }

  const indexedDbDeleted = await deleteIndexedDb();

  let consentCleared = false;
  if (options.includeConsent) {
    try {
      window.localStorage.removeItem(CONSENT_KEY);
      consentCleared = true;
    } catch {
      /* ignore */
    }
  }

  return { localKeysRemoved, indexedDbDeleted, consentCleared };
}

function deleteIndexedDb(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof indexedDB === "undefined") return resolve(false);
    try {
      const request = indexedDB.deleteDatabase(INDEXED_DB_NAME);
      request.onsuccess = () => resolve(true);
      request.onerror = () => resolve(false);
      // Another open tab can block deletion; do not hang the UI waiting for it.
      request.onblocked = () => resolve(false);
    } catch {
      resolve(false);
    }
  });
}
