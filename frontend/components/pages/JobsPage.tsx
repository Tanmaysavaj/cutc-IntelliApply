'use client';

import { useState } from 'react';
import PageHeader from '@/components/PageHeader';
import Card from '@/components/Card';

interface JobsPageProps {
  jobUrl: string;
  setJobUrl: (url: string) => void;
  setJobSource: (source: { kind: string; value: string }) => void;
  startAnalysis: () => void;
  notify: (message: string) => void;
}

function JobRow({
  title,
  company,
  location,
  status,
  startAnalysis,
}: {
  title: string;
  company: string;
  location: string;
  status: string;
  startAnalysis: () => void;
}) {
  return (
    <div className="job-row">
      <div className="job-name">
        <span className="company-logo">✦</span>
        <div>
          <strong>{title}</strong>
          <small>{company}</small>
        </div>
      </div>
      <span>{location}</span>
      <span className="pill">{status}</span>
      <div>
        <button className="btn secondary compact-btn" onClick={startAnalysis}>
          Analyze Match
        </button>
      </div>
    </div>
  );
}

export default function JobsPage({
  jobUrl,
  setJobUrl,
  setJobSource,
  startAnalysis,
  notify,
}: JobsPageProps) {
  const [tab, setTab] = useState<'url' | 'text'>('url');

  const saveJob = () => {
    if (!jobUrl.trim()) {
      notify('Add a job URL or description first');
      return;
    }
    setJobSource({
      kind: tab === 'url' ? 'Job URL' : 'Pasted description',
      value: jobUrl.trim(),
    });
    notify('Job details saved');
  };

  return (
    <>
      <PageHeader
        title="Jobs"
        subtitle="Add a job URL or description, then compare it with your resume."
      />

      <Card className="job-entry">
        <div className="tabs">
          <button className={tab === 'url' ? 'active' : ''} onClick={() => setTab('url')}>
            Paste Job URL
          </button>
          <button className={tab === 'text' ? 'active' : ''} onClick={() => setTab('text')}>
            Paste Description
          </button>
        </div>
        <div className="entry-row">
          {tab === 'url' ? (
            <input
              id="job-entry"
              value={jobUrl}
              onChange={(e) => setJobUrl(e.target.value)}
              placeholder="https://company.com/jobs/..."
            />
          ) : (
            <textarea
              id="job-entry"
              value={jobUrl}
              onChange={(e) => setJobUrl(e.target.value)}
              placeholder="Paste the full job description here…"
            />
          )}
          <button className="btn primary" onClick={saveJob}>
            Save Job Details
          </button>
        </div>
      </Card>

      <div className="first-job-callout">
        <span>1</span>
        <div>
          <strong>Prototype opportunity</strong>
          <p>Use this sample job to test the match flow, or add your own details above.</p>
        </div>
      </div>

      <Card className="jobs-table">
        <div className="job-head">
          <span>Opportunity</span>
          <span>Location</span>
          <span>Status</span>
          <span>Action</span>
        </div>
        <JobRow
          title="Business Systems Analyst"
          company="Northstar Digital"
          location="Toronto, ON · Hybrid"
          status="Ready"
          startAnalysis={startAnalysis}
        />
      </Card>
    </>
  );
}
