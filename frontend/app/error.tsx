'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error to monitoring service in production
    console.error('Application error:', error);
  }, [error]);

  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: '20px' }}>
      <div style={{ maxWidth: '500px', textAlign: 'center' }}>
        <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>Something went wrong</h1>
        <p style={{ color: '#666', marginBottom: '2rem', lineHeight: '1.6' }}>
          We encountered an unexpected error. Please try refreshing the page or contact support if
          the problem persists.
        </p>
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
          <button
            onClick={() => reset()}
            style={{
              padding: '12px 24px',
              background: '#5c45f5',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            Try again
          </button>
          <Link
            href="/"
            style={{
              padding: '12px 24px',
              background: '#f3f1ff',
              color: '#5c45f5',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 600,
              textDecoration: 'none',
              display: 'inline-block',
            }}
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}
