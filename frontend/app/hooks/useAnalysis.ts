'use client';

import { useCallback } from 'react';
import { useAppState } from '@/app/contexts/AppStateContext';

export function useAnalysis() {
  const appState = useAppState();

  const startAnalysis = useCallback(() => {
    if (!appState.uploaded) {
      appState.notify('Upload your resume before starting an analysis');
      appState.setPage('resume');
      return;
    }

    appState.setAnalyzing(true);
    // Simulate analysis delay
    setTimeout(() => {
      appState.setHasAnalysis(true);
      appState.setAnalyzing(false);
      appState.setPage('analysis');
    }, 1800);
  }, [appState]);

  const resetAnalysis = useCallback(() => {
    appState.setHasAnalysis(false);
  }, [appState]);

  return {
    hasAnalysis: appState.hasAnalysis,
    analyzing: appState.analyzing,
    startAnalysis,
    resetAnalysis,
  };
}
