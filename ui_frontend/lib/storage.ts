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
