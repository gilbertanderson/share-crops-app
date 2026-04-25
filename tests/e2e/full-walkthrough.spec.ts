import { test } from '@playwright/test';

test('full app walkthrough - complete end-to-end flow', async ({ page }) => {
  // 1. Load app
  console.log('🔓 Step 1: Load app');
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  // 2. Navigate to marketplace
  console.log('🏪 Step 2: Navigate to marketplace');
  await page.goto('/marketplace');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  // 3. Scroll down marketplace
  console.log('👀 Step 3: Scroll marketplace');
  await page.evaluate(() => window.scrollBy(0, window.innerHeight * 0.5));
  await page.waitForTimeout(1000);
  await page.evaluate(() => window.scrollBy(0, window.innerHeight * 0.5));
  await page.waitForTimeout(1500);

  // 4. Try clicking a listing if available
  console.log('🔍 Step 4: Interact with listings');
  const firstListing = page.locator('[data-mobile-card-id], [role="button"][aria-label*="listing"]').first();
  if (await firstListing.count().then(c => c > 0)) {
    await firstListing.click().catch(() => null);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);
    // Scroll listing detail
    await page.evaluate(() => window.scrollBy(0, window.innerHeight * 0.5));
    await page.waitForTimeout(1000);
  }

  // 5. Navigate to offers
  console.log('📋 Step 5: Navigate to Offers');
  await page.goto('/offers').catch(() => null);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1500);
  // Scroll offers
  await page.evaluate(() => window.scrollBy(0, window.innerHeight * 0.5));
  await page.waitForTimeout(1000);

  // 6. Navigate to messages
  console.log('💬 Step 6: Navigate to Messages');
  await page.goto('/messages').catch(() => null);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1500);
  // Scroll messages
  await page.evaluate(() => window.scrollBy(0, window.innerHeight * 0.5));
  await page.waitForTimeout(1000);

  // 7. Navigate to profile
  console.log('👤 Step 7: Navigate to Profile');
  await page.goto('/profile').catch(() => null);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1500);
  // Scroll profile
  await page.evaluate(() => window.scrollBy(0, window.innerHeight * 0.5));
  await page.waitForTimeout(1000);
  await page.evaluate(() => window.scrollBy(0, window.innerHeight * 0.5));
  await page.waitForTimeout(1000);

  // 8. Back to marketplace
  console.log('🏪 Step 8: Return to marketplace');
  await page.goto('/marketplace');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1500);

  // 9. Scroll marketplace again
  console.log('📜 Step 9: Final marketplace browse');
  await page.evaluate(() => window.scrollBy(0, window.innerHeight * 0.5));
  await page.waitForTimeout(1000);
  await page.evaluate(() => window.scrollBy(0, window.innerHeight * 0.5));
  await page.waitForTimeout(1000);

  // 10. Offers again
  console.log('📋 Step 10: Back to Offers');
  await page.goto('/offers').catch(() => null);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1500);

  // 11. Messages again
  console.log('💬 Step 11: Back to Messages');
  await page.goto('/messages').catch(() => null);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);

  // 12. Profile again
  console.log('👤 Step 12: Back to Profile');
  await page.goto('/profile').catch(() => null);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);

  // 13. Scroll profile final time
  console.log('📜 Step 13: Scroll profile');
  await page.evaluate(() => window.scrollBy(0, window.innerHeight * 0.5));
  await page.waitForTimeout(1000);

  // 14. Marketplace final view
  console.log('🏪 Step 14: Final marketplace');
  await page.goto('/marketplace');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  console.log('✅ Full app walkthrough complete!');
});
