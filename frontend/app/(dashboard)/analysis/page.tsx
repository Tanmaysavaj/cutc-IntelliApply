'use client';

import { useAppState } from '@/app/hooks/useAppState';
import AnalysisPage from '@/components/pages/AnalysisPage';

export default function Page() {
  const appState = useAppState();

  return (
    <AnalysisPage
      hasAnalysis={appState.hasAnalysis}
      startAnalysis={() => appState.setPage('jobs')}
      notify={appState.notify}
    />
  );
}
