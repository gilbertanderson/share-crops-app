import { expect, test } from '@playwright/test';
import {
  installApiMocks,
  loginViaForm,
  mockCommunity,
  seedAuthSession,
  TEST_CREDENTIALS,
} from './helpers/mock-api';

test.describe('Mock login', () => {
  test('logs in through the form and enters the app (new user → community setup)', async ({ page }) => {
    // A user with no communities yet: a successful login should route to community setup.
    await installApiMocks(page, { communities: [] });

    await loginViaForm(page);

    await expect(page).toHaveURL(/\/community-setup$/);
    await expect(page.getByRole('heading', { name: 'Join Your Community' })).toBeVisible();
    // The session token the mocked backend handed back is now persisted.
    const token = await page.evaluate(() => localStorage.getItem('sharecrops_token'));
    expect(token).toBeTruthy();
  });

  test('shows an error when the backend rejects the credentials', async ({ page }) => {
    await installApiMocks(page, {
      loginError: { status: 401, message: 'Invalid login credentials' },
    });

    await loginViaForm(page, { email: TEST_CREDENTIALS.email, password: 'WrongPassword123!' });

    await expect(page.getByRole('alert')).toContainText('Invalid login credentials');
    // Still on the auth screen; no session was stored.
    await expect(page.getByRole('button', { name: 'Log In' })).toBeVisible();
    const token = await page.evaluate(() => localStorage.getItem('sharecrops_token'));
    expect(token).toBeNull();
  });

  test('a seeded session boots straight into the marketplace', async ({ page }) => {
    // Reuse the mocks for the data the app fetches, but skip the login UI entirely.
    await installApiMocks(page, { communities: [mockCommunity] });
    await seedAuthSession(page, { communitySelected: true });

    await page.goto('/marketplace');

    await expect(page.getByRole('heading', { name: 'Marketplace' })).toBeVisible();
    // Never bounced back to the login screen.
    await expect(page).toHaveURL(/\/marketplace$/);
  });
});
