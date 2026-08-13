'use client';

import { useAppState } from '@/app/contexts/AppStateContext';
import { useRouter } from 'next/navigation';

const links = [
  { id: 'landing', label: 'Home' },
  { id: 'resume', label: 'Resume' },
  { id: 'jobs', label: 'Jobs' },
  { id: 'analysis', label: 'Analysis' },
  { id: 'history', label: 'History' },
];

function Brand({ compact = false, onHome }: { compact?: boolean; onHome: () => void }) {
  return (
    <button className={`brand ${compact ? 'compact' : ''}`} onClick={onHome}>
      <span className="brand-mark">✦</span>
      <span>
        Intelli<span>Apply</span>
      </span>
    </button>
  );
}

function ThemeToggle({
  theme,
  toggleTheme,
}: {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}) {
  return (
    <button
      className="theme-toggle"
      onClick={toggleTheme}
      aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
    >
      <span className={theme === 'light' ? 'active' : ''}>☀</span>
      <span className={theme === 'dark' ? 'active' : ''}>☾</span>
    </button>
  );
}

export default function Topbar() {
  const { page, setPage, theme, toggleTheme } = useAppState();
  const router = useRouter();

  const handleHome = () => {
    setPage('landing');
    router.push('/');
  };

  const handleNavigate = (id: string) => {
    setPage(id as 'landing' | 'resume' | 'jobs' | 'analysis' | 'history');
    if (id !== 'landing') {
      router.push(`/${id}`);
    } else {
      router.push('/');
    }
  };

  return (
    <header className={`topbar ${page === 'landing' ? 'landing-topbar' : ''}`}>
      {page === 'landing' && <Brand onHome={handleHome} />}
      {page === 'landing' && (
        <nav className="top-nav">
          {links.map((link) => (
            <button
              key={link.id}
              className={page === link.id ? 'active' : ''}
              onClick={() => handleNavigate(link.id)}
            >
              {link.label}
            </button>
          ))}
        </nav>
      )}
      {page !== 'landing' && (
        <div className="mobile-brand">
          <Brand compact onHome={handleHome} />
        </div>
      )}
      <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
    </header>
  );
}
