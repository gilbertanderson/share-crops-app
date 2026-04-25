import { expect, test } from '@playwright/test';

test.describe('Password Reset Flow', () => {
  test('should show forgot password link on login page', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('heading', { name: 'Share Crops' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Log In' })).toBeVisible();
    
    // Password field should be visible initially
    await expect(page.getByLabel('Password')).toBeVisible();
  });

  test('should navigate to password reset form when clicking forgot password', async ({ page }) => {
    await page.goto('/');

    // Find and click the "Forgot password?" link
    const forgotLink = page.getByRole('button', { name: 'Forgot password?' });
    await expect(forgotLink).toBeVisible();
    await forgotLink.click();

    // Verify the page changes to reset mode
    await expect(page.getByRole('button', { name: 'Send Reset Link' })).toBeVisible();
    
    // Password field should no longer be visible in reset mode
    await expect(page.getByLabel('Password')).not.toBeVisible();
    
    // Email field should still be visible
    await expect(page.getByLabel('Email')).toBeVisible();
  });

  test('should allow user to enter email and request password reset', async ({ page }) => {
    await page.goto('/');

    // Click forgot password link
    await page.getByRole('button', { name: 'Forgot password?' }).click();

    // Fill in email
    const testEmail = `test-${Date.now()}@example.com`;
    await page.getByLabel('Email').fill(testEmail);

    // Submit the form
    const sendButton = page.getByRole('button', { name: 'Send Reset Link' });
    await expect(sendButton).toBeEnabled();
    await sendButton.click();

    // Verify success message appears
    await expect(page.getByText(/If an account exists for/)).toBeVisible();
    await expect(page.getByText(testEmail)).toBeVisible();
    await expect(page.getByText(/you'll receive a password reset link/)).toBeVisible();
  });

  test('should allow returning to login from reset form', async ({ page }) => {
    await page.goto('/');

    // Navigate to reset form
    await page.getByRole('button', { name: 'Forgot password?' }).click();
    await expect(page.getByRole('button', { name: 'Send Reset Link' })).toBeVisible();

    // Click back to login
    await page.getByRole('button', { name: 'Back to log in' }).click();

    // Verify we're back to login form
    await expect(page.getByRole('button', { name: 'Log In' })).toBeVisible();
    await expect(page.getByLabel('Password')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Send Reset Link' })).not.toBeVisible();
  });

  test('should return to login after successful reset request', async ({ page }) => {
    await page.goto('/');

    // Navigate to reset form
    await page.getByRole('button', { name: 'Forgot password?' }).click();

    // Submit reset request
    await page.getByLabel('Email').fill('test@example.com');
    await page.getByRole('button', { name: 'Send Reset Link' }).click();

    // Wait for success message
    await expect(page.getByText(/If an account exists for/)).toBeVisible();

    // Click back to login button shown after success
    const backButton = page.getByRole('button', { name: 'Back to log in' }).last();
    await backButton.click();

    // Verify we're back to login form
    await expect(page.getByRole('button', { name: 'Log In' })).toBeVisible();
    await expect(page.getByLabel('Password')).toBeVisible();
  });

  test('should maintain email input when toggling between login and forgot password', async ({ page }) => {
    await page.goto('/');

    const testEmail = `test-${Date.now()}@example.com`;

    // Enter email on login page
    await page.getByLabel('Email').fill(testEmail);

    // Navigate to forgot password
    await page.getByRole('button', { name: 'Forgot password?' }).click();

    // Email should be preserved
    await expect(page.getByLabel('Email')).toHaveValue(testEmail);

    // Go back to login
    await page.getByRole('button', { name: 'Back to log in' }).click();

    // Email should still be there
    await expect(page.getByLabel('Email')).toHaveValue(testEmail);
  });
});
