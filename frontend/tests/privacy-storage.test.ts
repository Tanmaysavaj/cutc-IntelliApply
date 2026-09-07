/**
 * Proves the storage opt-out is real.
 *
 * Run with:  node --test tests/privacy-storage.test.ts
 *
 * A consent control that records a preference but keeps writing anyway is worse
 * than none at all, so these tests drive the actual storage.ts write paths with a
 * stubbed localStorage and assert on what does and does not land.
 */

import test from "node:test";
import assert from "node:assert/strict";

import {
  CONSENT_KEY,
  clearEverything,
  functionalStorageAllowed,
  readConsent,
  writeConsent,
  STORAGE_INVENTORY,
} from "../lib/privacy.ts";
import { addToHistory, saveLastAnalysis, saveResume } from "../lib/storage.ts";

/** Minimal localStorage stand-in with the same observable behaviour. */
function installFakeStorage() {
  const map = new Map<string, string>();
  const storage = {
    getItem: (k: string) => (map.has(k) ? map.get(k)! : null),
    setItem: (k: string, v: string) => void map.set(k, String(v)),
    removeItem: (k: string) => void map.delete(k),
    clear: () => map.clear(),
    key: (i: number) => [...map.keys()][i] ?? null,
    get length() {
      return map.size;
    },
  };
  // `Object.keys(localStorage)` is used by the Supabase-key sweep in clearEverything.
  const proxy = new Proxy(storage, {
    ownKeys: () => [...map.keys()],
    getOwnPropertyDescriptor: () => ({ enumerable: true, configurable: true }),
    has: (target, prop) => typeof prop === "string" && map.has(prop),
  });

  (globalThis as any).window = { localStorage: proxy };
  (globalThis as any).localStorage = proxy;
  return map;
}

const HISTORY_KEY = "intelliapply_analysis_history";
const LAST_ANALYSIS_KEY = "intelliapply_last_analysis";

const historyEntry = {
  id: "1",
  date: new Date().toISOString(),
  job_title: "Backend Developer",
  company_name: "Shopify",
  location: "Toronto",
  overall_score: 91,
  recommendation: "apply",
  analysisData: {},
  jobData: {},
};

test("consent round-trips and defaults to allowing optional storage", () => {
  installFakeStorage();

  // No decision recorded yet: optional storage stays on so History does not
  // silently break for anyone who ignored the notice.
  assert.equal(readConsent(), null);
  assert.equal(functionalStorageAllowed(), true);

  writeConsent("essential-only");
  assert.equal(readConsent()?.choice, "essential-only");
  assert.equal(functionalStorageAllowed(), false);

  writeConsent("accepted");
  assert.equal(functionalStorageAllowed(), true);
});

test("opting out actually blocks the optional writes", () => {
  const store = installFakeStorage();
  writeConsent("essential-only");

  saveLastAnalysis({ score: 91 });
  addToHistory(historyEntry);

  assert.equal(store.get(LAST_ANALYSIS_KEY), undefined, "last analysis must not be written");
  assert.equal(store.get(HISTORY_KEY), undefined, "history must not be written");
});

test("opting in allows the optional writes", () => {
  const store = installFakeStorage();
  writeConsent("accepted");

  saveLastAnalysis({ score: 91 });
  addToHistory(historyEntry);

  assert.ok(store.get(LAST_ANALYSIS_KEY), "last analysis should be written");
  assert.ok(store.get(HISTORY_KEY), "history should be written");
});

test("essential writes are never blocked by the opt-out", () => {
  const store = installFakeStorage();
  writeConsent("essential-only");

  // Parsing the resume the user just uploaded is the feature they asked for; it
  // cannot be gated or the app simply does not work.
  saveResume({ name: "Alex Chen" } as any);
  assert.ok(store.get("intelliapply_resume"), "resume must still be stored");
});

test("clearEverything removes all app data, including the sign-in session", async () => {
  const store = installFakeStorage();
  writeConsent("accepted");

  saveResume({ name: "Alex Chen" } as any);
  saveLastAnalysis({ score: 91 });
  addToHistory(historyEntry);
  store.set("intelliapply_applications", "[]");
  store.set("intelliapply_app_notes", "{}");
  store.set("intelliapply-theme", "dark");
  store.set("sb-abcdef-auth-token", "session");

  const result = await clearEverything();

  for (const key of [
    "intelliapply_resume",
    LAST_ANALYSIS_KEY,
    HISTORY_KEY,
    "intelliapply_applications",
    "intelliapply_app_notes",
    "intelliapply-theme",
    "sb-abcdef-auth-token",
  ]) {
    assert.equal(store.get(key), undefined, `${key} should have been erased`);
  }
  assert.ok(result.localKeysRemoved >= 7, `expected >=7 removals, got ${result.localKeysRemoved}`);

  // The consent record survives by default, so the notice does not reappear
  // immediately after someone erases their data.
  assert.ok(store.get(CONSENT_KEY), "consent record should be kept unless asked otherwise");
});

test("clearEverything can also forget the consent decision", async () => {
  const store = installFakeStorage();
  writeConsent("accepted");

  const result = await clearEverything({ includeConsent: true });

  assert.equal(store.get(CONSENT_KEY), undefined);
  assert.equal(result.consentCleared, true);
});

test("the published inventory matches the keys the erase actually clears", async () => {
  const store = installFakeStorage();

  // Guards against the policy page drifting from the code: every localStorage key
  // named in the inventory must be one the erase routine handles.
  const inventoryKeys = STORAGE_INVENTORY.filter((i) => i.medium === "localStorage")
    .flatMap((i) => i.key.split("/").map((k) => k.trim()))
    // Entries documented with a qualifier rather than a literal key.
    .filter((k) => !k.startsWith("sb-") && !k.includes("(") && k !== CONSENT_KEY);

  for (const key of inventoryKeys) store.set(key, "x");
  await clearEverything();

  for (const key of inventoryKeys) {
    assert.equal(store.get(key), undefined, `inventory lists "${key}" but erase left it behind`);
  }
});
