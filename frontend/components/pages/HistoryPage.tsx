'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/contexts/AuthContext';
import { analysisAPI } from '@/app/api/analysis';
import PageHeader from '@/components/PageHeader';
import Card from '@/components/Card';

interface HistoryPageProps {
  hasAnalysis: boolean;
  jobSource: { kind: string; value: string };
  setPage: (page: 'landing' | 'resume' | 'jobs' | 'analysis' | 'history') => void;
}

interface HistoryItem {
  id: string;
  match_score: number;
  created_at: string;
  result: {
    ai_insights?: {
      application_recommendation?: { recommendation: string };
      summary?: string;
    };
    match?: {
      overall_score: number;
      strengths?: string[];
      gaps?: string[];
    };
  };
  jobs?: { title: string; company: string } | null;
}

export default function HistoryPage({ hasAnalysis, jobSource, setPage }: HistoryPageProps) {
  const [detail, setDetail] = useState<'job' | 'resume' | 'analysis' | null>(null);
  const [downloadNote, setDownloadNote] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedAnalysis, setSelectedAnalysis] = useState<HistoryItem | null>(null);
  const router = useRouter();
  const { user } = useAuth();

  // Load history from backend when authenticated
  useEffect(() => {
    if (!user) return;
    
    setLoading(true);
    analysisAPI.getHistory()
      .then((data) => {
        setHistory(data.analyses || []);
      })
      .catch((err) => {
        console.error('Failed to load history:', err);
      })
      .finally(() => setLoading(false));
  }, [user]);

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

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const diff = today.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    return date.toLocaleDateString();
  };

  // Authenticated mode with persisted history
  if (user && history.length > 0) {
    return (
      <>
        <PageHeader title="Application History" subtitle="Review your past analyses and track your progress." />

        <Card className="history-table">
          <div className="history-head">
            <span>Date</span>
            <span>Job</span>
            <span>Score</span>
            <span>Recommendation</span>
          </div>
          {history.map((item) => (
            <div className="history-row" key={item.id}>
              <span>
                <strong>{formatDate(item.created_at)}</strong>
                <small>{new Date(item.created_at).toLocaleDateString()}</small>
              </span>
              <span>
                <strong>{item.jobs?.title || 'Unknown Position'}</strong>
                <small>{item.jobs?.company || 'Unknown Company'}</small>
              </span>
              <span>
                <strong className="history-score">{item.match_score}%</strong>
              </span>
              <button onClick={() => setSelectedAnalysis(item)}>
                <b>{item.result?.ai_insights?.application_recommendation?.recommendation || '—'}</b>
                <small>View details →</small>
              </button>
            </div>
          ))}
        </Card>

        {selectedAnalysis && (
          <div className="detail-overlay" role="dialog" aria-modal="true" aria-label="Analysis details">
            <div className="detail-modal">
              <button
                className="demo-close"
                onClick={() => setSelectedAnalysis(null)}
                aria-label="Close details"
              >
                ×
              </button>
              <div className="detail-icon">{selectedAnalysis.match_score}%</div>
              <h2>{selectedAnalysis.jobs?.title || 'Position'}</h2>
              <p>
                {selectedAnalysis.jobs?.company || ''} — Match score:{' '}
                <strong className="success">{selectedAnalysis.match_score}%</strong>
              </p>
              {selectedAnalysis.result?.ai_insights?.summary && (
                <p className="muted" style={{ marginTop: '12px', lineHeight: '1.6' }}>
                  {selectedAnalysis.result.ai_insights.summary}
                </p>
              )}
              <div className="detail-summary">
                <span>
                  <b>Strengths</b>
                  {selectedAnalysis.result?.match?.strengths?.slice(0, 3).join(', ') || 'N/A'}
                </span>
                <span>
                  <b>Gaps</b>
                  {selectedAnalysis.result?.match?.gaps?.slice(0, 3).join(', ') || 'N/A'}
                </span>
              </div>
              <button className="btn primary" onClick={handleAnalysisView}>
                View Full Analysis
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  // Loading state
  if (user && loading) {
    return (
      <>
        <PageHeader title="Application History" subtitle="Loading your past analyses…" />
        <Card className="history-empty">
          <span>◷</span>
          <h2>Loading history…</h2>
          <p>Retrieving your past analyses from the database.</p>
        </Card>
      </>
    );
  }

  // Demo/unauthenticated fallback - original behavior
  if (!hasAnalysis && !user) {
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

  // Authenticated but no history yet
  if (user && history.length === 0 && !loading) {
    return (
      <>
        <PageHeader title="Application History" subtitle="Your analyses will appear here after you complete one." />
        <Card className="history-empty">
          <span>◷</span>
          <h2>No analyses yet</h2>
          <p>Upload a resume, add a job posting, and run an analysis. Your results will be saved automatically.</p>
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

  // Demo mode fallback (hasAnalysis is true but user is not authenticated)
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
