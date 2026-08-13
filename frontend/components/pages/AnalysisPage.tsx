'use client';

import { useMemo } from 'react';
import PageHeader from '@/components/PageHeader';
import Card from '@/components/Card';

interface AnalysisPageProps {
  hasAnalysis: boolean;
  startAnalysis: () => void;
  notify: (message: string) => void;
}

const Icon = ({ children }: { children: React.ReactNode }) => (
  <span className="icon" aria-hidden="true">
    {children}
  </span>
);

function InfoCard({
  title,
  icon,
  children,
}: {
  title: string;
  icon: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="analysis-card">
      <h3>
        <Icon>{icon}</Icon>
        {title}
      </h3>
      {children}
    </Card>
  );
}

function Metric({
  label,
  value,
  warning = false,
}: {
  label: string;
  value: string;
  warning?: boolean;
}) {
  return (
    <div className="metric">
      <span>{warning ? '●' : '✓'} {label}</span>
      <b className={warning ? 'warning' : 'success'}>{value}</b>
    </div>
  );
}

export default function AnalysisPage({
  hasAnalysis,
  startAnalysis,
  notify,
}: AnalysisPageProps) {
  const questions = useMemo(
    () => [
      'Walk me through a complex requirements-gathering process you led.',
      'How do you approach writing efficient SQL queries for reporting?',
      'Describe a time you improved a business process with stakeholders.',
    ],
    []
  );

  if (!hasAnalysis) {
    return (
      <>
        <PageHeader
          title="Job Match Analysis"
          subtitle="Your match results will appear here after an analysis."
        />
        <Card className="analysis-empty">
          <div className="empty-illustration">
            <span>▤</span>
            <i>＋</i>
            <span>▣</span>
          </div>
          <h2>No analysis to display yet</h2>
          <p>
            First upload your resume. Then add or select a job and click <strong>Analyze Match</strong>
            . The future backend will calculate the real score; this prototype displays a sample
            result only after that action.
          </p>
          <div className="empty-steps">
            <span>
              <b>1</b> Upload resume
            </span>
            <span>
              <b>2</b> Add a job
            </span>
            <span>
              <b>3</b> Analyze match
            </span>
          </div>
          <button className="btn primary" onClick={startAnalysis}>
            Choose a Job to Analyze
          </button>
        </Card>
      </>
    );
  }

  return (
    <>
      <PageHeader title="Job Match Analysis" subtitle="Sample prototype result for the selected opportunity.">
        <div className="header-actions">
          <button
            className="btn secondary small-btn"
            onClick={() => notify('Analysis saved')}
          >
            ♡ Save Analysis
          </button>
          <button className="btn primary small-btn" onClick={startAnalysis}>
            ⌕ Analyze Another Job
          </button>
        </div>
      </PageHeader>

      <div className="prototype-note">
        Prototype sample — the backend will replace this with a real resume-to-job analysis.
      </div>

      <Card className="analysis-hero">
        <div className="candidate">
          <span className="avatar">CA</span>
          <div>
            <small>CANDIDATE PROFILE</small>
            <strong>Your Resume</strong>
            <span>Technology Professional</span>
          </div>
        </div>
        <div className="analysis-score">
          <strong>82%</strong>
          <span>Sample Match</span>
        </div>
        <div className="role">
          <div>
            <small>JOB OPPORTUNITY</small>
            <strong>Business Systems Analyst</strong>
            <span>Northstar Digital · Toronto, ON</span>
          </div>
          <b>APPLY</b>
        </div>
      </Card>

      <div className="analysis-grid">
        <InfoCard title="Why You Match" icon="✓">
          <p>
            Your background aligns strongly with requirements analysis, stakeholder collaboration,
            and data-driven problem solving. Your SQL and documentation experience are particularly
            relevant.
          </p>
        </InfoCard>

        <InfoCard title="Top Strengths" icon="☆">
          <Metric label="Requirements Analysis" value="Excellent" />
          <Metric label="SQL & Reporting" value="Strong" />
          <Metric label="Jira & Documentation" value="Strong" />
        </InfoCard>

        <InfoCard title="Skill Gaps" icon="△">
          <Metric label="API Documentation" value="Moderate gap" warning />
          <Metric label="Cloud Fundamentals" value="Moderate gap" warning />
        </InfoCard>

        <InfoCard title="Application Advice" icon="✎">
          <ul>
            <li>Lead with requirements and documentation experience.</li>
            <li>Quantify reporting and process improvements.</li>
            <li>Highlight SQL and stakeholder-facing projects.</li>
          </ul>
        </InfoCard>

        <InfoCard title="Interview Preparation" icon="◌">
          {questions.map((q, i) => (
            <button className="question" key={q}>
              <b>{i + 1}</b>
              <span>{q}</span>
              <i>›</i>
            </button>
          ))}
        </InfoCard>

        <InfoCard title="Company Research" icon="▥">
          <div className="company-card">
            <span className="company-logo">✦</span>
            <div>
              <strong>Northstar Digital</strong>
              <p className="success">● Research available</p>
            </div>
          </div>
          <p>Review the company overview and recent priorities before tailoring your application.</p>
        </InfoCard>
      </div>
    </>
  );
}
