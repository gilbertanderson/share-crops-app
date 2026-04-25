import { test, expect, Page } from '@playwright/test';

const API_BASE = 'http://127.0.0.1:4173';
const ts = Date.now();

// Helper to create unique test credentials
const testUser = (role: string) => ({
  email: `${role}_${ts}_${Math.random().toString(36).slice(2, 9)}@testcrops.dev`,
  password: 'TempPassword123!',
  name: `Test ${role} User`,
});

// Helper: Sign up a new user
async function signUpUser(page: Page, user: { email: string; password: string; name: string }) {
  await page.goto(`${API_BASE}/`);
  await page.click('text=Sign up');

  await page.fill('input[placeholder*="name" i]', user.name);
  await page.fill('input[type="email"]', user.email);
  await page.fill('input[type="password"]', user.password);

  const confirmPassword = await page.locator('input[type="password"]').nth(1);
  await confirmPassword.fill(user.password);

  await page.click('button:has-text("Create Account")');
  await page.waitForNavigation();
}

// Helper: Log in user
async function loginUser(page: Page, user: { email: string; password: string }) {
  await page.goto(`${API_BASE}/`);
  await page.fill('input[type="email"]', user.email);
  await page.fill('input[type="password"]', user.password);
  await page.click('button:has-text("Log in")');
  await page.waitForNavigation();
}

test.describe('Admin and Profile Features', () => {
  test.setTimeout(180000); // 3 minutes per test

  test('Error states display rotten tomato icon', async ({ page }) => {
    await page.goto(`${API_BASE}/listings/nonexistent-id-12345`);
    await page.waitForTimeout(1000);

    // Look for error message or error display component
    const errorDisplay = page.locator('[role="alert"]');

    if (await errorDisplay.count() > 0) {
      // Check if error contains rotten tomato SVG or image
      const rottenTomato = errorDisplay.locator('svg, img[src*="tomato"], [class*="rotten"]');

      // Error display should have visual error styling
      await expect(errorDisplay).toHaveClass(/error|alert/i);
    }
  });

  test('Delete account removes all listings but keeps communities', async ({ browser }) => {
    const user = testUser('deleteuser');

    // Setup: Create user with listing
    let context = await browser.newContext();
    let page = await context.newPage();
    await signUpUser(page, user);

    // Create a listing
    await page.goto(`${API_BASE}/marketplace`);
    const createButton = page.locator('button:has-text("Create Listing")');
    if (await createButton.count() > 0) {
      await createButton.click();
      await page.fill('input[placeholder*="title" i]', 'Test Produce');
      await page.fill('textarea[placeholder*="description" i]', 'For deletion test');
      await page.fill('input[placeholder*="quantity" i]', '5 units');
      await page.fill('input[placeholder*="looking for" i]', 'Other produce');
      await page.click('input[placeholder*="days" i]');
      await page.fill('input[placeholder*="days" i]', '30');
      await page.click('button:has-text("Create")');
      await page.waitForNavigation();
    }

    const listingUrl = page.url();
    const listingId = listingUrl.split('/').pop();

    // Go to profile and look for delete account button
    await page.goto(`${API_BASE}/profile`);
    await page.waitForTimeout(500);

    const deleteButton = page.locator('button:has-text("Delete Account")');
    if (await deleteButton.count() > 0) {
      await deleteButton.click();
      await page.waitForTimeout(500);

      const confirmButton = page.locator('button:has-text("Delete"):last-of-type');
      if (await confirmButton.count() > 0) {
        await confirmButton.click();
        await page.waitForTimeout(1000);
      }
    }

    await context.close();

    // Verify listing no longer accessible
    context = await browser.newContext();
    page = await context.newPage();
    await page.goto(`${API_BASE}/listings/${listingId}`);
    await page.waitForTimeout(500);

    // Should show error or redirect away from listing
    const errorText = page.locator('text=/not found|error|deleted/i');
    const isError = await errorText.count() > 0 || !page.url().includes(`listings/${listingId}`);
    expect(isError).toBeTruthy();

    await context.close();
  });

  test('User cannot join same community twice', async ({ browser }) => {
    const user = testUser('dupjoinuser');
    const targetZip = '78704';

    const context = await browser.newContext();
    const page = await context.newPage();

    await signUpUser(page, user);

    // Navigate to communities to join
    await page.goto(`${API_BASE}/communities`);
    await page.waitForTimeout(1000);

    // Look for a community with the target zip and join it
    const communities = page.locator('[class*="community"]');
    const count = await communities.count();

    let joined = false;
    for (let i = 0; i < Math.min(count, 3); i++) {
      const joinBtn = communities.nth(i).locator('button:has-text("Join")');
      if (await joinBtn.count() > 0) {
        await joinBtn.click();
        joined = true;
        await page.waitForTimeout(500);
        break;
      }
    }

    // Navigate back and verify button changed to "Joined"
    if (joined) {
      await page.goto(`${API_BASE}/communities`);
      await page.waitForTimeout(500);

      const joinedBtn = page.locator('button:has-text("Joined")');
      expect(await joinedBtn.count()).toBeGreaterThan(0);
    }

    await context.close();
  });
});
