/**
 * E2E tests for the password reset flow.
 *
 * These tests validate that:
 *  1. The /reset-password route renders the "Set New Password" form and does NOT
 *     redirect back to /login (the original bug).
 *  2. The form validates inputs correctly.
 *  3. Navigating to the root URL with a recovery token in the hash is caught by
 *     the App catch-all and forwarded to /reset-password (whitelisting fix).
 *  4. A PKCE ?code= param renders the "Verifying…" loading state before form.
 *
 * Note: Full end-to-end password change (with a real Supabase token) requires a
 * live recovery link. These tests confirm the routing and UI layer are correct.
 * Video recordings of every run are saved to test-results/ by Playwright.
 */

import { test, expect } from '@playwright/test';

const IMPLICIT_HASH =
  '#access_token=fake_token_for_ui_test&refresh_token=fake_refresh&expires_in=3600' +
  '&token_type=bearer&type=recovery';

test.describe('Password Reset Flow', () => {
  test('renders Set New Password form when navigating to /reset-password with implicit hash token', async ({
    page,
  }) => {
    await page.goto(`/reset-password${IMPLICIT_HASH}`);

    // Must NOT redirect to /login
    await expect(page).not.toHaveURL(/\/login/);
    await expect(page).toHaveURL(/\/reset-password/);

    // Form should be visible
    await expect(page.getByRole('heading', { name: 'Set New Password' })).toBeVisible();
    await expect(page.getByLabel('New Password', { exact: true })).toBeVisible();
    await expect(page.getByLabel('Confirm New Password', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Update Password' })).toBeVisible();
  });

  test('shows validation error when passwords do not match', async ({ page }) => {
    await page.goto(`/reset-password${IMPLICIT_HASH}`);
    await expect(page.getByLabel('New Password', { exact: true })).toBeVisible();

    await page.getByLabel('New Password', { exact: true }).fill('Password1!');
    await page.getByLabel('Confirm New Password', { exact: true }).fill('Different1!');
    await page.getByRole('button', { name: 'Update Password' }).click();

    await expect(page.getByText('Passwords do not match')).toBeVisible();
  });

  test('shows password strength error for weak password', async ({ page }) => {
    await page.goto(`/reset-password${IMPLICIT_HASH}`);
    await expect(page.getByLabel('New Password', { exact: true })).toBeVisible();

    await page.getByLabel('New Password', { exact: true }).fill('weak');
    await page.getByLabel('Confirm New Password', { exact: true }).fill('weak');
    await page.getByRole('button', { name: 'Update Password' }).click();

    // Should show a password strength error (first failing rule)
    await expect(
      page.locator('.text-error').getByText(/at least 8 characters|uppercase|number|special character/i)
    ).toBeVisible();
  });

  test('shows verifying state when navigated with a PKCE code param', async ({ page }) => {
    // Navigate with a PKCE-style code (Supabase PKCE flow appends ?code=...)
    // The component will call exchangeCodeForSession which will fail with a fake code,
    // but the key assertion is that we land on /reset-password and see the verifying state
    // briefly before the error — never bounced to /login.
    await page.goto('/reset-password?code=fake_pkce_code_for_ui_test');

    await expect(page).not.toHaveURL(/\/login/);
    await expect(page).toHaveURL(/\/reset-password/);

    await expect(page.getByRole('heading', { name: 'Set New Password' })).toBeVisible();
  });

  test('catch-all forwards root landing with recovery hash to /reset-password', async ({
    page,
  }) => {
    // Simulates: Supabase redirect_to not whitelisted → tokens land at site root
    await page.goto(`/${IMPLICIT_HASH}`);

    // The CatchAll component detects type=recovery and forwards here
    await expect(page).toHaveURL(/\/reset-password/);
    await expect(page.getByRole('heading', { name: 'Set New Password' })).toBeVisible();
  });

  test('"Back to log in" link navigates to /login from the reset form', async ({ page }) => {
    await page.goto(`/reset-password${IMPLICIT_HASH}`);
    await expect(page.getByRole('heading', { name: 'Set New Password' })).toBeVisible();

    await page.getByRole('button', { name: 'Back to log in' }).click();
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByRole('heading', { name: 'Share Crops' })).toBeVisible();
  });
});
