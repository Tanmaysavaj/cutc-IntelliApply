/**
 * Validation tests for the contact form.
 *
 * Run with:  node --test tests/contact-validation.test.ts
 *
 * The point of these is calibration, not coverage. Rejecting junk is easy; the
 * hard part is not rejecting terse, technical, or non-English submissions from
 * real people. The "accepts" block is therefore the important half.
 */

import test from "node:test";
import assert from "node:assert/strict";

import { contactFormSchema, toFieldErrors } from "../lib/contactSchema.ts";
import {
  countUrls,
  hasKeyboardRun,
  hasLongCharRun,
  hasLongConsonantCluster,
  isPlaceholderText,
  isRepeatedSingleWord,
  isUnreachableEmailDomain,
  isWordLike,
  looksLikeGibberish,
  uppercaseRatio,
  vowelRatio,
} from "../lib/textQuality.ts";

const validBase = {
  name: "Tanmay Savaj",
  email: "person@company.com",
  category: "bug" as const,
  subject: "Resume upload fails on Safari",
  message:
    "Uploading a 3 MB PDF resume on Safari 17 returns a 500 error and the spinner never stops. It works in Chrome on the same file.",
  consent: true as const,
  referenceCode: "",
  elapsedMs: 12000,
};

const parse = (overrides: Record<string, unknown> = {}) =>
  contactFormSchema.safeParse({ ...validBase, ...overrides });

/* ─── heuristics ─── */

test("hasLongCharRun catches padded characters but allows real doubles", () => {
  assert.equal(hasLongCharRun("aaaa"), true);
  assert.equal(hasLongCharRun("!!!!"), true);
  assert.equal(hasLongCharRun("success"), false);
  assert.equal(hasLongCharRun("committee"), false);
});

test("hasKeyboardRun catches key mashing and ignores digits", () => {
  assert.equal(hasKeyboardRun("asdf"), true);
  assert.equal(hasKeyboardRun("qwer"), true);
  assert.equal(hasKeyboardRun("poiu"), true, "reverse runs too");
  // Digit rows are excluded so error codes stay valid.
  assert.equal(hasKeyboardRun("error 1234 occurred"), false);
  assert.equal(hasKeyboardRun("the upload failed"), false);
});

test("vowelRatio separates prose from mashed consonants", () => {
  assert.ok(vowelRatio("the upload failed on safari") > 0.3);
  assert.ok(vowelRatio("sdfghjkl") < 0.1);
});

test("isWordLike allows initialisms and short tokens", () => {
  for (const w of ["PDF", "UI", "500", "API", "a", "in"]) {
    assert.equal(isWordLike(w), true, `${w} should be word-like`);
  }
  for (const w of ["sdfgh", "qwrtp", "bcdfg"]) {
    assert.equal(isWordLike(w), false, `${w} should not be word-like`);
  }
});

test("placeholder and repetition detectors", () => {
  assert.equal(isPlaceholderText("test test"), true);
  assert.equal(isPlaceholderText("lorem ipsum dolor"), true);
  assert.equal(isPlaceholderText("hello"), true);
  assert.equal(isPlaceholderText("the pdf upload is broken"), false, "real text is not placeholder");
  assert.equal(isRepeatedSingleWord("broken broken broken"), true);
  assert.equal(isRepeatedSingleWord("the upload is broken"), false);
});

test("misc detectors", () => {
  assert.equal(hasLongConsonantCluster("rhythms"), false);
  assert.equal(hasLongConsonantCluster("bcdfghjk"), true);
  assert.equal(countUrls("see https://a.com and www.b.com"), 2);
  assert.ok(uppercaseRatio("THIS IS ALL CAPS") > 0.9);
  assert.equal(isUnreachableEmailDomain("a@example.com"), true);
  assert.equal(isUnreachableEmailDomain("a@mailinator.com"), true);
  assert.equal(isUnreachableEmailDomain("a@mail.mailinator.com"), true, "subdomains too");
  assert.equal(isUnreachableEmailDomain("a@company.co.uk"), false);
});

/* ─── the calibration that matters: do not reject real people ─── */

test("looksLikeGibberish accepts genuine messages", () => {
  const real = [
    "Uploading a 3 MB PDF resume on Safari 17 returns a 500 error and the spinner never stops.",
    "The match score shows 0% even though my resume clearly lists every required skill.",
    "Analysis page is blank after I press Extract Job. Console shows a CORS error.",
    "Please delete my stored resume and analysis history from this browser.",
    "Could you add support for DOCX files as well as PDF?",
    "Le téléchargement du CV échoue avec une erreur 500 sur Safari.",
    "履歴書のアップロードが失敗します。エラーは500です。",
  ];
  for (const text of real) {
    assert.equal(looksLikeGibberish(text), false, `should accept: ${text}`);
  }
});

test("looksLikeGibberish rejects junk", () => {
  const junk = [
    "asdfghjkl asdfghjkl",
    "qwertyuiop qwerty",
    "aaaaaaaaaaaaaaaa",
    "sdfg hjkl bcdfg xcvbn",
    "zxcvbnm zxcvbnm zxcv",
    "THIS IS COMPLETELY BROKEN AAAA",
  ];
  for (const text of junk) {
    assert.equal(looksLikeGibberish(text), true, `should reject: ${text}`);
  }
});

/* ─── schema ─── */

test("accepts a well-formed submission", () => {
  const result = parse();
  assert.equal(result.success, true, JSON.stringify(result.success ? {} : toFieldErrors(result.error)));
});

test("accepts a terse but genuine technical report", () => {
  const result = parse({
    subject: "CORS error on analysis",
    message: "Clicking Analyze Match logs a CORS error from the API and the page stays empty. Chrome 140, macOS.",
  });
  assert.equal(result.success, true, JSON.stringify(result.success ? {} : toFieldErrors(result.error)));
});

test("accepts non-Latin names and messages", () => {
  const result = parse({
    name: "李明",
    message: "履歴書のアップロードが失敗します。3MBのPDFを選ぶと500エラーになり、読み込みが終わりません。",
    subject: "履歴書のアップロード失敗",
  });
  assert.equal(result.success, true, JSON.stringify(result.success ? {} : toFieldErrors(result.error)));
});

test("accepts accented and hyphenated names", () => {
  for (const name of ["José Álvarez", "Anne-Marie O'Neill", "J. Smith"]) {
    const result = parse({ name });
    assert.equal(result.success, true, `should accept name: ${name}`);
  }
});

test("rejects missing and malformed fields", () => {
  const cases: Array<[string, Record<string, unknown>, string]> = [
    ["short name", { name: "A" }, "name"],
    ["numeric name", { name: "User123" }, "name"],
    ["bad email", { email: "not-an-email" }, "email"],
    ["disposable email", { email: "me@mailinator.com" }, "email"],
    ["placeholder email domain", { email: "me@example.com" }, "email"],
    ["bad category", { category: "spam" }, "category"],
    ["short subject", { subject: "bug" }, "subject"],
    ["one-word subject", { subject: "brokenbrokenbroken" }, "subject"],
    ["gibberish subject", { subject: "asdfgh asdfgh" }, "subject"],
    ["short message", { message: "it is broken" }, "message"],
    ["gibberish message", { message: "asdfghjkl asdfghjkl asdfghjkl asdfghjkl" }, "message"],
    ["placeholder message", { message: "test test test test test test test test test" }, "message"],
    ["repeated word message", { message: "broken broken broken broken broken broken broken" }, "message"],
    ["no consent", { consent: false }, "consent"],
    ["honeypot filled", { referenceCode: "bot" }, "referenceCode"],
    ["submitted too fast", { elapsedMs: 200 }, "elapsedMs"],
  ];

  for (const [label, override, expectedField] of cases) {
    const result = parse(override);
    assert.equal(result.success, false, `${label} should be rejected`);
    if (!result.success) {
      const errors = toFieldErrors(result.error);
      assert.ok(errors[expectedField as keyof typeof errors], `${label} should flag "${expectedField}", got ${JSON.stringify(errors)}`);
    }
  }
});

test("rejects link-only messages but allows messages containing links", () => {
  const linkOnly = parse({ message: "https://example.com/a https://example.com/b" });
  assert.equal(linkOnly.success, false, "link-only should be rejected");

  const withLink = parse({
    message: "The analysis fails for this posting: https://company.com/jobs/123 — it returns a 500 error every time.",
  });
  assert.equal(withLink.success, true, JSON.stringify(withLink.success ? {} : toFieldErrors(withLink.error)));
});

test("strips unknown keys instead of forwarding them", () => {
  const result = contactFormSchema.safeParse({ ...validBase, isAdmin: true, injected: "<script>" });
  assert.equal(result.success, false, "unknown keys must be rejected by .strict()");
});

test("trims and normalises accepted values", () => {
  const result = parse({ name: "  Tanmay Savaj  ", email: "  Person@Company.COM " });
  assert.equal(result.success, true);
  if (result.success) {
    assert.equal(result.data.name, "Tanmay Savaj");
    assert.equal(result.data.email, "person@company.com", "email should be lowercased for consistency");
  }
});
