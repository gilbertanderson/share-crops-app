import { test, expect, Browser, BrowserContext, Page } from '@playwright/test';

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

// Helper: Create listing
async function createListing(page: Page, title: string, description: string, quantity: string, lookingFor: string) {
  await page.goto(`${API_BASE}/marketplace`);
  await page.click('button:has-text("Create Listing")');

  await page.fill('input[placeholder*="title" i]', title);
  await page.fill('textarea[placeholder*="description" i]', description);
  await page.fill('input[placeholder*="quantity" i]', quantity);
  await page.fill('input[placeholder*="looking for" i]', lookingFor);

  // Set expiration to 30 days
  await page.click('input[placeholder*="days" i]');
  await page.fill('input[placeholder*="days" i]', '30');

  await page.click('button:has-text("Create")');
  await page.waitForNavigation();
  return page.url();
}

// Helper: Make an offer
async function makeOffer(page: Page, listingId: string, produce: string, message?: string) {
  await page.goto(`${API_BASE}/listings/${listingId}`);
  await page.click('button:has-text("Make Offer")');

  await page.fill('input[placeholder*="offering" i]', produce);
  if (message) {
    await page.fill('textarea[placeholder*="message" i]', message);
  }

  await page.click('button:has-text("Submit Offer")');
  await page.waitForTimeout(1000);
}

test.describe('User Scenarios - Complete Workflows', () => {
  test.setTimeout(180000); // 3 minutes per test

  test('Scenario 1: New seller creates listing and receives offer', async ({ browser }) => {
    const seller = testUser('seller');
    const buyer = testUser('buyer');

    // Seller signs up
    let context = await browser.newContext();
    let page = await context.newPage();
    await signUpUser(page, seller);
    await expect(page.locator('text=Welcome')).toBeVisible();

    // Seller creates listing
    await page.goto(`${API_BASE}/marketplace`);
    await page.click('button:has-text("Create Listing")');

    await page.fill('input[placeholder*="title" i]', 'Fresh Tomatoes');
    await page.fill('textarea[placeholder*="description" i]', 'Homegrown organic tomatoes, very fresh');
    await page.fill('input[placeholder*="quantity" i]', '10 lbs');
    await page.fill('input[placeholder*="looking for" i]', 'Fresh herbs or lettuce');
    await page.click('input[placeholder*="days" i]');
    await page.fill('input[placeholder*="days" i]', '30');

    await page.click('button:has-text("Create")');
    await page.waitForNavigation();

    const listingUrl = page.url();
    const listingId = listingUrl.split('/').pop();

    // Verify listing appears
    await expect(page.locator('text=Fresh Tomatoes')).toBeVisible();

    await context.close();

    // Buyer signs up and makes offer
    context = await browser.newContext();
    page = await context.newPage();
    await signUpUser(page, buyer);

    // Buyer searches for listing
    await page.goto(`${API_BASE}/marketplace`);
    await page.waitForTimeout(1000);
    await page.click(`text=Fresh Tomatoes`);

    // Buyer makes offer
    await page.click('button:has-text("Make Offer")');
    await page.fill('input[placeholder*="offering" i]', '2 bunches of fresh basil');
    await page.fill('textarea[placeholder*="message" i]', 'I have beautiful fresh basil!');
    await page.click('button:has-text("Submit Offer")');

    await expect(page.locator('text=Offer submitted')).toBeVisible();

    await context.close();

    // Seller verifies offer received
    context = await browser.newContext();
    page = await context.newPage();
    await loginUser(page, seller);

    await page.goto(`${API_BASE}/offers`);
    await page.click('text=As Seller');

    await expect(page.locator('text=2 bunches of fresh basil')).toBeVisible();
    await expect(page.locator('text=Pending')).toBeVisible();

    await context.close();
  });

  test('Scenario 2: Buyer prevents duplicate offers', async ({ browser }) => {
    const buyer = testUser('buyer');
    const seller = testUser('seller');

    // Setup: Create seller with listing
    let context = await browser.newContext();
    let page = await context.newPage();
    await signUpUser(page, seller);

    await page.goto(`${API_BASE}/marketplace`);
    await page.click('button:has-text("Create Listing")');
    await page.fill('input[placeholder*="title" i]', 'Fresh Eggs');
    await page.fill('textarea[placeholder*="description" i]', 'Farm fresh eggs');
    await page.fill('input[placeholder*="quantity" i]', '2 dozen');
    await page.fill('input[placeholder*="looking for" i]', 'Vegetables');
    await page.click('input[placeholder*="days" i]');
    await page.fill('input[placeholder*="days" i]', '30');
    await page.click('button:has-text("Create")');
    await page.waitForNavigation();

    const listingUrl = page.url();
    const listingId = listingUrl.split('/').pop();

    await context.close();

    // Buyer creates account and makes first offer
    context = await browser.newContext();
    page = await context.newPage();
    await signUpUser(page, buyer);

    await page.goto(`${API_BASE}/listings/${listingId}`);
    await page.click('button:has-text("Make Offer")');
    await page.fill('input[placeholder*="offering" i]', '5 lbs fresh carrots');
    await page.click('button:has-text("Submit Offer")');

    await expect(page.locator('text=Offer submitted')).toBeVisible();
    await page.click('button:has-text("OK")');

    // Try to make duplicate offer - should show existing offer
    await page.click('button:has-text("Make Offer")');
    await page.waitForTimeout(500);

    // Should see existing offer displayed
    await expect(page.locator('text=Your existing offer')).toBeVisible();
    await expect(page.locator('text=5 lbs fresh carrots')).toBeVisible();

    await context.close();
  });

  test('Scenario 3: Buyer deletes and resubmits offer', async ({ browser }) => {
    const buyer = testUser('buyer');
    const seller = testUser('seller');

    // Setup: Create seller with listing
    let context = await browser.newContext();
    let page = await context.newPage();
    await signUpUser(page, seller);

    await page.goto(`${API_BASE}/marketplace`);
    await page.click('button:has-text("Create Listing")');
    await page.fill('input[placeholder*="title" i]', 'Honey');
    await page.fill('textarea[placeholder*="description" i]', 'Local raw honey');
    await page.fill('input[placeholder*="quantity" i]', '1 quart');
    await page.fill('input[placeholder*="looking for" i]', 'Jam or preserves');
    await page.click('input[placeholder*="days" i]');
    await page.fill('input[placeholder*="days" i]', '30');
    await page.click('button:has-text("Create")');
    await page.waitForNavigation();

    const listingUrl = page.url();
    const listingId = listingUrl.split('/').pop();

    await context.close();

    // Buyer makes initial offer
    context = await browser.newContext();
    page = await context.newPage();
    await signUpUser(page, buyer);

    await page.goto(`${API_BASE}/listings/${listingId}`);
    await page.click('button:has-text("Make Offer")');
    await page.fill('input[placeholder*="offering" i]', 'Strawberry jam');
    await page.click('button:has-text("Submit Offer")');
    await expect(page.locator('text=Offer submitted')).toBeVisible();
    await page.click('button:has-text("OK")');

    // Delete offer and submit corrected one
    await page.click('button:has-text("Make Offer")');
    await expect(page.locator('text=Your existing offer')).toBeVisible();

    // Click delete button
    const deleteButtons = await page.locator('button:has-text("Delete")').all();
    await deleteButtons[0].click();

    // Confirm deletion
    await page.click('button:has-text("Delete"):last-of-type');
    await page.waitForTimeout(500);

    // Existing offer should be gone, now can submit new one
    await page.fill('input[placeholder*="offering" i]', 'Homemade blackberry jam - better quality');
    await page.fill('textarea[placeholder*="message" i]', 'This is the better batch');
    await page.click('button:has-text("Submit Offer")');

    await expect(page.locator('text=Offer submitted')).toBeVisible();

    await context.close();
  });

  test('Scenario 4: Seller accepts, completes, and rates buyer', async ({ browser }) => {
    const seller = testUser('seller');
    const buyer = testUser('buyer');

    // Setup: Create listing
    let context = await browser.newContext();
    let page = await context.newPage();
    await signUpUser(page, seller);

    await page.goto(`${API_BASE}/marketplace`);
    await page.click('button:has-text("Create Listing")');
    await page.fill('input[placeholder*="title" i]', 'Peppers');
    await page.fill('textarea[placeholder*="description" i]', 'Colorful bell peppers');
    await page.fill('input[placeholder*="quantity" i]', '5 peppers');
    await page.fill('input[placeholder*="looking for" i]', 'Onions');
    await page.click('input[placeholder*="days" i]');
    await page.fill('input[placeholder*="days" i]', '30');
    await page.click('button:has-text("Create")');
    await page.waitForNavigation();

    const listingId = page.url().split('/').pop();
    await context.close();

    // Buyer makes offer
    context = await browser.newContext();
    page = await context.newPage();
    await signUpUser(page, buyer);

    await page.goto(`${API_BASE}/listings/${listingId}`);
    await page.click('button:has-text("Make Offer")');
    await page.fill('input[placeholder*="offering" i]', '3 lbs sweet onions');
    await page.click('button:has-text("Submit Offer")');
    await expect(page.locator('text=Offer submitted')).toBeVisible();

    await context.close();

    // Seller accepts offer
    context = await browser.newContext();
    page = await context.newPage();
    await loginUser(page, seller);

    await page.goto(`${API_BASE}/offers`);
    await page.click('text=As Seller');
    await page.click('button:has-text("Accept"):first-of-type');
    await page.waitForTimeout(500);

    await expect(page.locator('text=Accepted')).toBeVisible();

    // Mark as completed
    await page.click('button:has-text("Mark as Completed")');
    await page.waitForTimeout(500);

    await expect(page.locator('text=Completed')).toBeVisible();

    // Rate the buyer
    await page.click('button:has-text("Rate Exchange")');
    await page.waitForTimeout(500);

    // Select rating (click on 4th tomato for "Very Good")
    const tomatoButtons = await page.locator('button[aria-label*="tomato"]').all();
    await tomatoButtons[3].click();

    await page.fill('textarea[placeholder*="Share your experience" i]', 'Great trade! Onions were fresh and delivery was timely.');
    await page.click('button:has-text("Submit Rating")');

    await expect(page.locator('text=Rating submitted')).toBeVisible();

    await context.close();
  });

  test('Scenario 5: Buyer views seller ratings on listing', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    // Use tempUser which has existing profile/ratings
    await loginUser(page, { email: 'tempuser@share-crop.com', password: 'tempUserPassword123!' });

    await page.goto(`${API_BASE}/marketplace`);
    await page.waitForTimeout(1000);

    // Click on a listing
    const listing = await page.locator('[role="button"]:has-text("Fresh")').first();
    if (await listing.count() > 0) {
      await listing.click();
      await page.waitForNavigation();

      // Should see seller info with rating
      await expect(page.locator('text=New seller')).toBeVisible().catch(() => {
        // Or see rating if they have one
        return expect(page.locator('[class*="rating"]')).toBeVisible();
      });
    }

    await context.close();
  });

  test('Scenario 6: Multiple offers on same listing', async ({ browser }) => {
    const seller = testUser('seller');
    const buyer1 = testUser('buyer1');
    const buyer2 = testUser('buyer2');

    // Setup: Seller creates listing
    let context = await browser.newContext();
    let page = await context.newPage();
    await signUpUser(page, seller);

    await page.goto(`${API_BASE}/marketplace`);
    await page.click('button:has-text("Create Listing")');
    await page.fill('input[placeholder*="title" i]', 'Zucchini');
    await page.fill('textarea[placeholder*="description" i]', 'Fresh summer zucchini');
    await page.fill('input[placeholder*="quantity" i]', '8 lbs');
    await page.fill('input[placeholder*="looking for" i]', 'Any vegetables');
    await page.click('input[placeholder*="days" i]');
    await page.fill('input[placeholder*="days" i]', '30');
    await page.click('button:has-text("Create")');
    await page.waitForNavigation();

    const listingId = page.url().split('/').pop();
    await context.close();

    // Buyer 1 makes offer
    context = await browser.newContext();
    page = await context.newPage();
    await signUpUser(page, buyer1);
    await page.goto(`${API_BASE}/listings/${listingId}`);
    await page.click('button:has-text("Make Offer")');
    await page.fill('input[placeholder*="offering" i]', 'Cucumber');
    await page.click('button:has-text("Submit Offer")');
    await expect(page.locator('text=Offer submitted')).toBeVisible();
    await context.close();

    // Buyer 2 makes different offer
    context = await browser.newContext();
    page = await context.newPage();
    await signUpUser(page, buyer2);
    await page.goto(`${API_BASE}/listings/${listingId}`);
    await page.click('button:has-text("Make Offer")');
    await page.fill('input[placeholder*="offering" i]', 'Tomatoes and lettuce');
    await page.click('button:has-text("Submit Offer")');
    await expect(page.locator('text=Offer submitted')).toBeVisible();
    await context.close();

    // Seller sees both offers
    context = await browser.newContext();
    page = await context.newPage();
    await loginUser(page, seller);

    await page.goto(`${API_BASE}/offers`);
    await page.click('text=As Seller');

    await expect(page.locator('text=Cucumber')).toBeVisible();
    await expect(page.locator('text=Tomatoes and lettuce')).toBeVisible();

    await context.close();
  });
});
