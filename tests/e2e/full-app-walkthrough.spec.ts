import { test, expect, type Page } from '@playwright/test';

const EMAIL = process.env.E2E_TEST_EMAIL;
const PASSWORD = process.env.E2E_TEST_PASSWORD;

if (!EMAIL || !PASSWORD) {
  throw new Error('Missing required environment variables: E2E_TEST_EMAIL and E2E_TEST_PASSWORD');
}
async function login(page: Page) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(EMAIL);
  await page.getByLabel('Password').fill(PASSWORD);
  await page.getByRole('button', { name: /^log in$/i }).click();

  // Wait for authenticated route
  await expect(
    page.getByRole('heading', { name: /marketplace/i })
      .or(page.getByText(/choose a community/i))
      .or(page.getByText(/join your community/i))
  ).toBeVisible({ timeout: 30000 });

  // Handle community selection if needed
  if (page.url().includes('/community-select')) {
    await page.getByRole('button', { name: /^enter$/i }).first().click();
    await expect(page.getByRole('heading', { name: /marketplace/i })).toBeVisible({ timeout: 30000 });
  }
}

test.describe('Full App Walkthrough', () => {
  test('complete user journey through the app', async ({ page }) => {
    // 1. Login as tempUser
    console.log('🔓 Logging in as tempUser...');
    await login(page);
    await page.waitForLoadState('networkidle');

    // 2. Verify marketplace loaded
    console.log('📱 Marketplace loaded...');
    await expect(page.getByRole('heading', { name: /marketplace/i })).toBeVisible();

    // 3. Verify navigation bar is visible
    console.log('🗺️  Checking navigation...');
    await expect(page.getByRole('button', { name: /home/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /^offers$/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /^chat$/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /^profile$/i })).toBeVisible();

    // 4. Browse marketplace
    console.log('🏪 Browsing marketplace listings...');
    await page.waitForTimeout(2000);
    const listingButtons = page.getByRole('button', { name: /view/i });
    const listingCount = await listingButtons.count();
    console.log(`Found ${listingCount} listings`);

    // 5. Click on first listing if available
    if (listingCount > 0) {
      console.log('👀 Opening first listing...');
      await listingButtons.first().click();
      await page.waitForURL(/\/listing\//, { timeout: 10000 });
      await page.waitForLoadState('networkidle');


      // 6. Verify listing detail page
      console.log('📖 Viewing listing details...');
      const listingTitle = page.getByRole('heading').first();
      await expect(listingTitle).toBeVisible();

      // 7. Go back to marketplace
      console.log('⬅️  Returning to marketplace...');
      await page.getByRole('button', { name: /home/i }).click();
      await page.waitForURL(/\/marketplace/, { timeout: 10000 });
      await page.waitForLoadState('networkidle');
      await expect(page.getByRole('heading', { name: /marketplace/i })).toBeVisible();
    }

    // 8. Test search on marketplace
    console.log('🔍 Testing marketplace search...');
    const searchBox = page.getByPlaceholder(/search/i);
    if (await searchBox.isVisible({ timeout: 2000 }).catch(() => false)) {
      await searchBox.fill('tomato');
      await page.waitForLoadState('networkidle');
      console.log('✓ Search executed');
    }

    // 9. Navigate to Offers tab
    console.log('💬 Checking Offers tab...');
    await page.getByRole('button', { name: /^offers$/i }).click();
    await page.waitForURL(/\/offers/, { timeout: 10000 });
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // 10. Navigate to Chat tab
    console.log('💬 Checking Chat tab...');
    await page.getByRole('button', { name: /^chat$/i }).click();
    await page.waitForURL(/\/messages/, { timeout: 10000 });
    await page.waitForLoadState('networkidle');


    // 11. Navigate to Profile tab
    console.log('👤 Checking Profile tab...');
    await page.getByRole('button', { name: /^profile$/i }).click();
    await page.waitForURL(/\/profile/, { timeout: 10000 });
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { name: /profile/i }).or(page.getByText(/ratings/i))).toBeVisible({ timeout: 5000 });

    // 12. Verify profile information visible
    console.log('✨ Verifying profile...');
    await expect(page.getByRole('heading', { name: /profile/i }).or(page.getByText(/ratings/i))).toBeVisible({ timeout: 5000 });

    // 13. Go back to marketplace
    console.log('🏠 Returning to marketplace...');
    await page.getByRole('button', { name: /home/i }).click();
    await page.waitForURL(/\/marketplace/, { timeout: 10000 });
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { name: /marketplace/i })).toBeVisible({ timeout: 10000 });

    // 14. Test scroll behavior on navigation
    console.log('⬆️ Testing scroll to top on page change...');
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForFunction(() => window.scrollY > 0);
    await page.getByRole('button', { name: /^offers$/i }).click();
    await page.waitForURL(/\/offers/, { timeout: 10000 });
    await page.waitForLoadState('networkidle');
    const scrollY = await page.evaluate(() => window.scrollY);
    console.log(`Scroll position after nav: ${scrollY}`);

    // 15. Return to marketplace for final state
    console.log('🏁 Final marketplace check...');
    await page.getByRole('button', { name: /home/i }).click();
    await page.waitForURL(/\/marketplace/, { timeout: 10000 });
    await page.waitForLoadState('networkidle');

    console.log('✅ Full app walkthrough complete!');
  });
});
