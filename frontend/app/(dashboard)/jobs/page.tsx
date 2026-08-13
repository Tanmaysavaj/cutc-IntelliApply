'use client';

import { useAppState } from '@/app/hooks/useAppState';
import JobsPage from '@/components/pages/JobsPage';

export default function Page() {
  const appState = useAppState();

  return (
    <JobsPage
      jobUrl={appState.jobUrl}
      setJobUrl={(url) => appState.setJobUrl(url)}
      setJobSource={(source) => appState.setJobSource(source)}
      startAnalysis={appState.startAnalysis}
      notify={appState.notify}
    />
  );
}
