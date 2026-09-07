/**
 * Reading the job posting out of the current tab.
 *
 * This runs in the side panel, not the service worker, and that is the whole
 * point. The first version put it in the worker and relied on the `activeTab`
 * permission — which does not work here: `activeTab` is only granted when the
 * user invokes the extension through the toolbar action, a context menu or a
 * keyboard shortcut. A click on a button *inside* the side panel is none of
 * those, so the extension had no access to the page at all: `chrome.tabs.query`
 * returned entries with no `url`, and `executeScript` failed outright. That was
 * the "capturing didn't work" bug.
 *
 * The fix is an optional host permission, requested the first time the user
 * captures. It is not granted at install time, so a fresh install still has no
 * access to anything you browse; the user grants it explicitly, once, and can
 * revoke it from the extensions page at any time. `chrome.permissions.request`
 * needs a user gesture, which a button click in the panel does provide.
 */

import { extractPosting } from "../content/extract-posting.js";
import { setPosting } from "./store.js";

/** Matches `optional_host_permissions` in the manifest. */
const PAGE_ORIGINS = ["http://*/*", "https://*/*"];

const UNREADABLE_PAGE =
  "IntelliApply cannot read this page. Open the job posting in a normal tab, then press Capture — " +
  "or use \u201cPaste manually\u201d below.";

export async function hasPageAccess() {
  return chrome.permissions.contains({ origins: PAGE_ORIGINS });
}

/**
 * Ensures we may read page content, prompting once if needed.
 * Must be called directly from a user gesture (a click handler).
 * @returns {Promise<boolean>} false when the user declines
 */
export async function ensurePageAccess() {
  if (await hasPageAccess()) return true;
  return chrome.permissions.request({ origins: PAGE_ORIGINS });
}

export async function revokePageAccess() {
  return chrome.permissions.remove({ origins: PAGE_ORIGINS });
}

/**
 * Injects the extractor into the active tab and stores what it finds.
 * @returns {Promise<object>} the captured posting
 */
export async function capturePosting() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) throw new Error("No active tab to read. Open the job posting in a tab and try again.");

  // With the host permission granted, `tab.url` is readable, so genuinely
  // unreadable pages can be rejected with a useful message up front.
  if (/^(chrome|edge|about|chrome-extension|devtools|view-source|file):/i.test(tab.url ?? "")) {
    throw new Error(UNREADABLE_PAGE);
  }

  let result;
  try {
    [result] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: extractPosting,
    });
  } catch (error) {
    const message = String(error?.message ?? error);
    if (/cannot access|must request permission|chrome:\/\//i.test(message)) {
      throw new Error(UNREADABLE_PAGE);
    }
    throw error;
  }

  const posting = result?.result;
  if (!posting?.text || posting.text.length < 120) {
    throw new Error(
      "Could not find a job posting on this page. Open the posting's own page, or paste the description manually."
    );
  }

  await setPosting(posting);
  return posting;
}
