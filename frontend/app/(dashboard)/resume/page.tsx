'use client';

import { useAppState } from '@/app/hooks/useAppState';
import ResumePage from '@/components/pages/ResumePage';

export default function Page() {
  const appState = useAppState();
  
  return (
    <ResumePage
      uploaded={appState.uploaded}
      parsing={appState.parsing}
      onUpload={appState.triggerFileUpload}
      goToJobs={() => appState.setPage('jobs')}
    />
  );
}
