"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { uploadResume, type ResumeData } from "@/lib/api";
import { saveResume, loadResume, saveJob, loadJob, saveResumeFile, loadResumeFile, saveLastAnalysis, loadLastAnalysis, addToHistory, getHistory } from "@/lib/storage";
import type { StoredJobData, AnalysisHistoryEntry } from "@/lib/storage";
import { useDemo } from "@/lib/useDemo";
import { useAuth, type UseAuthReturn } from "@/lib/useAuth";
import type { DemoAnalysis, DemoJob, DemoApplication, ApplicationStatus } from "@/lib/data";
import { demoCareerSnapshot, demoAnalytics, demoReanalyzeComparison, STATUS_CONFIG, APPLICATION_STATUSES, getDemoApplicationByJobId } from "@/lib/data";
import type { DemoAnalyticsData, DemoReanalyzeComparison } from "@/lib/data";
import { projectConfig } from "@/lib/config";

type Page = "landing" | "resume" | "jobs" | "analysis" | "history" | "analytics" | "applications" | "application-detail" | "how-it-works" | "about" | "team";
const Icon = ({ children }: { children: React.ReactNode }) => <span className="icon" aria-hidden="true">{children}</span>;
const navItems: { id: Page; label: string; icon: string }[] = [
  { id: "landing", label: "Home", icon: "⌂" }, { id: "resume", label: "Resume", icon: "▤" },
  { id: "jobs", label: "Jobs", icon: "▣" }, { id: "applications", label: "Applications", icon: "◈" }, { id: "analysis", label: "Analysis", icon: "↗" }, { id: "history", label: "History", icon: "◷" },
  { id: "analytics", label: "Analytics", icon: "▦" },
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
  const [jobSource, setJobSource] = useState({ kind: "Job URL", value: "" });
  const [processedJobData, setProcessedJobData] = useState<any>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const auth = useAuth();
  const [toast, setToast] = useState("");
  const [resumeData, setResumeData] = useState<ResumeData | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [analysisResult, setAnalysisResult] = useState<any>(() => {
    if (typeof window === 'undefined') return null;
    return loadLastAnalysis();
  });
  const fileRef = useRef<HTMLInputElement>(null);

  // Application Hub state
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);

  // Demo mode
  const demo = useDemo();
  const { isDemo, selectedJobId, selectedAnalysis } = demo.state;
  const { enterDemo, exitDemo, selectJob, clearSelection } = demo.actions;

  const handleEnterDemo = useCallback(() => {
    enterDemo();
    setPage("landing"); // go to dashboard in demo mode
  }, [enterDemo]);

  const handleExitDemo = useCallback(() => {
    exitDemo();
    setPage("landing");
  }, [exitDemo]);

  // Load persisted data on mount
  useEffect(() => {
    const storedResume = loadResume();
    const storedJob = loadJob();
    if (storedResume) { setResumeData(storedResume); setUploaded(true); }
    if (storedJob) { setProcessedJobData(storedJob.data); setJobSource({ kind: storedJob.extraction_source, value: storedJob.source_value || '' }); }
    loadResumeFile().then(file => { if (file) setResumeFile(file); });
  }, []);

  useEffect(() => { document.documentElement.dataset.theme = theme; }, [theme]);
  const toggleTheme = () => { const next = theme === "light" ? "dark" : "light"; setTheme(next); document.documentElement.dataset.theme = next; localStorage.setItem("intelliapply-theme", next); };
  const notify = (message: string) => { setToast(message); window.setTimeout(() => setToast(""), 2600); };

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.pdf')) { notify("Please upload a PDF file"); return; }
    if (file.size > 10 * 1024 * 1024) { notify("File too large. Maximum size is 10MB"); return; }
    setFileName(file.name);
    setResumeFile(file);
    saveResumeFile(file);
    setParsing(true);
    try {
      const response = await uploadResume(file);
      if (response.success && response.data) {
        setResumeData(response.data);
        saveResume(response.data);
        setUploaded(true);
        setPage("resume");
        notify("Resume parsed successfully!");
      } else { throw new Error("Failed to process resume"); }
    } catch (error) {
      notify(error instanceof Error ? error.message : "Failed to upload resume");
    } finally {
      setParsing(false);
      if (event.target) event.target.value = "";
    }
  };

  const startAnalysis = () => {
    if (!uploaded) { notify("Upload your resume before starting an analysis"); setPage("resume"); return; }
    if (!processedJobData) { notify("Extract a job before analyzing"); setPage("jobs"); return; }
    setAnalysisResult(null);
    setPage("analysis");
  };

  const shell = page !== "landing" || isDemo;

  return <main className={shell ? "app-shell" : "landing-shell"}>
    {shell && <Sidebar page={page} setPage={setPage} isDemo={isDemo} onExitDemo={handleExitDemo} />}
    <section className={shell ? "app-main" : "landing-main"}>
      <Topbar page={page} setPage={setPage} theme={theme} toggleTheme={toggleTheme} isDemo={isDemo} onExitDemo={handleExitDemo} auth={auth} onShowAuth={() => setShowAuthModal(true)} />
      <div className={shell ? "page-wrap" : ""}>
        {page === "landing" && !isDemo && <LandingPage uploaded={uploaded} hasAnalysis={hasAnalysis} onStart={() => fileRef.current?.click()} onNext={() => setPage(uploaded ? "jobs" : "resume")} onAnalysis={() => setPage("analysis")} onDemo={handleEnterDemo} setPage={setPage} />}
        {page === "landing" && isDemo && <DemoDashboard data={demo.data} setPage={setPage} selectJob={selectJob} setSelectedAppId={setSelectedAppId} />}
        {page === "resume" && !isDemo && <ResumePage uploaded={uploaded} parsing={parsing} resumeData={resumeData} fileName={fileName} onUpload={() => fileRef.current?.click()} goToJobs={() => setPage("jobs")} />}
        {page === "resume" && isDemo && <DemoResumePage data={demo.data} />}
        {page === "jobs" && !isDemo && <JobsPage jobUrl={jobUrl} setJobUrl={setJobUrl} setJobSource={setJobSource} processedJobData={processedJobData} setProcessedJobData={setProcessedJobData} startAnalysis={startAnalysis} notify={notify} setPage={setPage} />}
        {page === "jobs" && isDemo && <DemoJobsPage data={demo.data} selectJob={selectJob} setPage={setPage} />}
        {page === "analysis" && !isDemo && <AnalysisPage hasAnalysis={hasAnalysis} resumeData={resumeData} jobData={processedJobData} startAnalysis={() => setPage("jobs")} notify={notify} resumeFile={resumeFile} setHasAnalysis={setHasAnalysis} analysisResult={analysisResult} setAnalysisResult={setAnalysisResult} />}
        {page === "analysis" && isDemo && <DemoAnalysisPage analysis={selectedAnalysis} data={demo.data} setPage={setPage} selectJob={selectJob} />}
        {page === "history" && !isDemo && <HistoryPage hasAnalysis={hasAnalysis} jobSource={jobSource} setPage={setPage} analysisResult={analysisResult} />}
        {page === "history" && isDemo && <DemoHistoryPage data={demo.data} selectJob={selectJob} setPage={setPage} setSelectedAppId={setSelectedAppId} />}
        {page === "analytics" && !isDemo && <AnalyticsPage setPage={setPage} />}
        {page === "analytics" && isDemo && <DemoAnalyticsPage setPage={setPage} />}
        {page === "applications" && isDemo && <DemoApplicationsPage data={demo.data} setPage={setPage} setSelectedAppId={setSelectedAppId} />}
        {page === "applications" && !isDemo && <ApplicationsEmptyPage setPage={setPage} />}
        {page === "application-detail" && isDemo && <DemoApplicationDetailPage data={demo.data} appId={selectedAppId} setPage={setPage} setSelectedAppId={setSelectedAppId} selectJob={selectJob} />}
        {page === "how-it-works" && <HowItWorksPage setPage={setPage} isDemo={isDemo} onDemo={handleEnterDemo} />}
        {page === "about" && <AboutPage setPage={setPage} />}
        {page === "team" && <TeamPage setPage={setPage} />}
      </div>
      <Footer setPage={setPage} isDemo={isDemo} onDemo={handleEnterDemo} />
    </section>
    <input ref={fileRef} className="sr-only" type="file" accept="application/pdf" onChange={handleUpload} />
    {parsing && <LoadingOverlay title="Reading your resume" detail="Extracting skills, experience, and education…" />}
    {analyzing && <LoadingOverlay title="Analyzing your match" detail="Comparing skills, experience, and responsibilities…" />}
    {demoStep !== null && <DemoTour step={demoStep} setStep={setDemoStep} setPage={setPage} setUploaded={setUploaded} />}
    {toast && <div className="toast">✓ {toast}</div>}
    {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} auth={auth} notify={notify} />}
  </main>;
}

/* ─── SHARED UI ─── */
function Brand({ compact = false, onHome }: { compact?: boolean; onHome: () => void }) { return <button className={`brand ${compact ? "compact" : ""}`} onClick={onHome}><span className="brand-mark">✦</span><span>Intelli<span>Apply</span></span></button>; }
function ThemeToggle({ theme, toggleTheme }: { theme: "light" | "dark"; toggleTheme: () => void }) { return <button className="theme-toggle" onClick={toggleTheme} aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}><span className={theme === "light" ? "active" : ""}>☀</span><span className={theme === "dark" ? "active" : ""}>☾</span></button>; }

function Topbar({ page, setPage, theme, toggleTheme, isDemo, onExitDemo, auth, onShowAuth }: { page: Page; setPage: (p: Page) => void; theme: "light" | "dark"; toggleTheme: () => void; isDemo: boolean; onExitDemo: () => void; auth: UseAuthReturn; onShowAuth: () => void }) {
  const links: { id: Page; label: string }[] = [{id:"landing",label:"Home"},{id:"resume",label:"Resume"},{id:"jobs",label:"Jobs"},{id:"applications",label:"Applications"},{id:"analysis",label:"Analysis"},{id:"history",label:"History"},{id:"analytics",label:"Analytics"}];
  const isLanding = page === "landing" && !isDemo;
  const [showUserMenu, setShowUserMenu] = useState(false);
  return <header className={`topbar ${isLanding ? "landing-topbar" : ""}`}>
    {isLanding && <Brand onHome={() => setPage("landing")} />}
    {isLanding && <nav className="top-nav">{links.map(link => <button key={link.id} className={page === link.id ? "active" : ""} onClick={() => setPage(link.id)}>{link.label}</button>)}</nav>}
    {!isLanding && <div className="mobile-brand"><Brand compact onHome={() => setPage("landing")} /></div>}
    {isDemo && <span className="demo-badge">DEMO MODE</span>}
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
      {auth.configured && !auth.user && <button className="btn secondary compact-btn" onClick={onShowAuth}>Sign In</button>}
      {auth.user && <div style={{ position: 'relative' }}>
        <button className="auth-user-btn" onClick={() => setShowUserMenu(!showUserMenu)}>
          <span className="user-avatar-sm">{(auth.user.name || auth.user.email || '?').slice(0, 2).toUpperCase()}</span>
          {auth.user.name || auth.user.email.split('@')[0]}
        </button>
        {showUserMenu && <div className="auth-dropdown">
          <div className="user-info"><strong>{auth.user.name || 'User'}</strong><small>{auth.user.email}</small></div>
          <button onClick={() => { auth.signOut(); setShowUserMenu(false); }}>Sign Out</button>
        </div>}
      </div>}
      <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
    </div>
  </header>;
}

function Sidebar({ page, setPage, isDemo, onExitDemo }: { page: Page; setPage: (p: Page) => void; isDemo: boolean; onExitDemo: () => void }) {
  const mainNav = navItems.filter(i => !["history", "analytics"].includes(i.id));
  const insightsNav = navItems.filter(i => ["history", "analytics"].includes(i.id));
  return <aside className="sidebar">
    <Brand onHome={() => setPage("landing")} />
    <nav className="side-nav">
      {mainNav.map(item => <button key={item.id} className={page === item.id ? "active" : ""} onClick={() => setPage(item.id)}><Icon>{item.icon}</Icon>{item.label}</button>)}
      <div className="side-nav-divider" />
      <span className="side-nav-section-label">Insights</span>
      {insightsNav.map(item => <button key={item.id} className={page === item.id ? "active" : ""} onClick={() => setPage(item.id)}><Icon>{item.icon}</Icon>{item.label}</button>)}
    </nav>
    {isDemo && <button className="btn secondary compact-btn exit-demo-btn" onClick={onExitDemo}>Exit Demo</button>}
    <div className="side-note"><span className="brand-mark small">✦</span><div><strong>Smarter applications</strong><p>Clear insights for every opportunity.</p></div></div>
  </aside>;
}

function PageHeader({ title, subtitle, children }: { title: string; subtitle: string; children?: React.ReactNode }) { return <div className="page-header"><div><h1>{title}</h1><p>{subtitle}</p></div>{children}</div>; }
function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) { return <section className={`card ${className}`}>{children}</section>; }
function InfoSection({ icon, title, children }: { icon: string; title: string; children: React.ReactNode }) { return <Card className="info-section"><Icon>{icon}</Icon><div><h3>{title}</h3>{children}</div></Card>; }
function Timeline({ title, meta, text }: { title: string; meta: string; text: string }) { return <div className="timeline"><i /><div><strong>{title}</strong><small>{meta}</small><p>{text}</p></div></div>; }
function LoadingOverlay({ title, detail }: { title: string; detail: string }) { return <div className="overlay"><div className="loader-card"><div className="loader">✦</div><h2>{title}</h2><p>{detail}</p><div className="progress"><i /></div></div></div>; }

function AuthModal({ onClose, auth, notify }: { onClose: () => void; auth: UseAuthReturn; notify: (msg: string) => void }) {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await auth.signUp(email, password, name);
        if (error) { setError(error); } else { notify("Account created! Check email for confirmation."); setMode("signin"); }
      } else {
        const { error } = await auth.signIn(email, password);
        if (error) { setError(error); } else { notify("Signed in successfully"); onClose(); }
      }
    } finally { setLoading(false); }
  };

  return <div className="detail-overlay" role="dialog" aria-modal="true">
    <div className="detail-modal auth-modal">
      <button className="demo-close" onClick={onClose}>×</button>
      <div className="detail-icon">✦</div>
      <h2>{mode === "signin" ? "Sign In" : "Create Account"}</h2>
      <p className="muted">{mode === "signin" ? "Sign in to save your analyses." : "Create an account to persist your data."}</p>
      <form onSubmit={handleSubmit} className="auth-form">
        {mode === "signup" && <div className="auth-field"><label>Name</label><input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Your name" /></div>}
        <div className="auth-field"><label>Email</label><input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required /></div>
        <div className="auth-field"><label>Password</label><input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required minLength={6} /></div>
        {error && <p className="auth-error">{error}</p>}
        <button className="btn primary auth-submit" type="submit" disabled={loading}>{loading ? "Processing…" : mode === "signin" ? "Sign In" : "Create Account"}</button>
      </form>
      <p className="auth-switch">{mode === "signin" ? <>No account? <button className="link-btn" onClick={() => { setMode("signup"); setError(""); }}>Sign up</button></> : <>Have an account? <button className="link-btn" onClick={() => { setMode("signin"); setError(""); }}>Sign in</button></>}</p>
    </div>
  </div>;
}

function getRecommendationLabel(rec: string): string {
  if (rec === "strong_apply" || rec === "apply") return "APPLY";
  if (rec === "review") return "REVIEW";
  return "LOW MATCH";
}
function getRecommendationClass(rec: string): string {
  if (rec === "strong_apply" || rec === "apply") return "green";
  if (rec === "review") return "orange";
  return "red";
}

/* ─── LANDING PAGE (Non-demo) ─── */
function LandingPage({ uploaded, hasAnalysis, onStart, onNext, onAnalysis, onDemo, setPage }: { uploaded: boolean; hasAnalysis: boolean; onStart: () => void; onNext: () => void; onAnalysis: () => void; onDemo: () => void; setPage: (p: Page) => void }) {
  return <div className="landing-wrap">
    <div className="hero">
      <div className="hero-copy">
        <div className="eyebrow"><span>✦</span> AI-powered career intelligence</div>
        <h1>Turn Every Job Into a <em>Smarter Application</em></h1>
        <p>Upload your resume, compare it with a job, and get clear strengths, gaps, and practical advice.</p>
        <div className="hero-actions">
          {uploaded ? <button className="btn primary" onClick={onNext}>＋ Add Your Job Details</button> : <button className="btn primary" onClick={onStart}>⇧ Upload Resume</button>}
          <button className="btn secondary" onClick={onDemo}>▷ Explore Demo</button>
          {hasAnalysis && <button className="btn secondary" onClick={onAnalysis}>View Latest Analysis</button>}
        </div>
        <div className="trust-row"><span>✓ Private by design</span><span>✓ Clear match scoring</span><span>✓ Actionable advice</span></div>
      </div>
      <div className="match-visual" aria-label="Resume and job match visualization">
        <div className="orbit one" /><div className="orbit two" />
        <div className={`score-ring ${hasAnalysis ? "complete" : "pending"}`}><strong>{hasAnalysis ? "82%" : "—"}</strong><span>{hasAnalysis ? "Latest match" : "Your match"}</span></div>
        <div className="mini-card resume-card"><span className="card-kicker">▤ YOUR RESUME</span><strong>{uploaded ? "Resume Ready" : "Candidate Profile"}</strong><p>Skills · Experience · Education</p><div className="mini-tags"><i>Reusable</i><i>Structured</i></div></div>
        <div className="mini-card job-card"><span className="card-kicker">▣ JOB DETAILS</span><strong>Selected Opportunity</strong><p>URL or pasted description</p><div className="mini-tags"><i>Requirements</i><i>Skills</i></div></div>
        <div className="insight-card"><span><b>Match strengths</b><small>{hasAnalysis ? "Requirements · SQL" : "Shown after analysis"}</small></span><span><b>Skill gaps</b><small>{hasAnalysis ? "Cloud fundamentals" : "Shown after analysis"}</small></span></div>
      </div>
    </div>
    {/* How It Works Preview */}
    <section className="hiw-preview">
      <h2>How It Works</h2>
      <div className="hiw-steps-row">
        <div className="hiw-step"><span className="hiw-num">01</span><h3>Upload your resume</h3><p>One PDF creates your reusable candidate profile.</p></div>
        <div className="hiw-step"><span className="hiw-num">02</span><h3>Add a job</h3><p>Paste a URL or job description to extract requirements.</p></div>
        <div className="hiw-step"><span className="hiw-num">03</span><h3>Analyze your match</h3><p>Get a clear score breakdown across skills and experience.</p></div>
        <div className="hiw-step"><span className="hiw-num">04</span><h3>Improve &amp; prepare</h3><p>Actionable skill gaps, resume tips, and interview prep.</p></div>
      </div>
      <div className="hiw-cta"><button className="btn secondary" onClick={() => setPage("how-it-works")}>Learn More →</button></div>
    </section>
  </div>;
}

/* ─── DEMO DASHBOARD ─── */
function DemoDashboard({ data, setPage, selectJob, setSelectedAppId }: { data: any; setPage: (p: Page) => void; selectJob: (id: string) => void; setSelectedAppId: (id: string | null) => void }) {
  const { stats, jobs, analyses, latest } = data;
  const topJobs = analyses.slice(0, 3);

  return <>
    <PageHeader title="Career Dashboard" subtitle="Your personalized career intelligence overview." />
    {/* Summary Cards */}
    <div className="stats-grid">
      <div className="stat-card"><span className="stat-icon">▣</span><div className="stat-value">{stats.jobsAnalyzed}</div><div className="stat-label">Jobs Analyzed</div></div>
      <div className="stat-card"><span className="stat-icon">◎</span><div className="stat-value">{stats.averageMatch}%</div><div className="stat-label">Average Match</div></div>
      <div className="stat-card accent"><span className="stat-icon">★</span><div className="stat-value">{stats.strongMatches}</div><div className="stat-label">Strong Matches</div></div>
      <div className="stat-card"><span className="stat-icon">△</span><div className="stat-value">{stats.skillGaps}</div><div className="stat-label">Skill Gaps Found</div></div>
    </div>

    {/* Recommended Jobs */}
    <section className="recommended-section">
      <div className="section-heading"><h2>Recommended for You</h2><button className="text-btn" onClick={() => setPage("jobs")}>View All Jobs →</button></div>
      <div className="rec-jobs-grid">
        {topJobs.map((analysis: DemoAnalysis) => {
          const job = jobs.find((j: DemoJob) => j.id === analysis.job_id);
          const recLabel = getRecommendationLabel(analysis.recommendation);
          const recClass = getRecommendationClass(analysis.recommendation);
          return <div key={analysis.id} className="rec-job-card" onClick={() => { selectJob(analysis.job_id); setPage("analysis"); }}>
            <div className="rec-job-top">
              <div className="rec-job-company"><span className="company-logo">✦</span><div><strong>{analysis.company_name}</strong><small>{analysis.location}</small></div></div>
              <span className={`rec-score ${recClass}`}>{analysis.overall_score}%</span>
            </div>
            <h3>{analysis.job_title}</h3>
            <div className="rec-job-skills">
              {analysis.strengths.slice(0, 4).map(s => <span key={s} className="skill-tag">{s}</span>)}
            </div>
            <div className="rec-job-bottom">
              <span className={`rec-badge ${recClass}`}>{recLabel}</span>
              <button className="text-btn">View Analysis →</button>
            </div>
          </div>;
        })}
      </div>
    </section>

    {/* Recent Activity */}
    <section className="recent-section">
      <div className="section-heading"><h2>Recent Activity</h2><button className="text-btn" onClick={() => setPage("history")}>View History →</button></div>
      <Card>
        <div className="activity-list">
          {analyses.slice(0, 4).map((a: DemoAnalysis) => {
            const date = new Date(a.date);
            return <div key={a.id} className="activity-item" onClick={() => { selectJob(a.job_id); setPage("analysis"); }}>
              <span className="company-logo small">✦</span>
              <div className="activity-info"><strong>{a.job_title}</strong><small>{a.company_name} · {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</small></div>
              <span className={`activity-score ${getRecommendationClass(a.recommendation)}`}>{a.overall_score}%</span>
              <span className={`rec-badge small ${getRecommendationClass(a.recommendation)}`}>{getRecommendationLabel(a.recommendation)}</span>
            </div>;
          })}
        </div>
      </Card>
    </section>

    {/* Recent Applications */}
    <section className="recent-section">
      <div className="section-heading"><h2>Recent Applications</h2><button className="text-btn" onClick={() => setPage("applications")}>View All Applications →</button></div>
      <Card>
        <div className="activity-list">
          {data.applications.slice(0, 3).map((app: DemoApplication) => {
            const statusConf = STATUS_CONFIG[app.status];
            return <div key={app.id} className="activity-item" onClick={() => { setSelectedAppId(app.id); setPage("application-detail"); }}>
              <span className="company-logo small">✦</span>
              <div className="activity-info"><strong>{app.title}</strong><small>{app.company} · {app.appliedDate ? new Date(app.appliedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Saved'}</small></div>
              <span className={`activity-score ${app.matchScore >= 80 ? 'green' : app.matchScore >= 60 ? 'orange' : ''}`}>{app.matchScore}%</span>
              <span className={`app-status-badge ${statusConf.className}`}>{statusConf.label}</span>
            </div>;
          })}
        </div>
      </Card>
    </section>

    {/* Career Snapshot — Demo Only */}
    <section className="career-snapshot-section">
      <div className="section-heading"><h2>Career Snapshot</h2></div>
      <p className="career-snapshot-subtitle">A quick look at your current career profile.</p>
      <div className="snapshot-stats-grid">
        <div className="snapshot-stat-card"><span className="snapshot-stat-value">{demoCareerSnapshot.averageMatch}%</span><span className="snapshot-stat-label">Average Match</span><span className="snapshot-stat-desc">Average match across analyzed jobs.</span></div>
        <div className="snapshot-stat-card"><span className="snapshot-stat-value">{demoCareerSnapshot.jobsAnalyzed}</span><span className="snapshot-stat-label">Jobs Analyzed</span><span className="snapshot-stat-desc">Opportunities evaluated.</span></div>
        <div className="snapshot-stat-card"><span className="snapshot-stat-value">{demoCareerSnapshot.strongMatches}</span><span className="snapshot-stat-label">Strong Matches</span><span className="snapshot-stat-desc">Jobs worth prioritizing.</span></div>
        <div className="snapshot-stat-card"><span className="snapshot-stat-value">{demoCareerSnapshot.skillGaps}</span><span className="snapshot-stat-label">Skill Gaps</span><span className="snapshot-stat-desc">Skills appearing across target roles.</span></div>
      </div>
      <Card className="snapshot-skills-card">
        <div className="snapshot-skills-row">
          <div className="snapshot-skills-block">
            <h4>Your Strongest Skills</h4>
            <div className="skill-chips green-chips">{demoCareerSnapshot.strongestSkills.map(s => <span key={s}>{s}</span>)}</div>
          </div>
          <div className="snapshot-skills-block">
            <h4>Skills To Develop</h4>
            <div className="skill-chips orange-chips">{demoCareerSnapshot.skillsToDevelop.map(s => <span key={s}>{s}</span>)}</div>
          </div>
        </div>
        <div className="snapshot-focus">
          <h4>Career Focus</h4>
          <p className="snapshot-focus-title">{demoCareerSnapshot.careerFocus}</p>
          <p className="snapshot-focus-desc">{demoCareerSnapshot.description}</p>
        </div>
      </Card>
    </section>
  </>;
}

/* ─── DEMO RESUME PAGE ─── */
function DemoResumePage({ data }: { data: any }) {
  const { resume } = data;
  return <>
    <PageHeader title="Your Resume" subtitle="Your structured candidate profile powering smarter job matches." />
    <Card className="resume-profile-card">
      <div className="profile-header">
        <span className="avatar large">AC</span>
        <div>
          <h2>{resume.data.name}</h2>
          <p className="profile-role">{resume.target_role}</p>
          <p className="profile-location">📍 {resume.data.location}</p>
        </div>
      </div>
    </Card>
    <div className="profile-stack">
      <InfoSection icon="⌘" title="Technical Skills">
        <div className="skill-chips">{resume.data.hard_skills.map((s: string) => <span key={s}>{s}</span>)}</div>
      </InfoSection>
      <InfoSection icon="▣" title="Experience">
        {resume.data.work_experience.map((exp: any, i: number) => <Timeline key={i} title={exp.role} meta={`${exp.company} · ${exp.duration}`} text={exp.responsibilities.join(". ")} />)}
      </InfoSection>
      <InfoSection icon="◇" title="Education">
        {resume.data.education.map((edu: any, i: number) => <div key={i}><strong>{edu.degree}</strong><p>{edu.institution}</p></div>)}
      </InfoSection>
      <InfoSection icon="★" title="Certifications">
        <div className="skill-chips">{resume.data.certifications.map((c: string) => <span key={c}>{c}</span>)}</div>
      </InfoSection>
      <InfoSection icon="⚙" title="Projects">
        <ul className="project-list">{resume.data.projects.map((p: string, i: number) => <li key={i}>{p}</li>)}</ul>
      </InfoSection>
      <Card className="career-snapshot">
        <h3>Career Snapshot</h3>
        <div className="snapshot-grid">
          <div><h4>Strongest Skills</h4><div className="skill-chips green-chips">{resume.strongest_skills.map((s: string) => <span key={s}>{s}</span>)}</div></div>
          <div><h4>Skills to Develop</h4><div className="skill-chips orange-chips">{resume.skills_to_develop.map((s: string) => <span key={s}>{s}</span>)}</div></div>
        </div>
      </Card>
    </div>
  </>;
}

/* ─── DEMO JOBS PAGE ─── */
function DemoJobsPage({ data, selectJob, setPage }: { data: any; selectJob: (id: string) => void; setPage: (p: Page) => void }) {
  const { jobs, analyses } = data;
  return <>
    <PageHeader title="Job Opportunities" subtitle={`${jobs.length} opportunities analyzed against your resume.`} />
    <div className="demo-jobs-grid">
      {jobs.map((job: DemoJob) => {
        const analysis = analyses.find((a: DemoAnalysis) => a.job_id === job.id);
        const score = analysis?.overall_score || 0;
        const rec = analysis?.recommendation || "review";
        const recLabel = getRecommendationLabel(rec);
        const recClass = getRecommendationClass(rec);
        return <div key={job.id} className="demo-job-card" onClick={() => { selectJob(job.id); setPage("analysis"); }}>
          <div className="djc-header">
            <div><span className="company-logo">✦</span></div>
            <div className="djc-info"><strong>{job.job_title}</strong><small>{job.company_name}</small><small className="djc-loc">📍 {job.location} · {job.remote_status}</small></div>
            <div className="djc-score-wrap"><span className={`djc-score ${recClass}`}>{score}%</span><span className={`rec-badge ${recClass}`}>{recLabel}</span></div>
          </div>
          <div className="djc-skills">
            {job.required_skills.slice(0, 5).map(s => <span key={s} className="skill-tag small">{s}</span>)}
            {job.required_skills.length > 5 && <span className="skill-tag small muted">+{job.required_skills.length - 5}</span>}
          </div>
          <div className="djc-footer">
            <span className="djc-exp">{job.experience_level}</span>
            {job.salary_range && <span className="djc-salary">{job.salary_range}</span>}
            <button className="text-btn">View Analysis →</button>
          </div>
        </div>;
      })}
    </div>
  </>;
}

/* ─── DEMO ANALYSIS PAGE ─── */
function DemoAnalysisPage({ analysis, data, setPage, selectJob }: { analysis: DemoAnalysis | null; data: any; setPage: (p: Page) => void; selectJob: (id: string) => void }) {
  if (!analysis) {
    // Show latest by default
    const a = data.latest;
    return <DemoAnalysisContent analysis={a} data={data} setPage={setPage} selectJob={selectJob} />;
  }
  return <DemoAnalysisContent analysis={analysis} data={data} setPage={setPage} selectJob={selectJob} />;
}

function DemoAnalysisContent({ analysis, data, setPage, selectJob }: { analysis: DemoAnalysis; data: any; setPage: (p: Page) => void; selectJob: (id: string) => void }) {
  const [showDemoComparison, setShowDemoComparison] = useState(false);
  const recLabel = getRecommendationLabel(analysis.recommendation);
  const recClass = getRecommendationClass(analysis.recommendation);
  const scoreColor = analysis.overall_score >= 80 ? "var(--green)" : analysis.overall_score >= 60 ? "var(--orange)" : "var(--primary)";
  const existingApp = data.getApplicationByJobId ? data.getApplicationByJobId(analysis.job_id) : null;

  return <>
    <PageHeader title="Job Match Analysis" subtitle="Detailed analysis of your resume against this opportunity.">
      <div className="header-actions">
        <button className="btn secondary small-btn" onClick={() => setPage("jobs")}>← All Jobs</button>
        {existingApp ? <button className="btn primary small-btn" onClick={() => setPage("applications")}>◈ View Application</button> : <button className="btn primary small-btn" onClick={() => setPage("applications")}>◈ Save Application</button>}
      </div>
    </PageHeader>

    {/* Hero */}
    <Card className="analysis-hero">
      <div className="candidate"><span className="avatar">AC</span><div><small>CANDIDATE</small><strong>{data.resume.data.name}</strong><span>{data.resume.target_role}</span></div></div>
      <div className="analysis-score" style={{ borderColor: scoreColor }}><strong style={{ color: scoreColor }}>{analysis.overall_score}%</strong><span>Match Score</span></div>
      <div className="role"><div><small>OPPORTUNITY</small><strong>{analysis.job_title}</strong><span>{analysis.company_name} · {analysis.location}</span></div><b className={recClass === "green" ? "" : "warning"}>{recLabel}</b></div>
    </Card>

    {/* Demo Re-Analyze Action */}
    {!showDemoComparison && (
      <div className="reanalyze-action">
        <button className="btn secondary small-btn" onClick={() => setShowDemoComparison(true)}>↻ Re-analyze with another resume</button>
      </div>
    )}

    {/* Demo Comparison */}
    {showDemoComparison && <DemoComparisonCard onDismiss={() => setShowDemoComparison(false)} />}

    {/* Score Breakdown */}
    <Card className="score-breakdown">
      <h3>📊 Score Breakdown</h3>
      <div className="breakdown-grid">
        {Object.entries(analysis.score_breakdown).map(([key, value]) => {
          const score = value as number;
          const barColor = score >= 80 ? 'var(--green)' : score >= 60 ? 'var(--orange)' : 'var(--primary)';
          return <div key={key} className="breakdown-item">
            <span className="breakdown-label">{key.replace(/_/g, ' ')}</span>
            <div className="breakdown-bar"><div className="breakdown-fill" style={{ width: `${score}%`, background: barColor }}></div></div>
            <span className="breakdown-value" style={{ color: barColor }}>{score}%</span>
          </div>;
        })}
      </div>
    </Card>

    {/* AI Summary */}
    <Card className="analysis-summary-card">
      <h3>📋 AI Summary</h3>
      <p className="analysis-summary-text">{analysis.summary}</p>
      <div className={`recommendation-banner ${recClass === "green" ? "success" : "warning"}`}>
        <span className="rec-icon">{recClass === "green" ? "✓" : "⚠"}</span>
        <div><strong>Recommendation: {recLabel}</strong><p>{analysis.application_recommendation.reason}</p></div>
      </div>
    </Card>

    {/* Grid sections */}
    <div className="analysis-sections">
      {/* Why You Match */}
      <Card className="analysis-section-card scrollable">
        <h3><span className="card-icon green">✓</span> Why You Match</h3>
        <ul className="section-list">{analysis.why_you_match.map((r, i) => <li key={i}>{r}</li>)}</ul>
      </Card>

      {/* Skill Gaps */}
      <Card className="analysis-section-card scrollable">
        <h3><span className="card-icon orange">△</span> Skill Gaps</h3>
        <div className="skill-gap-list">
          {analysis.skill_gaps.map((gap, i) => <div key={i} className="skill-gap-item">
            <div className="sg-header"><span className="sg-skill">{gap.skill}</span><span className={`sg-importance ${gap.importance}`}>{gap.importance === 'required' ? '🔴 Required' : '🟡 Preferred'}</span></div>
            <p className="sg-reason">{gap.reason}</p>
            <div className="sg-rec"><span>💡</span><span>{gap.recommendation}</span></div>
          </div>)}
        </div>
      </Card>

      {/* Matched Skills */}
      <Card className="analysis-section-card">
        <h3><span className="card-icon green">☆</span> Matched Skills</h3>
        <div className="matched-skills-grid">
          {analysis.strengths.map((s, i) => <span key={i} className="matched-skill">✓ {s}</span>)}
        </div>
      </Card>

      {/* Missing Skills */}
      <Card className="analysis-section-card">
        <h3><span className="card-icon orange">⚡</span> Missing Skills</h3>
        <div className="missing-skills-grid">
          {analysis.gaps.map((g, i) => <span key={i} className="missing-skill">● {g}</span>)}
        </div>
      </Card>

      {/* Resume Improvements */}
      <Card className="analysis-section-card full-width">
        <h3><span className="card-icon purple">✎</span> Resume Improvements</h3>
        <ul className="improvement-list">{analysis.resume_improvements.map((tip, i) => <li key={i}>{tip}</li>)}</ul>
      </Card>

      {/* Interview Preparation */}
      <Card className="analysis-section-card full-width">
        <h3>🎯 Interview Preparation</h3>
        <div className="interview-grid">
          {analysis.interview_focus.map((q, i) => <div key={i} className="interview-card"><span className="interview-num">{i + 1}</span><p>{q}</p></div>)}
        </div>
      </Card>
    </div>
  </>;
}

/* ─── DEMO HISTORY PAGE ─── */
function DemoHistoryPage({ data, selectJob, setPage, setSelectedAppId }: { data: any; selectJob: (id: string) => void; setPage: (p: Page) => void; setSelectedAppId: (id: string | null) => void }) {
  const { history } = data;
  return <>
    <PageHeader title="Application History" subtitle={`${history.length} analyses completed.`} />
    <Card className="history-table">
      <div className="history-head"><span>Date</span><span>Opportunity</span><span>Score</span><span>Action</span></div>
      {history.map((entry: any) => {
        const date = new Date(entry.date);
        const recLabel = getRecommendationLabel(entry.recommendation);
        const recClass = getRecommendationClass(entry.recommendation);
        const app = data.getApplicationByJobId ? data.getApplicationByJobId(entry.job_id) : null;
        return <div className="history-row" key={entry.id}>
          <span><strong>{date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</strong><small>{date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</small></span>
          <span><strong>{entry.job_title}</strong><small>{entry.company_name} · {entry.location}</small></span>
          <span><b className={`history-score-val ${recClass}`}>{entry.overall_score}%</b><small className={recClass}>{recLabel}</small></span>
          <span className="history-actions">
            <button className="btn secondary compact-btn" onClick={() => { selectJob(entry.job_id); setPage("analysis"); }}>View Analysis →</button>
            {app && <button className="btn primary compact-btn" onClick={() => { setSelectedAppId(app.id); setPage("application-detail"); }}>View Application</button>}
          </span>
        </div>;
      })}
    </Card>
  </>;
}

/* ─── ANALYTICS PAGE (Live Mode) ─── */
function AnalyticsPage({ setPage }: { setPage: (p: Page) => void }) {
  const history = getHistory();

  // If no history, show empty state
  if (history.length === 0) {
    return <>
      <PageHeader title="Application Analytics" subtitle="Your career analytics will appear here." />
      <Card className="analytics-empty">
        <div className="empty-illustration"><span>◈</span></div>
        <h2>No analytics yet.</h2>
        <p>Once you analyze and save a few applications, IntelliApply will show your application patterns, match performance and common skill gaps.</p>
        <button className="btn primary" onClick={() => setPage("jobs")}>Explore Jobs</button>
      </Card>
    </>;
  }

  // Derive analytics from history
  const totalApplications = history.length;
  const scores = history.map(h => h.overall_score);
  const averageMatch = Math.round(scores.reduce((s, v) => s + v, 0) / scores.length);
  const strong = scores.filter(s => s >= 80).length;
  const moderate = scores.filter(s => s >= 60 && s < 80).length;
  const low = scores.filter(s => s < 60).length;

  // Derive skill gaps from analysis data
  const allGaps: string[] = [];
  history.forEach(h => {
    const gaps = h.analysisData?.match?.gaps || [];
    gaps.forEach((g: any) => { allGaps.push(typeof g === 'string' ? g : (g?.skill || '')); });
    const aiGaps = h.analysisData?.ai_insights?.skill_gaps || [];
    aiGaps.forEach((g: any) => { if (g?.skill) allGaps.push(g.skill); });
  });
  const gapCounts: Record<string, number> = {};
  allGaps.filter(Boolean).forEach(g => { gapCounts[g] = (gapCounts[g] || 0) + 1; });
  const commonSkillGaps = Object.entries(gapCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([skill, count]) => ({ skill, count }));

  // Simple insights
  const strongApps = history.filter(h => h.overall_score >= 80);
  const strongAvg = strongApps.length > 0 ? Math.round(strongApps.reduce((s, h) => s + h.overall_score, 0) / strongApps.length) : 0;
  const insights: string[] = [];
  if (strongApps.length > 0) insights.push(`Your strongest applications have an average match of ${strongAvg}%.`);
  if (commonSkillGaps.length > 0) insights.push(`${commonSkillGaps[0].skill} is currently your most common skill gap.`);
  insights.push(`You have analyzed ${totalApplications} application${totalApplications > 1 ? 's' : ''} so far.`);

  return <>
    <PageHeader title="Application Analytics" subtitle="Insights derived from your application history." />

    {/* Summary Cards */}
    <div className="analytics-summary-grid">
      <div className="analytics-stat-card"><span className="analytics-stat-icon">▣</span><div className="analytics-stat-value">{totalApplications}</div><div className="analytics-stat-label">Total Applications</div></div>
      <div className="analytics-stat-card"><span className="analytics-stat-icon">◎</span><div className="analytics-stat-value">{averageMatch}%</div><div className="analytics-stat-label">Average Match</div></div>
      <div className="analytics-stat-card accent"><span className="analytics-stat-icon">★</span><div className="analytics-stat-value">{strong}</div><div className="analytics-stat-label">Strong Matches</div></div>
      <div className="analytics-stat-card"><span className="analytics-stat-icon">△</span><div className="analytics-stat-value">{commonSkillGaps.length}</div><div className="analytics-stat-label">Skill Gaps Found</div></div>
    </div>

    {/* Match Performance */}
    <Card className="analytics-section">
      <h3>Match Performance</h3>
      <div className="analytics-performance-grid">
        <div className="perf-item"><span className="perf-label">Strong (80–100)</span><div className="perf-bar"><div className="perf-fill green" style={{ width: `${totalApplications > 0 ? (strong / totalApplications) * 100 : 0}%` }}></div></div><span className="perf-count">{strong}</span></div>
        <div className="perf-item"><span className="perf-label">Moderate (60–79)</span><div className="perf-bar"><div className="perf-fill orange" style={{ width: `${totalApplications > 0 ? (moderate / totalApplications) * 100 : 0}%` }}></div></div><span className="perf-count">{moderate}</span></div>
        <div className="perf-item"><span className="perf-label">Low (0–59)</span><div className="perf-bar"><div className="perf-fill red" style={{ width: `${totalApplications > 0 ? (low / totalApplications) * 100 : 0}%` }}></div></div><span className="perf-count">{low}</span></div>
      </div>
    </Card>

    {/* Common Skill Gaps */}
    {commonSkillGaps.length > 0 && <Card className="analytics-section">
      <h3>Most Common Skill Gaps</h3>
      <div className="analytics-skill-gaps">
        {commonSkillGaps.map(({ skill, count }) => (
          <div key={skill} className="skill-gap-row">
            <span className="skill-gap-name">{skill}</span>
            <div className="skill-gap-bar"><div className="skill-gap-fill" style={{ width: `${(count / commonSkillGaps[0].count) * 100}%` }}></div></div>
            <span className="skill-gap-count">{count} {count === 1 ? 'job' : 'jobs'}</span>
          </div>
        ))}
      </div>
    </Card>}

    {/* Application Insights */}
    {insights.length > 0 && <Card className="analytics-section">
      <h3>Application Insights</h3>
      <ul className="analytics-insights-list">
        {insights.map((insight, i) => <li key={i}><span className="insight-icon">💡</span>{insight}</li>)}
      </ul>
    </Card>}
  </>;
}

/* ─── DEMO ANALYTICS PAGE ─── */
function DemoAnalyticsPage({ setPage }: { setPage: (p: Page) => void }) {
  const data = demoAnalytics;
  const totalStatus = data.statusBreakdown.saved + data.statusBreakdown.applied + data.statusBreakdown.screening + data.statusBreakdown.interview + data.statusBreakdown.offer;
  const totalPerf = data.matchPerformance.strong + data.matchPerformance.moderate + data.matchPerformance.low;

  return <>
    <PageHeader title="Application Analytics" subtitle="Your career patterns and application insights." />

    {/* Summary Cards */}
    <div className="analytics-summary-grid">
      <div className="analytics-stat-card"><span className="analytics-stat-icon">▣</span><div className="analytics-stat-value">{data.totalApplications}</div><div className="analytics-stat-label">Total Applications</div></div>
      <div className="analytics-stat-card"><span className="analytics-stat-icon">🎤</span><div className="analytics-stat-value">{data.interviews}</div><div className="analytics-stat-label">Interviews</div></div>
      <div className="analytics-stat-card accent"><span className="analytics-stat-icon">◎</span><div className="analytics-stat-value">{data.averageMatch}%</div><div className="analytics-stat-label">Average Match</div></div>
      <div className="analytics-stat-card"><span className="analytics-stat-icon">↗</span><div className="analytics-stat-value">{data.interviewRate}%</div><div className="analytics-stat-label">Interview Rate</div></div>
    </div>

    {/* Application Status Breakdown */}
    <Card className="analytics-section">
      <h3>Application Status</h3>
      <div className="analytics-status-breakdown">
        {Object.entries(data.statusBreakdown).map(([status, count]) => (
          <div key={status} className="status-row">
            <span className="status-label">{status.charAt(0).toUpperCase() + status.slice(1)}</span>
            <div className="status-bar"><div className={`status-fill status-${status}`} style={{ width: `${totalStatus > 0 ? (count / totalStatus) * 100 : 0}%` }}></div></div>
            <span className="status-count">{count}</span>
          </div>
        ))}
      </div>
    </Card>

    {/* Match Performance */}
    <Card className="analytics-section">
      <h3>Match Performance</h3>
      <p className="analytics-section-subtitle">Average Match: <strong>{data.averageMatch}%</strong></p>
      <div className="analytics-performance-grid">
        <div className="perf-item"><span className="perf-label">Strong (80–100)</span><div className="perf-bar"><div className="perf-fill green" style={{ width: `${totalPerf > 0 ? (data.matchPerformance.strong / totalPerf) * 100 : 0}%` }}></div></div><span className="perf-count">{data.matchPerformance.strong}</span></div>
        <div className="perf-item"><span className="perf-label">Moderate (60–79)</span><div className="perf-bar"><div className="perf-fill orange" style={{ width: `${totalPerf > 0 ? (data.matchPerformance.moderate / totalPerf) * 100 : 0}%` }}></div></div><span className="perf-count">{data.matchPerformance.moderate}</span></div>
        <div className="perf-item"><span className="perf-label">Low (0–59)</span><div className="perf-bar"><div className="perf-fill red" style={{ width: `${totalPerf > 0 ? (data.matchPerformance.low / totalPerf) * 100 : 0}%` }}></div></div><span className="perf-count">{data.matchPerformance.low}</span></div>
      </div>
    </Card>

    {/* Common Skill Gaps */}
    <Card className="analytics-section">
      <h3>Most Common Skill Gaps</h3>
      <div className="analytics-skill-gaps">
        {data.commonSkillGaps.map(({ skill, count }) => (
          <div key={skill} className="skill-gap-row">
            <span className="skill-gap-name">{skill}</span>
            <div className="skill-gap-bar"><div className="skill-gap-fill" style={{ width: `${(count / data.commonSkillGaps[0].count) * 100}%` }}></div></div>
            <span className="skill-gap-count">{count} jobs</span>
          </div>
        ))}
      </div>
    </Card>

    {/* Career Focus */}
    <Card className="analytics-section analytics-career-focus">
      <h3>Your Career Focus</h3>
      <p className="career-focus-title">{data.careerFocus}</p>
      <p className="career-focus-desc">{data.careerDescription}</p>
    </Card>

    {/* Application Insights */}
    <Card className="analytics-section">
      <h3>Application Insights</h3>
      <ul className="analytics-insights-list">
        {data.insights.map((insight, i) => <li key={i}><span className="insight-icon">💡</span>{insight}</li>)}
      </ul>
    </Card>
  </>;
}

/* ─── HOW IT WORKS PAGE ─── */
function HowItWorksPage({ setPage, isDemo, onDemo }: { setPage: (p: Page) => void; isDemo: boolean; onDemo: () => void }) {
  const steps = [
    { num: "01", title: "Upload your resume", desc: "One PDF creates your reusable candidate profile. We extract skills, experience, education, and certifications automatically." },
    { num: "02", title: "Add a job", desc: "Paste a job posting URL, description text, or upload a PDF. IntelliApply structures the requirements, skills, and responsibilities." },
    { num: "03", title: "Analyze your match", desc: "Our AI compares your profile against the job. You get a clear score breakdown across hard skills, soft skills, experience, and education." },
    { num: "04", title: "Understand your skill gaps", desc: "See exactly which required and preferred skills are missing, with actionable recommendations for each gap." },
    { num: "05", title: "Improve and prepare", desc: "Get tailored resume improvement suggestions and interview preparation questions specific to the role." },
  ];
  return <>
    <PageHeader title="How It Works" subtitle="Five steps to a smarter application." />
    <div className="hiw-page-steps">
      {steps.map(step => <div key={step.num} className="hiw-page-step">
        <span className="hiw-page-num">{step.num}</span>
        <div><h3>{step.title}</h3><p>{step.desc}</p></div>
      </div>)}
    </div>
    <div className="hiw-page-cta">
      {!isDemo && <button className="btn primary" onClick={onDemo}>▷ Try the Demo</button>}
      <button className="btn secondary" onClick={() => setPage("landing")}>← Back Home</button>
    </div>
  </>;
}

/* ─── ABOUT PAGE ─── */
function AboutPage({ setPage }: { setPage: (p: Page) => void }) {
  return <>
    <PageHeader title="About" subtitle="Learn about IntelliApply and why we built it." />

    {/* Hero */}
    <section className="about-hero-section">
      <h2>Why IntelliApply?</h2>
      <p className="about-subtitle">The job search shouldn't feel like a full-time job.</p>
      <p className="about-supporting">IntelliApply was built to make the process of finding, understanding, and preparing for the right opportunities simpler.</p>
    </section>

    {/* The Problem */}
    <Card className="about-section-card">
      <h3>Finding a job is more than submitting a resume.</h3>
      <p>When we were applying for internships and co-op opportunities, every application meant doing the same work over and over again:</p>
      <ul className="about-list">
        <li>Read the job description.</li>
        <li>Compare it with the resume.</li>
        <li>Figure out which skills actually match.</li>
        <li>Identify what's missing.</li>
        <li>Research the company.</li>
        <li>Decide whether the opportunity is worth applying to.</li>
        <li>Then prepare the resume and interview.</li>
      </ul>
      <p>And often, that meant jumping between multiple platforms to get everything done.</p>
      <p>There are already great tools that solve parts of this problem, but many are built around a single use case or place their most useful features behind paid subscriptions.</p>
      <p>We thought there had to be a better way.</p>
    </Card>

    {/* The Idea */}
    <Card className="about-section-card">
      <h3>That's where IntelliApply started.</h3>
      <p>Instead of building another tool that solves only one part of the job search, we wanted to bring the important pieces together in one place.</p>
      <p>IntelliApply takes your resume and a job opportunity and helps you understand the entire picture.</p>
      <div className="about-value-questions">
        <div className="about-question-block">
          <span className="about-q-label">Not just:</span>
          <span className="about-q-text">"What's my match score?"</span>
        </div>
        <div className="about-answer-block">
          <span className="about-a-label">But:</span>
          <div className="about-answers">
            <span>"Why am I a match?"</span>
            <span>"What am I missing?"</span>
            <span>"What should I improve?"</span>
            <span>"Is this opportunity worth pursuing?"</span>
            <span>"How should I prepare?"</span>
          </div>
        </div>
      </div>
    </Card>

    {/* What IntelliApply Does */}
    <section className="about-features-section">
      <h2>One platform. One career profile. One place to prepare.</h2>
      <div className="about-features-grid">
        <div className="about-feature-card"><span className="about-feature-icon">▤</span><h4>Resume Intelligence</h4><p>Understand your experience, skills, education and strengths.</p></div>
        <div className="about-feature-card"><span className="about-feature-icon">▣</span><h4>Job Intelligence</h4><p>Break down job descriptions into the skills and requirements that actually matter.</p></div>
        <div className="about-feature-card"><span className="about-feature-icon">◎</span><h4>Smart Matching</h4><p>Compare your resume with a specific opportunity and understand how well your experience aligns.</p></div>
        <div className="about-feature-card"><span className="about-feature-icon">△</span><h4>Skill Gap Insights</h4><p>Identify the skills you're missing and the areas that could make you a stronger candidate.</p></div>
        <div className="about-feature-card"><span className="about-feature-icon">↗</span><h4>Application & Interview Guidance</h4><p>Get practical recommendations for improving your resume, positioning yourself for the role and preparing for interviews.</p></div>
      </div>
    </section>

    {/* Our Approach */}
    <Card className="about-section-card">
      <h3>AI that supports your decisions.</h3>
      <p>We don't believe AI should make every decision for you.</p>
      <p>IntelliApply combines structured data and deterministic matching with AI-powered insights.</p>
      <p>The match score is based on the information extracted from your resume and the job requirements, while AI helps explain the results and turn them into useful recommendations.</p>
      <p>The goal isn't to replace your judgment.</p>
      <p className="about-highlight">It's to give you better information to make that judgment.</p>
    </Card>

    {/* Our Mission */}
    <Card className="about-section-card about-mission">
      <h3>Our Mission</h3>
      <p className="about-mission-text">Make the job search less about guessing and more about making informed decisions.</p>
      <p>We want people to spend less time switching between tools and more time focusing on opportunities that genuinely fit their skills and goals.</p>
    </Card>

    {/* How It Works */}
    <section className="about-how-section">
      <h2>How It Works</h2>
      <div className="about-steps">
        <div className="about-step"><span className="about-step-num">01</span><div><h4>Upload Your Resume</h4><p>We analyze your experience, education and skills.</p></div></div>
        <div className="about-step"><span className="about-step-num">02</span><div><h4>Add a Job</h4><p>Provide a job opportunity you are considering.</p></div></div>
        <div className="about-step"><span className="about-step-num">03</span><div><h4>Analyze Your Match</h4><p>Compare your profile against the role's requirements.</p></div></div>
        <div className="about-step"><span className="about-step-num">04</span><div><h4>Understand Your Gaps</h4><p>See the skills and experience that could strengthen your application.</p></div></div>
        <div className="about-step"><span className="about-step-num">05</span><div><h4>Apply With Confidence</h4><p>Use personalized insights to make a better application decision.</p></div></div>
      </div>
    </section>

    {/* CTA */}
    <section className="about-cta-section">
      <h2>Your next opportunity starts with understanding where you stand.</h2>
      <p className="about-cta-sub">{projectConfig.tagline}</p>
      <button className="btn primary" onClick={() => setPage("landing")}>Try IntelliApply</button>
    </section>
  </>;
}

/* ─── FOOTER ─── */
function Footer({ setPage, isDemo, onDemo }: { setPage: (p: Page) => void; isDemo: boolean; onDemo: () => void }) {
  return <footer className="app-footer">
    <div className="footer-grid">
      <div className="footer-brand">
        <span className="brand"><span className="brand-mark">✦</span><span>Intelli<span>Apply</span></span></span>
        <p>{projectConfig.supportingTagline}</p>
      </div>
      <div className="footer-col">
        <h4>Product</h4>
        <button onClick={() => setPage("landing")}>Dashboard</button>
        <button onClick={() => setPage("resume")}>Resume</button>
        <button onClick={() => setPage("jobs")}>Jobs</button>
        <button onClick={() => setPage("applications")}>Applications</button>
        <button onClick={() => setPage("analysis")}>Analysis</button>
        <button onClick={() => setPage("history")}>History</button>
        <button onClick={() => setPage("analytics")}>Analytics</button>
      </div>
      <div className="footer-col">
        <h4>Resources</h4>
        <button onClick={() => setPage("how-it-works")}>How It Works</button>
        <button onClick={onDemo}>Demo</button>
        {projectConfig.social.documentation && <a href={projectConfig.social.documentation} target="_blank" rel="noopener noreferrer">Documentation</a>}
      </div>
      <div className="footer-col">
        <h4>Company</h4>
        <button onClick={() => setPage("about")}>About</button>
        <button onClick={() => setPage("team")}>Team</button>
        {projectConfig.social.contact && <a href={projectConfig.social.contact} target="_blank" rel="noopener noreferrer">Contact</a>}
      </div>
      <div className="footer-col">
        <h4>Connect</h4>
        {projectConfig.social.github && <a href={projectConfig.social.github} target="_blank" rel="noopener noreferrer">GitHub</a>}
        {projectConfig.social.linkedin && <a href={projectConfig.social.linkedin} target="_blank" rel="noopener noreferrer">LinkedIn</a>}
      </div>
      <div className="footer-col">
        <h4>Legal</h4>
        <button className="footer-legal-link" aria-label="Privacy policy (coming soon)">Privacy</button>
        <button className="footer-legal-link" aria-label="Terms of service (coming soon)">Terms</button>
        <button className="footer-legal-link footer-ai-disclaimer-link" aria-label="AI Disclaimer">AI Disclaimer</button>
      </div>
    </div>
    <div className="footer-disclaimer">
      <p>{projectConfig.legal.aiDisclaimer}</p>
    </div>
    <div className="footer-bottom">
      <span>© {projectConfig.year} IntelliApply</span>
      <span>Built for the {projectConfig.event}</span>
      <span>Built by Team IntelliApply</span>
    </div>
  </footer>;
}

/* ─── TEAM PAGE ─── */
function TeamPage({ setPage }: { setPage: (p: Page) => void }) {
  return <>
    <PageHeader title="Meet the Team" subtitle="Built by a small team solving a problem we've experienced ourselves." />
    <div className="team-grid">
      {projectConfig.team.map((member) => (
        <div key={member.name} className="team-card">
          <div className="team-avatar">{member.image ? <img src={member.image} alt={member.name} /> : <span>{member.name.split(" ").map(n => n[0]).join("").slice(0, 2)}</span>}</div>
          <h3 className="team-name">{member.name}</h3>
          <p className="team-role">{member.role}</p>
          <p className="team-resp">{member.responsibilities}</p>
          <div className="team-links">
            {member.github && <a href={member.github} target="_blank" rel="noopener noreferrer" aria-label={`${member.name}'s GitHub`}>GitHub</a>}
            {member.linkedin && <a href={member.linkedin} target="_blank" rel="noopener noreferrer" aria-label={`${member.name}'s LinkedIn`}>LinkedIn</a>}
          </div>
        </div>
      ))}
    </div>
    <Card className="team-why-card">
      <h3>Why We Built IntelliApply</h3>
      <p>We experienced how fragmented and time-consuming the job application process can be.</p>
      <p>IntelliApply started from that experience and grew into an idea for bringing job matching, skill analysis, application guidance and interview preparation into one place.</p>
    </Card>
    <div className="about-cta"><button className="btn secondary" onClick={() => setPage("landing")}>← Back Home</button></div>
  </>;
}

/* ─── APPLICATION HUB PAGES ─── */

function ApplicationsEmptyPage({ setPage }: { setPage: (p: Page) => void }) {
  return <>
    <PageHeader title="Applications" subtitle="Your application workspace." />
    <Card className="analysis-empty">
      <div className="empty-illustration"><span>◈</span></div>
      <h2>No applications yet.</h2>
      <p>Save a job to keep your resume, job description, analysis and interview preparation together.</p>
      <button className="btn primary" onClick={() => setPage("jobs")}>Explore Jobs</button>
    </Card>
  </>;
}

function DemoApplicationsPage({ data, setPage, setSelectedAppId }: { data: any; setPage: (p: Page) => void; setSelectedAppId: (id: string | null) => void }) {
  const [filter, setFilter] = useState<ApplicationStatus | "ALL">("ALL");
  const apps: DemoApplication[] = data.applications;
  const filtered = filter === "ALL" ? apps : apps.filter((a: DemoApplication) => a.status === filter);

  return <>
    <PageHeader title="Applications" subtitle="Your application workspace — everything for every opportunity in one place." />

    {/* Filter tabs */}
    <div className="app-filter-tabs">
      <button className={filter === "ALL" ? "active" : ""} onClick={() => setFilter("ALL")}>All ({apps.length})</button>
      <button className={filter === "SAVED" ? "active" : ""} onClick={() => setFilter("SAVED")}>Saved</button>
      <button className={filter === "APPLIED" ? "active" : ""} onClick={() => setFilter("APPLIED")}>Applied</button>
      <button className={filter === "SCREENING" ? "active" : ""} onClick={() => setFilter("SCREENING")}>Screening</button>
      <button className={filter === "INTERVIEW" ? "active" : ""} onClick={() => setFilter("INTERVIEW")}>Interview</button>
      <button className={filter === "OFFER" ? "active" : ""} onClick={() => setFilter("OFFER")}>Offer</button>
      <button className={filter === "REJECTED" ? "active" : ""} onClick={() => setFilter("REJECTED")}>Rejected</button>
    </div>

    {/* Application cards */}
    {filtered.length === 0 && <Card className="analysis-empty"><h2>No applications with this status.</h2><p>Try a different filter or save more jobs.</p></Card>}

    <div className="app-list">
      {filtered.map((app: DemoApplication) => {
        const statusConf = STATUS_CONFIG[app.status];
        const scoreColor = app.matchScore >= 80 ? "green" : app.matchScore >= 60 ? "orange" : "";
        return <Card key={app.id} className="app-card">
          <div className="app-card-top">
            <div className="app-card-company">
              <span className="company-logo">✦</span>
              <div>
                <strong className="app-card-title">{app.title}</strong>
                <small className="app-card-company-name">{app.company} · {app.location}</small>
              </div>
            </div>
            <div className="app-card-meta">
              <span className={`app-card-score ${scoreColor}`}>{app.matchScore}%<small>Match</small></span>
            </div>
          </div>
          <div className="app-card-bottom">
            <div className="app-card-info">
              <span className={`app-status-badge ${statusConf.className}`}>{statusConf.label}</span>
              {app.appliedDate && <span className="app-card-date">Applied: {new Date(app.appliedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>}
              {app.interviewDate && <span className="app-card-date interview-date">Interview: {new Date(app.interviewDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>}
            </div>
            <button className="btn primary compact-btn" onClick={() => { setSelectedAppId(app.id); setPage("application-detail"); }}>Open Application →</button>
          </div>
        </Card>;
      })}
    </div>
  </>;
}

function DemoApplicationDetailPage({ data, appId, setPage, setSelectedAppId, selectJob }: { data: any; appId: string | null; setPage: (p: Page) => void; setSelectedAppId: (id: string | null) => void; selectJob: (id: string) => void }) {
  const app: DemoApplication | undefined = appId ? data.getApplication(appId) : undefined;
  const [status, setStatus] = useState<ApplicationStatus>(app?.status || "SAVED");
  const [notes, setNotes] = useState(app?.notes || "");
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [showCoverLetter, setShowCoverLetter] = useState(false);
  const [showJobDesc, setShowJobDesc] = useState(false);

  if (!app) {
    return <>
      <PageHeader title="Application" subtitle="Application not found.">
        <div className="header-actions"><button className="btn secondary small-btn" onClick={() => setPage("applications")}>← Back to Applications</button></div>
      </PageHeader>
      <Card className="analysis-empty"><h2>Application not found</h2><p>This application may have been removed.</p><button className="btn primary" onClick={() => setPage("applications")}>View All Applications</button></Card>
    </>;
  }

  const statusConf = STATUS_CONFIG[status];
  const scoreColor = app.matchScore >= 80 ? "var(--green)" : app.matchScore >= 60 ? "var(--orange)" : "var(--primary)";

  return <>
    <PageHeader title="Application Package" subtitle="Everything you need for this application, in one place.">
      <div className="header-actions"><button className="btn secondary small-btn" onClick={() => setPage("applications")}>← All Applications</button></div>
    </PageHeader>

    {/* Application Header */}
    <Card className="app-detail-header">
      <div className="app-detail-top">
        <div className="app-detail-company">
          <span className="company-logo large">✦</span>
          <div>
            <h2>{app.company}</h2>
            <p className="app-detail-role">{app.title}</p>
            <p className="app-detail-location">📍 {app.location}</p>
          </div>
        </div>
        <div className="app-detail-score" style={{ borderColor: scoreColor }}>
          <strong style={{ color: scoreColor }}>{app.matchScore}%</strong>
          <span>Match</span>
        </div>
      </div>
      <div className="app-detail-status-row">
        <div className="app-detail-status-wrap" style={{ position: 'relative' }}>
          <button className={`app-status-badge large ${statusConf.className}`} onClick={() => setShowStatusMenu(!showStatusMenu)}>● {statusConf.label} ▾</button>
          {showStatusMenu && <div className="app-status-dropdown">
            {APPLICATION_STATUSES.map(s => {
              const conf = STATUS_CONFIG[s];
              return <button key={s} className={`app-status-option ${s === status ? 'active' : ''}`} onClick={() => { setStatus(s); setShowStatusMenu(false); }}>{conf.label}</button>;
            })}
          </div>}
        </div>
        {app.appliedDate && <span className="app-detail-date">Applied {new Date(app.appliedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>}
        {app.interviewDate && <span className="app-detail-date interview-date">Interview {new Date(app.interviewDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>}
      </div>
      {status === "SAVED" && <button className="btn primary compact-btn" onClick={() => setStatus("APPLIED")} style={{ marginTop: '12px' }}>Mark as Applied</button>}
    </Card>

    {/* APPLICATION PACKAGE */}
    <section className="app-package-section">
      <h2 className="app-section-title">◈ Application Package</h2>
      <p className="app-section-subtitle">Everything you need for this application is here.</p>
      <div className="app-package-grid">
        {/* Resume */}
        <Card className="app-package-card">
          <div className="app-pkg-icon">▤</div>
          <h3>Resume</h3>
          <p>Resume used for this application</p>
          <span className="app-pkg-file">{app.resume.fileName}</span>
          <button className="btn secondary compact-btn" onClick={() => setPage("resume")}>View Resume</button>
        </Card>

        {/* Cover Letter */}
        <Card className="app-package-card">
          <div className="app-pkg-icon">✉</div>
          <h3>Cover Letter</h3>
          {app.coverLetter ? <>
            <p>Cover letter for this application</p>
            <span className="app-pkg-file">{app.coverLetter.title}</span>
            <button className="btn secondary compact-btn" onClick={() => setShowCoverLetter(true)}>View Cover Letter</button>
          </> : <>
            <p className="muted">No cover letter has been added yet.</p>
            <button className="btn secondary compact-btn" disabled>Add Cover Letter</button>
          </>}
        </Card>

        {/* Job Description */}
        <Card className="app-package-card">
          <div className="app-pkg-icon">▣</div>
          <h3>Job Description</h3>
          <p>Original job description used for analysis</p>
          <span className="app-pkg-file">{app.job.company_name} — {app.job.job_title}</span>
          <button className="btn secondary compact-btn" onClick={() => setShowJobDesc(true)}>View Job Description</button>
        </Card>

        {/* Match Analysis */}
        <Card className="app-package-card">
          <div className="app-pkg-icon">↗</div>
          <h3>Match Analysis</h3>
          <p>Your match analysis for this role</p>
          <span className="app-pkg-file" style={{ color: scoreColor, fontWeight: 700 }}>{app.matchScore}% Match</span>
          <button className="btn secondary compact-btn" onClick={() => { selectJob(app.jobId); setPage("analysis"); }}>View Analysis</button>
        </Card>

        {/* Interview Preparation */}
        <Card className="app-package-card">
          <div className="app-pkg-icon">🎯</div>
          <h3>Interview Preparation</h3>
          <p>{app.interviewPrep.technicalQuestions.length} technical, {app.interviewPrep.behavioralQuestions.length} behavioral questions</p>
          <span className="app-pkg-file">{app.interviewPrep.topicsToReview.length} topics to review</span>
          <button className="btn primary compact-btn" onClick={() => { selectJob(app.jobId); setPage("analysis"); }}>Start Preparation</button>
        </Card>
      </div>
    </section>

    {/* INTERVIEW PREPARATION PREVIEW */}
    <section className="app-interview-section">
      <h2 className="app-section-title">🎯 Prepare for Your Interview</h2>
      <div className="app-interview-grid">
        <Card className="app-interview-card">
          <h4>Technical Questions</h4>
          <ul className="app-interview-list">
            {app.interviewPrep.technicalQuestions.map((q, i) => <li key={i}>{q}</li>)}
          </ul>
        </Card>
        <Card className="app-interview-card">
          <h4>Behavioral Questions</h4>
          <ul className="app-interview-list">
            {app.interviewPrep.behavioralQuestions.map((q, i) => <li key={i}>{q}</li>)}
          </ul>
        </Card>
        <Card className="app-interview-card">
          <h4>Topics To Review</h4>
          <div className="skill-chips">{app.interviewPrep.topicsToReview.map(t => <span key={t}>{t}</span>)}</div>
        </Card>
      </div>
    </section>

    {/* APPLICATION TIMELINE */}
    <section className="app-timeline-section">
      <h2 className="app-section-title">◷ Application Timeline</h2>
      <div className="app-timeline">
        {app.timeline.map((event, i) => <div key={i} className="app-timeline-item">
          <span className="app-timeline-dot" />
          <div className="app-timeline-content">
            <strong>{new Date(event.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</strong>
            <span>{event.label}</span>
          </div>
        </div>)}
      </div>
    </section>

    {/* NOTES */}
    <section className="app-notes-section">
      <h2 className="app-section-title">📝 Notes</h2>
      <Card className="app-notes-card">
        <textarea
          className="app-notes-textarea"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Add personal notes about this application..."
          rows={4}
        />
      </Card>
    </section>

    {/* Cover Letter Modal */}
    {showCoverLetter && app.coverLetter && <div className="detail-overlay" role="dialog" aria-modal="true">
      <div className="detail-modal app-modal">
        <button className="demo-close" onClick={() => setShowCoverLetter(false)}>×</button>
        <h2>{app.coverLetter.title}</h2>
        <div className="app-cover-letter-content"><pre>{app.coverLetter.content}</pre></div>
      </div>
    </div>}

    {/* Job Description Modal */}
    {showJobDesc && <div className="detail-overlay" role="dialog" aria-modal="true">
      <div className="detail-modal app-modal">
        <button className="demo-close" onClick={() => setShowJobDesc(false)}>×</button>
        <h2>{app.job.company_name} — {app.job.job_title}</h2>
        <div className="app-job-desc-content">
          <div className="app-job-meta">
            <span>📍 {app.job.location} · {app.job.remote_status}</span>
            {app.job.experience_level && <span>📋 {app.job.experience_level}</span>}
            {app.job.salary_range && <span>💰 {app.job.salary_range}</span>}
          </div>
          <h4>Required Skills</h4>
          <div className="skill-chips">{app.job.required_skills.map(s => <span key={s}>{s}</span>)}</div>
          {app.job.preferred_skills.length > 0 && <><h4>Preferred Skills</h4><div className="skill-chips">{app.job.preferred_skills.map(s => <span key={s}>{s}</span>)}</div></>}
          <h4>Key Responsibilities</h4>
          <ul>{app.job.key_responsibilities.map((r, i) => <li key={i}>{r}</li>)}</ul>
        </div>
      </div>
    </div>}
  </>;
}

/* ─── EXISTING LIVE PAGES (preserved) ─── */

function ResumePage({ uploaded, parsing, resumeData, fileName, onUpload, goToJobs }: { uploaded: boolean; parsing: boolean; resumeData: ResumeData | null; fileName: string; onUpload: () => void; goToJobs: () => void }) {
  const skills = resumeData?.data?.hard_skills?.slice(0, 8) || [];
  const workExperience = resumeData?.data?.work_experience || [];
  const education = resumeData?.data?.education || [];

  return <>{uploaded ? <>
    <PageHeader title="Your Resume" subtitle="We structure your resume to power smarter job matches." />
    <Card className="resume-ready"><div className="file-summary"><div className="pdf-icon">PDF</div><div><strong>{fileName || "Candidate_Resume.pdf"}</strong><p className="success">✓ Successfully uploaded and parsed</p><small>Processed at: {resumeData?.extracted_at ? new Date(resumeData.extracted_at).toLocaleString() : 'Just now'}</small></div></div><div className="resume-ready-actions"><button className="btn secondary compact-btn" onClick={onUpload}>Replace Resume</button><button className="btn primary" onClick={goToJobs}>Continue to Add Job →</button></div></Card>
    <div className="next-step-banner"><span>2</span><div><strong>Your resume is ready. Now add the job you want to compare.</strong><p>Paste a job link or description, then IntelliApply can prepare a match analysis.</p></div><button className="btn primary compact-btn" onClick={goToJobs}>Add Job Details</button></div>
    <div className="profile-stack">
      <InfoSection icon="◎" title="Professional Summary">
        <p>Your resume has been successfully processed. Key skills and experience have been extracted for job matching.</p>
        {resumeData?.data?.keywords && resumeData.data.keywords.length > 0 && <p style={{marginTop:'8px',color:'var(--muted)',fontSize:'13px'}}>Key themes: {resumeData.data.keywords.join(", ")}</p>}
      </InfoSection>
      <InfoSection icon="⌘" title="Skills">
        <div className="skill-chips">{skills.length > 0 ? skills.map(s => <span key={s}>{s}</span>) : <p style={{color:'var(--muted)'}}>No skills extracted from resume</p>}</div>
        {resumeData?.data?.soft_skills && resumeData.data.soft_skills.length > 0 && <div style={{marginTop:'12px'}}><p style={{fontWeight:600,marginBottom:'8px'}}>Soft Skills:</p><div className="skill-chips">{resumeData.data.soft_skills.slice(0, 5).map(s => <span key={s}>{s}</span>)}</div></div>}
      </InfoSection>
      <InfoSection icon="▣" title="Experience">
        {workExperience.length > 0 ? workExperience.slice(0, 2).map((exp, i) => <Timeline key={i} title={exp.role || "Position"} meta={`${exp.company || "Company"} · ${exp.duration || "Duration"}`} text={exp.responsibilities.length > 0 ? exp.responsibilities.join(". ") : "Responsibilities extracted from resume"} />) : <p style={{color:'var(--muted)'}}>No work experience extracted</p>}
      </InfoSection>
      <InfoSection icon="◇" title="Education">
        {education.length > 0 ? education.map((edu, i) => <div key={i}><strong>{edu.degree || "Degree"}</strong><p>{edu.institution || "Institution"}</p></div>) : <p style={{color:'var(--muted)'}}>No education information extracted</p>}
      </InfoSection>
      {resumeData?.data?.certifications && resumeData.data.certifications.length > 0 && <InfoSection icon="★" title="Certifications"><div className="skill-chips">{resumeData.data.certifications.map(cert => <span key={cert}>{cert}</span>)}</div></InfoSection>}
      {resumeData?.data?.projects && resumeData.data.projects.length > 0 && <InfoSection icon="⚙" title="Projects"><ul className="project-list">{resumeData.data.projects.slice(0, 3).map((project, i) => <li key={i}>{project}</li>)}</ul></InfoSection>}
    </div>
  </> : <>
    <PageHeader title="Your Resume" subtitle="Upload your resume to create a reusable candidate profile." />
    <Card className="single-upload"><span>⇧</span><h2>{parsing ? "Processing your resume…" : "Upload your resume"}</h2><p>Choose one PDF resume to create your candidate profile.</p><button className="btn primary" onClick={onUpload}>Browse Resume PDF</button><small>PDF format only, up to 10MB</small></Card>
  </>}</>;
}

function JobsPage({ jobUrl, setJobUrl, setJobSource, processedJobData, setProcessedJobData, startAnalysis, notify, setPage }: { jobUrl: string; setJobUrl: (v: string) => void; setJobSource: (v: { kind: string; value: string }) => void; processedJobData: any; setProcessedJobData: (v: any) => void; startAnalysis: () => void; notify: (v: string) => void; setPage: (p: Page) => void }) {
  const [tab, setTab] = useState<"url" | "text" | "pdf">("url");
  const [processing, setProcessing] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const extractAndSaveJob = async () => {
    if (!jobUrl.trim()) { notify("Add a job URL or description first"); return; }
    setProcessing(true);
    try {
      let response;
      if (tab === "url") {
        const { processJobFromURL } = await import("@/lib/api");
        response = await processJobFromURL(jobUrl.trim());
        setJobSource({ kind: "Job URL", value: jobUrl.trim() });
      } else {
        const { processJobFromDescription } = await import("@/lib/api");
        response = await processJobFromDescription(jobUrl.trim());
        setJobSource({ kind: "Pasted description", value: jobUrl.trim() });
      }
      if ((response as any).success && (response as any).data) {
        const r = response as any;
        setProcessedJobData(r.data.data);
        const jobToStore: StoredJobData = { data: r.data.data, job_id: r.job_id, extracted_at: r.data.processed_at, extraction_source: r.extraction.source as any, source_value: jobUrl.trim() };
        saveJob(jobToStore);
        notify("✓ Job extracted successfully!");
        setJobUrl("");
        setTimeout(() => startAnalysis(), 1500);
      } else {
        const errorMsg = (response as any).error || "Failed to extract job details";
        notify(`❌ ${errorMsg}`);
      }
    } catch (error) {
      notify(`❌ ${error instanceof Error ? error.message : "Failed to process job"}`);
    } finally { setProcessing(false); }
  };

  const handlePDFUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.pdf')) { notify("Please upload a PDF file"); return; }
    if (file.size > 10 * 1024 * 1024) { notify("File too large. Maximum size is 10MB"); return; }
    setProcessing(true);
    try {
      const { processJobFromPDF } = await import("@/lib/api");
      const response = await processJobFromPDF(file);
      if ((response as any).success && (response as any).data) {
        const r = response as any;
        setProcessedJobData(r.data.data);
        setJobSource({ kind: "Job Description PDF", value: file.name });
        const jobToStore: StoredJobData = { data: r.data.data, job_id: r.job_id, extracted_at: r.data.processed_at, extraction_source: r.extraction.source as any, source_value: file.name };
        saveJob(jobToStore);
        notify("✓ PDF processed successfully!");
        setTimeout(() => startAnalysis(), 1500);
      } else {
        notify(`❌ ${(response as any).error || "Failed to process PDF"}`);
      }
    } catch (error) {
      notify(`❌ ${error instanceof Error ? error.message : "Failed to process PDF"}`);
    } finally { setProcessing(false); if (event.target) event.target.value = ""; }
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
        {tab === "url" && <><input value={jobUrl} onChange={e => setJobUrl(e.target.value)} placeholder="https://company.com/jobs/..." disabled={processing} /><button className="btn primary" onClick={extractAndSaveJob} disabled={processing}>{processing ? "Processing..." : "Extract Job"}</button></>}
        {tab === "text" && <><textarea value={jobUrl} onChange={e => setJobUrl(e.target.value)} placeholder="Paste the full job description here…" disabled={processing} /><button className="btn primary" onClick={extractAndSaveJob} disabled={processing}>{processing ? "Processing..." : "Extract Job"}</button></>}
        {tab === "pdf" && <><input ref={fileRef} className="sr-only" type="file" accept="application/pdf" onChange={handlePDFUpload} disabled={processing} /><button className="btn primary" onClick={() => fileRef.current?.click()} disabled={processing}>{processing ? "Processing..." : "Choose PDF"}</button></>}
      </div>
    </Card>
    {processedJobData && <Card className="processed-job"><div className="job-result"><h3>{processedJobData.job_title || "Job Title"}</h3><p className="company">{processedJobData.company_name || "Company"}</p>{processedJobData.location && <p className="location">📍 {processedJobData.location}</p>}{processedJobData.remote_status && <p className="remote">🏠 {processedJobData.remote_status}</p>}{processedJobData.required_skills?.length > 0 && <div className="job-skills"><h4>Required Skills:</h4><div className="skill-chips">{processedJobData.required_skills.slice(0, 8).map((skill: string) => <span key={skill}>{skill}</span>)}</div></div>}{processedJobData.key_responsibilities?.length > 0 && <div className="job-responsibilities"><h4>Key Responsibilities:</h4><ul>{processedJobData.key_responsibilities.slice(0, 4).map((resp: string, idx: number) => <li key={idx}>{resp}</li>)}</ul></div>}<button className="btn primary" onClick={startAnalysis}>Analyze Match →</button></div></Card>}
    {!processedJobData && <div className="first-job-callout"><span>1</span><div><strong>Add your first job</strong><p>Paste a job posting URL or description above to extract and compare with your resume.</p></div></div>}
  </>;
}

function AnalysisPage({ hasAnalysis, resumeData, jobData, startAnalysis, notify, resumeFile, setHasAnalysis, analysisResult, setAnalysisResult }: { hasAnalysis: boolean; resumeData: ResumeData | null; jobData: any; startAnalysis: () => void; notify: (v: string) => void; resumeFile: File | null; setHasAnalysis: (v: boolean) => void; analysisResult: any; setAnalysisResult: (v: any) => void }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showReanalyze, setShowReanalyze] = useState(false);
  const [reanalyzeFile, setReanalyzeFile] = useState<File | null>(null);
  const [reanalyzing, setReanalyzing] = useState(false);
  const [comparison, setComparison] = useState<{ previous: any; current: any; previousFileName: string; currentFileName: string } | null>(null);
  const reanalyzeFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (jobData && !analysisResult && !loading && !error) { runRealAnalysis(); }
  }, [jobData]);

  const runRealAnalysis = async () => {
    if (!jobData) { notify("Extract a job first"); return; }
    setLoading(true);
    setError(null);
    try {
      const { runAnalysis } = await import("@/lib/api");
      const jobPayload = jobData.data || jobData;
      if (!resumeFile) {
        if (resumeData) { setError("Please re-upload your resume to run the full analysis."); setLoading(false); return; }
        else { setError("Please upload your resume first."); setLoading(false); return; }
      }
      const result = await runAnalysis(resumeFile, jobPayload);
      if (result && 'success' in result && (result as any).success) {
        setAnalysisResult(result);
        saveLastAnalysis(result);
        setHasAnalysis(true);
        const jobInfo = jobData.data || jobData;
        addToHistory({ id: (result as any).analysis_id || Date.now().toString(), date: new Date().toISOString(), job_title: jobInfo.job_title || 'Unknown', company_name: jobInfo.company_name || 'Unknown', location: jobInfo.location || '', overall_score: (result as any).match?.overall_score || 0, recommendation: (result as any).ai_insights?.application_recommendation?.recommendation || 'review', analysisData: result, jobData: jobInfo });
        notify("✓ Analysis complete!");
      } else if (result && 'error' in result) {
        setError((result as any).error || "Analysis failed");
      } else {
        setAnalysisResult(result);
        saveLastAnalysis(result);
        setHasAnalysis(true);
        const jobInfo = jobData.data || jobData;
        addToHistory({ id: Date.now().toString(), date: new Date().toISOString(), job_title: jobInfo.job_title || 'Unknown', company_name: jobInfo.company_name || 'Unknown', location: jobInfo.location || '', overall_score: (result as any)?.match?.overall_score || 0, recommendation: (result as any)?.ai_insights?.application_recommendation?.recommendation || 'review', analysisData: result, jobData: jobInfo });
        notify("✓ Analysis complete!");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed");
    } finally { setLoading(false); }
  };

  const handleReanalyzeFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.pdf')) { notify("Please upload a PDF file"); return; }
    if (file.size > 10 * 1024 * 1024) { notify("File too large. Maximum size is 10MB"); return; }
    setReanalyzeFile(file);
    if (event.target) event.target.value = "";
  };

  const runReanalysis = async () => {
    if (!reanalyzeFile || !jobData) return;
    setReanalyzing(true);
    try {
      const { runAnalysis } = await import("@/lib/api");
      const jobPayload = jobData.data || jobData;
      const result = await runAnalysis(reanalyzeFile, jobPayload);
      if (result && !('error' in result)) {
        const previousResult = analysisResult;
        setComparison({
          previous: previousResult,
          current: result,
          previousFileName: resumeFile?.name || "Previous Resume",
          currentFileName: reanalyzeFile.name,
        });
        // Save new analysis to history without overwriting the previous
        const jobInfo = jobData.data || jobData;
        addToHistory({ id: (result as any).analysis_id || Date.now().toString(), date: new Date().toISOString(), job_title: jobInfo.job_title || 'Unknown', company_name: jobInfo.company_name || 'Unknown', location: jobInfo.location || '', overall_score: (result as any).match?.overall_score || 0, recommendation: (result as any).ai_insights?.application_recommendation?.recommendation || 'review', analysisData: result, jobData: jobInfo });
        // Update current analysis to the new one
        setAnalysisResult(result);
        saveLastAnalysis(result);
        setShowReanalyze(false);
        notify("✓ Re-analysis complete!");
      } else {
        notify((result as any)?.error || "Re-analysis failed");
      }
    } catch (err) {
      notify(err instanceof Error ? err.message : "Re-analysis failed");
    } finally { setReanalyzing(false); }
  };

  if (!jobData) return <>
    <PageHeader title="Job Match Analysis" subtitle="Your match results will appear here after an analysis." />
    <Card className="analysis-empty"><div className="empty-illustration"><span>▤</span><i>＋</i><span>▣</span></div><h2>No analysis to display yet</h2><p>Upload your resume and add a job, then click <strong>Analyze Match</strong>.</p><div className="empty-steps"><span><b>1</b> Upload resume</span><span><b>2</b> Add a job</span><span><b>3</b> Analyze match</span></div><button className="btn primary" onClick={startAnalysis}>Choose a Job to Analyze</button></Card>
  </>;

  if (loading) return <>
    <PageHeader title="Job Match Analysis" subtitle="Analyzing your resume against the job..." />
    <Card className="analysis-empty"><div className="empty-illustration"><span>⏳</span></div><h2>Analyzing your match...</h2><p>Comparing your skills, experience, and qualifications. This may take 15-30 seconds.</p><div className="loading-bar"><div className="loading-progress"></div></div></Card>
  </>;

  if (error) return <>
    <PageHeader title="Job Match Analysis" subtitle="An issue occurred during analysis." />
    <Card className="analysis-empty"><div className="empty-illustration"><span>⚠</span></div><h2>Analysis Issue</h2><p>{error}</p><div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}><button className="btn primary" onClick={runRealAnalysis}>Retry Analysis</button><button className="btn secondary" onClick={startAnalysis}>Back to Jobs</button></div></Card>
  </>;

  // Results
  const jobInfo = jobData.data || jobData;
  const match = analysisResult?.match;
  const aiInsights = analysisResult?.ai_insights;
  const overallScore = match?.overall_score || 0;
  const strengths = match?.strengths || [];
  const gaps = match?.gaps || [];
  const scoreBreakdown = match?.score_breakdown || {};
  const recommendation = aiInsights?.application_recommendation?.recommendation || "review";
  const recLabel = getRecommendationLabel(recommendation);
  const recClass = getRecommendationClass(recommendation);
  const scoreColor = overallScore >= 80 ? "var(--green)" : overallScore >= 60 ? "var(--orange)" : "var(--primary)";

  return <>
    <PageHeader title="Job Match Analysis" subtitle="Real analysis of your resume against the selected opportunity.">
      <div className="header-actions"><button className="btn secondary small-btn" onClick={startAnalysis}>⌕ New Analysis</button></div>
    </PageHeader>
    <Card className="analysis-hero">
      <div className="candidate"><span className="avatar">CA</span><div><small>CANDIDATE PROFILE</small><strong>Your Resume</strong><span>{resumeData?.data?.keywords?.[0] || "Professional"}</span></div></div>
      <div className="analysis-score" style={{ borderColor: scoreColor }}><strong style={{ color: scoreColor }}>{overallScore}%</strong><span>Match Score</span></div>
      <div className="role"><div><small>JOB OPPORTUNITY</small><strong>{jobInfo.job_title || "Job"}</strong><span>{jobInfo.company_name || "Company"} · {jobInfo.location || "Remote"}</span></div><b className={recClass === "green" ? "" : "warning"}>{recLabel}</b></div>
    </Card>

    {/* Re-Analyze Action */}
    {!showReanalyze && !comparison && (
      <div className="reanalyze-action">
        <button className="btn secondary small-btn" onClick={() => setShowReanalyze(true)}>↻ Re-analyze with another resume</button>
      </div>
    )}

    {/* Re-Analyze Resume Selection */}
    {showReanalyze && (
      <Card className="reanalyze-card">
        <h3>↻ Re-analyze with a different resume</h3>
        <p className="reanalyze-subtitle">See how a different resume changes your match score for this job.</p>
        <div className="reanalyze-resume-compare">
          <div className="reanalyze-resume-item">
            <small>Current Resume</small>
            <strong>{resumeFile?.name || "Current Resume"}</strong>
          </div>
          <span className="reanalyze-arrow">→</span>
          <div className="reanalyze-resume-item">
            <small>New Resume</small>
            {reanalyzeFile ? <strong>{reanalyzeFile.name}</strong> : <button className="btn secondary compact-btn" onClick={() => reanalyzeFileRef.current?.click()}>Select Resume</button>}
          </div>
        </div>
        <div className="reanalyze-actions">
          {reanalyzeFile && <button className="btn primary" onClick={runReanalysis} disabled={reanalyzing}>{reanalyzing ? "Analyzing..." : "Re-analyze"}</button>}
          {reanalyzeFile && <button className="btn secondary compact-btn" onClick={() => reanalyzeFileRef.current?.click()}>Change File</button>}
          <button className="btn secondary compact-btn" onClick={() => { setShowReanalyze(false); setReanalyzeFile(null); }}>Cancel</button>
        </div>
        <input ref={reanalyzeFileRef} className="sr-only" type="file" accept="application/pdf" onChange={handleReanalyzeFileSelect} />
      </Card>
    )}

    {/* Comparison Results */}
    {comparison && <ResumeComparisonCard comparison={comparison} onDismiss={() => setComparison(null)} />}

    {scoreBreakdown && Object.keys(scoreBreakdown).length > 0 && <Card className="score-breakdown"><h3>📊 Score Breakdown</h3><div className="breakdown-grid">{Object.entries(scoreBreakdown).map(([key, value]) => { const score = typeof value === 'number' ? value : (value as any)?.score ?? 0; const barColor = score >= 70 ? 'var(--green)' : score >= 40 ? 'var(--orange)' : 'var(--primary)'; return <div key={key} className="breakdown-item"><span className="breakdown-label">{key.replace(/_/g, ' ')}</span><div className="breakdown-bar"><div className="breakdown-fill" style={{ width: `${score}%`, background: barColor }}></div></div><span className="breakdown-value" style={{ color: barColor }}>{score}%</span></div>; })}</div></Card>}

    {aiInsights?.summary && <Card className="analysis-summary-card"><h3>📋 AI Summary</h3><p className="analysis-summary-text">{aiInsights.summary}</p>{aiInsights?.application_recommendation && <div className={`recommendation-banner ${recClass === "green" ? "success" : "warning"}`}><span className="rec-icon">{recClass === "green" ? "✓" : "⚠"}</span><div><strong>Recommendation: {recLabel}</strong><p>{aiInsights.application_recommendation.reason}</p></div></div>}</Card>}

    <div className="analysis-sections">
      {aiInsights?.why_you_match?.length > 0 && <Card className="analysis-section-card scrollable"><h3><span className="card-icon green">✓</span> Why You Match</h3><ul className="section-list">{aiInsights.why_you_match.map((r: string, i: number) => <li key={i}>{r}</li>)}</ul></Card>}
      {aiInsights?.skill_gaps?.length > 0 && <Card className="analysis-section-card scrollable"><h3><span className="card-icon orange">△</span> Skill Gaps</h3><div className="skill-gap-list">{aiInsights.skill_gaps.map((gap: any, i: number) => <div key={i} className="skill-gap-item"><div className="sg-header"><span className="sg-skill">{gap.skill || gap}</span>{gap.importance && <span className={`sg-importance ${gap.importance}`}>{gap.importance === 'required' ? '🔴 Required' : '🟡 Preferred'}</span>}</div>{gap.reason && <p className="sg-reason">{gap.reason}</p>}{gap.recommendation && <div className="sg-rec"><span>💡</span><span>{gap.recommendation}</span></div>}</div>)}</div></Card>}
      {strengths.length > 0 && <Card className="analysis-section-card"><h3><span className="card-icon green">☆</span> Matched Skills</h3><div className="matched-skills-grid">{strengths.slice(0, 8).map((s: any, i: number) => <span key={i} className="matched-skill">✓ {typeof s === 'string' ? s : (s?.skill || s?.name || JSON.stringify(s))}</span>)}</div></Card>}
      {gaps.length > 0 && <Card className="analysis-section-card"><h3><span className="card-icon orange">⚡</span> Missing Skills</h3><div className="missing-skills-grid">{gaps.slice(0, 8).map((g: any, i: number) => <span key={i} className="missing-skill">● {typeof g === 'string' ? g : (g?.skill || g?.name || JSON.stringify(g))}</span>)}</div></Card>}
      {aiInsights?.resume_improvements?.length > 0 && <Card className="analysis-section-card full-width"><h3><span className="card-icon purple">✎</span> Resume Improvements</h3><ul className="improvement-list">{aiInsights.resume_improvements.map((tip: string, i: number) => <li key={i}>{tip}</li>)}</ul></Card>}
      {aiInsights?.interview_focus?.length > 0 && <Card className="analysis-section-card full-width"><h3>🎯 Interview Preparation</h3><div className="interview-grid">{aiInsights.interview_focus.map((q: string, i: number) => <div className="interview-card" key={i}><span className="interview-num">{i + 1}</span><p>{q}</p></div>)}</div></Card>}
    </div>
  </>;
}

/* ─── RESUME COMPARISON CARD (Re-Analyze Feature) ─── */
function ResumeComparisonCard({ comparison, onDismiss }: { comparison: { previous: any; current: any; previousFileName: string; currentFileName: string }; onDismiss: () => void }) {
  const prevScore = comparison.previous?.match?.overall_score || 0;
  const newScore = comparison.current?.match?.overall_score || 0;
  const improvement = newScore - prevScore;
  const improvementColor = improvement > 0 ? "var(--green)" : improvement < 0 ? "var(--primary)" : "var(--muted)";

  // Derive what improved from comparing strengths
  const prevStrengths = new Set(comparison.previous?.match?.strengths || []);
  const newStrengths = comparison.current?.match?.strengths || [];
  const whatImproved = newStrengths.filter((s: string) => !prevStrengths.has(s)).map((s: string) => `${s} experience identified`);

  // Remaining gaps from new analysis
  const remainingGaps = comparison.current?.match?.gaps || [];

  return <Card className="comparison-card">
    <div className="comparison-header">
      <h3>📊 Resume Impact</h3>
      <button className="btn secondary compact-btn" onClick={onDismiss}>✕ Dismiss</button>
    </div>
    <div className="comparison-scores">
      <div className="comparison-score-item">
        <small>Previous Match</small>
        <strong className="comparison-score-value">{prevScore}%</strong>
        <span className="comparison-file">{comparison.previousFileName}</span>
      </div>
      <div className="comparison-arrow">
        <span style={{ color: improvementColor, fontWeight: 700, fontSize: '1.25rem' }}>→</span>
      </div>
      <div className="comparison-score-item">
        <small>New Match</small>
        <strong className="comparison-score-value" style={{ color: 'var(--green)' }}>{newScore}%</strong>
        <span className="comparison-file">{comparison.currentFileName}</span>
      </div>
      <div className="comparison-improvement">
        <span className="comparison-improvement-value" style={{ color: improvementColor }}>{improvement > 0 ? '+' : ''}{improvement} points</span>
        <small>{improvement > 0 ? 'Improvement' : improvement < 0 ? 'Decrease' : 'No change'}</small>
      </div>
    </div>
    {whatImproved.length > 0 && <div className="comparison-section">
      <h4>What Improved</h4>
      <ul className="comparison-improved-list">{whatImproved.slice(0, 5).map((item: string, i: number) => <li key={i}><span className="card-icon green">✓</span> {item}</li>)}</ul>
    </div>}
    {remainingGaps.length > 0 && <div className="comparison-section">
      <h4>Remaining Gaps</h4>
      <ul className="comparison-gaps-list">{remainingGaps.slice(0, 5).map((gap: string, i: number) => <li key={i}><span className="card-icon orange">⚠</span> {typeof gap === 'string' ? gap : (gap as any)?.skill || JSON.stringify(gap)}</li>)}</ul>
    </div>}
  </Card>;
}

/* ─── DEMO COMPARISON CARD (Re-Analyze Feature - Demo Mode) ─── */
function DemoComparisonCard({ onDismiss }: { onDismiss: () => void }) {
  const comp = demoReanalyzeComparison;
  const improvementColor = comp.improvement > 0 ? "var(--green)" : "var(--primary)";

  return <Card className="comparison-card">
    <div className="comparison-header">
      <h3>📊 Resume Impact</h3>
      <button className="btn secondary compact-btn" onClick={onDismiss}>✕ Dismiss</button>
    </div>
    <div className="comparison-scores">
      <div className="comparison-score-item">
        <small>Previous Match</small>
        <strong className="comparison-score-value">{comp.previousScore}%</strong>
        <span className="comparison-file">{comp.previousResume}</span>
      </div>
      <div className="comparison-arrow">
        <span style={{ color: improvementColor, fontWeight: 700, fontSize: '1.25rem' }}>→</span>
      </div>
      <div className="comparison-score-item">
        <small>New Match</small>
        <strong className="comparison-score-value" style={{ color: 'var(--green)' }}>{comp.newScore}%</strong>
        <span className="comparison-file">{comp.newResume}</span>
      </div>
      <div className="comparison-improvement">
        <span className="comparison-improvement-value" style={{ color: improvementColor }}>+{comp.improvement} points</span>
        <small>Improvement</small>
      </div>
    </div>
    <div className="comparison-section">
      <h4>What Improved</h4>
      <ul className="comparison-improved-list">{comp.whatImproved.map((item, i) => <li key={i}><span className="card-icon green">✓</span> {item}</li>)}</ul>
    </div>
    <div className="comparison-section">
      <h4>Remaining Gaps</h4>
      <ul className="comparison-gaps-list">{comp.remainingGaps.map((gap, i) => <li key={i}><span className="card-icon orange">⚠</span> {gap}</li>)}</ul>
    </div>
  </Card>;
}

function HistoryPage({ hasAnalysis, jobSource, setPage, analysisResult }: { hasAnalysis: boolean; jobSource: { kind: string; value: string }; setPage: (p: Page) => void; analysisResult: any }) {
  const history = getHistory();
  if (history.length === 0) return <>
    <PageHeader title="Application History" subtitle="Your analysis history will appear here after completing a match analysis." />
    <Card className="history-empty"><span>◷</span><h2>No application history yet</h2><p>Your first record will be created after you upload a resume, add a job, and complete an analysis.</p><button className="btn primary" onClick={() => setPage("resume")}>Start With Your Resume</button></Card>
  </>;

  return <>
    <PageHeader title="Application History" subtitle={`${history.length} analysis record${history.length > 1 ? 's' : ''} saved locally.`} />
    <Card className="history-table">
      <div className="history-head"><span>Date</span><span>Opportunity</span><span>Score</span><span>Action</span></div>
      {history.map((entry, i) => {
        const date = new Date(entry.date);
        const scoreColor = entry.overall_score >= 70 ? 'var(--green)' : entry.overall_score >= 40 ? 'var(--orange)' : 'var(--primary)';
        const recLabel = entry.recommendation === 'apply' || entry.recommendation === 'strong_apply' ? 'Apply' : entry.recommendation === 'review' ? 'Review' : 'Low Match';
        return <div className="history-row" key={entry.id || i}>
          <span><strong>{date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</strong><small>{date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</small></span>
          <span><strong>{entry.job_title}</strong><small>{entry.company_name}{entry.location ? ` · ${entry.location}` : ''}</small></span>
          <span><b style={{ color: scoreColor, fontSize: '18px' }}>{entry.overall_score}%</b><small style={{ color: scoreColor }}>{recLabel}</small></span>
          <button className="btn secondary compact-btn" onClick={() => setPage("analysis")}>View →</button>
        </div>;
      })}
    </Card>
  </>;
}

/* ─── DEMO TOUR (existing, preserved) ─── */
const demoSteps = [
  { icon: "⇧", title: "Upload your resume", text: "Start with one PDF resume. IntelliApply will extract your experience, skills, education, and professional profile.", benefit: "Creates one reusable candidate profile for every job comparison.", page: "resume" as Page },
  { icon: "▣", title: "Add the job you want", text: "Paste a job-posting URL or the complete job description. The application will identify the role, required skills, and responsibilities.", benefit: "Turns a long posting into clear, structured requirements.", page: "jobs" as Page },
  { icon: "◎", title: "Analyze the match", text: "Select a saved job and click Analyze Match. Your resume and that specific job will be compared with a clear score breakdown.", benefit: "Gives every selected job its own result instead of one general score.", page: "jobs" as Page },
  { icon: "↗", title: "Act on the results", text: "Review the match score, strongest qualifications, missing skills, application advice, and tailored interview questions.", benefit: "Shows whether to apply and exactly how to strengthen the application.", page: "analysis" as Page },
];
function DemoTour({ step, setStep, setPage, setUploaded }: { step: number; setStep: (v: number | null) => void; setPage: (p: Page) => void; setUploaded: (v: boolean) => void }) {
  const item = demoSteps[step];
  const goNext = () => { if (step === demoSteps.length - 1) { setStep(null); setUploaded(false); setPage("resume"); } else { const next = step + 1; setStep(next); setPage(demoSteps[next].page); } };
  return <div className="demo-overlay" role="dialog" aria-modal="true"><div className="demo-modal"><button className="demo-close" onClick={() => setStep(null)}>×</button><div className="demo-progress">{demoSteps.map((_, i) => <span key={i} className={i <= step ? "active" : ""} />)}</div><div className="demo-count">STEP {step + 1} OF {demoSteps.length}</div><div className="demo-icon">{item.icon}</div><h2>{item.title}</h2><p>{item.text}</p><div className="demo-benefit">✦ {item.benefit}</div><div className="demo-actions">{step > 0 && <button className="btn secondary" onClick={() => { const previous = step - 1; setStep(previous); setPage(demoSteps[previous].page); }}>← Back</button>}<button className="btn primary" onClick={goNext}>{step === demoSteps.length - 1 ? "Try It Yourself" : "Next Step →"}</button></div></div></div>;
}
