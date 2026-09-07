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
 * @returns {Promise<{ fileName: string, bytes: Uint8Array, contents: string[] }>}
 */
export async function buildPackage({ posting, resume, coverLetter, attachments = [] }) {
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
    fileName: packageFileName(posting),
    bytes: createZip(entries),
    contents,
  };
}

/** e.g. `shopify-backend-developer-2026-09-07.zip` */
export function packageFileName(posting, now = new Date()) {
  const date = now.toISOString().slice(0, 10);
  const company = posting.company ? slugify(posting.company) : "";
  const role = slugify(posting.title || "application");
  const stem = [company, role].filter(Boolean).join("-") || "application";
  return `${stem}-${date}.zip`;
}
