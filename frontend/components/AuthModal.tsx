'use client';

import { useState } from 'react';
import { useAuth } from '@/app/contexts/AuthContext';

interface AuthModalProps {
  onClose: () => void;
  onSuccess?: () => void;
}

export default function AuthModal({ onClose, onSuccess }: AuthModalProps) {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [signupSuccess, setSignupSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (mode === 'signup') {
        const { error } = await signUp(email, password, name);
        if (error) {
          setError(error);
        } else {
          setSignupSuccess(true);
        }
      } else {
        const { error } = await signIn(email, password);
        if (error) {
          setError(error);
        } else {
          onSuccess?.();
          onClose();
        }
      }
    } finally {
      setLoading(false);
    }
  };

  if (signupSuccess) {
    return (
      <div className="detail-overlay" role="dialog" aria-modal="true" aria-label="Authentication">
        <div className="detail-modal auth-modal">
          <button className="demo-close" onClick={onClose} aria-label="Close">×</button>
          <div className="detail-icon">✓</div>
          <h2>Account Created</h2>
          <p className="muted">Check your email for a confirmation link, then sign in.</p>
          <button
            className="btn primary"
            onClick={() => { setSignupSuccess(false); setMode('signin'); }}
          >
            Go to Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="detail-overlay" role="dialog" aria-modal="true" aria-label="Authentication">
      <div className="detail-modal auth-modal">
        <button className="demo-close" onClick={onClose} aria-label="Close">×</button>
        
        <div className="detail-icon">✦</div>
        <h2>{mode === 'signin' ? 'Sign In' : 'Create Account'}</h2>
        <p className="muted">
          {mode === 'signin'
            ? 'Sign in to save your analyses and track your progress.'
            : 'Create an account to persist your data across sessions.'}
        </p>

        <form onSubmit={handleSubmit} className="auth-form">
          {mode === 'signup' && (
            <div className="auth-field">
              <label htmlFor="auth-name">Name</label>
              <input
                id="auth-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                autoComplete="name"
              />
            </div>
          )}

          <div className="auth-field">
            <label htmlFor="auth-email">Email</label>
            <input
              id="auth-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              autoComplete="email"
            />
          </div>

          <div className="auth-field">
            <label htmlFor="auth-password">Password</label>
            <input
              id="auth-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={6}
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
            />
          </div>

          {error && <p className="auth-error">{error}</p>}

          <button className="btn primary auth-submit" type="submit" disabled={loading}>
            {loading
              ? 'Processing…'
              : mode === 'signin'
              ? 'Sign In'
              : 'Create Account'}
          </button>
        </form>

        <p className="auth-switch">
          {mode === 'signin' ? (
            <>
              Don&apos;t have an account?{' '}
              <button className="link-btn" onClick={() => { setMode('signup'); setError(''); }}>
                Sign up
              </button>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <button className="link-btn" onClick={() => { setMode('signin'); setError(''); }}>
                Sign in
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
