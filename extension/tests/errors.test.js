/**
 * Error-message tests.
 *
 * Run with:  node --test extension/tests/errors.test.js
 *
 * These exist because the first version of the client reduced every backend
 * failure to "HTTP 422", which cost real debugging time: the actual cause was an
 * expired AI-provider key on the server, and nothing in the UI hinted at that.
 * The rule being locked in here is that a user should always be told *whose*
 * problem it is and what to do next.
 */

import test from "node:test";
import assert from "node:assert/strict";

import { describeError } from "../src/lib/api.js";

test("reads the backend's own `error` field", () => {
  // The backend's ErrorResponse model uses `error`, not `detail` or `message`.
  assert.match(describeError({ success: false, error: "Job posting was empty" }, 422), /Job posting was empty/);
});

test("still understands `detail` and `message`", () => {
  assert.match(describeError({ detail: "Something specific" }, 400), /Something specific/);
  assert.match(describeError({ message: "Also specific" }, 400), /Also specific/);
});

test("an expired AI-provider key is reported as a server problem, not the user's resume", () => {
  // The real production failure, verbatim from the backend.
  const raw =
    "Failed to extract resume information: Resume extraction failed: Failed to extract resume " +
    "information: Error code: 401 - {'error': {'message': 'User not found.', 'code': 401}}";
  const out = describeError({ error: raw }, 422);

  assert.match(out, /could not authenticate/i);
  assert.match(out, /OPENROUTER_API_KEY/);
  assert.match(out, /server-side/i);
  // Must actively reassure, since the raw text reads like the resume was rejected.
  assert.match(out, /resume and this extension are fine/i);
  // And must not dump the provider trace at the user.
  assert.doesNotMatch(out, /User not found/);
});

test("out of credits and rate limits are distinguished from bad credentials", () => {
  for (const raw of [
    "Error code: 402 - insufficient credits",
    "Error code: 429 - rate limit exceeded",
  ]) {
    const out = describeError({ error: raw }, 422);
    assert.match(out, /credits or is rate limiting/i, `for: ${raw}`);
  }
});

test("an image-only PDF is explained with the fix", () => {
  const out = describeError({ error: "Failed to extract resume information: No text extracted from PDF" }, 422);
  assert.match(out, /scan or an image/i);
  assert.match(out, /Save as PDF/i);
});

test("a provider outage is marked as temporary", () => {
  const out = describeError({ error: "Error code: 503 - upstream unavailable" }, 502);
  assert.match(out, /did not respond/i);
  assert.match(out, /temporary/i);
});

test("genuine backend messages are passed through untouched", () => {
  // Only upstream/provider failures get rewritten; anything actionable stays as-is.
  const raw = "Failed to open file as type pdf.";
  assert.equal(describeError({ error: raw }, 422), raw);
});

test("FastAPI validation arrays become readable text", () => {
  const out = describeError(
    { detail: [{ loc: ["body", "resume"], msg: "Field required", type: "missing" }] },
    422
  );
  assert.match(out, /resume: Field required/);
});

test("falls back sensibly when the body says nothing", () => {
  assert.match(describeError(null, 422), /could not process the resume or job posting/i);
  assert.match(describeError({}, 500), /HTTP 500/);
});
