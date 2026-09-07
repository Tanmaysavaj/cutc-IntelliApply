/**
 * Side panel controller.
 *
 * This is the only surface that may touch the File System Access API: picking and
 * writing to a directory requires a document and a user gesture, neither of which
 * a service worker has. All backend calls are delegated to the worker instead, so
 * that page CORS never applies.
 */

import { MSG } from "../lib/messages.js";
import {
  addAttachment,
  addHistoryEntry,
  clearHistory,
  clearResume,
  eraseAll,
  getCoverLetter,
  getHistory,
  getPosting,
  getResumeFile,
  getResumeMeta,
  getSettings,
  listAttachments,
  removeAttachment,
  saveResumeFile,
  setCoverLetter,
  setPosting,
} from "../lib/store.js";
import { buildPackage, packageFileName } from "../lib/packageBuilder.js";
import { chooseFolder, ensureWritable, isSupported, writeFile } from "../lib/saveToFolder.js";
import { capturePosting, ensurePageAccess } from "../lib/capture.js";

const $ = (id) => document.getElementById(id);

/** Wraps sendMessage so a rejected handler surfaces as a thrown Error. */
async function ask(type) {
  const reply = await chrome.runtime.sendMessage({ type });
  if (!reply?.ok) throw new Error(reply?.error ?? "The extension did not respond.");
  return reply.data;
}

let toastTimer;
function toast(message, isError = false) {
  const el = $("toast");
  el.textContent = message;
  el.classList.toggle("error", isError);
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (el.hidden = true), isError ? 6000 : 3200);
}

/** Runs an async action with a busy label, so double-clicks cannot double-fire. */
async function withBusy(button, label, action) {
  const original = button.textContent;
  button.disabled = true;
  button.textContent = label;
  try {
    return await action();
  } catch (error) {
    toast(error instanceof Error ? error.message : String(error), true);
    return null;
  } finally {
    button.disabled = false;
    button.textContent = original;
  }
}

/* ─── rendering ─── */

async function renderResume() {
  const meta = await getResumeMeta();
  $("resume-status").textContent = meta
    ? `${meta.name} · ${(meta.size / 1024).toFixed(0)} KB`
    : "No resume added yet.";
  $("resume-clear").hidden = !meta;
}

async function renderPosting() {
  const posting = await getPosting();
  const status = $("posting-status");
  if (!posting) {
    status.textContent = "Open a job posting in a tab, then capture it.";
    $("posting-toggle").hidden = true;
    $("posting-details").hidden = true;
    $("posting-fields").hidden = true;
    await renderPackageName();
    return;
  }
  const title = posting.title || "Job posting";
  status.textContent = posting.company ? `${title} · ${posting.company}` : title;
  $("posting-text").textContent = posting.text ?? "";
  $("posting-toggle").hidden = false;
  $("posting-fields").hidden = false;
  $("posting-title").value = posting.title ?? "";
  $("posting-company").value = posting.company ?? "";
  await renderPackageName();
}

/** Shows the exact filename that will be written, so surprises are visible up front. */
async function renderPackageName() {
  const [posting, resumeMeta] = await Promise.all([getPosting(), getResumeMeta()]);
  const preview = $("package-name-preview");
  if (!posting) {
    preview.textContent = "";
    return;
  }
  preview.textContent = `Will save as: ${packageFileName(posting, { resumeName: resumeMeta?.name })}`;
}

async function renderFolder() {
  const settings = await getSettings();
  const status = $("folder-status");
  if (!isSupported()) {
    status.textContent = "This browser cannot save to a chosen folder (needs Chrome or Edge 114+).";
    $("choose-folder").disabled = true;
    return;
  }
  status.textContent = settings.saveFolderName
    ? `Saving to: ${settings.saveFolderName}`
    : "No save folder chosen yet.";
}

async function renderAttachments() {
  const attachments = await listAttachments();
  const list = $("attachment-list");
  list.textContent = "";
  for (const { name, file } of attachments) {
    const li = document.createElement("li");
    const label = document.createElement("span");
    label.textContent = `${name} · ${(file.size / 1024).toFixed(0)} KB`;
    const remove = document.createElement("button");
    remove.className = "link-btn danger";
    remove.type = "button";
    remove.textContent = "Remove";
    remove.addEventListener("click", async () => {
      await removeAttachment(name);
      await renderAttachments();
    });
    li.append(label, remove);
    list.append(li);
  }
}

async function renderHistory() {
  const history = await getHistory();
  const list = $("history-list");
  list.textContent = "";

  if (history.length === 0) {
    const li = document.createElement("li");
    li.className = "muted";
    li.textContent = "Nothing saved yet.";
    list.append(li);
    return;
  }

  for (const entry of history) {
    const li = document.createElement("li");
    const info = document.createElement("div");
    const title = document.createElement("strong");
    title.textContent = entry.title || "Application";
    const meta = document.createElement("small");
    meta.textContent = [
      entry.company,
      entry.score != null ? `${entry.score}% match` : null,
      new Date(entry.savedAt).toLocaleDateString(),
      entry.fileName,
    ]
      .filter(Boolean)
      .join(" · ");
    info.append(title, meta);

    const reload = document.createElement("button");
    reload.className = "link-btn";
    reload.type = "button";
    reload.textContent = "Reload";
    reload.addEventListener("click", async () => {
      // Restores the captured posting so a past application can be revisited
      // without opening the original page again.
      if (!entry.posting) return toast("This entry has no saved posting.", true);
      await setPosting(entry.posting);
      await renderPosting();
      showMain();
      toast("Posting reloaded.");
    });

    li.append(info, reload);
    list.append(li);
  }
}

function renderScore(result) {
  const data = result?.data ?? result ?? {};
  const score = data.overall_score ?? data.score ?? null;
  if (score == null) {
    toast("The analysis came back without a score.", true);
    return;
  }

  $("score-value").textContent = `${Math.round(score)}%`;

  const recommendation = String(data.recommendation ?? "").replace(/_/g, " ");
  const pill = $("score-recommendation");
  pill.textContent = recommendation ? recommendation.toUpperCase() : "ANALYSED";
  pill.className = `pill ${score >= 75 ? "good" : score >= 55 ? "" : "warn"}`.trim();

  const detail = $("score-detail");
  detail.textContent = "";
  const groups = [
    ["Strengths", data.strengths ?? data.matching_skills],
    ["Gaps", data.gaps ?? data.missing_skills],
    ["Suggestions", data.recommendations ?? data.suggestions],
  ];
  for (const [heading, items] of groups) {
    if (!Array.isArray(items) || items.length === 0) continue;
    const wrap = document.createElement("div");
    wrap.className = "group";
    const h3 = document.createElement("h3");
    h3.textContent = heading;
    const ul = document.createElement("ul");
    for (const item of items.slice(0, 6)) {
      const li = document.createElement("li");
      li.textContent = typeof item === "string" ? item : (item?.skill ?? JSON.stringify(item));
      ul.append(li);
    }
    wrap.append(h3, ul);
    detail.append(wrap);
  }

  $("score-result").hidden = false;
}

function showMain() {
  $("view-main").hidden = false;
  $("view-history").hidden = true;
}

/* ─── wiring ─── */

let latestScore = null;

function wire() {
  $("resume-input").addEventListener("change", async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".pdf")) return toast("Please choose a PDF.", true);
    if (file.size > 10 * 1024 * 1024) return toast("That PDF is larger than 10 MB.", true);
    await saveResumeFile(file, file.name);
    await renderResume();
    // The resume name feeds the archive name, so refresh the preview.
    await renderPackageName();
    toast("Resume saved on this device.");
  });

  $("resume-clear").addEventListener("click", async () => {
    await clearResume();
    await renderResume();
  });

  $("capture").addEventListener("click", async (event) => {
    // The permission request must happen synchronously within the click's user
    // gesture, so it runs before withBusy's first await.
    const granted = await ensurePageAccess();
    if (!granted) {
      toast(
        "Permission to read pages was declined, so IntelliApply cannot capture. Use “Paste manually” instead.",
        true
      );
      return;
    }
    await withBusy(event.currentTarget, "Reading…", async () => {
      const posting = await capturePosting();
      await renderPosting();
      toast(`Captured "${posting.title || "posting"}".`);
    });
  });

  // Edits to the title/company are saved and feed straight into the archive name.
  for (const [id, field] of [["posting-title", "title"], ["posting-company", "company"]]) {
    $(id).addEventListener("input", async (event) => {
      const posting = await getPosting();
      if (!posting) return;
      await setPosting({ ...posting, [field]: event.target.value.trim() });
      await renderPackageName();
    });
  }

  $("posting-toggle").addEventListener("click", () => {
    const details = $("posting-details");
    details.hidden = !details.hidden;
    if (!details.hidden) details.open = true;
  });

  $("paste-toggle").addEventListener("click", () => {
    const wrap = $("paste-wrap");
    wrap.hidden = !wrap.hidden;
  });

  $("paste-save").addEventListener("click", async () => {
    const text = $("paste-text").value.trim();
    if (text.length < 120) return toast("Please paste the full description.", true);
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    await setPosting({
      url: tab?.url ?? "",
      title: tab?.title ?? "Pasted posting",
      company: "",
      text,
      strategy: "manual-paste",
      capturedAt: new Date().toISOString(),
    });
    $("paste-wrap").hidden = true;
    await renderPosting();
    toast("Posting saved.");
  });

  $("check-score").addEventListener("click", (event) =>
    withBusy(event.currentTarget, "Analysing…", async () => {
      const result = await ask(MSG.CHECK_SCORE);
      latestScore = result?.data ?? result ?? null;
      renderScore(result);
    })
  );

  // Debounced so a long letter is not written on every keystroke.
  let letterTimer;
  $("cover-letter").addEventListener("input", (event) => {
    clearTimeout(letterTimer);
    const value = event.target.value;
    letterTimer = setTimeout(() => setCoverLetter(value), 400);
  });

  $("attachment-input").addEventListener("change", async (event) => {
    const files = [...(event.target.files ?? [])];
    event.target.value = "";
    for (const file of files) {
      if (file.size > 15 * 1024 * 1024) {
        toast(`${file.name} is larger than 15 MB and was skipped.`, true);
        continue;
      }
      await addAttachment(file);
    }
    await renderAttachments();
  });

  $("choose-folder").addEventListener("click", (event) =>
    withBusy(event.currentTarget, "Choosing…", async () => {
      try {
        await chooseFolder();
      } catch (error) {
        // Dismissing the picker is a normal action, not an error worth shouting about.
        if (error?.name === "AbortError") return;
        throw error;
      }
      await renderFolder();
      toast("Save folder set.");
    })
  );

  $("save-package").addEventListener("click", (event) =>
    withBusy(event.currentTarget, "Saving…", async () => {
      const handle = await ensureWritable();
      if (!handle) {
        return toast("Choose a save folder first.", true);
      }

      const [posting, resumeFile, resumeMeta, coverLetter, attachments] = await Promise.all([
        getPosting(),
        getResumeFile(),
        getResumeMeta(),
        getCoverLetter(),
        listAttachments(),
      ]);

      const pkg = await buildPackage({
        posting,
        resume: resumeFile ? { file: resumeFile, name: resumeMeta?.name ?? "resume.pdf" } : null,
        coverLetter,
        attachments,
        // Prefer the name the backend parsed out of the resume, when we have it.
        applicantName: latestScore?.resume_name ?? latestScore?.candidate_name ?? "",
      });

      const { fileName, folderName } = await writeFile(handle, pkg.fileName, pkg.bytes);

      await addHistoryEntry({
        title: posting.title || "Application",
        company: posting.company || "",
        url: posting.url || "",
        fileName,
        folderName,
        contents: pkg.contents,
        score: latestScore?.overall_score ?? latestScore?.score ?? null,
        posting,
      });

      toast(`Saved ${fileName} to ${folderName}.`);
    })
  );

  $("tab-history").addEventListener("click", async () => {
    await renderHistory();
    $("view-main").hidden = true;
    $("view-history").hidden = false;
  });

  $("back-main").addEventListener("click", showMain);

  $("history-clear").addEventListener("click", async () => {
    await clearHistory();
    await renderHistory();
  });

  $("erase").addEventListener("click", async () => {
    await eraseAll();
    latestScore = null;
    $("cover-letter").value = "";
    $("score-result").hidden = true;
    await refresh();
    toast("Everything stored by the extension has been erased.");
  });
}

async function refresh() {
  await Promise.all([renderResume(), renderPosting(), renderFolder(), renderAttachments()]);
  $("cover-letter").value = await getCoverLetter();
}

wire();
refresh().catch((error) => toast(error.message, true));
