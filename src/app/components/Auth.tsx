import React, { useState, useEffect, useRef } from 'react';
import { API } from '../../utils/api';
import { validateEmail, validatePassword, LoginAttemptTracker } from '../../utils/security';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';

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
