'use client';

import { useEffect, useRef } from 'react';
import LandingPage from '@/components/pages/LandingPage';
import { AppStateProvider, useAppState } from '@/app/contexts/AppStateContext';
import LoadingOverlay from '@/components/LoadingOverlay';
import Toast from '@/components/Toast';
import DemoTour from '@/components/DemoTour';

function AppContent() {
  const appState = useAppState();
  const hasInitializedTheme = useRef(false);

  useEffect(() => {
    // Set theme on mount
    if (!hasInitializedTheme.current && typeof document !== 'undefined') {
      document.documentElement.dataset.theme = appState.theme;
      hasInitializedTheme.current = true;
    }
  }, [appState.theme]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    appState.setParsing(true);
    // Simulate processing delay
    setTimeout(() => {
      appState.setUploaded(true);
      appState.setParsing(false);
      appState.setPage('resume');
      appState.notify('Resume parsed successfully');
    }, 1400);
  };

  return (
    <main className={appState.page !== 'landing' ? 'app-shell' : 'landing-shell'}>
      <section className={appState.page !== 'landing' ? 'app-main' : 'landing-main'}>
        <LandingPage />
      </section>

      <input
        ref={appState.fileRef}
        className="sr-only"
        type="file"
        accept="application/pdf"
        onChange={handleFileUpload}
      />

      {/* eslint-disable-next-line react-hooks/refs */}
      {appState.parsing ? (
        <LoadingOverlay
          title="Reading your resume"
          detail="Extracting skills, experience, and education…"
        />
      ) : null}

      {/* eslint-disable-next-line react-hooks/refs */}
      {appState.analyzing ? (
        <LoadingOverlay
          title="Analyzing your match"
          detail="Comparing skills, experience, and responsibilities…"
        />
      ) : null}

      {/* eslint-disable-next-line react-hooks/refs */}
      {appState.demoStep !== null ? <DemoTour /> : null}

      {/* eslint-disable-next-line react-hooks/refs */}
      {appState.toast ? <Toast message={appState.toast} /> : null}
    </main>
  );
}

export default function Home() {
  return (
    <AppStateProvider>
      <AppContent />
    </AppStateProvider>
  );
}
