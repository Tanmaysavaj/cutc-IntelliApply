"use client";

import { useEffect, useState } from "react";
import type { Page } from "@/lib/routes";
import {
  clearEverything,
  PROCESSORS,
  PURPOSE_LABELS,
  readConsent,
  STORAGE_INVENTORY,
  writeConsent,
  type ConsentRecord,
  type StoragePurpose,
} from "@/lib/privacy";
import { projectConfig } from "@/lib/config";
import { DEFAULT_CONTACT_RECIPIENT_PUBLIC } from "@/lib/contactRecipient";

const GROUPS: { purpose: StoragePurpose; blurb: string }[] = [
  {
    purpose: "essential",
    blurb:
      "Needed to deliver what you asked for. Without these, uploading a resume and running an analysis cannot work.",
  },
  {
    purpose: "preference",
    blurb: "Records a display choice only. Contains no personal information.",
  },
  {
    purpose: "functional",
    blurb:
      "Convenience caches of your own results. You can switch these off below — the app keeps working, but History and Analytics will stop filling up.",
  },
];

export default function PrivacyPage({ setPage }: { setPage: (p: Page) => void }) {
  const [consent, setConsent] = useState<ConsentRecord | null>(null);
  const [erasing, setErasing] = useState(false);
  const [erasedNote, setErasedNote] = useState<string | null>(null);

  // Read on mount rather than during render: localStorage is unavailable while
  // the page is server-rendered.
  useEffect(() => setConsent(readConsent()), []);

  const optedOut = consent?.choice === "essential-only";

  const choose = (choice: "accepted" | "essential-only") => {
    setConsent(writeConsent(choice));
    setErasedNote(null);
  };

  const handleErase = async () => {
    setErasing(true);
    setErasedNote(null);
    const result = await clearEverything();
    setErasing(false);
    setErasedNote(
      `Removed ${result.localKeysRemoved} stored item${result.localKeysRemoved === 1 ? "" : "s"}` +
        (result.indexedDbDeleted ? " and your uploaded PDF." : ". Your uploaded PDF could not be removed — close other IntelliApply tabs and try again.")
    );
  };

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Data &amp; Permissions</h1>
          <p>Exactly what IntelliApply accesses, what it keeps, where it goes, and how to switch it off.</p>
        </div>
      </div>

      {/* Plain-language summary first. */}
      <section className="card policy-summary">
        <h2>In short</h2>
        <ul>
          <li>
            <strong>We read the files you give us.</strong> When you upload a resume, IntelliApply reads
            that PDF to pull out your skills and experience. It only ever touches the file you pick — it
            cannot browse your device.
          </li>
          <li>
            <strong>Most of your data stays in your own browser.</strong> Your resume, the job posting and
            your results are cached locally so the app survives a page reload.
          </li>
          <li>
            <strong>We use no cookies and no tracking.</strong> There is no advertising, no analytics
            product and no third-party tracker in this app.
          </li>
          <li>
            <strong>Your resume is sent to an AI model to be analysed.</strong> That is the core feature,
            and the detail is listed below.
          </li>
          <li>
            <strong>You can erase everything at any time</strong> using the button further down this page.
          </li>
        </ul>
      </section>

      {/* Access / permissions. */}
      <section className="card policy-section">
        <h2>What IntelliApply accesses</h2>
        <dl className="policy-defs">
          <dt>Files you explicitly choose</dt>
          <dd>
            A resume PDF, and optionally a job description PDF. These are read only when you pick them
            through the file dialog. IntelliApply has no standing access to your filesystem, camera,
            microphone, location or contacts, and asks for no browser permissions.
          </dd>
          <dt>Text you paste or link</dt>
          <dd>
            A job posting URL or a pasted job description. If you give a URL, our backend fetches that
            public page to read the posting.
          </dd>
          <dt>Your email address</dt>
          <dd>
            Only if you create an account, or write to us through the contact form. It is used to sign you
            in or to reply — nothing else.
          </dd>
        </dl>
      </section>

      {/* Storage inventory, generated from the same data the erase button walks. */}
      <section className="card policy-section">
        <h2>What is stored in your browser</h2>
        <p className="policy-lead">
          IntelliApply sets <strong>no cookies</strong>. It uses your browser&apos;s localStorage and
          IndexedDB instead. Everything it writes is listed here.
        </p>

        {GROUPS.map(({ purpose, blurb }) => {
          const items = STORAGE_INVENTORY.filter((item) => item.purpose === purpose);
          if (items.length === 0) return null;
          return (
            <div key={purpose} className="policy-group">
              <h3>
                <span className={`policy-tag policy-tag-${purpose}`}>{PURPOSE_LABELS[purpose]}</span>
              </h3>
              <p className="policy-group-blurb">{blurb}</p>
              <div className="policy-storage-list">
                {items.map((item) => (
                  <div key={item.key} className="policy-storage-item">
                    <div className="policy-storage-head">
                      <strong>{item.label}</strong>
                      <code>{item.medium}</code>
                    </div>
                    <p>{item.contains}</p>
                    <small>{item.reason}</small>
                    <code className="policy-storage-key">{item.key}</code>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </section>

      {/* Third parties. */}
      <section className="card policy-section">
        <h2>Who else processes your data</h2>
        <p className="policy-lead">
          Running an analysis necessarily sends your resume and the job posting off your device. These are
          every service involved.
        </p>
        <div className="policy-processor-list">
          {PROCESSORS.map((processor) => (
            <div key={processor.name} className="policy-processor">
              <strong>{processor.name}</strong>
              <p>{processor.role}</p>
              <small>
                <em>Receives:</em> {processor.data}
              </small>
            </div>
          ))}
        </div>
        <p className="policy-note">
          We do not sell your data, and we do not use it to train our own models.
        </p>
      </section>

      {/* Real controls. */}
      <section className="card policy-section policy-controls">
        <h2>Your choices</h2>

        <div className="policy-choice">
          <div>
            <strong>Optional storage</strong>
            <p>
              Controls the convenience caches marked <em>Optional</em> above — your most recent analysis
              and your analysis history. Essential items cannot be switched off, because the app cannot
              parse a resume it is not allowed to hold.
            </p>
            <small>
              {consent
                ? `Currently: ${optedOut ? "optional storage is off" : "optional storage is on"}${
                    consent.decidedAt ? ` · set ${new Date(consent.decidedAt).toLocaleDateString()}` : ""
                  }`
                : "Currently: optional storage is on (no choice recorded yet)"}
            </small>
          </div>
          <div className="policy-choice-actions">
            <button
              className={`btn ${optedOut ? "secondary" : "primary"} compact-btn`}
              onClick={() => choose("accepted")}
              aria-pressed={!optedOut}
            >
              Allow optional
            </button>
            <button
              className={`btn ${optedOut ? "primary" : "secondary"} compact-btn`}
              onClick={() => choose("essential-only")}
              aria-pressed={optedOut}
            >
              Essential only
            </button>
          </div>
        </div>

        <div className="policy-choice">
          <div>
            <strong>Erase everything in this browser</strong>
            <p>
              Removes your parsed resume, the uploaded PDF, the extracted job, your analysis history,
              tracked applications and notes, and any sign-in session. This cannot be undone.
            </p>
            {erasedNote && (
              <small className="policy-erased" role="status">
                {erasedNote}
              </small>
            )}
          </div>
          <div className="policy-choice-actions">
            <button className="btn secondary compact-btn" onClick={handleErase} disabled={erasing}>
              {erasing ? "Erasing…" : "Erase my data"}
            </button>
          </div>
        </div>

        <div className="policy-choice">
          <div>
            <strong>Data held on our servers</strong>
            <p>
              If you signed in, your parsed resume may also be stored against your account. To have that
              deleted, send us a data request and we will remove it.
            </p>
          </div>
          <div className="policy-choice-actions">
            <button className="btn primary compact-btn" onClick={() => setPage("contact")}>
              Make a data request
            </button>
          </div>
        </div>
      </section>

      <section className="card policy-section">
        <h2>AI disclaimer</h2>
        <p className="policy-lead">{projectConfig.legal.aiDisclaimer}</p>
      </section>

      <section className="card policy-section">
        <h2>Questions</h2>
        <p className="policy-lead">
          Use the{" "}
          <button className="text-btn" onClick={() => setPage("contact")}>
            contact form
          </button>{" "}
          or email{" "}
          <a href={`mailto:${DEFAULT_CONTACT_RECIPIENT_PUBLIC}`}>{DEFAULT_CONTACT_RECIPIENT_PUBLIC}</a>.
          IntelliApply is a project built for the {projectConfig.event}; this page describes what the
          software actually does today rather than a generic template.
        </p>
      </section>
    </>
  );
}
