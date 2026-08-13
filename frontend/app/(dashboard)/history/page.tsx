'use client';

import { useAppState } from '@/app/hooks/useAppState';
import HistoryPage from '@/components/pages/HistoryPage';

export default function Page() {
  const appState = useAppState();

  return (
    <HistoryPage
      hasAnalysis={appState.hasAnalysis}
      jobSource={appState.jobSource}
      setPage={(page) => appState.setPage(page)}
    />
  );
}
