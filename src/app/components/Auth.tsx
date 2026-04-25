import React, { useState, useEffect, useRef } from 'react';
import { API } from '../../utils/api';
import { validateEmail, validatePassword, LoginAttemptTracker } from '../../utils/security';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Separator } from './ui/separator';

interface AuthProps {
  onSuccess: () => void;
}

export function Auth({ onSuccess }: AuthProps) {
  const [mode, setMode] = useState<'login' | 'signup' | 'reset'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resetSent, setResetSent] = useState(false);
  const [oauthLoading, setOAuthLoading] = useState(false);
  // Honeypot — hidden field that only bots fill in
  const honeypotRef = useRef<HTMLInputElement>(null);
  // Lockout countdown
  const [lockoutSeconds, setLockoutSeconds] = useState(0);

  // Drive lockout countdown ticker
  useEffect(() => {
    if (lockoutSeconds <= 0) return;
    const id = setInterval(() => {
      setLockoutSeconds((s) => {
        if (s <= 1) { clearInterval(id); return 0; }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [lockoutSeconds]);

  // Re-check tracker when email changes so UI reflects an existing lockout
  useEffect(() => {
    if (mode === 'login' && email && LoginAttemptTracker.isLockedOut(email)) {
      setLockoutSeconds(LoginAttemptTracker.getRetryAfterSeconds(email));
    }
  }, [email, mode]);

  const formatCountdown = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(1, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const handleOAuthSignIn = async (provider: 'google' | 'apple') => {
    try {
      setError('');
      setOAuthLoading(true);
      await API.signInWithOAuth(provider);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : `${provider} sign-in failed`);
      setOAuthLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Honeypot check — bots fill hidden fields; real users never see it
    if (honeypotRef.current?.value) {
      // Silently no-op to avoid tipping off the bot
      return;
    }

    // Client-side lockout gate (mirrors server rule)
    if (mode === 'login' && LoginAttemptTracker.isLockedOut(email)) {
      setLockoutSeconds(LoginAttemptTracker.getRetryAfterSeconds(email));
      return;
    }

    if (!validateEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }

    if (mode !== 'reset') {
      const { valid, errors } = validatePassword(password);
      if (!valid) {
        setError(errors[0]);
        return;
      }
    }

    setLoading(true);

    try {
      if (mode === 'reset') {
        await API.resetPassword(email);
        setResetSent(true);
      } else if (mode === 'signup') {
        await API.signup(email, password, name);
        await API.login(email, password);
        await API.getMe();
        onSuccess();
      } else {
        await API.login(email, password);
        await API.getMe();
        LoginAttemptTracker.clear(email);
        onSuccess();
      }
    } catch (err: unknown) {
      if (mode === 'login') {
        LoginAttemptTracker.record(email);
        if (LoginAttemptTracker.isLockedOut(email)) {
          setLockoutSeconds(LoginAttemptTracker.getRetryAfterSeconds(email));
          setError('');
        } else {
          setError(err instanceof Error ? err.message : 'Authentication failed');
        }
      } else {
        setError(err instanceof Error ? err.message : 'Authentication failed');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center space-y-2">
          <div className="flex justify-center mb-2">
            <svg
              viewBox="0 0 48 48"
              className="w-16 h-16"
              fill="none"
            >
              <circle cx="24" cy="28" r="16" fill="#E63946" />
              <path
                d="M24 12V8M20 10.5C20 10.5 21 12 24 12C27 12 28 10.5 28 10.5M18 8C18 8 19 10 22 11M30 8C30 8 29 10 26 11"
                stroke="#4a7c3f"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </div>
          <CardTitle className="text-2xl font-bold">Share Crops</CardTitle>
          <CardDescription>
            {mode === 'reset' ? 'Reset your password' : 'Local Community Garden Exchange'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {mode === 'reset' && resetSent ? (
            <div className="space-y-4 text-center">
              <div className="bg-green-50 border border-green-200 rounded-md p-4 dark:bg-green-950/20 dark:border-green-800">
                <p className="text-sm text-green-800 dark:text-green-300">
                  If an account exists for <strong>{email}</strong>, you'll receive a password reset link shortly. Check your inbox.
                </p>
              </div>
              <button
                type="button"
                onClick={() => { setMode('login'); setResetSent(false); setError(''); }}
                className="text-sm text-primary hover:underline"
              >
                Back to log in
              </button>
            </div>
          ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Honeypot — invisible to real users, bots fill it in */}
            <input
              ref={honeypotRef}
              type="text"
              name="website"
              tabIndex={-1}
              aria-hidden="true"
              autoComplete="off"
              className="absolute -left-[9999px] w-px h-px opacity-0 pointer-events-none"
            />
            {mode === 'signup' && (
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="bg-input-background border-input-border"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-input-background border-input-border"
              />
            </div>

            {mode !== 'reset' && (
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="bg-input-background border-input-border"
                />
                {mode === 'signup' && (
                  <p className="text-xs text-muted-foreground">
                    8+ characters, uppercase letter, and number required.
                  </p>
                )}
                {mode === 'login' && (
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => { setMode('reset'); setError(''); }}
                      className="text-xs text-muted-foreground hover:text-primary hover:underline"
                    >
                      Forgot password?
                    </button>
                  </div>
                )}
              </div>
            )}

            {lockoutSeconds > 0 && (
              <div className="bg-amber-50 border border-amber-300 rounded-md p-3 dark:bg-amber-950/20 dark:border-amber-700">
                <p className="text-sm text-amber-800 dark:text-amber-300 font-medium">
                  Too many failed attempts.
                </p>
                <p className="text-sm text-amber-700 dark:text-amber-400">
                  Try again in <span className="font-mono font-semibold">{formatCountdown(lockoutSeconds)}</span>
                </p>
              </div>
            )}

            {error && (
              <div className="bg-error/10 border border-error rounded-md p-3">
                <p className="text-sm text-error">{error}</p>
              </div>
            )}

            <Button
              type="submit"
              className="w-full bg-primary hover:bg-primary-hover text-primary-foreground"
              disabled={loading || lockoutSeconds > 0}
            >
              {loading
                ? 'Please wait...'
                : mode === 'login'
                ? 'Log In'
                : mode === 'signup'
                ? 'Sign Up'
                : 'Send Reset Link'}
            </Button>

            {mode !== 'reset' && (
              <>
                <Separator className="my-4" />
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => handleOAuthSignIn('google')}
                    disabled={oauthLoading}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-input rounded-md hover:bg-accent transition-colors disabled:opacity-50"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                    <span>Sign in with Google</span>
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => handleOAuthSignIn('apple')}
                    disabled={oauthLoading}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-input rounded-md hover:bg-accent transition-colors disabled:opacity-50 dark:text-white"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.05 13.5c-.91 0-1.82.58-2.3 1.42.48.87 1.45 1.45 2.3 1.45 1.59 0 2.87-1.28 2.87-2.87S18.64 10.63 17.05 10.63c-1.59 0-2.87 1.28-2.87 2.87 0 .5.14.97.38 1.38-.48.84-1.39 1.42-2.3 1.42-1.59 0-2.87-1.28-2.87-2.87 0-.5.14-.97.38-1.38.48-.84 1.39-1.42 2.3-1.42 1.59 0 2.87 1.28 2.87 2.87s-1.28 2.87-2.87 2.87M6.5 2C5.12 2 4 3.12 4 4.5v15C4 20.88 5.12 22 6.5 22h11c1.38 0 2.5-1.12 2.5-2.5v-15C20 3.12 18.88 2 17.5 2h-11z"/>
                    </svg>
                    <span>Sign in with Apple</span>
                  </button>
                </div>
              </>
            )}

            <div className="text-center text-sm space-y-1">
              {mode === 'reset' ? (
                <button
                  type="button"
                  onClick={() => { setMode('login'); setError(''); }}
                  className="text-primary hover:underline"
                >
                  Back to log in
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setMode(mode === 'login' ? 'signup' : 'login');
                    setError('');
                  }}
                  className="text-primary hover:underline"
                >
                  {mode === 'login'
                    ? "Don't have an account? Sign up"
                    : 'Already have an account? Log in'}
                </button>
              )}
            </div>
          </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
