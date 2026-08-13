'use client';

import { useAppState } from '@/app/contexts/AppStateContext';
import { useRouter } from 'next/navigation';
import Topbar from '@/components/Topbar';

export default function LandingPage() {
  const { uploaded, hasAnalysis, triggerFileUpload, setPage, setDemoStep } =
    useAppState();
  const router = useRouter();

  const handleStart = () => {
    triggerFileUpload();
  };

  const handleNext = () => {
    if (uploaded) {
      setPage('jobs');
      router.push('/jobs');
    } else {
      setPage('resume');
      router.push('/resume');
    }
  };

  const handleAnalysis = () => {
    setPage('analysis');
    router.push('/analysis');
  };

  const handleDemo = () => {
    setPage('resume');
    router.push('/resume');
    setDemoStep(0);
  };

  return (
    <>
      <Topbar />
      <div className="landing-wrap">
        <div className="hero">
          <div className="hero-copy">
            <div className="eyebrow">
              <span>✦</span> AI-powered career intelligence
            </div>
            <h1>
              Turn Every Job Into a <em>Smarter Application</em>
            </h1>
            <p>
              Upload your resume, compare it with a job, and get clear strengths, gaps, and
              practical advice.
            </p>
            <div className="hero-actions">
              {uploaded ? (
                <button className="btn primary" onClick={handleNext}>
                  ＋ Add Your Job Details
                </button>
              ) : (
                <button className="btn primary" onClick={handleStart}>
                  ⇧ Upload Resume
                </button>
              )}
              <button className="btn secondary" onClick={handleDemo}>
                ▷ View Demo
              </button>
              {hasAnalysis && (
                <button className="btn secondary" onClick={handleAnalysis}>
                  View Latest Analysis
                </button>
              )}
            </div>
            <div className="trust-row">
              <span>✓ Private by design</span>
              <span>✓ Clear match scoring</span>
              <span>✓ Actionable advice</span>
            </div>
          </div>

          <div className="match-visual" aria-label="Resume and job match visualization">
            <div className="orbit one" />
            <div className="orbit two" />
            <div className={`score-ring ${hasAnalysis ? 'complete' : 'pending'}`}>
              <strong>{hasAnalysis ? '82%' : '—'}</strong>
              <span>{hasAnalysis ? 'Latest match' : 'Your match'}</span>
            </div>
            <div className="mini-card resume-card">
              <span className="card-kicker">▤ YOUR RESUME</span>
              <strong>{uploaded ? 'Resume Ready' : 'Candidate Profile'}</strong>
              <p>Skills · Experience · Education</p>
              <div className="mini-tags">
                <i>Reusable</i>
                <i>Structured</i>
              </div>
            </div>
            <div className="mini-card job-card">
              <span className="card-kicker">▣ JOB DETAILS</span>
              <strong>Selected Opportunity</strong>
              <p>URL or pasted description</p>
              <div className="mini-tags">
                <i>Requirements</i>
                <i>Skills</i>
              </div>
            </div>
            <div className="insight-card">
              <span>
                <b>Match strengths</b>
                <small>{hasAnalysis ? 'Requirements · SQL' : 'Shown after analysis'}</small>
              </span>
              <span>
                <b>Skill gaps</b>
                <small>{hasAnalysis ? 'Cloud fundamentals' : 'Shown after analysis'}</small>
              </span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
