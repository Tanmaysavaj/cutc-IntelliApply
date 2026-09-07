/**
 * Writing to the folder the user picked.
 *
 * The File System Access API is the only mechanism that can write to an arbitrary
 * user-chosen directory. `chrome.downloads` is limited to the Downloads folder and
 * its subfolders, so it cannot honour "save it where I said".
 *
 * Two constraints this module works around:
 * - `showDirectoryPicker()` needs a document and a user gesture, so it can only be
 *   called from the side panel — never the service worker.
 * - The directory handle survives restarts via IndexedDB, but the browser may
 *   still ask to re-confirm access. `ensureWritable` re-requests rather than
 *   failing, and only that path needs a user gesture.
 */

import { getDirectoryHandle, saveDirectoryHandle } from "./store.js";

export function isSupported() {
  return typeof window !== "undefined" && typeof window.showDirectoryPicker === "function";
}

/** Prompts for a folder and remembers it. Must be called from a click handler. */
export async function chooseFolder() {
  if (!isSupported()) {
    throw new Error("This browser cannot save to a chosen folder. Chrome or Edge 114+ is required.");
  }
  const handle = await window.showDirectoryPicker({
    id: "intelliapply-packages",
    mode: "readwrite",
    startIn: "documents",
  });
  await saveDirectoryHandle(handle);
  return handle;
}

/**
 * Confirms we still hold write permission, asking again if the browser dropped it.
 * @returns {Promise<FileSystemDirectoryHandle|null>} null when no folder is set
 */
export async function ensureWritable({ prompt = true } = {}) {
  const handle = await getDirectoryHandle();
  if (!handle) return null;

  const options = { mode: "readwrite" };
  if ((await handle.queryPermission(options)) === "granted") return handle;
  if (!prompt) return null;
  if ((await handle.requestPermission(options)) === "granted") return handle;

  throw new Error(
    "Access to your save folder was declined. Choose the folder again to continue saving there."
  );
}

/**
 * Writes bytes into the chosen folder, without overwriting: if the name is taken,
 * a numeric suffix is added, so saving twice never destroys the first package.
 *
 * @returns {Promise<{fileName: string, folderName: string}>}
 */
export async function writeFile(handle, fileName, bytes) {
  const unique = await uniqueName(handle, fileName);
  const fileHandle = await handle.getFileHandle(unique, { create: true });
  const writable = await fileHandle.createWritable();
  try {
    await writable.write(bytes);
  } finally {
    // Closing is what actually flushes to disk, so it must happen even on error.
    await writable.close();
  }
  return { fileName: unique, folderName: handle.name };
}

async function uniqueName(handle, fileName) {
  const match = /^(.*?)(\.[^.]*)?$/.exec(fileName);
  const stem = match?.[1] ?? fileName;
  const ext = match?.[2] ?? "";

  let candidate = fileName;
  for (let i = 2; i < 100; i++) {
    if (!(await exists(handle, candidate))) return candidate;
    candidate = `${stem}-${i}${ext}`;
  }
  return `${stem}-${Date.now()}${ext}`;
}

async function exists(handle, name) {
  try {
    await handle.getFileHandle(name);
    return true;
  } catch {
    return false;
  }
}
