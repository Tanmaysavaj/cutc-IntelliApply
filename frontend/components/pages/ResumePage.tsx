'use client';

import { useRouter } from 'next/navigation';
import PageHeader from '@/components/PageHeader';
import Card from '@/components/Card';
import InfoSection from '@/components/InfoSection';
import Timeline from '@/components/Timeline';

interface ResumePageProps {
  uploaded: boolean;
  parsing: boolean;
  onUpload: () => void;
  goToJobs: () => void;
}

export default function ResumePage({
  uploaded,
  parsing,
  onUpload,
  goToJobs,
}: ResumePageProps) {
  const router = useRouter();

  const handleGoToJobs = () => {
    goToJobs();
    router.push('/jobs');
  };

  return (
    <>
      <PageHeader
        title="Your Resume"
        subtitle="We structure your resume to power smarter job matches."
      />

      {uploaded ? (
        <>
          <Card className="resume-ready">
            <div className="file-summary">
              <div className="pdf-icon">PDF</div>
              <div>
                <strong>Candidate_Resume.pdf</strong>
                <p className="success">✓ Successfully uploaded and parsed</p>
              </div>
            </div>
            <div className="resume-ready-actions">
              <button className="btn secondary compact-btn" onClick={onUpload}>
                Replace Resume
              </button>
              <button className="btn primary" onClick={handleGoToJobs}>
                Continue to Add Job →
              </button>
            </div>
          </Card>

          <div className="next-step-banner">
            <span>2</span>
            <div>
              <strong>Your resume is ready. Now add the job you want to compare.</strong>
              <p>Paste a job link or description, then IntelliApply can prepare a match analysis.</p>
            </div>
            <button className="btn primary compact-btn" onClick={handleGoToJobs}>
              Add Job Details
            </button>
          </div>

          <div className="profile-stack">
            <InfoSection icon="◎" title="Professional Summary">
              <p>
                Detail-oriented technology professional with experience in requirements analysis,
                stakeholder collaboration, data reporting, and software development. Skilled at
                translating business needs into clear, practical solutions.
              </p>
            </InfoSection>

            <InfoSection icon="⌘" title="Skills">
              <div className="skill-chips">
                {[
                  'TypeScript',
                  'React',
                  'Python',
                  'FastAPI',
                  'SQL',
                  'Power BI',
                  'Jira',
                  'Confluence',
                ].map((s) => (
                  <span key={s}>{s}</span>
                ))}
              </div>
            </InfoSection>

            <InfoSection icon="▣" title="Experience">
              <Timeline
                title="Business Analyst Co-op"
                meta="Public Sector Technology · 2026"
                text="Gathered requirements, maintained delivery trackers, created reporting dashboards, and supported stakeholder updates."
              />
              <Timeline
                title="Software Development Intern"
                meta="Technology Team · 2025"
                text="Built responsive interfaces, integrated APIs, and collaborated on testing and documentation."
              />
            </InfoSection>

            <InfoSection icon="◇" title="Education">
              <strong>Honours Bachelor of Technology – Software Development</strong>
              <p>Seneca Polytechnic · Toronto, Ontario</p>
            </InfoSection>
          </div>
        </>
      ) : (
        <Card className="single-upload">
          <span>⇧</span>
          <h2>{parsing ? 'Processing your resume…' : 'Upload your resume'}</h2>
          <p>Choose one PDF resume to create your candidate profile.</p>
          <button className="btn primary" onClick={onUpload}>
            Browse Resume PDF
          </button>
          <small>PDF format only, up to 10MB</small>
        </Card>
      )}
    </>
  );
}
