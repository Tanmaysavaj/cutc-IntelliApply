/**
 * Backend client. Intended to run in the service worker, where `host_permissions`
 * exempts requests from page CORS.
 *
 * Anonymous by design: no tokens, no account. The backend is called exactly as
 * the web app calls it, so no new endpoints are required for capture + scoring.
 */

import { ENDPOINTS, REQUEST_TIMEOUT_MS, SETTINGS_DEFAULTS } from "./config.js";
import { getSettings } from "./store.js";

async function baseUrl() {
  const settings = await getSettings();
  return (settings.apiBaseUrl || SETTINGS_DEFAULTS.apiBaseUrl).replace(/\/+$/, "");
}

/**
 * Turns a failed response into something worth showing a user.
 *
 * The backend's own ErrorResponse model puts the reason in `error` — e.g.
 * "Failed to extract resume information: …". The first version of this client
 * only looked at `detail` and `message`, so every one of those became a bare
 * "HTTP 422" and the actual cause was thrown away. `error` is checked first now.
 */
/**
 * Backend failures often arrive as a nested trace from whatever the backend was
 * calling — e.g. `Failed to extract resume information: Resume extraction failed:
 * Error code: 401 - {'error': {'message': 'User not found.'}}`. That is accurate
 * but useless to a user, and it reads as if their resume were at fault when the
 * real problem is a server-side credential. These translate the common upstream
 * failures into something that says who needs to do what.
 */
const UPSTREAM_HINTS = [
  {
    match: /error code: 401|user not found|unauthoriz|invalid api key|authentication/i,
    message:
      "The IntelliApply backend could not authenticate with its AI provider (401). " +
      "That is a server-side configuration problem — the backend's OPENROUTER_API_KEY is missing, " +
      "expired or revoked. Your resume and this extension are fine.",
  },
  {
    match: /insufficient credits|error code: 40[23]|error code: 429|quota|rate limit/i,
    message:
      "The IntelliApply backend's AI provider is out of credits or is rate limiting requests. " +
      "Try again shortly, or top up the provider account.",
  },
  {
    match: /no text extracted|no extractable text/i,
    message:
      "The backend could not read any text from your PDF, which usually means it is a scan or an image " +
      "rather than a text PDF. Re-export it (for example “Save as PDF” from Word or Google Docs) and try again.",
  },
  {
    match: /error code: 5\d\d|upstream|bad gateway|timed out|timeout/i,
    message:
      "The backend's AI provider did not respond. This is usually temporary — try again in a moment.",
  },
];

function translateUpstream(raw) {
  for (const hint of UPSTREAM_HINTS) {
    if (hint.match.test(raw)) return hint.message;
  }
  return raw;
}

/** Exported for tests; not part of the client's public surface. */
export function describeError(body, status) {
  const candidate = body?.error ?? body?.detail ?? body?.message;

  if (typeof candidate === "string" && candidate.trim()) return translateUpstream(candidate);

  // FastAPI request-validation failures arrive as an array of issue objects.
  if (Array.isArray(candidate)) {
    const issues = candidate
      .map((issue) => {
        const field = Array.isArray(issue?.loc) ? issue.loc.filter((p) => p !== "body").join(".") : "";
        return [field, issue?.msg].filter(Boolean).join(": ");
      })
      .filter(Boolean);
    if (issues.length) return issues.join("; ");
  }

  if (candidate && typeof candidate === "object") return JSON.stringify(candidate);

  return status === 422
    ? "The backend could not process the resume or job posting (HTTP 422)."
    : `Request failed (HTTP ${status}).`;
}

/** Adds a timeout, so a cold backend surfaces as a clear error not a hung UI. */
async function request(path, init = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(`${await baseUrl()}${path}`, {
      ...init,
      signal: controller.signal,
    });
    const text = await response.text();
    let body = null;
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      body = { raw: text };
    }
    if (!response.ok) throw new Error(describeError(body, response.status));
    return body;
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error("The backend did not respond in time. It may be waking up — try again.");
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

export async function checkHealth() {
  return request(ENDPOINTS.health, { method: "GET" });
}

/**
 * Turns free-form posting text into structured job data. The backend already
 * accepts a pasted description, so the page extractor only has to supply text —
 * it does not need per-site field parsing.
 */
export async function processJobDescription(description) {
  const form = new FormData();
  form.append("description", description);
  return request(ENDPOINTS.jobs, { method: "POST", body: form });
}

export async function parseResume(file) {
  const form = new FormData();
  form.append("resume", file, file.name || "resume.pdf");
  return request(ENDPOINTS.resume, { method: "POST", body: form });
}

/**
 * @param {File|Blob} resumeFile
 * @param {object|null} jobData structured job data from processJobDescription
 * @param {string|null} jobDescription raw text fallback
 */
export async function runAnalysis(resumeFile, jobData, jobDescription) {
  const form = new FormData();
  form.append("resume", resumeFile, resumeFile.name || "resume.pdf");
  if (jobData) form.append("job_data", JSON.stringify(jobData));
  else if (jobDescription) form.append("job_description", jobDescription);
  else throw new Error("Capture a job posting before running an analysis.");
  return request(ENDPOINTS.analysis, { method: "POST", body: form });
}
