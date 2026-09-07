/**
 * Builds the application package archive.
 *
 * Contents, per spec: the resume PDF, the job posting, the cover letter, and any
 * other attachments. The match analysis is deliberately NOT included — it is a
 * decision aid, not part of what you send to an employer.
 *
 * One zip per application rather than a folder tree, so the whole thing is a
 * single file to archive, move or attach.
 */

import { createZip, slugify } from "./zip.js";

/** Turns a Blob/File into the bytes the zip writer needs. */
async function toBytes(blob) {
  return new Uint8Array(await blob.arrayBuffer());
}

/** Human-readable posting, so the archive is useful without any tooling. */
export function formatPosting(posting) {
  const lines = [
    `# ${posting.title || "Job posting"}`,
    "",
    posting.company ? `**Company:** ${posting.company}` : null,
    posting.url ? `**Source:** ${posting.url}` : null,
    posting.capturedAt ? `**Captured:** ${new Date(posting.capturedAt).toLocaleString()}` : null,
    "",
    "---",
    "",
    posting.text || "",
  ];

  if (posting.truncated) {
    lines.push("", "---", "", "_Note: the posting was long and has been truncated._");
  }
  return lines.filter((line) => line !== null).join("\n");
}

/**
 * @param {object} options
 * @param {object} options.posting captured posting
 * @param {{file: Blob, name: string}|null} options.resume
 * @param {string} options.coverLetter
 * @param {Array<{name: string, file: Blob}>} options.attachments
 * @param {string} [options.applicantName] used in the archive name
 * @returns {Promise<{ fileName: string, bytes: Uint8Array, contents: string[] }>}
 */
export async function buildPackage({ posting, resume, coverLetter, attachments = [], applicantName }) {
  if (!posting) throw new Error("Capture a job posting before saving a package.");

  const entries = [];
  const contents = [];

  entries.push({ name: "job-posting.md", data: formatPosting(posting) });
  contents.push("job-posting.md");

  if (resume?.file) {
    const name = resume.name?.toLowerCase().endsWith(".pdf") ? resume.name : "resume.pdf";
    entries.push({ name, data: await toBytes(resume.file) });
    contents.push(name);
  }

  const letter = (coverLetter ?? "").trim();
  if (letter) {
    entries.push({ name: "cover-letter.md", data: letter });
    contents.push("cover-letter.md");
  }

  for (const attachment of attachments) {
    if (!attachment?.file) continue;
    const name = `attachments/${attachment.name}`;
    entries.push({ name, data: await toBytes(attachment.file) });
    contents.push(name);
  }

  return {
    fileName: packageFileName(posting, { applicantName, resumeName: resume?.name }),
    bytes: createZip(entries),
    contents,
  };
}

/** Drops the extension and common filler from a resume filename. */
export function applicantFromResumeName(resumeName) {
  if (!resumeName) return "";
  const stem = resumeName.replace(/\.[^.]+$/, "");
  // Separators must become spaces first: `_` is a word character, so `\b` would
  // not see a boundary in "Priya_Raman_CV_v3" and the filler would survive.
  const cleaned = stem
    .replace(/[_.\-\s]+/g, " ")
    .replace(/\b(resume|resumes|cv|curriculum\s*vitae|final|latest|updated|copy|v\d+|\d{4})\b/gi, " ")
    .trim();
  // If stripping the filler leaves nothing useful, keep the original stem —
  // "resume.pdf" should still contribute something rather than vanish.
  return slugify(cleaned || stem, "");
}

/**
 * Archive name, built from the things that actually identify an application:
 * company, role, and whose resume it is.
 *
 * e.g. `shopify-backend-developer-alex-chen-2026-09-07.zip`
 *
 * Every part is optional and simply omitted when unknown, so a partially
 * captured posting still produces a sensible name rather than "application".
 */
export function packageFileName(posting, options = {}, now = new Date()) {
  const { applicantName, resumeName } = options;
  const date = now.toISOString().slice(0, 10);

  const parts = [
    posting.company ? slugify(posting.company, "") : "",
    posting.title ? slugify(posting.title, "") : "",
    applicantName ? slugify(applicantName, "") : applicantFromResumeName(resumeName),
  ].filter(Boolean);

  // De-duplicate: a resume called "shopify-application.pdf" should not repeat
  // the company already in the name.
  const seen = new Set();
  const unique = parts.filter((part) => {
    if (seen.has(part)) return false;
    seen.add(part);
    return true;
  });

  const stem = unique.join("-") || "application";
  return `${stem}-${date}.zip`;
}
