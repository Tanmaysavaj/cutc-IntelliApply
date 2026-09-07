# IntelliApply browser extension

Capture a job posting from the page you are on, check how well your resume matches it, and save the
whole application package as a single zip in a folder you choose.

Works in **Chrome and Edge 114+** from one build. No account required — everything is anonymous and
stored on your own device.

## Load it locally

1. Open `chrome://extensions` (or `edge://extensions`).
2. Turn on **Developer mode**.
3. Click **Load unpacked** and select this `extension/` folder.
4. Pin IntelliApply to the toolbar and click it to open the side panel.

No build step. The extension is plain ES modules, so what you load is what you read.

## How it works

| Piece | Role |
|---|---|
| `src/background/service-worker.js` | The only code that calls the backend |
| `src/content/extract-posting.js` | Injected on demand to read the posting off the page |
| `src/sidepanel/` | The UI, and the only place allowed to touch the filesystem |
| `src/lib/` | Backend client, local storage, zip writer, package builder |

Three design decisions worth knowing:

**Network calls live in the service worker.** An extension service worker with `host_permissions` is
[not subject to page CORS](https://developer.chrome.com/docs/extensions/develop/concepts/network-requests),
so the FastAPI backend needs no extra allowed origin. Content scripts get no such exemption, which is
why the page extractor only reads the DOM and never calls the API.

**Pages are read only when you ask.** There are no `content_scripts`. Permission to read pages is an
**optional** host permission, so a fresh install has zero access to anything you browse. The first time
you press *Capture*, Chrome asks; you grant it once and can revoke it any time from the extensions page.

`activeTab` alone is not sufficient here and this is worth knowing if you touch the code: it is only
granted when the extension is invoked through the toolbar action, a context menu or a keyboard
shortcut. A click on a button *inside* the side panel is none of those, so with `activeTab` only, the
extension cannot read the page — or even see the tab's URL. Capture therefore lives in the side panel
(`src/lib/capture.js`), because `chrome.permissions.request` needs a user gesture that a service
worker cannot provide.

**Saving uses the File System Access API.** It is the only way to write to a folder you choose;
`chrome.downloads` can only write inside Downloads. You pick the folder once and the handle is kept in
IndexedDB, so later saves go straight there. This needs a document and a user gesture, so it happens
in the side panel — a service worker cannot do it.

## What ends up in the zip

```
shopify-backend-developer-alex-chen-2026-09-07.zip
├── resume.pdf            your resume, as you uploaded it
├── job-posting.md        the captured posting, with its source URL
├── cover-letter.md       only if you wrote one
└── attachments/          anything else you added
```

The name is built from **company, role and whose resume it is** (taken from the resume filename, with
filler like `cv`, `final` and `v2` stripped). Any part that is unknown is simply omitted. The job title
and company are editable in the panel, and the exact filename is previewed before you save, so a site
that reports a poor title never produces a meaningless archive name.

The **match score is deliberately not included** — it is a decision aid for you, not something to
send to an employer.

## Where your data lives

Nothing is uploaded except what is needed to answer a question you asked:

- The resume PDF, attachments and your chosen folder handle are in **IndexedDB** on this device.
- Settings, the captured posting, your cover-letter draft and history are in **`chrome.storage.local`**.
- Your resume and the posting text are sent to the IntelliApply backend when you press
  *Ask IntelliApply*, which forwards them to the AI model that produces the analysis. This mirrors the
  web app; see the web app's Data & Permissions page for the full processor list.
- **Erase everything on this device** at the bottom of the panel clears all of the above.

## Tests

```bash
cd extension && node --test        # 28 tests, no dependencies to install
```

- `zip.test.js` — archives are written to disk and verified with the **system `unzip`**, so the pass
  condition is that a real ZIP implementation accepts them, not that our writer agrees with itself.
- `package.test.js` — package contents, including the negative assertion that no score/analysis file
  is ever included.
- `structure.test.js` — parses every module and resolves every import. This stands in for the bundler
  the extension deliberately does not have, where a mistyped path would otherwise only fail in Chrome.
- `fixtures/` — three job-page shapes (schema.org JSON-LD, a job-board container, and a generic page
  with no markers) used to exercise the extractor's fallback chain.

## Configuration

Defaults to the production backend. To point at a local one, from the side panel devtools console:

```js
const store = await import("/src/lib/store.js");
await store.setSettings({ apiBaseUrl: "http://localhost:8000" });
```

## Limitations

- **Chrome and Edge only.** Firefox does not support File System Access writes, so folder saving would
  have to fall back to a Downloads subfolder there. Safari needs a separate port.
- **No auto-fill.** Reading a posting and giving feedback is in scope; filling application forms is
  planned for a later release.
- **Cover letters are written by you.** AI drafting and feedback on cover letters and application
  questions need new backend endpoints and are not in this first version.
- **No toolbar icons yet**, so the browser shows a default placeholder.
- Extraction is heuristic. Sites vary and change; *Paste manually* is always available as a fallback.

## Troubleshooting

**"The backend could not authenticate with its AI provider (401)"** — nothing is wrong with your resume
or the extension. The backend's `OPENROUTER_API_KEY` is missing, expired or revoked, so every AI feature
fails (in the web app too, not just here). Fix it on the server: set a valid key in the Render
environment for the backend service and redeploy. You can confirm it independently with:

```bash
curl -X POST https://cutc-intelliapply.onrender.com/api/jobs -F "description=a job description long enough to process"
```

A `500` with `"Failed to extract structured job information"` means the key is still bad.

**"The backend could not read any text from your PDF"** — usually a scanned or image-only resume. Export
a text-based PDF (e.g. *Save as PDF* from Word or Google Docs) rather than a scan or screenshot.

**Capture does nothing / asks for permission every time** — permission to read pages must be granted
once. If you declined, re-open the panel and press *Capture* again, or grant "Read your browsing
history"-style site access from `chrome://extensions` → IntelliApply → *Details*.

**Capture finds the wrong text** — some sites render postings in ways no selector can reach reliably.
Use *Paste manually*, and correct the job title and company fields so the archive is still named well.
