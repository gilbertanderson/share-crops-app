import { expect, test, Browser, BrowserContext, Page } from '@playwright/test';

const ZIP = '90210';
// Generate unique credentials per run so tests don't collide
const ts = Date.now();
const SELLER_EMAIL = `seller_${ts}@testcrops.dev`;
const SELLER_PASS = 'TestPass1!';
const SELLER_NAME = `Seller ${ts}`;
const BUYER_EMAIL = `buyer_${ts}@testcrops.dev`;
const BUYER_PASS = 'TestPass1!';
const BUYER_NAME = `Buyer ${ts}`;
const COMMUNITY_NAME = `Test Garden ${ts}`;
const LISTING_TITLE = `Fresh Tomatoes ${ts}`;
const OFFER_TEXT = `3 dozen eggs ${ts}`;

async function signup(page: Page, email: string, password: string, name: string) {
  await page.goto('/');
  // Switch to signup mode
  await page.getByRole('button', { name: /don't have an account/i }).click();
  await expect(page.getByLabel('Name')).toBeVisible({ timeout: 5000 });
  await page.getByLabel('Name').fill(name);
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: /^sign up$/i }).click();
  // Wait for either success (community setup) or an error message
  await expect(
    page.getByText(/join your community/i).or(page.getByText(/error|failed|invalid/i))
  ).toBeVisible({ timeout: 60000 });
  // Fail explicitly if we see an error
  const errorText = await page.getByText(/error|failed|invalid/i).textContent().catch(() => null);
  if (errorText) throw new Error(`Signup failed: ${errorText}`);
}

async function login(page: Page, email: string, password: string) {
  await page.goto('/');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: /^log in$/i }).click();
  await expect(page.getByText(/join your community|marketplace/i)).toBeVisible({ timeout: 45000 });
}

async function createCommunity(page: Page, zip: string, communityName: string) {
  // Should be on community setup screen
  await expect(page.getByText(/join your community/i)).toBeVisible({ timeout: 10000 });
  await page.getByLabel(/zip code/i).fill(zip);
  await page.getByRole('button', { name: /find communities/i }).click();
  // Wait for search results to load
  await page.waitForTimeout(3000);
  // If "Create New Community" button available, click it; otherwise the form may already be visible
  const createBtn = page.getByRole('button', { name: /create new community/i });
  if (await createBtn.isVisible()) {
    await createBtn.click();
  }
  // Fill community name input
  await expect(page.getByLabel(/community name/i)).toBeVisible({ timeout: 5000 });
  await page.getByLabel(/community name/i).fill(communityName);
  await page.getByRole('button', { name: /^create community$/i }).click();
  // After creating, lands on marketplace
  await expect(page.getByRole('heading', { name: /marketplace/i })).toBeVisible({ timeout: 45000 });
}

async function joinCommunityByName(page: Page, zip: string, communityName: string) {
  await expect(page.getByText(/join your community/i)).toBeVisible({ timeout: 10000 });
  await page.getByLabel(/zip code/i).fill(zip);
  await page.getByRole('button', { name: /find communities/i }).click();
  // Wait for results to load
  await page.waitForTimeout(3000);
  // Find the community row by partial name match and click Join
  const communityRow = page.getByText(communityName, { exact: false });
  await expect(communityRow).toBeVisible({ timeout: 15000 });
  // The Join button should be near the community name
  await page.getByRole('button', { name: /^join$/i }).first().click();
  await expect(page.getByRole('heading', { name: /marketplace/i })).toBeVisible({ timeout: 45000 });
}

async function createListing(page: Page, title: string) {
  await page.getByRole('button', { name: /list item/i }).click();
  await page.getByLabel(/what are you sharing/i).fill(title);
  await page.getByLabel(/description/i).fill('Freshly picked from the garden, organic.');
  await page.getByLabel(/quantity/i).fill('10 lbs');
  await page.getByRole('button', { name: /create listing/i }).click();
  // Dialog closes, we stay on marketplace
  await expect(page.getByRole('heading', { name: /marketplace/i })).toBeVisible({ timeout: 10000 });
}

async function makeOffer(page: Page, listingTitle: string, offerText: string) {
  // Click listing card
  await page.getByText(listingTitle, { exact: false }).first().click();
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 10000 });
  await page.getByRole('button', { name: /make offer/i }).click();
  await page.getByLabel(/what are you offering/i).fill(offerText);
  await page.getByRole('button', { name: /submit offer/i }).click();
  // Confirm success dialog/alert
  await page.waitForTimeout(1000);
}

async function acceptOffer(page: Page, offerText: string) {
  // Navigate to Offers tab
  await page.getByRole('button', { name: /offers/i }).click();
  // Switch to "As Seller" view
  await page.getByRole('button', { name: /as seller/i }).click();
  // Wait for the offer to appear
  await expect(page.getByText(offerText, { exact: false })).toBeVisible({ timeout: 15000 });
  // Click Accept
  await page.getByRole('button', { name: /^accept$/i }).first().click();
  // Offer should now show Accepted badge
  await expect(page.getByText(/accepted/i).first()).toBeVisible({ timeout: 10000 });
}

async function verifyOfferAccepted(page: Page) {
  await page.getByRole('button', { name: /offers/i }).click();
  await page.getByRole('button', { name: /as buyer/i }).click();
  await expect(page.getByText(/accepted/i).first()).toBeVisible({ timeout: 15000 });
}

test.describe('Buyer / Seller flow', () => {
  test.setTimeout(300000); // 5 minutes — cold-start edge functions can be slow

  test('seller creates listing, buyer makes offer, seller accepts', async ({ browser }) => {
    // --- SELLER SETUP ---
    const sellerCtx: BrowserContext = await browser.newContext();
    const sellerPage: Page = await sellerCtx.newPage();

    await signup(sellerPage, SELLER_EMAIL, SELLER_PASS, SELLER_NAME);
    await createCommunity(sellerPage, ZIP, COMMUNITY_NAME);
    await createListing(sellerPage, LISTING_TITLE);

    // --- BUYER SETUP (separate context = separate localStorage) ---
    const buyerCtx: BrowserContext = await browser.newContext();
    const buyerPage: Page = await buyerCtx.newPage();

    await signup(buyerPage, BUYER_EMAIL, BUYER_PASS, BUYER_NAME);
    await joinCommunityByName(buyerPage, ZIP, COMMUNITY_NAME);

    // Switch to All listings to ensure the seller's listing is visible
    const allBtn = buyerPage.getByRole('button', { name: /all zip/i });
    if (await allBtn.isVisible()) {
      await allBtn.click();
    }
    await buyerPage.waitForTimeout(1500);

    await makeOffer(buyerPage, LISTING_TITLE, OFFER_TEXT);

    // --- SELLER ACCEPTS ---
    await acceptOffer(sellerPage, OFFER_TEXT);

    // --- BUYER VERIFIES ---
    // Reload to pick up the accepted state
    await buyerPage.reload();
    await verifyOfferAccepted(buyerPage);

    await sellerCtx.close();
    await buyerCtx.close();
  });

  test('seller cannot make offer on own listing', async ({ browser }) => {
    const ctx: BrowserContext = await browser.newContext();
    const page: Page = await ctx.newPage();
    const email = `solo_${ts}@testcrops.dev`;

    await signup(page, email, SELLER_PASS, `Solo ${ts}`);
    await createCommunity(page, ZIP, `Solo Community ${ts}`);
    await createListing(page, `Solo Listing ${ts}`);

    // Click own listing
    await page.getByText(`Solo Listing ${ts}`, { exact: false }).first().click();
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 10000 });

    // Make Offer button should NOT be visible for own listing
    await expect(page.getByRole('button', { name: /make offer/i })).not.toBeVisible();
    // Delete button should be visible instead
    await expect(page.getByRole('button', { name: /delete listing/i })).toBeVisible();

    await ctx.close();
  });
});
