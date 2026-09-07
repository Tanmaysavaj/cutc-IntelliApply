/**
 * Minimal ZIP writer — no dependencies, no build step.
 *
 * Why hand-rolled rather than JSZip/fflate: the extension ships as plain ES
 * modules so it can be loaded unpacked and read as-is, with no bundler in the
 * loop. Pulling in an npm package would mean adding a build step for this one
 * concern.
 *
 * Entries are stored uncompressed (method 0, "STORE"). That is a deliberate
 * trade: an application package is mostly PDFs, which are already compressed, so
 * deflate would add a compressor for almost no size win. The result is a fully
 * standard archive that Windows Explorer, macOS Archive Utility and `unzip` all
 * open normally.
 *
 * Limits: no ZIP64, so this is valid up to 4 GB per entry and per archive, which
 * is far beyond what an application package needs. `createZip` throws rather
 * than silently emitting a corrupt archive if that is ever exceeded.
 */

const LOCAL_HEADER_SIG = 0x04034b50;
const CENTRAL_HEADER_SIG = 0x02014b50;
const EOCD_SIG = 0x06054b50;

/** Bit 11 marks the filename as UTF-8, so non-ASCII names survive. */
const FLAG_UTF8 = 0x0800;
const METHOD_STORE = 0;
const VERSION_NEEDED = 20;

const MAX_UINT32 = 0xffffffff;

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c >>> 0;
  }
  return table;
})();

export function crc32(bytes) {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    crc = CRC_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

/** MS-DOS date/time, which is what the ZIP format stores. */
function dosDateTime(date) {
  const year = date.getFullYear();
  // The DOS epoch starts at 1980; clamp rather than emit a negative year.
  const dosYear = Math.max(1980, year) - 1980;
  return {
    time:
      (date.getHours() << 11) |
      (date.getMinutes() << 5) |
      // DOS stores seconds in 2-second units.
      Math.floor(date.getSeconds() / 2),
    date: (dosYear << 9) | ((date.getMonth() + 1) << 5) | date.getDate(),
  };
}

const encoder = new TextEncoder();

function toBytes(data) {
  if (data instanceof Uint8Array) return data;
  if (data instanceof ArrayBuffer) return new Uint8Array(data);
  if (typeof data === "string") return encoder.encode(data);
  throw new TypeError("Zip entry data must be a string, Uint8Array or ArrayBuffer");
}

/**
 * Builds a ZIP archive.
 *
 * @param {Array<{name: string, data: string|Uint8Array|ArrayBuffer, date?: Date}>} entries
 * @returns {Uint8Array}
 */
export function createZip(entries) {
  if (!Array.isArray(entries) || entries.length === 0) {
    throw new Error("createZip requires at least one entry");
  }

  const prepared = entries.map((entry) => {
    if (!entry?.name) throw new Error("Every zip entry needs a name");
    // Always forward slashes, and never a leading slash or drive letter, so the
    // archive cannot write outside its own extraction directory.
    const name = String(entry.name).replace(/\\/g, "/").replace(/^\/+/, "");
    if (name.includes("..")) throw new Error(`Unsafe zip entry name: ${entry.name}`);

    const bytes = toBytes(entry.data);
    if (bytes.length > MAX_UINT32) {
      throw new Error(`Entry "${name}" exceeds the 4 GB ZIP32 limit`);
    }
    return {
      nameBytes: encoder.encode(name),
      bytes,
      crc: crc32(bytes),
      ...dosDateTime(entry.date instanceof Date ? entry.date : new Date()),
    };
  });

  const seen = new Set();
  for (const entry of prepared) {
    const name = new TextDecoder().decode(entry.nameBytes);
    if (seen.has(name)) throw new Error(`Duplicate zip entry name: ${name}`);
    seen.add(name);
  }

  const localSize = prepared.reduce((sum, e) => sum + 30 + e.nameBytes.length + e.bytes.length, 0);
  const centralSize = prepared.reduce((sum, e) => sum + 46 + e.nameBytes.length, 0);
  const total = localSize + centralSize + 22;
  if (total > MAX_UINT32) throw new Error("Archive exceeds the 4 GB ZIP32 limit");

  const out = new Uint8Array(total);
  const view = new DataView(out.buffer);
  let offset = 0;

  // ─── local file headers + data ───
  for (const entry of prepared) {
    entry.offset = offset;
    view.setUint32(offset, LOCAL_HEADER_SIG, true);
    view.setUint16(offset + 4, VERSION_NEEDED, true);
    view.setUint16(offset + 6, FLAG_UTF8, true);
    view.setUint16(offset + 8, METHOD_STORE, true);
    view.setUint16(offset + 10, entry.time, true);
    view.setUint16(offset + 12, entry.date, true);
    view.setUint32(offset + 14, entry.crc, true);
    // Stored, so compressed and uncompressed sizes are identical.
    view.setUint32(offset + 18, entry.bytes.length, true);
    view.setUint32(offset + 22, entry.bytes.length, true);
    view.setUint16(offset + 26, entry.nameBytes.length, true);
    view.setUint16(offset + 28, 0, true); // no extra field
    offset += 30;

    out.set(entry.nameBytes, offset);
    offset += entry.nameBytes.length;
    out.set(entry.bytes, offset);
    offset += entry.bytes.length;
  }

  // ─── central directory ───
  const centralStart = offset;
  for (const entry of prepared) {
    view.setUint32(offset, CENTRAL_HEADER_SIG, true);
    view.setUint16(offset + 4, VERSION_NEEDED, true); // version made by
    view.setUint16(offset + 6, VERSION_NEEDED, true); // version needed
    view.setUint16(offset + 8, FLAG_UTF8, true);
    view.setUint16(offset + 10, METHOD_STORE, true);
    view.setUint16(offset + 12, entry.time, true);
    view.setUint16(offset + 14, entry.date, true);
    view.setUint32(offset + 16, entry.crc, true);
    view.setUint32(offset + 20, entry.bytes.length, true);
    view.setUint32(offset + 24, entry.bytes.length, true);
    view.setUint16(offset + 28, entry.nameBytes.length, true);
    view.setUint16(offset + 30, 0, true); // extra
    view.setUint16(offset + 32, 0, true); // comment
    view.setUint16(offset + 34, 0, true); // disk number
    view.setUint16(offset + 36, 0, true); // internal attrs
    view.setUint32(offset + 38, 0, true); // external attrs
    view.setUint32(offset + 42, entry.offset, true);
    offset += 46;

    out.set(entry.nameBytes, offset);
    offset += entry.nameBytes.length;
  }

  // ─── end of central directory ───
  view.setUint32(offset, EOCD_SIG, true);
  view.setUint16(offset + 4, 0, true); // this disk
  view.setUint16(offset + 6, 0, true); // disk with central directory
  view.setUint16(offset + 8, prepared.length, true);
  view.setUint16(offset + 10, prepared.length, true);
  view.setUint32(offset + 12, offset - centralStart, true);
  view.setUint32(offset + 16, centralStart, true);
  view.setUint16(offset + 20, 0, true); // comment length

  return out;
}

/** Filesystem-safe slug used for package folder and archive names. */
export function slugify(value, fallback = "untitled") {
  const slug = String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase()
    .slice(0, 60);
  return slug || fallback;
}
