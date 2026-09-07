/**
 * ZIP writer tests.
 *
 * Run with:  node --test extension/tests/zip.test.js
 *
 * These deliberately do not assert on our own byte layout — that would only
 * prove the writer agrees with itself. Instead each archive is written to disk
 * and handed to the system `unzip`, so the pass condition is "a real ZIP
 * implementation accepts this and round-trips the bytes".
 */

import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { createZip, crc32, slugify } from "../src/lib/zip.js";

function writeArchive(entries) {
  const dir = mkdtempSync(join(tmpdir(), "ia-zip-"));
  const file = join(dir, "package.zip");
  writeFileSync(file, createZip(entries));
  return { dir, file };
}

function unzip(args, cwd) {
  return execFileSync("unzip", args, { cwd, encoding: "utf8" });
}

test("crc32 matches known values", () => {
  // Standard CRC-32 check value for "123456789".
  assert.equal(crc32(new TextEncoder().encode("123456789")), 0xcbf43926);
  assert.equal(crc32(new Uint8Array(0)), 0);
});

test("system unzip reports the archive as valid", () => {
  const { dir, file } = writeArchive([
    { name: "job-posting.md", data: "# Backend Developer\n\nShopify · Toronto\n" },
    { name: "cover-letter.md", data: "Dear hiring team,\n" },
  ]);
  try {
    const out = unzip(["-t", file], dir);
    assert.match(out, /No errors detected in compressed data/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("round-trips text, binary and nested paths byte-for-byte", () => {
  // A byte pattern covering the full 0-255 range, to catch any signed/encoding bug.
  const binary = new Uint8Array(512);
  for (let i = 0; i < binary.length; i++) binary[i] = i % 256;

  const text = "Line one\nLine two — em dash, accents: éüñ\n";

  const { dir, file } = writeArchive([
    { name: "notes.txt", data: text },
    { name: "attachments/portfolio.bin", data: binary },
  ]);

  try {
    unzip(["-o", file], dir);
    assert.equal(readFileSync(join(dir, "notes.txt"), "utf8"), text);
    assert.deepEqual(new Uint8Array(readFileSync(join(dir, "attachments", "portfolio.bin"))), binary);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("preserves a realistic PDF-like binary payload", () => {
  // Mimics a small PDF: binary header, null bytes, high bytes, EOF marker.
  const pdf = new Uint8Array([
    0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37, 0x0a,
    0x00, 0x00, 0xff, 0xfe, 0x80, 0x7f, 0x0d, 0x0a,
    0x25, 0x25, 0x45, 0x4f, 0x46,
  ]);
  const { dir, file } = writeArchive([{ name: "resume.pdf", data: pdf }]);
  try {
    unzip(["-o", file], dir);
    assert.deepEqual(new Uint8Array(readFileSync(join(dir, "resume.pdf"))), pdf);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("lists every entry with the correct size", () => {
  const { dir, file } = writeArchive([
    { name: "a.txt", data: "aaa" },
    { name: "sub/b.txt", data: "bbbb" },
    { name: "sub/deeper/c.txt", data: "ccccc" },
  ]);
  try {
    const listing = unzip(["-l", file], dir);
    assert.match(listing, /a\.txt/);
    assert.match(listing, /sub\/b\.txt/);
    assert.match(listing, /sub\/deeper\/c\.txt/);
    assert.match(listing, /3 files/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("handles non-ASCII filenames via the UTF-8 flag", () => {
  const { dir, file } = writeArchive([{ name: "履歴書.txt", data: "resume" }]);
  try {
    const out = unzip(["-t", file], dir);
    assert.match(out, /No errors detected/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("rejects unsafe and malformed input rather than emitting a bad archive", () => {
  assert.throws(() => createZip([]), /at least one entry/);
  assert.throws(() => createZip([{ name: "", data: "x" }]), /needs a name/);
  assert.throws(() => createZip([{ name: "../escape.txt", data: "x" }]), /Unsafe/);
  assert.throws(() => createZip([{ name: "a.txt", data: 42 }]), /must be a string/);
  assert.throws(
    () => createZip([{ name: "a.txt", data: "x" }, { name: "a.txt", data: "y" }]),
    /Duplicate/
  );
});

test("strips leading slashes so archives cannot write outside the extract dir", () => {
  const { dir, file } = writeArchive([{ name: "/etc/passwd", data: "nope" }]);
  try {
    const listing = unzip(["-l", file], dir);
    assert.match(listing, /etc\/passwd/);
    assert.doesNotMatch(listing, / \/etc\/passwd/, "leading slash must be gone");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("slugify produces safe names for folders and archives", () => {
  assert.equal(slugify("Backend Developer — Shopify!"), "backend-developer-shopify");
  assert.equal(slugify("  "), "untitled");
  assert.equal(slugify("Café Ünïcode"), "cafe-unicode");
});
