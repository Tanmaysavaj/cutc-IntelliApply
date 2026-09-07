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
import { extractPosting } from "../content/extract-posting.js";

// Clicking the toolbar icon opens the side panel.
chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {
    // Older builds without the behaviour API still open the panel from the manifest.
  });
});

const UNREADABLE_PAGE =
  "IntelliApply cannot read this page. Open the job posting in a normal tab, then press Capture — " +
  "or use “Paste manually” below.";

async function activeTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) throw new Error("No active tab to read.");
  // `tab.url` is only populated once we have access to the tab, which we
  // deliberately do not request up front, so treat it as a best-effort hint.
  if (/^(chrome|edge|about|chrome-extension|devtools|view-source):/i.test(tab.url ?? "")) {
    throw new Error(UNREADABLE_PAGE);
  }
  return tab;
}

async function capturePosting() {
  const tab = await activeTab();

  // `activeTab` + `scripting` means the extension has no standing access to any
  // site: injection only happens on an explicit user action, for this one tab.
  let result;
  try {
    [result] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: extractPosting,
    });
  } catch (error) {
    // Without the broad `tabs` permission we cannot always see the URL in
    // advance, so the guard above can miss. Chrome's own message here
    // ("Cannot access contents of the page…") is not something to show a user.
    const message = String(error?.message ?? error);
    if (/cannot access|must request permission|chrome:\/\/|showing error page/i.test(message)) {
      throw new Error(UNREADABLE_PAGE);
    }
    throw error;
  }

  const posting = result?.result;
  if (!posting || !posting.text || posting.text.length < 120) {
    throw new Error(
      "Could not find a job posting on this page. Open the posting's own page, or paste the description manually."
    );
  }
  await setPosting(posting);
  return posting;
}

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

  return runAnalysis(resume, jobData, jobData ? null : posting.text);
}

const HANDLERS = {
  [MSG.CAPTURE_POSTING]: capturePosting,
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
