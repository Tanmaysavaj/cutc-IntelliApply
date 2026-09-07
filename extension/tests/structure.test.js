/**
 * Structural tests for the extension.
 *
 * Run with:  node --test extension/tests/structure.test.js
 *
 * The extension ships as plain ES modules with no bundler, which is good for
 * reviewability but means nothing checks the wiring: a mistyped import path or a
 * syntax error only surfaces when Chrome loads it. These tests stand in for the
 * bundler by parsing every file and resolving every relative import.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync, existsSync, statSync, mkdtempSync, copyFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

const jsFiles = walk(join(ROOT, "src")).filter((f) => f.endsWith(".js"));

test("the extension has source files to check", () => {
  assert.ok(jsFiles.length >= 8, `expected several modules, found ${jsFiles.length}`);
});

test("every module parses as valid ES module syntax", () => {
  // `node --check` treats .js as CommonJS, where `import` is a syntax error, so
  // each file is checked through a .mjs copy.
  const dir = mkdtempSync(join(tmpdir(), "ia-ext-syntax-"));
  try {
    for (const file of jsFiles) {
      const copy = join(dir, `${file.replace(/[\\/]/g, "_")}.mjs`);
      copyFileSync(file, copy);
      try {
        execFileSync(process.execPath, ["--check", copy], { stdio: "pipe" });
      } catch (error) {
        assert.fail(`${file.slice(ROOT.length + 1)} failed to parse:\n${error.stderr?.toString() ?? error.message}`);
      }
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("every relative import resolves to a real file", () => {
  const pattern = /(?:^|\n)\s*(?:import|export)[^'"\n]*from\s*['"]([^'"]+)['"]/g;
  const missing = [];

  for (const file of jsFiles) {
    const source = readFileSync(file, "utf8");
    for (const [, specifier] of source.matchAll(pattern)) {
      if (!specifier.startsWith(".")) continue; // bare specifiers: none expected, but not our concern
      const target = resolve(dirname(file), specifier);
      if (!existsSync(target)) {
        missing.push(`${file.slice(ROOT.length + 1)} → ${specifier}`);
      }
    }
  }

  assert.deepEqual(missing, [], `unresolved imports:\n${missing.join("\n")}`);
});

test("no bare npm imports, since there is no bundler to resolve them", () => {
  const pattern = /(?:^|\n)\s*(?:import|export)[^'"\n]*from\s*['"]([^'"]+)['"]/g;
  const bare = [];
  for (const file of jsFiles) {
    for (const [, specifier] of readFileSync(file, "utf8").matchAll(pattern)) {
      if (!specifier.startsWith(".") && !specifier.startsWith("/")) {
        bare.push(`${file.slice(ROOT.length + 1)} → ${specifier}`);
      }
    }
  }
  assert.deepEqual(bare, [], `bare imports would fail at runtime:\n${bare.join("\n")}`);
});

/* ─── manifest ─── */

const manifest = JSON.parse(readFileSync(join(ROOT, "manifest.json"), "utf8"));

test("manifest targets Manifest V3 and a Chrome version with the Side Panel API", () => {
  assert.equal(manifest.manifest_version, 3);
  // chrome.sidePanel landed in Chrome 114; Edge supports it for its sidebar.
  assert.ok(Number(manifest.minimum_chrome_version) >= 114, "side panel needs Chrome 114+");
});

test("manifest points at files that exist", () => {
  const referenced = [manifest.background?.service_worker, manifest.side_panel?.default_path].filter(Boolean);
  assert.ok(referenced.length === 2, "expected a service worker and a side panel path");
  for (const path of referenced) {
    assert.ok(existsSync(join(ROOT, path)), `manifest references missing file: ${path}`);
  }
});

test("service worker is declared as a module, matching its import syntax", () => {
  assert.equal(manifest.background.type, "module");
});

test("declares the permissions the code actually relies on", () => {
  for (const permission of ["sidePanel", "storage", "activeTab", "scripting"]) {
    assert.ok(manifest.permissions.includes(permission), `missing permission: ${permission}`);
  }
});

test("requests no broad host access to web pages", () => {
  // Page reading goes through activeTab + scripting on an explicit user action, so
  // the extension must not hold standing access to every site.
  for (const host of manifest.host_permissions) {
    assert.doesNotMatch(host, /^\*:\/\/\*\/|<all_urls>/, `over-broad host permission: ${host}`);
  }
  assert.ok(
    manifest.host_permissions.some((h) => h.includes("cutc-intelliapply.onrender.com")),
    "backend host must be permitted so the service worker is exempt from page CORS"
  );
});

test("no content_scripts are declared", () => {
  // Injection is on demand via chrome.scripting, which is what keeps the
  // extension from reading pages the user never asked about.
  assert.equal(manifest.content_scripts, undefined);
});

test("side panel HTML loads its script as a module and references its stylesheet", () => {
  const html = readFileSync(join(ROOT, manifest.side_panel.default_path), "utf8");
  assert.match(html, /<script[^>]*type="module"[^>]*src="sidepanel\.js"/);
  assert.match(html, /href="sidepanel\.css"/);
  // No inline handlers: MV3's content security policy forbids them.
  assert.doesNotMatch(html, /\son(click|input|change|load)=/i);
});

test("every element the side panel script looks up exists in the HTML", () => {
  const html = readFileSync(join(ROOT, manifest.side_panel.default_path), "utf8");
  const script = readFileSync(join(ROOT, "src/sidepanel/sidepanel.js"), "utf8");

  const ids = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
  const referenced = [...script.matchAll(/\$\("([^"]+)"\)/g)].map((m) => m[1]);

  const dangling = [...new Set(referenced)].filter((id) => !ids.has(id));
  assert.deepEqual(dangling, [], `script references ids not present in the HTML: ${dangling.join(", ")}`);
});
