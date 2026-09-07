/**
 * Backend endpoints, matching the contracts the web client already uses
 * (frontend/lib/api.ts). Any change here must stay in step with FastAPI.
 */

export const PRODUCTION_API = "https://cutc-intelliapply.onrender.com";
export const DEVELOPMENT_API = "http://localhost:8000";

export const ENDPOINTS = {
  /** POST, FormData: resume=<File> */
  resume: "/api/resume",
  /** POST, FormData: description=<string> */
  jobs: "/api/jobs",
  /** POST, FormData: resume=<File>, job_data=<json> | job_description=<string> */
  analysis: "/api/analysis",
  health: "/api/health",
};

/** Requests to the backend can be slow on a cold Render dyno. */
export const REQUEST_TIMEOUT_MS = 90_000;

export const SETTINGS_DEFAULTS = {
  apiBaseUrl: PRODUCTION_API,
};
