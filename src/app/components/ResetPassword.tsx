import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { supabase } from '../../utils/supabase';
import { API } from '../../utils/api';
import { validatePassword } from '../../utils/security';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';

/**
 * Supabase recovery emails can arrive in two formats:
 *
 * 1. Implicit flow  → /reset-password#access_token=...&type=recovery
 * 2. PKCE flow      → /reset-password?code=...  (modern Supabase default)
 *
 * The catch-all in App.tsx forwards tokens that land at the root (e.g. when
 * redirect_to is not whitelisted in the Supabase dashboard) to this route.
 */

type TokenState =
  | { status: 'loading' }
  | { status: 'pkce_ready' }       // code exchanged; session set on supabase client
  | { status: 'direct'; token: string } // implicit flow access_token
  | { status: 'invalid' };

export function ResetPassword() {
  const navigate = useNavigate();
  const [tokenState, setTokenState] = useState<TokenState>({ status: 'loading' });
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const query = new URLSearchParams(window.location.search);

    const code = query.get('code');
    const accessToken = hash.get('access_token') || query.get('access_token');

    if (code) {
      // PKCE flow: exchange the one-time code for a Supabase session
      supabase.auth
        .exchangeCodeForSession(code)
        .then(({ error: err }) => {
          if (err) {
            setError('This reset link has expired or already been used. Please request a new one.');
            setTokenState({ status: 'invalid' });
          } else {
            // Clean the code from the URL so a page refresh doesn't re-use it
            window.history.replaceState({}, '', '/reset-password');
            setTokenState({ status: 'pkce_ready' });
          }
        });
    } else if (accessToken) {
      // Implicit flow: access_token in hash
      window.history.replaceState({}, '', '/reset-password');
      setTokenState({ status: 'direct', token: accessToken });
    } else {
      setError('Invalid or expired reset link. Please request a new one.');
      setTokenState({ status: 'invalid' });
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    const { valid, errors } = validatePassword(password);
    if (!valid) {
      setError(errors[0]);
      return;
    }

    setSubmitting(true);
    try {
      if (tokenState.status === 'pkce_ready') {
        // Session is already established on the Supabase client
        const { error: err } = await supabase.auth.updateUser({ password });
        if (err) throw err;
      } else if (tokenState.status === 'direct') {
        await API.updatePasswordWithToken(tokenState.token, password);
      } else {
        throw new Error('No valid session to update password.');
      }
      setSuccess(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Password reset failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center space-y-2">
          <CardTitle className="text-2xl font-bold">Set New Password</CardTitle>
          <CardDescription>Choose a new password for your account.</CardDescription>
        </CardHeader>
        <CardContent>
          {tokenState.status === 'loading' ? (
            <p className="text-center text-muted-foreground py-6">Verifying your reset link…</p>
          ) : success ? (
            <div className="space-y-4 text-center">
              <div className="bg-green-50 border border-green-200 rounded-md p-4 dark:bg-green-950/20 dark:border-green-800">
                <p className="text-sm text-green-800 dark:text-green-300">
                  Your password has been updated successfully.
                </p>
              </div>
              <Button
                type="button"
                className="w-full bg-primary hover:bg-primary-hover text-primary-foreground"
                onClick={() => navigate('/login')}
              >
                Continue to Log In
              </Button>
            </div>
          ) : tokenState.status === 'invalid' && !error ? null : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-password">New Password</Label>
                <Input
                  id="new-password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={tokenState.status === 'invalid'}
                  className="bg-input-background border-input-border"
                />
                <p className="text-xs text-muted-foreground">
                  8+ characters, uppercase letter, number, and special character.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm New Password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={tokenState.status === 'invalid'}
                  className="bg-input-background border-input-border"
                />
              </div>

              {error && (
                <div className="bg-error/10 border border-error rounded-md p-3">
                  <p className="text-sm text-error">{error}</p>
                </div>
              )}

              <Button
                type="submit"
                className="w-full bg-primary hover:bg-primary-hover text-primary-foreground"
                disabled={submitting || tokenState.status === 'invalid'}
              >
                {submitting ? 'Updating…' : 'Update Password'}
              </Button>

              <button
                type="button"
                onClick={() => navigate('/login')}
                className="w-full text-sm text-primary hover:underline"
              >
                Back to log in
              </button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
