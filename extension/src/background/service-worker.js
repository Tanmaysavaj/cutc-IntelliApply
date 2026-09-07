/**
 * Service worker: the only place that talks to the backend.
 *
 * Two reasons it lives here rather than in the side panel or a content script:
 * - With `host_permissions`, requests from the extension service worker are not
 *   subject to page CORS, so the FastAPI backend needs no extra allowed origin.
 * - Content scripts get no such exemption, so the page extractor stays read-only.
 *
 * Binary never crosses `sendMessage` (which is JSON-only). The resume is written
 * to IndexedDB by the panel and read back here, since both share the extension
 * origin.
 */

import { MSG, ok, fail } from "../lib/messages.js";
import { checkHealth, parseResume, processJobDescription, runAnalysis } from "../lib/api.js";
import { getPosting, getResumeFile, setPosting } from "../lib/store.js";

// Clicking the toolbar icon opens the side panel.
chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {
    // Older builds without the behaviour API still open the panel from the manifest.
  });
});

// Capturing the page deliberately does NOT live here. It needs a user gesture to
// request the optional host permission, which only an extension page can supply,
// so it lives in the side panel — see src/lib/capture.js.

async function checkScore() {
  const [resume, posting] = await Promise.all([getResumeFile(), getPosting()]);
  if (!resume) throw new Error("Add your resume first.");
  if (!posting) throw new Error("Capture a job posting first.");

  // Structured extraction first; the analysis is better with parsed fields, but
  // fall back to raw text so a parsing hiccup does not block scoring.
  let jobData = posting.jobData ?? null;
  if (!jobData) {
    try {
      const processed = await processJobDescription(posting.text);
      jobData = processed?.data ?? null;
      if (jobData) await setPosting({ ...posting, jobData });
    } catch (error) {
      console.warn("[IntelliApply] job extraction failed, using raw text:", error);
    }
  }

  if (!jobData) return runAnalysis(resume, null, posting.text);

  try {
    return await runAnalysis(resume, jobData, null);
  } catch (error) {
    // The analysis endpoint re-validates job_data against its own model and
    // answers 422 "Failed to process job information" if it does not fit. The raw
    // description usually still works, so it is worth one retry before giving up.
    if (/job (information|data)/i.test(String(error?.message ?? ""))) {
      console.warn("[IntelliApply] structured job data rejected, retrying with raw text:", error);
      return runAnalysis(resume, null, posting.text);
    }
    throw error;
  }
}

const HANDLERS = {
  [MSG.PROCESS_JOB]: async () => {
    const posting = await getPosting();
    if (!posting) throw new Error("Capture a job posting first.");
    const processed = await processJobDescription(posting.text);
    const jobData = processed?.data ?? null;
    if (jobData) await setPosting({ ...posting, jobData });
    return jobData;
  },
  [MSG.PARSE_RESUME]: async () => {
    const resume = await getResumeFile();
    if (!resume) throw new Error("Add your resume first.");
    return parseResume(resume);
  },
  [MSG.CHECK_SCORE]: checkScore,
  [MSG.PING_BACKEND]: checkHealth,
};

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  const handler = HANDLERS[message?.type];
  if (!handler) {
    sendResponse(fail(`Unknown message type: ${message?.type}`));
    return false;
  }

  handler(message)
    .then((data) => sendResponse(ok(data)))
    .catch((error) => {
      console.error(`[IntelliApply] ${message.type} failed:`, error);
      sendResponse(fail(error instanceof Error ? error.message : "Unexpected error"));
    });

  // Returning true keeps the message channel open for the async reply.
  return true;
});
