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
    if (!response.ok) {
      const detail = body?.detail || body?.message || `HTTP ${response.status}`;
      throw new Error(typeof detail === "string" ? detail : JSON.stringify(detail));
    }
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
