'use client';

import { useCallback } from 'react';
import { useAppState } from '@/app/contexts/AppStateContext';

export function useResume() {
  const { uploaded, setUploaded, parsing, setParsing, triggerFileUpload, notify } = useAppState();

  const handleUploadClick = useCallback(() => {
    triggerFileUpload();
  }, [triggerFileUpload]);

  const handleFileUpload = useCallback(
    async (file: File) => {
      if (!file.type.includes('pdf')) {
        notify('Please upload a PDF file');
        return;
      }

      if (file.size > 10 * 1024 * 1024) {
        notify('File size must be under 10MB');
        return;
      }

      setParsing(true);
      try {
        // Simulate processing delay
        // In production, this would call the actual API
        await new Promise((resolve) => setTimeout(resolve, 1400));
        setUploaded(true);
        notify('Resume parsed successfully');
      } catch (error) {
        notify('Failed to parse resume');
        console.error('Resume upload error:', error);
      } finally {
        setParsing(false);
      }
    },
    [setParsing, setUploaded, notify]
  );

  const resetResume = useCallback(() => {
    setUploaded(false);
  }, [setUploaded]);

  return {
    uploaded,
    parsing,
    handleUploadClick,
    handleFileUpload,
    resetResume,
  };
}
