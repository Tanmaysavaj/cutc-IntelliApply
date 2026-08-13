'use client';

import { ReactNode } from 'react';
import Sidebar from '@/components/Sidebar';
import Topbar from '@/components/Topbar';
import { AppStateProvider } from '@/app/contexts/AppStateContext';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <AppStateProvider>
      <div className="app-shell">
        <Sidebar />
        <main className="app-main">
          <Topbar />
          <div className="page-wrap">
            {children}
          </div>
        </main>
      </div>
    </AppStateProvider>
  );
}
