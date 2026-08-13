'use client';

import { useAppState } from '@/app/contexts/AppStateContext';
import { useRouter } from 'next/navigation';

const navItems = [
  { id: 'landing' as const, label: 'Home', icon: '⌂' },
  { id: 'resume' as const, label: 'Resume', icon: '▤' },
  { id: 'jobs' as const, label: 'Jobs', icon: '▣' },
  { id: 'analysis' as const, label: 'Analysis', icon: '↗' },
  { id: 'history' as const, label: 'History', icon: '◷' },
];

const Icon = ({ children }: { children: React.ReactNode }) => (
  <span className="icon" aria-hidden="true">
    {children}
  </span>
);

export default function Sidebar() {
  const { setPage } = useAppState();
  const router = useRouter();

  const handleNavigate = (id: string) => {
    setPage(id as 'landing' | 'resume' | 'jobs' | 'analysis' | 'history');
    if (id === 'landing') {
      router.push('/');
    } else if (id !== 'landing') {
      router.push(`/${id}`);
    }
  };

  return (
    <aside className="sidebar">
      <button className="brand" onClick={() => handleNavigate('landing')}>
        <span className="brand-mark">✦</span>
        <span>
          Intelli<span>Apply</span>
        </span>
      </button>
      <nav className="side-nav">
        {navItems.map((item) => (
          <button
            key={item.id}
            className="active"
            onClick={() => handleNavigate(item.id)}
          >
            <Icon>{item.icon}</Icon>
            {item.label}
          </button>
        ))}
      </nav>
      <div className="side-note">
        <span className="brand-mark small">✦</span>
        <div>
          <strong>Smarter applications</strong>
          <p>Clear insights for every opportunity.</p>
        </div>
      </div>
    </aside>
  );
}
