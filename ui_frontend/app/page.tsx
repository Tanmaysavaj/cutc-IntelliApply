"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { uploadResume, type ResumeResponse, type ResumeData } from "@/lib/api";

type Page = "landing" | "resume" | "jobs" | "analysis" | "history";
const Icon = ({ children }: { children: React.ReactNode }) => <span className="icon" aria-hidden="true">{children}</span>;
const navItems: { id: Page; label: string; icon: string }[] = [
  { id: "landing", label: "Home", icon: "⌂" }, { id: "resume", label: "Resume", icon: "▤" },
  { id: "jobs", label: "Jobs", icon: "▣" }, { id: "analysis", label: "Analysis", icon: "↗" }, { id: "history", label: "History", icon: "◷" },
];

export default function Home() {
  const [page, setPage] = useState<Page>("landing");
  const [theme, setTheme] = useState<"light" | "dark">(() => typeof window === "undefined" ? "light" : (localStorage.getItem("intelliapply-theme") as "light" | "dark" | null) || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"));
  const [uploaded, setUploaded] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [hasAnalysis, setHasAnalysis] = useState(false);
  const [demoStep, setDemoStep] = useState<number | null>(null);
  const [jobUrl, setJobUrl] = useState("");
  const [jobSource, setJobSource] = useState({ kind: "Job URL", value: "https://example.com/jobs/business-systems-analyst" });
  const [processedJobData, setProcessedJobData] = useState<any>(null);
  const [toast, setToast] = useState("");
  const [resumeData, setResumeData] = useState<ResumeData | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const fileRef = useRef<HTMLInputElement>(null);
  useEffect(() => { document.documentElement.dataset.theme = theme; }, [theme]);
  const toggleTheme = () => { const next = theme === "light" ? "dark" : "light"; setTheme(next); document.documentElement.dataset.theme = next; localStorage.setItem("intelliapply-theme", next); };
  const notify = (message: string) => { setToast(message); window.setTimeout(() => setToast(""), 2600); };
  
  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      notify("Please upload a PDF file");
      return;
    }

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      notify("File too large. Maximum size is 10MB");
      return;
    }

    setFileName(file.name);
    setParsing(true);

    try {
      const response = await uploadResume(file);
      
      if (response.success && response.data) {
        setResumeData(response.data);
        setUploaded(true);
        setPage("resume");
        notify("Resume parsed successfully!");
      } else {
        throw new Error("Failed to process resume");
      }
    } catch (error) {
      console.error("Upload error:", error);
      notify(error instanceof Error ? error.message : "Failed to upload resume");
    } finally {
      setParsing(false);
      // Reset file input
      if (event.target) {
        event.target.value = "";
      }
    }
  };

  const startAnalysis = () => {
    if (!uploaded) { notify("Upload your resume before starting an analysis"); setPage("resume"); return; }
    if (!processedJobData) { notify("Extract a job before analyzing"); setPage("jobs"); return; }
    setAnalyzing(true); window.setTimeout(() => { setHasAnalysis(true); setAnalyzing(false); setPage("analysis"); }, 1800);
  };
  const shell = page !== "landing";
  return <main className={shell ? "app-shell" : "landing-shell"}>
    {shell && <Sidebar page={page} setPage={setPage} />}
    <section className={shell ? "app-main" : "landing-main"}>
      <Topbar page={page} setPage={setPage} theme={theme} toggleTheme={toggleTheme} />
      <div className={shell ? "page-wrap" : "landing-wrap"}>
        {page === "landing" && <Landing uploaded={uploaded} hasAnalysis={hasAnalysis} onStart={() => fileRef.current?.click()} onNext={() => setPage(uploaded ? "jobs" : "resume")} onAnalysis={() => setPage("analysis")} onDemo={() => { setPage("resume"); setDemoStep(0); }} />}
        {page === "resume" && <ResumePage uploaded={uploaded} parsing={parsing} resumeData={resumeData} fileName={fileName} onUpload={() => fileRef.current?.click()} goToJobs={() => setPage("jobs")} />}
        {page === "jobs" && <JobsPage jobUrl={jobUrl} setJobUrl={setJobUrl} setJobSource={setJobSource} processedJobData={processedJobData} setProcessedJobData={setProcessedJobData} startAnalysis={startAnalysis} notify={notify} />}
        {page === "analysis" && <AnalysisPage hasAnalysis={hasAnalysis} resumeData={resumeData} jobData={processedJobData} startAnalysis={() => setPage("jobs")} notify={notify} />}
        {page === "history" && <HistoryPage hasAnalysis={hasAnalysis} jobSource={jobSource} setPage={setPage} />}
      </div>
    </section>
    <input ref={fileRef} className="sr-only" type="file" accept="application/pdf" onChange={handleUpload} />
    {parsing && <LoadingOverlay title="Reading your resume" detail="Extracting skills, experience, and education…" />}
    {analyzing && <LoadingOverlay title="Analyzing your match" detail="Comparing skills, experience, and responsibilities…" />}
    {demoStep !== null && <DemoTour step={demoStep} setStep={setDemoStep} setPage={setPage} setUploaded={setUploaded} />}
    {toast && <div className="toast">✓ {toast}</div>}
  </main>;
}

function Brand({ compact = false, onHome }: { compact?: boolean; onHome: () => void }) { return <button className={`brand ${compact ? "compact" : ""}`} onClick={onHome}><span className="brand-mark">✦</span><span>Intelli<span>Apply</span></span></button>; }
function ThemeToggle({ theme, toggleTheme }: { theme: "light" | "dark"; toggleTheme: () => void }) { return <button className="theme-toggle" onClick={toggleTheme} aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}><span className={theme === "light" ? "active" : ""}>☀</span><span className={theme === "dark" ? "active" : ""}>☾</span></button>; }
function Topbar({ page, setPage, theme, toggleTheme }: { page: Page; setPage: (p: Page) => void; theme: "light" | "dark"; toggleTheme: () => void }) { const links: { id: Page; label: string }[] = [{id:"landing",label:"Home"},{id:"resume",label:"Resume"},{id:"jobs",label:"Jobs"},{id:"analysis",label:"Analysis"},{id:"history",label:"History"}]; return <header className={`topbar ${page === "landing" ? "landing-topbar" : ""}`}>{page === "landing" && <Brand onHome={() => setPage("landing")} />}{page === "landing" && <nav className="top-nav">{links.map(link => <button key={link.id} className={page === link.id ? "active" : ""} onClick={() => setPage(link.id)}>{link.label}</button>)}</nav>}{page !== "landing" && <div className="mobile-brand"><Brand compact onHome={() => setPage("landing")} /></div>}<ThemeToggle theme={theme} toggleTheme={toggleTheme} /></header>; }
function Sidebar({ page, setPage }: { page: Page; setPage: (p: Page) => void }) { return <aside className="sidebar"><Brand onHome={() => setPage("landing")} /><nav className="side-nav">{navItems.map(item => <button key={item.id} className={page === item.id ? "active" : ""} onClick={() => setPage(item.id)}><Icon>{item.icon}</Icon>{item.label}</button>)}</nav><div className="side-note"><span className="brand-mark small">✦</span><div><strong>Smarter applications</strong><p>Clear insights for every opportunity.</p></div></div></aside>; }

function Landing({ uploaded, hasAnalysis, onStart, onNext, onAnalysis, onDemo }: { uploaded:boolean; hasAnalysis:boolean; onStart: () => void; onNext: () => void; onAnalysis: () => void; onDemo: () => void }) { return <div className="hero"><div className="hero-copy"><div className="eyebrow"><span>✦</span> AI-powered career intelligence</div><h1>Turn Every Job Into a <em>Smarter Application</em></h1><p>Upload your resume, compare it with a job, and get clear strengths, gaps, and practical advice.</p><div className="hero-actions">{uploaded ? <button className="btn primary" onClick={onNext}>＋ Add Your Job Details</button> : <button className="btn primary" onClick={onStart}>⇧ Upload Resume</button>}<button className="btn secondary" onClick={onDemo}>▷ View Demo</button>{hasAnalysis && <button className="btn secondary" onClick={onAnalysis}>View Latest Analysis</button>}</div><div className="trust-row"><span>✓ Private by design</span><span>✓ Clear match scoring</span><span>✓ Actionable advice</span></div></div><div className="match-visual" aria-label="Resume and job match visualization"><div className="orbit one" /><div className="orbit two" /><div className={`score-ring ${hasAnalysis ? "complete" : "pending"}`}><strong>{hasAnalysis ? "82%" : "—"}</strong><span>{hasAnalysis ? "Latest match" : "Your match"}</span></div><div className="mini-card resume-card"><span className="card-kicker">▤ YOUR RESUME</span><strong>{uploaded ? "Resume Ready" : "Candidate Profile"}</strong><p>Skills · Experience · Education</p><div className="mini-tags"><i>Reusable</i><i>Structured</i></div></div><div className="mini-card job-card"><span className="card-kicker">▣ JOB DETAILS</span><strong>Selected Opportunity</strong><p>URL or pasted description</p><div className="mini-tags"><i>Requirements</i><i>Skills</i></div></div><div className="insight-card"><span><b>Match strengths</b><small>{hasAnalysis ? "Requirements · SQL" : "Shown after analysis"}</small></span><span><b>Skill gaps</b><small>{hasAnalysis ? "Cloud fundamentals" : "Shown after analysis"}</small></span></div></div></div>; }

function ResumePage({ uploaded, parsing, resumeData, fileName, onUpload, goToJobs }: { uploaded: boolean; parsing: boolean; resumeData: ResumeData | null; fileName: string; onUpload: () => void; goToJobs: () => void }) { 
  const skills = resumeData?.data?.hard_skills?.slice(0, 8) || [];
  const workExperience = resumeData?.data?.work_experience || [];
  const education = resumeData?.data?.education || [];
  
  return <><PageHeader title="Your Resume" subtitle="We structure your resume to power smarter job matches." />{uploaded ? <><Card className="resume-ready"><div className="file-summary"><div className="pdf-icon">PDF</div><div><strong>{fileName || "Candidate_Resume.pdf"}</strong><p className="success">✓ Successfully uploaded and parsed</p><small>Processed at: {resumeData?.extracted_at ? new Date(resumeData.extracted_at).toLocaleString() : 'Just now'}</small></div></div><div className="resume-ready-actions"><button className="btn secondary compact-btn" onClick={onUpload}>Replace Resume</button><button className="btn primary" onClick={goToJobs}>Continue to Add Job →</button></div></Card><div className="next-step-banner"><span>2</span><div><strong>Your resume is ready. Now add the job you want to compare.</strong><p>Paste a job link or description, then IntelliApply can prepare a match analysis.</p></div><button className="btn primary compact-btn" onClick={goToJobs}>Add Job Details</button></div><div className="profile-stack">
    <InfoSection icon="◎" title="Professional Summary">
      <p>Your resume has been successfully processed. Key skills and experience have been extracted for job matching.</p>
      {resumeData?.data?.keywords && resumeData.data.keywords.length > 0 && (
        <div className="mt-3">
          <p className="text-sm text-gray-600">Key themes: {resumeData.data.keywords.join(", ")}</p>
        </div>
      )}
    </InfoSection>
    
    <InfoSection icon="⌘" title="Skills">
      <div className="skill-chips">
        {skills.length > 0 ? skills.map(s => <span key={s}>{s}</span>) : 
          <p className="text-gray-500">No skills extracted from resume</p>}
      </div>
      {resumeData?.data?.soft_skills && resumeData.data.soft_skills.length > 0 && (
        <div className="mt-4">
          <p className="font-medium mb-2">Soft Skills:</p>
          <div className="skill-chips">
            {resumeData.data.soft_skills.slice(0, 5).map(s => <span key={s} className="bg-blue-50 text-blue-700">{s}</span>)}
          </div>
        </div>
      )}
    </InfoSection>
    
    <InfoSection icon="▣" title="Experience">
      {workExperience.length > 0 ? (
        workExperience.slice(0, 2).map((exp, index) => (
          <Timeline 
            key={index}
            title={exp.role || "Position"}
            meta={`${exp.company || "Company"} · ${exp.duration || "Duration"}`}
            text={exp.responsibilities.length > 0 ? exp.responsibilities.join(". ") : "Responsibilities extracted from resume"}
          />
        ))
      ) : (
        <p className="text-gray-500">No work experience extracted from resume</p>
      )}
    </InfoSection>
    
    <InfoSection icon="◇" title="Education">
      {education.length > 0 ? (
        <>
          {education.map((edu, index) => (
            <div key={index} className="mb-3">
              <strong>{edu.degree || "Degree"}</strong>
              <p>{edu.institution || "Institution"}</p>
            </div>
          ))}
        </>
      ) : (
        <p className="text-gray-500">No education information extracted from resume</p>
      )}
    </InfoSection>
    
    {(resumeData?.data?.certifications && resumeData.data.certifications.length > 0) && (
      <InfoSection icon="★" title="Certifications">
        <div className="skill-chips">
          {resumeData.data.certifications.map(cert => <span key={cert}>{cert}</span>)}
        </div>
      </InfoSection>
    )}
    
    {(resumeData?.data?.projects && resumeData.data.projects.length > 0) && (
      <InfoSection icon="⚙️" title="Projects">
        <ul className="list-disc pl-5 space-y-1">
          {resumeData.data.projects.slice(0, 3).map((project, index) => (
            <li key={index}>{project}</li>
          ))}
        </ul>
      </InfoSection>
    )}
  </div></> : <Card className="single-upload"><span>⇧</span><h2>{parsing ? "Processing your resume…" : "Upload your resume"}</h2><p>Choose one PDF resume to create your candidate profile.</p><button className="btn primary" onClick={onUpload}>Browse Resume PDF</button><small>PDF format only, up to 10MB</small></Card>}</>; 
}

function JobsPage({ jobUrl, setJobUrl, setJobSource, processedJobData, setProcessedJobData, startAnalysis, notify }: { jobUrl: string; setJobUrl: (v: string) => void; setJobSource: (v: {kind:string;value:string}) => void; processedJobData: any; setProcessedJobData: (v: any) => void; startAnalysis: () => void; notify: (v: string) => void }) { 
  const [tab, setTab] = useState<"url" | "text" | "pdf">("url");
  const [processing, setProcessing] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  
  const {
    processJobFromDescription,
    processJobFromPDF,
    processJobFromURL,
  } = (() => ({
    processJobFromDescription: async (desc: string) => {
      const { processJobFromDescription: fn } = await import("@/lib/api");
      return fn(desc);
    },
    processJobFromPDF: async (file: File) => {
      const { processJobFromPDF: fn } = await import("@/lib/api");
      return fn(file);
    },
    processJobFromURL: async (url: string) => {
      const { processJobFromURL: fn } = await import("@/lib/api");
      return fn(url);
    },
  }))();
  
  const saveJob = async () => {
    if (!jobUrl.trim()) {
      notify("Add a job URL or description first");
      return;
    }
    
    setProcessing(true);
    try {
      let response;
      
      if (tab === "url") {
        response = await processJobFromURL(jobUrl.trim());
        setJobSource({kind: "Job URL", value: jobUrl.trim()});
      } else {
        response = await processJobFromDescription(jobUrl.trim());
        setJobSource({kind: "Pasted description", value: jobUrl.trim()});
      }
      
      if (response.success && response.data) {
        setProcessedJobData(response.data.data);
        notify("✓ Job extracted successfully!");
        setJobUrl("");
      } else {
        // Handle error response from backend
        const errorMsg = response.error || "Failed to extract job details";
        notify(`❌ ${errorMsg}`);
        console.error("Job extraction error:", response);
      }
    } catch (error) {
      console.error("Job processing error:", error);
      const errorMsg = error instanceof Error ? error.message : "Failed to process job";
      notify(`❌ ${errorMsg}`);
    } finally {
      setProcessing(false);
    }
  };
  
  const handlePDFUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      notify("Please upload a PDF file");
      return;
    }
    
    if (file.size > 10 * 1024 * 1024) {
      notify("File too large. Maximum size is 10MB");
      return;
    }
    
    setProcessing(true);
    try {
      const response = await processJobFromPDF(file);
      
      if (response.success && response.data) {
        setProcessedJobData(response.data.data);
        setJobSource({kind: "Job Description PDF", value: file.name});
        notify("✓ PDF processed successfully!");
      } else {
        // Handle error response from backend
        const errorMsg = response.error || "Failed to process PDF";
        notify(`❌ ${errorMsg}`);
        console.error("PDF processing error:", response);
      }
    } catch (error) {
      console.error("PDF processing error:", error);
      const errorMsg = error instanceof Error ? error.message : "Failed to process PDF";
      notify(`❌ ${errorMsg}`);
    } finally {
      setProcessing(false);
      if (event.target) {
        event.target.value = "";
      }
    }
  };
  
  return <>
    <PageHeader title="Jobs" subtitle="Add a job URL, description, or PDF file to compare with your resume." />
    <Card className="job-entry">
      <div className="tabs">
        <button className={tab === "url" ? "active" : ""} onClick={() => setTab("url")}>Paste Job URL</button>
        <button className={tab === "text" ? "active" : ""} onClick={() => setTab("text")}>Paste Description</button>
        <button className={tab === "pdf" ? "active" : ""} onClick={() => setTab("pdf")}>Upload PDF</button>
      </div>
      <div className="entry-row">
        {tab === "url" && (
          <>
            <input 
              id="job-entry" 
              value={jobUrl} 
              onChange={e => setJobUrl(e.target.value)} 
              placeholder="https://company.com/jobs/..." 
              disabled={processing}
            />
            <button className="btn primary" onClick={saveJob} disabled={processing}>
              {processing ? "Processing..." : "Extract Job"}
            </button>
          </>
        )}
        {tab === "text" && (
          <>
            <textarea 
              id="job-entry" 
              value={jobUrl} 
              onChange={e => setJobUrl(e.target.value)} 
              placeholder="Paste the full job description here…" 
              disabled={processing}
            />
            <button className="btn primary" onClick={saveJob} disabled={processing}>
              {processing ? "Processing..." : "Extract Job"}
            </button>
          </>
        )}
        {tab === "pdf" && (
          <>
            <input 
              ref={fileRef} 
              className="sr-only" 
              type="file" 
              accept="application/pdf" 
              onChange={handlePDFUpload}
              disabled={processing}
            />
            <button 
              className="btn primary" 
              onClick={() => fileRef.current?.click()}
              disabled={processing}
            >
              {processing ? "Processing..." : "Choose PDF"}
            </button>
          </>
        )}
      </div>
    </Card>
    
    {processedJobData && processedJobData.data && (
      <Card className="processed-job">
        <div className="job-result">
          <h3>{processedJobData.data.job_title || "Job Title"}</h3>
          <p className="company">{processedJobData.data.company_name || "Company"}</p>
          {processedJobData.data.location && <p className="location">📍 {processedJobData.data.location}</p>}
          {processedJobData.data.remote_status && <p className="remote">🏠 {processedJobData.data.remote_status}</p>}
          
          {processedJobData.data.required_skills && processedJobData.data.required_skills.length > 0 && (
            <div className="job-skills">
              <h4>Required Skills:</h4>
              <div className="skill-chips">
                {processedJobData.data.required_skills.slice(0, 8).map((skill: string) => (
                  <span key={skill}>{skill}</span>
                ))}
              </div>
            </div>
          )}
          
          {processedJobData.data.key_responsibilities && processedJobData.data.key_responsibilities.length > 0 && (
            <div className="job-responsibilities">
              <h4>Key Responsibilities:</h4>
              <ul>
                {processedJobData.data.key_responsibilities.slice(0, 4).map((resp: string, idx: number) => (
                  <li key={idx}>{resp}</li>
                ))}
              </ul>
            </div>
          )}
          
          <button className="btn primary" onClick={startAnalysis}>Analyze Match →</button>
        </div>
      </Card>
    )}
    
    {!processedJobData && (
      <>
        <div className="first-job-callout"><span>1</span><div><strong>Prototype opportunity</strong><p>Use this sample job to test the match flow, or add your own details above.</p></div></div>
        <Card className="jobs-table">
          <div className="job-head"><span>Opportunity</span><span>Location</span><span>Status</span><span>Action</span></div>
          <JobRow title="Business Systems Analyst" company="Northstar Digital" location="Toronto, ON · Hybrid" status="Ready" startAnalysis={startAnalysis} />
        </Card>
      </>
    )}
  </>; 
}

function AnalysisPage({ hasAnalysis, resumeData, jobData, startAnalysis, notify }: { hasAnalysis: boolean; resumeData: ResumeData | null; jobData: any; startAnalysis: () => void; notify: (v: string) => void }) { 
  const questions = useMemo(() => ["Walk me through a complex requirements-gathering process you led.", "How do you approach writing efficient SQL queries for reporting?", "Describe a time you improved a business process with stakeholders."], []);
  
  if (!hasAnalysis || !jobData) return <>
    <PageHeader title="Job Match Analysis" subtitle="Your match results will appear here after an analysis." />
    <Card className="analysis-empty">
      <div className="empty-illustration"><span>▤</span><i>＋</i><span>▣</span></div>
      <h2>No analysis to display yet</h2>
      <p>First upload your resume to extract your skills and experience. Then add or select a job and click <strong>Analyze Match</strong>. The backend will calculate a real match score based on your actual resume data.</p>
      <div className="empty-steps"><span><b>1</b> Upload resume</span><span><b>2</b> Add a job</span><span><b>3</b> Analyze match</span></div>
      <button className="btn primary" onClick={startAnalysis}>Choose a Job to Analyze</button>
    </Card>
  </>;
  
  const jobTitle = jobData.data?.job_title || "Job Opportunity";
  const companyName = jobData.data?.company_name || "Company";
  const location = jobData.data?.location || "Remote";
  const requiredSkills = jobData.data?.required_skills || [];
  const responsibilities = jobData.data?.key_responsibilities || [];
  
  return <>
    <PageHeader title="Job Match Analysis" subtitle="Analysis of your resume against the selected opportunity.">
      <div className="header-actions">
        <button className="btn secondary small-btn" onClick={() => notify("Analysis saved")}>♡ Save Analysis</button>
        <button className="btn primary small-btn" onClick={startAnalysis}>⌕ Analyze Another Job</button>
      </div>
    </PageHeader>
    <Card className="analysis-hero">
      <div className="candidate">
        <span className="avatar">CA</span>
        <div>
          <small>CANDIDATE PROFILE</small>
          <strong>Your Resume</strong>
          <span>{resumeData?.data?.keywords?.[0] || "Technology Professional"}</span>
        </div>
      </div>
      <div className="analysis-score">
        <strong>82%</strong>
        <span>Sample Match</span>
      </div>
      <div className="role">
        <div>
          <small>JOB OPPORTUNITY</small>
          <strong>{jobTitle}</strong>
          <span>{companyName} · {location}</span>
        </div>
        <b>APPLY</b>
      </div>
    </Card>
    <div className="analysis-grid">
      <InfoCard title="Why You Match" icon="✓">
        <p>Your background aligns with the role requirements. Review the matched skills below and tailor your application to highlight your strongest qualifications.</p>
      </InfoCard>
      <InfoCard title="Top Strengths" icon="☆">
        {requiredSkills.slice(0, 3).map(skill => (
          <Metric key={skill} label={skill} value="Strong" />
        ))}
      </InfoCard>
      <InfoCard title="Skill Gaps" icon="△">
        {requiredSkills.slice(3, 5).map(skill => (
          <Metric key={skill} label={skill} value="Moderate gap" warning />
        ))}
      </InfoCard>
      <InfoCard title="Application Advice" icon="✎">
        <ul>
          {responsibilities.slice(0, 3).map((resp: string, i: number) => (
            <li key={i}>Address: {resp.substring(0, 50)}...</li>
          ))}
        </ul>
      </InfoCard>
      <InfoCard title="Interview Preparation" icon="◌">
        {questions.map((q, i) => <button className="question" key={q}><b>{i + 1}</b><span>{q}</span><i>›</i></button>)}
      </InfoCard>
      <InfoCard title="Company Research" icon="▥">
        <div className="company-card">
          <span className="company-logo">✦</span>
          <div>
            <strong>{companyName}</strong>
            <p className="success">● Research available</p>
          </div>
        </div>
        <p>Review the company overview before tailoring your application.</p>
      </InfoCard>
    </div>
  </>; 
}

function HistoryPage({ hasAnalysis, jobSource, setPage }: { hasAnalysis: boolean; jobSource: {kind:string;value:string}; setPage: (p:Page) => void }) { const [detail, setDetail] = useState<"job"|"resume"|"analysis"|null>(null); const [downloadNote,setDownloadNote]=useState(false); return <><PageHeader title="Application History" subtitle="Reopen the job details, resume, and analysis used for every match." />{hasAnalysis ? <Card className="history-table"><div className="history-head"><span>Date</span><span>Job details</span><span>Resume</span><span>Analysis</span></div><div className="history-row"><span><strong>Today</strong><small>Prototype record</small></span><button onClick={() => setDetail("job")}><b>{jobSource.kind}</b><small>Open details →</small></button><button onClick={() => setDetail("resume")}><b>Candidate_Resume.pdf</b><small>View or download →</small></button><button onClick={() => setDetail("analysis")}><b className="history-score">82% match</b><small>Open full analysis →</small></button></div></Card> : <Card className="history-empty"><span>◷</span><h2>No application history yet</h2><p>Your first record will be created after you upload a resume, add a job, and complete an analysis.</p><button className="btn primary" onClick={() => setPage("resume")}>Start With Your Resume</button></Card>}{detail && <div className="detail-overlay" role="dialog" aria-modal="true" aria-label="History details"><div className="detail-modal"><button className="demo-close" onClick={() => {setDetail(null);setDownloadNote(false)}} aria-label="Close details">×</button>{detail === "job" && <><div className="detail-icon">▣</div><h2>{jobSource.kind}</h2>{jobSource.kind === "Job URL" ? <a className="job-link" href={jobSource.value} target="_blank" rel="noreferrer">{jobSource.value}</a> : <div className="description-box">{jobSource.value}</div>}<p className="muted">This is the exact source used for this analysis.</p></>}{detail === "resume" && <><div className="detail-icon">PDF</div><h2>Candidate_Resume.pdf</h2><p className="muted">The resume connected to this match analysis.</p><div className="detail-actions"><button className="btn secondary" onClick={() => {setDetail(null);setPage("resume")}}>View Resume</button><button className="btn primary" onClick={() => setDownloadNote(true)}>Download Resume</button></div>{downloadNote && <div className="download-note">The download control is ready; the backend will connect it to the stored original PDF.</div>}</>}{detail === "analysis" && <><div className="detail-icon">82%</div><h2>Business Systems Analyst</h2><p>Overall prototype match: <strong className="success">82% — Apply</strong></p><div className="detail-summary"><span><b>Strengths</b>Requirements, SQL, Jira</span><span><b>Gaps</b>API documentation, cloud</span></div><button className="btn primary" onClick={() => {setDetail(null);setPage("analysis")}}>View Full Analysis</button></>}</div></div>}</>; }

function PageHeader({ title, subtitle, children }: { title: string; subtitle: string; children?: React.ReactNode }) { return <div className="page-header"><div><h1>{title}</h1><p>{subtitle}</p></div>{children}</div>; }
function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) { return <section className={`card ${className}`}>{children}</section>; }
function InfoSection({ icon, title, children }: { icon: string; title: string; children: React.ReactNode }) { return <Card className="info-section"><Icon>{icon}</Icon><div><h3>{title}</h3>{children}</div></Card>; }
function Timeline({ title, meta, text }: { title: string; meta: string; text: string }) { return <div className="timeline"><i /><div><strong>{title}</strong><small>{meta}</small><p>{text}</p></div></div>; }
function JobRow({ title, company, location, status, startAnalysis }: { title: string; company: string; location: string; status: string; startAnalysis: () => void }) { return <div className="job-row"><div className="job-name"><span className="company-logo">✦</span><div><strong>{title}</strong><small>{company}</small></div></div><span>{location}</span><span className="pill">{status}</span><div><button className="btn secondary compact-btn" onClick={startAnalysis}>Analyze Match</button></div></div>; }
function LoadingOverlay({ title, detail }: { title: string; detail: string }) { return <div className="overlay"><div className="loader-card"><div className="loader">✦</div><h2>{title}</h2><p>{detail}</p><div className="progress"><i /></div></div></div>; }
const demoSteps = [
  { icon: "⇧", title: "Upload your resume", text: "Start with one PDF resume. IntelliApply will extract your experience, skills, education, and professional profile so you do not have to enter everything manually.", benefit: "How it helps: creates one reusable candidate profile for every job comparison.", page: "resume" as Page },
  { icon: "▣", title: "Add the job you want", text: "Paste a job-posting URL or the complete job description. The application will identify the role, required skills, experience, responsibilities, and location.", benefit: "How it helps: turns a long posting into clear, structured requirements.", page: "jobs" as Page },
  { icon: "◎", title: "Analyze the match", text: "Select a saved job and click Analyze Match. Your resume and that specific job will be compared. The loading state shows that the comparison is in progress.", benefit: "How it helps: gives every selected job its own result instead of one general score.", page: "jobs" as Page },
  { icon: "↗", title: "Act on the results", text: "Review the match score, strongest qualifications, missing skills, application advice, company research, and tailored interview questions.", benefit: "How it helps: shows whether to apply and exactly how to strengthen the application.", page: "analysis" as Page },
];
function DemoTour({ step, setStep, setPage, setUploaded }: { step: number; setStep: (v: number | null) => void; setPage: (p: Page) => void; setUploaded: (v: boolean) => void }) { const item = demoSteps[step]; const goNext = () => { if (step === demoSteps.length - 1) { setStep(null); setUploaded(false); setPage("resume"); } else { const next = step + 1; setStep(next); setPage(demoSteps[next].page); } }; return <div className="demo-overlay" role="dialog" aria-modal="true" aria-label="How IntelliApply works"><div className="demo-modal"><button className="demo-close" onClick={() => setStep(null)} aria-label="Close demo">×</button><div className="demo-progress">{demoSteps.map((_, i) => <span key={i} className={i <= step ? "active" : ""} />)}</div><div className="demo-count">STEP {step + 1} OF {demoSteps.length}</div><div className="demo-icon">{item.icon}</div><h2>{item.title}</h2><p>{item.text}</p><div className="demo-benefit">✦ {item.benefit}</div><div className="demo-actions">{step > 0 && <button className="btn secondary" onClick={() => { const previous = step - 1; setStep(previous); setPage(demoSteps[previous].page); }}>← Back</button>}<button className="btn primary" onClick={goNext}>{step === demoSteps.length - 1 ? "Try It Yourself" : "Next Step →"}</button></div></div></div>; }
function InfoCard({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) { return <Card className="analysis-card"><h3><Icon>{icon}</Icon>{title}</h3>{children}</Card>; }
function Metric({ label, value, warning = false }: { label: string; value: string; warning?: boolean }) { return <div className="metric"><span>{warning ? "●" : "✓"} {label}</span><b className={warning ? "warning" : "success"}>{value}</b></div>; }
