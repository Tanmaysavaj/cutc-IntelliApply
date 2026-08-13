'use client';

import { useAppState } from '@/app/contexts/AppStateContext';

export function useTheme() {
  const { theme, toggleTheme } = useAppState();

  return {
    theme,
    toggleTheme,
    isDark: theme === 'dark',
    isLight: theme === 'light',
  };
}
