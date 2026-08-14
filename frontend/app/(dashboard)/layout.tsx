'use client';

import { ReactNode } from 'react';
import Sidebar from '@/components/Sidebar';
import Topbar from '@/components/Topbar';
import LoadingOverlay from '@/components/LoadingOverlay';
import Toast from '@/components/Toast';
import { AppStateProvider, useAppState } from '@/app/contexts/AppStateContext';

function DashboardChrome({ children }: { children: ReactNode }) {
  const appState = useAppState();

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    appState.setParsing(true);
    setTimeout(() => {
      appState.setUploaded(true);
      appState.setParsing(false);
      appState.notify('Resume parsed successfully');
    }, 1400);
  };

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="app-main">
        <Topbar />
        <div className="page-wrap">{children}</div>
      </main>

      <input
        ref={appState.fileRef}
        className="sr-only"
        type="file"
        accept="application/pdf"
        onChange={handleFileUpload}
      />

      {appState.parsing ? (
        <LoadingOverlay title="Reading your resume" detail="Extracting skills, experience, and education…" />
      ) : null}
      {appState.analyzing ? (
        <LoadingOverlay title="Analyzing your match" detail="Comparing skills, experience, and responsibilities…" />
      ) : null}

      {appState.toast ? <Toast message={appState.toast} /> : null}
    </div>
  );
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <AppStateProvider>
      <DashboardChrome>{children}</DashboardChrome>
    </AppStateProvider>
  );
}