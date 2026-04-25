/**
 * Offer Workflow E2E Tests
 *
 * These tests sign up real users, create a community, post a listing,
 * and verify the full buyer → offer → seller accept flow.
 *
 * Tests run serially because each step builds on the previous one.
 */
import { expect, test, Browser, BrowserContext, Page } from '@playwright/test';

const ts = Date.now();
const ZIP = '10001';
const SELLER_EMAIL = `seller_${ts}@testcrops.dev`;
const SELLER_PASS = 'TestPass1!';
const SELLER_NAME = `Seller ${ts}`;
const BUYER_EMAIL = `buyer_${ts}@testcrops.dev`;
const BUYER_PASS = 'TestPass1!';
const BUYER_NAME = `Buyer ${ts}`;
const COMMUNITY_NAME = `Garden ${ts}`;
const LISTING_TITLE = `Fresh Tomatoes ${ts}`;
const OFFER_TEXT = `3 dozen eggs ${ts}`;

// Shared contexts — created once in beforeAll, reused across serial tests
let sellerCtx: BrowserContext;
let buyerCtx: BrowserContext;
let sellerPage: Page;
let buyerPage: Page;

// ─── Helpers ────────────────────────────────────────────────────────────────

async function signup(page: Page, email: string, password: string, name: string) {
  await page.goto('/');
  await page.getByRole('button', { name: /don't have an account/i }).click();
  await expect(page.getByLabel('Name')).toBeVisible({ timeout: 10000 });
  await page.getByLabel('Name').fill(name);
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: /^sign up$/i }).click();
  // After signup the app auto-logs in and moves to community setup
  await expect(page.getByText(/join your community/i)).toBeVisible({ timeout: 60000 });
}

async function createCommunity(page: Page, zip: string, communityName: string) {
  await expect(page.getByText(/join your community/i)).toBeVisible({ timeout: 10000 });
  await page.getByLabel(/zip code/i).fill(zip);
  await page.getByRole('button', { name: /find communities/i }).click();
  // Wait for the search to complete
  await page.waitForTimeout(3000);
  // If there are existing communities a "Create New Community" button appears; click it
  const createNewBtn = page.getByRole('button', { name: /create new community/i });
  if (await createNewBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await createNewBtn.click();
  }
  // Fill community name and submit
  await expect(page.getByLabel(/community name/i)).toBeVisible({ timeout: 5000 });
  await page.getByLabel(/community name/i).fill(communityName);
  await page.getByRole('button', { name: /^create community$/i }).click();
  await expect(page.getByRole('heading', { name: /marketplace/i })).toBeVisible({ timeout: 45000 });
}

async function joinCommunity(page: Page, zip: string, communityName: string) {
  await expect(page.getByText(/join your community/i)).toBeVisible({ timeout: 10000 });
  await page.getByLabel(/zip code/i).fill(zip);
  await page.getByRole('button', { name: /find communities/i }).click();
  await page.waitForTimeout(3000);
  await expect(page.getByText(communityName, { exact: false })).toBeVisible({ timeout: 15000 });
  await page.getByRole('button', { name: /^join$/i }).first().click();
  await expect(page.getByRole('heading', { name: /marketplace/i })).toBeVisible({ timeout: 45000 });
}

async function createListing(page: Page, title: string) {
  await page.getByRole('button', { name: /list item/i }).click();
  await page.getByLabel(/what are you sharing/i).fill(title);
  await page.getByLabel(/description/i).fill('Freshly picked, organic heirlooms.');
  await page.getByRole('button', { name: /^create listing$/i }).click();
  await expect(page.getByRole('heading', { name: /marketplace/i })).toBeVisible({ timeout: 15000 });
}

async function goToOffers(page: Page) {
  await page.getByRole('button', { name: 'Offers' }).click();
  await expect(page.getByRole('heading', { name: /my offers/i })).toBeVisible({ timeout: 10000 });
}

// ─── Suite ──────────────────────────────────────────────────────────────────

test.describe.serial('Offer Workflow - Buyers and Sellers', () => {
  test.setTimeout(300000); // 5 min — edge functions can cold-start slowly

  test.beforeAll(async ({ browser }: { browser: Browser }) => {
    // ── Seller: sign up → create community → post listing ──
    sellerCtx = await browser.newContext();
    sellerPage = await sellerCtx.newPage();
    await signup(sellerPage, SELLER_EMAIL, SELLER_PASS, SELLER_NAME);
    await createCommunity(sellerPage, ZIP, COMMUNITY_NAME);
    await createListing(sellerPage, LISTING_TITLE);

    // ── Buyer: sign up → join same community ──
    buyerCtx = await browser.newContext();
    buyerPage = await buyerCtx.newPage();
    await signup(buyerPage, BUYER_EMAIL, BUYER_PASS, BUYER_NAME);
    await joinCommunity(buyerPage, ZIP, COMMUNITY_NAME);
  });

  test.afterAll(async () => {
    await sellerCtx?.close();
    await buyerCtx?.close();
  });

  // ── Test 1: Buyer can see the listing and make an offer ───────────────────
  test('buyer can make an offer on a listing', async () => {
    await expect(buyerPage.getByRole('heading', { name: /marketplace/i })).toBeVisible({ timeout: 15000 });

    // Switch to "All ZIP" so the seller's listing is visible
    const allZipBtn = buyerPage.getByRole('button', { name: /all zip/i });
    if (await allZipBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await allZipBtn.click();
      await buyerPage.waitForTimeout(1500);
    }

    await expect(buyerPage.getByText(LISTING_TITLE, { exact: false }).first()).toBeVisible({ timeout: 15000 });
    await buyerPage.getByText(LISTING_TITLE, { exact: false }).first().click();

    await expect(buyerPage.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 10000 });

    await buyerPage.getByRole('button', { name: /make offer/i }).click();
    await expect(buyerPage.getByLabel(/what are you offering/i)).toBeVisible({ timeout: 5000 });
    await buyerPage.getByLabel(/what are you offering/i).fill(OFFER_TEXT);
    await buyerPage.getByRole('button', { name: /submit offer/i }).click();

    await buyerPage.waitForTimeout(1500);
  });

  // ── Test 2: Seller can see the incoming offer ─────────────────────────────
  test('seller can view offers received on their listings', async () => {
    await sellerPage.reload();
    await goToOffers(sellerPage);
    await sellerPage.getByRole('button', { name: 'As Seller' }).click();
    await sellerPage.waitForTimeout(1000);
    await expect(sellerPage.getByText(OFFER_TEXT, { exact: false })).toBeVisible({ timeout: 20000 });
  });

  // ── Test 3: Seller can accept the offer ───────────────────────────────────
  test('seller can accept an offer', async () => {
    await expect(sellerPage.getByText(OFFER_TEXT, { exact: false })).toBeVisible({ timeout: 10000 });
    await sellerPage.getByRole('button', { name: /^accept$/i }).first().click();
    await expect(sellerPage.getByText('Accepted').first()).toBeVisible({ timeout: 15000 });
  });

  // ── Test 4: Buyer sees the offer status update ────────────────────────────
  test('buyer sees accepted status on their offer', async () => {
    await buyerPage.reload();
    await goToOffers(buyerPage);
    await buyerPage.getByRole('button', { name: 'As Buyer' }).click();
    await expect(buyerPage.getByText('Accepted').first()).toBeVisible({ timeout: 20000 });
  });

  // ── Test 5: Seller can decline a separate offer ───────────────────────────
  test('seller can decline an offer', async ({ browser }: { browser: Browser }) => {
    const declineTs = Date.now();
    const declineEmail = `buyer2_${declineTs}@testcrops.dev`;
    const declineOffer = `Zucchini ${declineTs}`;

    const ctx2 = await browser.newContext();
    const page2 = await ctx2.newPage();
    try {
      await signup(page2, declineEmail, 'TestPass1!', `Buyer2 ${declineTs}`);
      await joinCommunity(page2, ZIP, COMMUNITY_NAME);

      const allZipBtn = page2.getByRole('button', { name: /all zip/i });
      if (await allZipBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await allZipBtn.click();
        await page2.waitForTimeout(1500);
      }

      await page2.getByText(LISTING_TITLE, { exact: false }).first().click();
      await page2.getByRole('button', { name: /make offer/i }).click();
      await page2.getByLabel(/what are you offering/i).fill(declineOffer);
      await page2.getByRole('button', { name: /submit offer/i }).click();
      await page2.waitForTimeout(1500);
    } finally {
      await ctx2.close();
    }

    await sellerPage.reload();
    await goToOffers(sellerPage);
    await sellerPage.getByRole('button', { name: 'As Seller' }).click();
    await expect(sellerPage.getByText(declineOffer, { exact: false })).toBeVisible({ timeout: 20000 });

    await sellerPage.getByRole('button', { name: /^decline$/i }).first().click();
    await expect(sellerPage.getByText('Declined').first()).toBeVisible({ timeout: 15000 });
  });

  // ── Test 6: Seller cannot make an offer on their own listing ──────────────
  test('seller cannot make offer on own listing', async () => {
    await sellerPage.getByRole('button', { name: 'Home' }).click();
    await expect(sellerPage.getByRole('heading', { name: /marketplace/i })).toBeVisible({ timeout: 10000 });
    await sellerPage.getByText(LISTING_TITLE, { exact: false }).first().click();
    await expect(sellerPage.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 10000 });
    await expect(sellerPage.getByRole('button', { name: /make offer/i })).not.toBeVisible();
  });
});
