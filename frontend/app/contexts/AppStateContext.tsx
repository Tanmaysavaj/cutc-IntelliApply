'use client';

import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';

type Page = 'landing' | 'resume' | 'jobs' | 'analysis' | 'history';

interface JobSource {
  kind: string;
  value: string;
}

interface AppStateContextType {
  page: Page;
  setPage: (page: Page) => void;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  uploaded: boolean;
  setUploaded: (value: boolean) => void;
  parsing: boolean;
  setParsing: (value: boolean) => void;
  analyzing: boolean;
  setAnalyzing: (value: boolean) => void;
  hasAnalysis: boolean;
  setHasAnalysis: (value: boolean) => void;
  demoStep: number | null;
  setDemoStep: (step: number | null) => void;
  jobUrl: string;
  setJobUrl: (url: string) => void;
  jobSource: JobSource;
  setJobSource: (source: JobSource) => void;
  toast: string;
  notify: (message: string) => void;
  triggerFileUpload: () => void;
  fileRef: React.RefObject<HTMLInputElement | null>;
  startAnalysis: () => void;
}

const AppStateContext = createContext<AppStateContextType | undefined>(undefined);

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [page, setPage] = useState<Page>('landing');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const saved = localStorage.getItem('intelliapply-theme') as 'light' | 'dark' | null;
    const preferred = saved || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    setTheme(preferred);
    document.documentElement.dataset.theme = preferred;
  }, []);
  
  const [uploaded, setUploaded] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [hasAnalysis, setHasAnalysis] = useState(false);
  const [demoStep, setDemoStep] = useState<number | null>(null);
  const [jobUrl, setJobUrl] = useState('');
  const [jobSource, setJobSource] = useState({
    kind: 'Job URL',
    value: 'https://example.com/jobs/business-systems-analyst',
  });
  const [toast, setToast] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const toggleTheme = useCallback(() => {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    if (typeof document !== 'undefined') {
      document.documentElement.dataset.theme = next;
      localStorage.setItem('intelliapply-theme', next);
    }
  }, [theme]);

  const notify = useCallback((message: string) => {
    setToast(message);
    const timeout = setTimeout(() => setToast(''), 2600);
    return () => clearTimeout(timeout);
  }, []);

  const triggerFileUpload = useCallback(() => {
    fileRef.current?.click();
  }, []);

  const startAnalysis = useCallback(() => {
    if (!uploaded) {
      notify('Upload your resume before starting an analysis');
      setPage('resume');
      return;
    }

    setAnalyzing(true);
    setTimeout(() => {
      setHasAnalysis(true);
      setAnalyzing(false);
      setPage('analysis');
    }, 1800);
  }, [uploaded, notify, setAnalyzing, setHasAnalysis, setPage]);

  return (
    <AppStateContext.Provider
      value={{
        page,
        setPage,
        theme,
        toggleTheme,
        uploaded,
        setUploaded,
        parsing,
        setParsing,
        analyzing,
        setAnalyzing,
        hasAnalysis,
        setHasAnalysis,
        demoStep,
        setDemoStep,
        jobUrl,
        setJobUrl,
        jobSource,
        setJobSource,
        toast,
        notify,
        triggerFileUpload,
        fileRef,
        startAnalysis,
      }}
    >
      {children}
    </AppStateContext.Provider>
  );
}

export function useAppState() {
  const context = useContext(AppStateContext);
  if (context === undefined) {
    throw new Error('useAppState must be used within AppStateProvider');
  }
  return context;
}
