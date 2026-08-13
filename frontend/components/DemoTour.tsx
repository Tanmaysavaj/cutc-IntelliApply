'use client';

import { useAppState } from '@/app/contexts/AppStateContext';
import { useRouter } from 'next/navigation';

const demoSteps = [
  {
    icon: '⇧',
    title: 'Upload your resume',
    text: 'Start with one PDF resume. IntelliApply will extract your experience, skills, education, and professional profile so you do not have to enter everything manually.',
    benefit: 'How it helps: creates one reusable candidate profile for every job comparison.',
    page: 'resume' as const,
  },
  {
    icon: '▣',
    title: 'Add the job you want',
    text: 'Paste a job-posting URL or the complete job description. The application will identify the role, required skills, experience, responsibilities, and location.',
    benefit: 'How it helps: turns a long posting into clear, structured requirements.',
    page: 'jobs' as const,
  },
  {
    icon: '◎',
    title: 'Analyze the match',
    text: 'Select a saved job and click Analyze Match. Your resume and that specific job will be compared. The loading state shows that the comparison is in progress.',
    benefit: 'How it helps: gives every selected job its own result instead of one general score.',
    page: 'jobs' as const,
  },
  {
    icon: '↗',
    title: 'Act on the results',
    text: 'Review the match score, strongest qualifications, missing skills, application advice, company research, and tailored interview questions.',
    benefit: 'How it helps: shows whether to apply and exactly how to strengthen the application.',
    page: 'analysis' as const,
  },
];

export default function DemoTour() {
  const { demoStep, setDemoStep, setPage, setUploaded } = useAppState();
  const router = useRouter();

  if (demoStep === null) return null;

  const item = demoSteps[demoStep];

  const goNext = () => {
    if (demoStep === demoSteps.length - 1) {
      setDemoStep(null);
      setUploaded(false);
      setPage('resume');
      router.push('/resume');
    } else {
      const next = demoStep + 1;
      setDemoStep(next);
      setPage(demoSteps[next].page);
      router.push(`/${demoSteps[next].page}`);
    }
  };

  const goBack = () => {
    if (demoStep > 0) {
      const previous = demoStep - 1;
      setDemoStep(previous);
      setPage(demoSteps[previous].page);
      router.push(`/${demoSteps[previous].page}`);
    }
  };

  return (
    <div className="demo-overlay" role="dialog" aria-modal="true" aria-label="How IntelliApply works">
      <div className="demo-modal">
        <button
          className="demo-close"
          onClick={() => setDemoStep(null)}
          aria-label="Close demo"
        >
          ×
        </button>
        <div className="demo-progress">
          {demoSteps.map((_, i) => (
            <span key={i} className={i <= demoStep ? 'active' : ''} />
          ))}
        </div>
        <div className="demo-count">
          STEP {demoStep + 1} OF {demoSteps.length}
        </div>
        <div className="demo-icon">{item.icon}</div>
        <h2>{item.title}</h2>
        <p>{item.text}</p>
        <div className="demo-benefit">✦ {item.benefit}</div>
        <div className="demo-actions">
          {demoStep > 0 && (
            <button className="btn secondary" onClick={goBack}>
              ← Back
            </button>
          )}
          <button className="btn primary" onClick={goNext}>
            {demoStep === demoSteps.length - 1 ? 'Try It Yourself' : 'Next Step →'}
          </button>
        </div>
      </div>
    </div>
  );
}
