"use client";

import { useEffect, useState } from "react";
import type { Page } from "@/lib/routes";
import { readConsent, writeConsent } from "@/lib/privacy";

/**
 * First-visit notice about browser storage.
 *
 * Worded around "browser storage" rather than cookies because IntelliApply sets
 * none — a cookie banner here would be describing something that does not exist.
 * It states plainly that nothing is used for tracking, and both buttons record a
 * real decision that `functionalStorageAllowed()` then enforces.
 */
export default function StorageConsentNotice({ setPage }: { setPage: (p: Page) => void }) {
  // Never rendered on the server: the decision lives in localStorage, and
  // guessing wrong would flash the notice at people who already dismissed it.
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (readConsent() === null) setVisible(true);
  }, []);

  if (!visible) return null;

  const decide = (choice: "accepted" | "essential-only") => {
    writeConsent(choice);
    setVisible(false);
  };

  return (
    <div className="storage-notice" role="dialog" aria-label="Browser storage notice">
      <div className="storage-notice-body">
        <strong>IntelliApply stores data in your browser</strong>
        <p>
          Your resume, the job you add and your results are kept in this browser so the app works when
          you reload or move between screens. We set <strong>no cookies</strong> and use no tracking or
          advertising. Optional items — your analysis history and last result — can be turned off.
        </p>
      </div>
      <div className="storage-notice-actions">
        <button
          className="text-btn"
          onClick={() => {
            setVisible(false);
            setPage("privacy");
          }}
        >
          Details
        </button>
        <button className="btn secondary compact-btn" onClick={() => decide("essential-only")}>
          Essential only
        </button>
        <button className="btn primary compact-btn" onClick={() => decide("accepted")}>
          Allow all
        </button>
      </div>
    </div>
  );
}
