'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import PageHeader from '@/components/PageHeader';
import Card from '@/components/Card';

interface HistoryPageProps {
  hasAnalysis: boolean;
  jobSource: { kind: string; value: string };
  setPage: (page: 'landing' | 'resume' | 'jobs' | 'analysis' | 'history') => void;
}

export default function HistoryPage({ hasAnalysis, jobSource, setPage }: HistoryPageProps) {
  const [detail, setDetail] = useState<'job' | 'resume' | 'analysis' | null>(null);
  const [downloadNote, setDownloadNote] = useState(false);
  const router = useRouter();

  const handleResumeView = () => {
    setDetail(null);
    setPage('resume');
    router.push('/resume');
  };

  const handleAnalysisView = () => {
    setDetail(null);
    setPage('analysis');
    router.push('/analysis');
  };

  if (!hasAnalysis) {
    return (
      <>
        <PageHeader title="Application History" subtitle="Reopen the job details, resume, and analysis used for every match." />
        <Card className="history-empty">
          <span>◷</span>
          <h2>No application history yet</h2>
          <p>Your first record will be created after you upload a resume, add a job, and complete an analysis.</p>
          <button
            className="btn primary"
            onClick={() => {
              setPage('resume');
              router.push('/resume');
            }}
          >
            Start With Your Resume
          </button>
        </Card>
      </>
    );
  }

  return (
    <>
      <PageHeader title="Application History" subtitle="Reopen the job details, resume, and analysis used for every match." />

      <Card className="history-table">
        <div className="history-head">
          <span>Date</span>
          <span>Job details</span>
          <span>Resume</span>
          <span>Analysis</span>
        </div>
        <div className="history-row">
          <span>
            <strong>Today</strong>
            <small>Prototype record</small>
          </span>
          <button onClick={() => setDetail('job')}>
            <b>{jobSource.kind}</b>
            <small>Open details →</small>
          </button>
          <button onClick={() => setDetail('resume')}>
            <b>Candidate_Resume.pdf</b>
            <small>View or download →</small>
          </button>
          <button onClick={() => setDetail('analysis')}>
            <b className="history-score">82% match</b>
            <small>Open full analysis →</small>
          </button>
        </div>
      </Card>

      {detail && (
        <div className="detail-overlay" role="dialog" aria-modal="true" aria-label="History details">
          <div className="detail-modal">
            <button
              className="demo-close"
              onClick={() => {
                setDetail(null);
                setDownloadNote(false);
              }}
              aria-label="Close details"
            >
              ×
            </button>

            {detail === 'job' && (
              <>
                <div className="detail-icon">▣</div>
                <h2>{jobSource.kind}</h2>
                {jobSource.kind === 'Job URL' ? (
                  <a className="job-link" href={jobSource.value} target="_blank" rel="noreferrer">
                    {jobSource.value}
                  </a>
                ) : (
                  <div className="description-box">{jobSource.value}</div>
                )}
                <p className="muted">This is the exact source used for this analysis.</p>
              </>
            )}

            {detail === 'resume' && (
              <>
                <div className="detail-icon">PDF</div>
                <h2>Candidate_Resume.pdf</h2>
                <p className="muted">The resume connected to this match analysis.</p>
                <div className="detail-actions">
                  <button className="btn secondary" onClick={handleResumeView}>
                    View Resume
                  </button>
                  <button
                    className="btn primary"
                    onClick={() => setDownloadNote(true)}
                  >
                    Download Resume
                  </button>
                </div>
                {downloadNote && (
                  <div className="download-note">
                    The download control is ready; the backend will connect it to the stored original
                    PDF.
                  </div>
                )}
              </>
            )}

            {detail === 'analysis' && (
              <>
                <div className="detail-icon">82%</div>
                <h2>Business Systems Analyst</h2>
                <p>
                  Overall prototype match: <strong className="success">82% — Apply</strong>
                </p>
                <div className="detail-summary">
                  <span>
                    <b>Strengths</b>Requirements, SQL, Jira
                  </span>
                  <span>
                    <b>Gaps</b>API documentation, cloud
                  </span>
                </div>
                <button className="btn primary" onClick={handleAnalysisView}>
                  View Full Analysis
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
