/**
 * LocalStorage utilities for persisting resume and job data
 * Allows data to survive page refreshes and be accessible across navigation
 */

import type { ResumeData } from './api';
import type { JobPosting } from './api';

// Storage keys
const STORAGE_KEYS = {
  RESUME: 'intelliapply_resume',
  JOB: 'intelliapply_job',
  JOB_METADATA: 'intelliapply_job_metadata',
};

/**
 * Extracted job data with metadata
 */
export interface StoredJobData {
  data: JobPosting;
  job_id: string;
  extracted_at: string;
  extraction_source: 'description' | 'job_description_pdf' | 'url';
  source_value?: string; // URL, file name, or snippet of description
}

/**
 * Save resume data to localStorage
 */
export function saveResume(resumeData: ResumeData | null): void {
  if (!resumeData) {
    localStorage.removeItem(STORAGE_KEYS.RESUME);
    return;
  }
  
  try {
    localStorage.setItem(STORAGE_KEYS.RESUME, JSON.stringify(resumeData));
    console.log('✓ Resume saved to localStorage');
  } catch (error) {
    console.error('Failed to save resume to localStorage:', error);
  }
}

/**
 * Load resume data from localStorage
 */
export function loadResume(): ResumeData | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.RESUME);
    if (!stored) return null;
    
    const data = JSON.parse(stored);
    console.log('✓ Resume loaded from localStorage');
    return data as ResumeData;
  } catch (error) {
    console.error('Failed to load resume from localStorage:', error);
    return null;
  }
}

/**
 * Save job data to localStorage
 */
export function saveJob(jobData: StoredJobData | null): void {
  if (!jobData) {
    localStorage.removeItem(STORAGE_KEYS.JOB);
    localStorage.removeItem(STORAGE_KEYS.JOB_METADATA);
    return;
  }
  
  try {
    // Save main job data
    localStorage.setItem(STORAGE_KEYS.JOB, JSON.stringify(jobData.data));
    
    // Save metadata separately for easy access
    localStorage.setItem(STORAGE_KEYS.JOB_METADATA, JSON.stringify({
      job_id: jobData.job_id,
      extracted_at: jobData.extracted_at,
      extraction_source: jobData.extraction_source,
      source_value: jobData.source_value,
    }));
    
    console.log('✓ Job data saved to localStorage');
  } catch (error) {
    console.error('Failed to save job to localStorage:', error);
  }
}

/**
 * Load job data from localStorage
 */
export function loadJob(): StoredJobData | null {
  try {
    const jobData = localStorage.getItem(STORAGE_KEYS.JOB);
    const metadata = localStorage.getItem(STORAGE_KEYS.JOB_METADATA);
    
    if (!jobData || !metadata) return null;
    
    const parsedJob = JSON.parse(jobData);
    const parsedMetadata = JSON.parse(metadata);
    
    console.log('✓ Job data loaded from localStorage');
    
    return {
      data: parsedJob as JobPosting,
      job_id: parsedMetadata.job_id,
      extracted_at: parsedMetadata.extracted_at,
      extraction_source: parsedMetadata.extraction_source,
      source_value: parsedMetadata.source_value,
    };
  } catch (error) {
    console.error('Failed to load job from localStorage:', error);
    return null;
  }
}

/**
 * Clear all stored data
 */
export function clearAllData(): void {
  try {
    localStorage.removeItem(STORAGE_KEYS.RESUME);
    localStorage.removeItem(STORAGE_KEYS.JOB);
    localStorage.removeItem(STORAGE_KEYS.JOB_METADATA);
    console.log('✓ All data cleared from localStorage');
  } catch (error) {
    console.error('Failed to clear localStorage:', error);
  }
}

/**
 * Check if resume is stored
 */
export function hasResumeStored(): boolean {
  return localStorage.getItem(STORAGE_KEYS.RESUME) !== null;
}

/**
 * Check if job is stored
 */
export function hasJobStored(): boolean {
  return localStorage.getItem(STORAGE_KEYS.JOB) !== null;
}

/**
 * Get storage stats (for debugging)
 */
export function getStorageStats(): {
  hasResume: boolean;
  hasJob: boolean;
  resumeSize: number;
  jobSize: number;
  totalSize: number;
} {
  const resume = localStorage.getItem(STORAGE_KEYS.RESUME);
  const job = localStorage.getItem(STORAGE_KEYS.JOB);
  const metadata = localStorage.getItem(STORAGE_KEYS.JOB_METADATA);
  
  return {
    hasResume: resume !== null,
    hasJob: job !== null,
    resumeSize: resume?.length || 0,
    jobSize: (job?.length || 0) + (metadata?.length || 0),
    totalSize: (resume?.length || 0) + (job?.length || 0) + (metadata?.length || 0),
  };
}

/**
 * Save resume PDF file to IndexedDB for persistence across refreshes
 */
export async function saveResumeFile(file: File): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('intelliapply_db', 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('files')) {
        db.createObjectStore('files');
      }
    };
    request.onsuccess = () => {
      const db = request.result;
      const tx = db.transaction('files', 'readwrite');
      const store = tx.objectStore('files');
      store.put(file, 'resume_pdf');
      tx.oncomplete = () => { console.log('✓ Resume PDF saved to IndexedDB'); resolve(); };
      tx.onerror = () => reject(tx.error);
    };
    request.onerror = () => reject(request.error);
  });
}

/**
 * Load resume PDF file from IndexedDB
 */
export async function loadResumeFile(): Promise<File | null> {
  return new Promise((resolve) => {
    const request = indexedDB.open('intelliapply_db', 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('files')) {
        db.createObjectStore('files');
      }
    };
    request.onsuccess = () => {
      const db = request.result;
      const tx = db.transaction('files', 'readonly');
      const store = tx.objectStore('files');
      const getRequest = store.get('resume_pdf');
      getRequest.onsuccess = () => {
        const file = getRequest.result;
        if (file) {
          console.log('✓ Resume PDF loaded from IndexedDB');
          resolve(file as File);
        } else {
          resolve(null);
        }
      };
      getRequest.onerror = () => resolve(null);
    };
    request.onerror = () => resolve(null);
  });
}

// ============ ANALYSIS HISTORY ============

const STORAGE_KEYS_ANALYSIS = {
  LAST_ANALYSIS: 'intelliapply_last_analysis',
  HISTORY: 'intelliapply_analysis_history',
};

export interface AnalysisHistoryEntry {
  id: string;
  date: string;
  job_title: string;
  company_name: string;
  location: string;
  overall_score: number;
  recommendation: string;
  analysisData: any;
  jobData: any;
}

/**
 * Save the last analysis result (for caching when navigating between tabs)
 */
export function saveLastAnalysis(data: any): void {
  try {
    localStorage.setItem(STORAGE_KEYS_ANALYSIS.LAST_ANALYSIS, JSON.stringify(data));
    console.log('✓ Last analysis cached');
  } catch (error) {
    console.error('Failed to cache analysis:', error);
  }
}

/**
 * Load the last analysis result
 */
export function loadLastAnalysis(): any | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS_ANALYSIS.LAST_ANALYSIS);
    if (!stored) return null;
    return JSON.parse(stored);
  } catch (error) {
    return null;
  }
}

/**
 * Save analysis to history (keeps last 10 entries)
 */
export function addToHistory(entry: AnalysisHistoryEntry): void {
  try {
    const history = getHistory();
    // Add new entry at the beginning
    history.unshift(entry);
    // Keep only last 10
    const trimmed = history.slice(0, 10);
    localStorage.setItem(STORAGE_KEYS_ANALYSIS.HISTORY, JSON.stringify(trimmed));
    console.log('✓ Analysis added to history');
  } catch (error) {
    console.error('Failed to save to history:', error);
  }
}

/**
 * Get analysis history (last 10 entries)
 */
export function getHistory(): AnalysisHistoryEntry[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS_ANALYSIS.HISTORY);
    if (!stored) return [];
    return JSON.parse(stored);
  } catch (error) {
    return [];
  }
}

/**
 * Import data from JSON (for restore)
 */
export function importData(data: { resume?: ResumeData | null; job?: StoredJobData | null }): void {
  if (data.resume) {
    saveResume(data.resume);
  }
  if (data.job) {
    saveJob(data.job);
  }
}

// ============ APPLICATION HUB STORAGE ============

const APP_STORAGE_KEYS = {
  APPLICATIONS: 'intelliapply_applications',
  APP_NOTES: 'intelliapply_app_notes',
};

export type ApplicationStatus = "SAVED" | "APPLIED" | "SCREENING" | "INTERVIEW" | "OFFER" | "REJECTED" | "WITHDRAWN";

export interface StoredApplication {
  id: string;
  jobId: string;
  analysisId: string;
  company: string;
  title: string;
  location: string;
  status: ApplicationStatus;
  matchScore: number;
  appliedDate: string | null;
  interviewDate: string | null;
  createdAt: string;
  notes: string;
}

/**
 * Save an application to localStorage
 */
export function saveApplication(app: StoredApplication): void {
  try {
    const apps = getApplications();
    const existing = apps.findIndex(a => a.id === app.id);
    if (existing >= 0) {
      apps[existing] = app;
    } else {
      apps.unshift(app);
    }
    localStorage.setItem(APP_STORAGE_KEYS.APPLICATIONS, JSON.stringify(apps));
  } catch (error) {
    console.error('Failed to save application:', error);
  }
}

/**
 * Get all stored applications
 */
export function getApplications(): StoredApplication[] {
  try {
    const stored = localStorage.getItem(APP_STORAGE_KEYS.APPLICATIONS);
    if (!stored) return [];
    return JSON.parse(stored);
  } catch (error) {
    return [];
  }
}

/**
 * Get a single application by ID
 */
export function getApplicationById(id: string): StoredApplication | null {
  const apps = getApplications();
  return apps.find(a => a.id === id) || null;
}

/**
 * Check if a job has already been saved as an application
 */
export function hasApplicationForJob(jobId: string): boolean {
  const apps = getApplications();
  return apps.some(a => a.jobId === jobId);
}

/**
 * Update application status
 */
export function updateApplicationStatus(id: string, status: ApplicationStatus): void {
  const apps = getApplications();
  const app = apps.find(a => a.id === id);
  if (app) {
    app.status = status;
    if (status === 'APPLIED' && !app.appliedDate) {
      app.appliedDate = new Date().toISOString().split('T')[0];
    }
    localStorage.setItem(APP_STORAGE_KEYS.APPLICATIONS, JSON.stringify(apps));
  }
}

/**
 * Update application notes
 */
export function updateApplicationNotes(id: string, notes: string): void {
  const apps = getApplications();
  const app = apps.find(a => a.id === id);
  if (app) {
    app.notes = notes;
    localStorage.setItem(APP_STORAGE_KEYS.APPLICATIONS, JSON.stringify(apps));
  }
}

/**
 * Update application interview date
 */
export function updateApplicationInterviewDate(id: string, date: string): void {
  const apps = getApplications();
  const app = apps.find(a => a.id === id);
  if (app) {
    app.interviewDate = date;
    localStorage.setItem(APP_STORAGE_KEYS.APPLICATIONS, JSON.stringify(apps));
  }
}
