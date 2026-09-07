/**
 * Message contract between the side panel and the service worker.
 *
 * Network calls live in the service worker on purpose: an extension service
 * worker with `host_permissions` is not subject to page CORS, so the backend
 * needs no extra allowed origin. Content scripts do not get that exemption,
 * which is why the page extractor only reads the DOM and never calls the API.
 */

export const MSG = {
  /**
   * Send posting text to the backend for structured extraction.
   *
   * Note there is no capture message: reading the page happens in the side panel
   * (src/lib/capture.js) because requesting the optional host permission needs a
   * user gesture, which a service worker cannot provide.
   */
  PROCESS_JOB: "process-job",
  /** Parse a stored resume PDF into structured data. */
  PARSE_RESUME: "parse-resume",
  /** Run the match analysis for the stored resume + captured job. */
  CHECK_SCORE: "check-score",
  /** Backend reachability probe. */
  PING_BACKEND: "ping-backend",
};

/** Uniform reply envelope so callers never have to guess the shape. */
export function ok(data) {
  return { ok: true, data };
}

export function fail(message, detail) {
  return { ok: false, error: message, detail: detail ?? null };
}
