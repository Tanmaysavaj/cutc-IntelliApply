/**
 * Local persistence for the extension. Everything here stays on the device —
 * there is no account and nothing is synced, which is what lets the extension
 * work anonymously.
 *
 * Two stores, chosen by what they hold:
 * - `chrome.storage.local` for settings, the captured posting and history, all
 *   of which are small JSON.
 * - IndexedDB for binary (the resume PDF, attachments) and for the saved
 *   directory handle, which only IndexedDB can persist.
 *
 * The same IndexedDB database is visible to the side panel and the service
 * worker because both run on the extension origin, so the resume can be written
 * once by the panel and read later by the worker without passing bytes through
 * `sendMessage` (which is JSON-only and would corrupt a file).
 */

const DB_NAME = "intelliapply_ext";
const DB_VERSION = 1;
const FILES_STORE = "files";
const HANDLES_STORE = "handles";

const KEY = {
  settings: "settings",
  posting: "captured_posting",
  resumeMeta: "resume_meta",
  history: "history",
  coverLetter: "cover_letter_draft",
};

const RESUME_FILE_KEY = "resume_pdf";
const DIRECTORY_HANDLE_KEY = "save_directory";

/** Keep history bounded so storage cannot grow without limit. */
const HISTORY_LIMIT = 50;

function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(FILES_STORE)) db.createObjectStore(FILES_STORE);
      if (!db.objectStoreNames.contains(HANDLES_STORE)) db.createObjectStore(HANDLES_STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function idbPut(store, key, value) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, "readwrite");
    tx.objectStore(store).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function idbGet(store, key) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, "readonly");
    const request = tx.objectStore(store).get(key);
    request.onsuccess = () => resolve(request.result ?? null);
    request.onerror = () => reject(request.error);
  });
}

async function idbDelete(store, key) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, "readwrite");
    tx.objectStore(store).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function idbKeys(store) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, "readonly");
    const request = tx.objectStore(store).getAllKeys();
    request.onsuccess = () => resolve(request.result ?? []);
    request.onerror = () => reject(request.error);
  });
}

/* ─── settings ─── */

export async function getSettings() {
  const { [KEY.settings]: settings } = await chrome.storage.local.get(KEY.settings);
  return settings ?? {};
}

export async function setSettings(patch) {
  const next = { ...(await getSettings()), ...patch };
  await chrome.storage.local.set({ [KEY.settings]: next });
  return next;
}

/* ─── resume ─── */

/**
 * @param {File|Blob} file
 * @param {string} name
 */
export async function saveResumeFile(file, name) {
  await idbPut(FILES_STORE, RESUME_FILE_KEY, file);
  await chrome.storage.local.set({
    [KEY.resumeMeta]: { name, size: file.size, savedAt: new Date().toISOString() },
  });
}

export async function getResumeFile() {
  return idbGet(FILES_STORE, RESUME_FILE_KEY);
}

export async function getResumeMeta() {
  const { [KEY.resumeMeta]: meta } = await chrome.storage.local.get(KEY.resumeMeta);
  return meta ?? null;
}

export async function clearResume() {
  await idbDelete(FILES_STORE, RESUME_FILE_KEY);
  await chrome.storage.local.remove(KEY.resumeMeta);
}

/* ─── attachments ─── */

const ATTACHMENT_PREFIX = "attachment:";

export async function addAttachment(file) {
  await idbPut(FILES_STORE, `${ATTACHMENT_PREFIX}${file.name}`, file);
}

export async function listAttachments() {
  const keys = await idbKeys(FILES_STORE);
  const names = keys.filter((k) => typeof k === "string" && k.startsWith(ATTACHMENT_PREFIX));
  const files = [];
  for (const key of names) {
    const file = await idbGet(FILES_STORE, key);
    if (file) files.push({ name: key.slice(ATTACHMENT_PREFIX.length), file });
  }
  return files;
}

export async function removeAttachment(name) {
  await idbDelete(FILES_STORE, `${ATTACHMENT_PREFIX}${name}`);
}

/* ─── captured posting ─── */

export async function setPosting(posting) {
  await chrome.storage.local.set({ [KEY.posting]: posting });
}

export async function getPosting() {
  const { [KEY.posting]: posting } = await chrome.storage.local.get(KEY.posting);
  return posting ?? null;
}

export async function clearPosting() {
  await chrome.storage.local.remove(KEY.posting);
}

/* ─── cover letter draft ─── */

export async function setCoverLetter(text) {
  await chrome.storage.local.set({ [KEY.coverLetter]: text });
}

export async function getCoverLetter() {
  const { [KEY.coverLetter]: text } = await chrome.storage.local.get(KEY.coverLetter);
  return text ?? "";
}

/* ─── history ─── */

/**
 * History exists so a past application can be reloaded without re-capturing the
 * posting or re-running the analysis. Stored locally only.
 */
export async function addHistoryEntry(entry) {
  const history = await getHistory();
  const next = [{ id: crypto.randomUUID(), savedAt: new Date().toISOString(), ...entry }, ...history];
  await chrome.storage.local.set({ [KEY.history]: next.slice(0, HISTORY_LIMIT) });
}

export async function getHistory() {
  const { [KEY.history]: history } = await chrome.storage.local.get(KEY.history);
  return Array.isArray(history) ? history : [];
}

export async function clearHistory() {
  await chrome.storage.local.remove(KEY.history);
}

/* ─── save directory ─── */

/**
 * The chosen output folder, as a FileSystemDirectoryHandle.
 *
 * Handles are structured-cloneable, so IndexedDB can persist them across browser
 * restarts. Only a document context (the side panel) may pick or use one — this
 * cannot be done from the service worker, which has no user activation.
 */
export async function saveDirectoryHandle(handle) {
  await idbPut(HANDLES_STORE, DIRECTORY_HANDLE_KEY, handle);
  await setSettings({ saveFolderName: handle.name });
}

export async function getDirectoryHandle() {
  return idbGet(HANDLES_STORE, DIRECTORY_HANDLE_KEY);
}

export async function clearDirectoryHandle() {
  await idbDelete(HANDLES_STORE, DIRECTORY_HANDLE_KEY);
  await setSettings({ saveFolderName: null });
}

/** Wipes everything the extension holds on this device. */
export async function eraseAll() {
  await chrome.storage.local.clear();
  const db = await openDb();
  await new Promise((resolve, reject) => {
    const tx = db.transaction([FILES_STORE, HANDLES_STORE], "readwrite");
    tx.objectStore(FILES_STORE).clear();
    tx.objectStore(HANDLES_STORE).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
