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
    const tokenType = hash.get('type') || query.get('type');

    if (code) {
      // PKCE flow: exchange the one-time code for a Supabase session
      supabase.auth
        .exchangeCodeForSession(code)
        .then(({ error: err }) => {
          if (err) {
            setError('This reset link has expired or already been used. Please request a new one.');
            setTokenState({ status: 'invalid' });
          } else {
            setTokenState({ status: 'pkce_ready' });
            // Clean the code param so a page refresh doesn't re-use it
            navigate('/reset-password', { replace: true });
          }
        });
    } else if (accessToken && tokenType === 'recovery') {
      // Implicit flow: access_token + type=recovery in hash — capture token first, then clean URL
      setTokenState({ status: 'direct', token: accessToken });
      navigate('/reset-password', { replace: true });
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
        // Sign out the recovery session so the user logs in fresh with the new password
        await supabase.auth.signOut();
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
              <div className="bg-success/10 border border-success rounded-md p-4">
                <p className="text-sm text-success font-medium">
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
          ) : tokenState.status === 'invalid' ? (
            <div className="space-y-4 text-center">
              <div role="alert" className="bg-error/10 border border-error rounded-md p-4">
                <p className="text-sm text-error">{error}</p>
              </div>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => navigate('/login')}
              >
                Back to Log In
              </Button>
            </div>
          ) : (
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
                  className="bg-input-background border-input-border"
                />
              </div>

              {error && (
                <div role="alert" className="bg-error/10 border border-error rounded-md p-3">
                  <p className="text-sm text-error">{error}</p>
                </div>
              )}

              <Button
                type="submit"
                className="w-full bg-primary hover:bg-primary-hover text-primary-foreground"
                disabled={submitting}
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
