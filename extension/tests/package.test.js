/**
 * Application-package tests.
 *
 * Run with:  node --test extension/tests/package.test.js
 *
 * As with the zip tests, archives are verified by extracting them with the system
 * `unzip` rather than by inspecting our own output. The most important assertion
 * here is a negative one: the match analysis must NOT end up in the package.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { buildPackage, formatPosting, packageFileName } from "../src/lib/packageBuilder.js";

const posting = {
  title: "Backend Developer",
  company: "Shopify",
  url: "https://example.com/jobs/backend-developer",
  text: "We are looking for a backend developer with Python and Postgres experience.\nRemote friendly.",
  capturedAt: "2026-09-07T12:00:00.000Z",
};

function pdfBlob() {
  // Byte-accurate enough to prove binary survives the archive.
  return new Blob([new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37, 0x00, 0xff, 0xfe])], {
    type: "application/pdf",
  });
}

async function extract(pkg) {
  const dir = mkdtempSync(join(tmpdir(), "ia-pkg-"));
  const file = join(dir, pkg.fileName);
  writeFileSync(file, pkg.bytes);
  const listing = execFileSync("unzip", ["-l", file], { cwd: dir, encoding: "utf8" });
  execFileSync("unzip", ["-o", file], { cwd: dir, encoding: "utf8" });
  return { dir, file, listing };
}

test("package contains the resume, posting, cover letter and attachments", async () => {
  const pkg = await buildPackage({
    posting,
    resume: { file: pdfBlob(), name: "alex-chen-resume.pdf" },
    coverLetter: "Dear hiring team,\n\nI am applying for the backend role.\n",
    attachments: [{ name: "portfolio.txt", file: new Blob(["portfolio contents"]) }],
  });

  const { dir, listing } = await extract(pkg);
  try {
    assert.match(listing, /alex-chen-resume\.pdf/);
    assert.match(listing, /job-posting\.md/);
    assert.match(listing, /cover-letter\.md/);
    assert.match(listing, /attachments\/portfolio\.txt/);

    assert.equal(readFileSync(join(dir, "cover-letter.md"), "utf8").trim().startsWith("Dear"), true);
    assert.match(readFileSync(join(dir, "job-posting.md"), "utf8"), /Backend Developer/);
    assert.deepEqual(
      new Uint8Array(readFileSync(join(dir, "alex-chen-resume.pdf"))),
      new Uint8Array(await pdfBlob().arrayBuffer())
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("the match analysis is NOT included in the package", async () => {
  const pkg = await buildPackage({
    posting,
    resume: { file: pdfBlob(), name: "resume.pdf" },
    coverLetter: "Dear hiring team,",
    attachments: [],
  });

  // Per spec the score is a decision aid, not something you send to an employer.
  for (const name of pkg.contents) {
    assert.doesNotMatch(name, /analysis|score|match/i, `unexpected entry: ${name}`);
  }

  const { dir, listing } = await extract(pkg);
  try {
    assert.doesNotMatch(listing, /analysis/i);
    assert.doesNotMatch(listing, /score/i);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("omits the cover letter and resume when they are absent", async () => {
  const pkg = await buildPackage({ posting, resume: null, coverLetter: "   ", attachments: [] });
  assert.deepEqual(pkg.contents, ["job-posting.md"]);

  const { dir, listing } = await extract(pkg);
  try {
    assert.doesNotMatch(listing, /cover-letter/);
    assert.doesNotMatch(listing, /\.pdf/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("forces a .pdf name for the resume entry", async () => {
  const pkg = await buildPackage({
    posting,
    resume: { file: pdfBlob(), name: "resume.docx" },
    coverLetter: "",
    attachments: [],
  });
  assert.ok(pkg.contents.includes("resume.pdf"), `got ${JSON.stringify(pkg.contents)}`);
});

test("refuses to build without a posting", async () => {
  await assert.rejects(() => buildPackage({ posting: null }), /Capture a job posting/);
});

test("archive name identifies the company, role and date", () => {
  const name = packageFileName(posting, new Date("2026-09-07T00:00:00Z"));
  assert.equal(name, "shopify-backend-developer-2026-09-07.zip");

  // Still produces something usable when the page yielded no company or title.
  assert.match(packageFileName({ title: "", company: "" }, new Date("2026-01-02T00:00:00Z")),
    /^application-2026-01-02\.zip$/);
});

test("formatted posting keeps the source URL and flags truncation", () => {
  const body = formatPosting({ ...posting, truncated: true });
  assert.match(body, /\*\*Company:\*\* Shopify/);
  assert.match(body, /example\.com\/jobs\/backend-developer/);
  assert.match(body, /truncated/);
});
