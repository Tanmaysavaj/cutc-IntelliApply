'use client';

import { useState, useRef, useEffect } from 'react';
import { useAppState } from '@/app/contexts/AppStateContext';
import { useAuth } from '@/app/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import AuthModal from '@/components/AuthModal';

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

function UserMenu() {
  const { user, signOut } = useAuth();
  const [showAuth, setShowAuth] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!user) {
    return (
      <>
        <button className="btn secondary compact-btn" onClick={() => setShowAuth(true)}>
          Sign In
        </button>
        {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
      </>
    );
  }

  const initials = (user.name || user.email || '?')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="auth-trigger" ref={dropdownRef}>
      <button className="auth-user-btn" onClick={() => setShowDropdown(!showDropdown)}>
        <span className="user-avatar-sm">{initials}</span>
        {user.name || user.email.split('@')[0]}
      </button>
      {showDropdown && (
        <div className="auth-dropdown">
          <div className="user-info">
            <strong>{user.name || 'User'}</strong>
            <small>{user.email}</small>
          </div>
          <button onClick={() => { signOut(); setShowDropdown(false); }}>
            Sign Out
          </button>
        </div>
      )}
    </div>
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
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <UserMenu />
        <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
      </div>
    </header>
  );
}
