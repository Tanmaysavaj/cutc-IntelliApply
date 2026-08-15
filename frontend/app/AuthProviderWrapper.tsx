'use client';

import { ReactNode } from 'react';
import { AuthProvider } from '@/app/contexts/AuthContext';

export function AuthProviderWrapper({ children }: { children: ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}
