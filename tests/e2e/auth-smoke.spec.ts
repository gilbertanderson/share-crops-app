import { expect, test } from '@playwright/test';

test('shows auth screen and can switch between login and signup', async ({ page }) => {
  await page.goto('/login');

  await expect(page.getByRole('heading', { name: 'Share Crops' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Log In' })).toBeVisible();

  await page.getByRole('button', { name: "Don't have an account? Sign up" }).click();
  await expect(page.getByRole('button', { name: 'Sign Up' })).toBeVisible();
  await expect(page.getByLabel('Name')).toBeVisible();

  await page.getByRole('button', { name: 'Already have an account? Log in' }).click();
  await expect(page.getByRole('button', { name: 'Log In' })).toBeVisible();
});
