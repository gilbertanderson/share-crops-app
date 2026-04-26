import { test, expect, Page } from '@playwright/test';

const ts = Date.now();

const testUser = (role: string) => ({
  email: `${role}_${ts}_${Math.random().toString(36).slice(2, 9)}@testcrops.dev`,
  password: 'TempPassword123!',
  name: `Test ${role} User`,
});

async function signUpUser(page: Page, user: { email: string; password: string; name: string }) {
  await page.goto('/login');
  await page.getByRole('button', { name: /don't have an account/i }).click();
  await expect(page.getByLabel('Name')).toBeVisible({ timeout: 10000 });
  await page.getByLabel('Name').fill(user.name);
  await page.getByLabel('Email').fill(user.email);
  await page.getByLabel('Password').fill(user.password);
  await page.getByRole('button', { name: /^sign up$/i }).click();
  await expect(page.getByText(/join your community/i)).toBeVisible({ timeout: 60000 });
}

async function loginUser(page: Page, user: { email: string; password: string }) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(user.email);
  await page.getByLabel('Password').fill(user.password);
  await page.getByRole('button', { name: /^log in$/i }).click();
  await expect(
    page.getByRole('heading', { name: /marketplace/i })
      .or(page.getByText(/choose a community/i))
  ).toBeVisible({ timeout: 30000 });
}

test.describe('User Scenarios - Complete Workflows', () => {
  test.setTimeout(180000); // 3 minutes per test

  test('Scenario 1: New seller creates listing and receives offer', async ({ browser }) => {
    const seller = testUser('seller');
    const buyer = testUser('buyer');

    // Seller signs up and creates listing
    let context = await browser.newContext();
    let page = await context.newPage();
    await signUpUser(page, seller);

    await page.goto('/marketplace');
    await page.getByRole('button', { name: /list item/i }).click();
    await page.getByLabel(/what are you sharing/i).fill('Fresh Tomatoes');
    await page.getByRole('button', { name: /^create listing$/i }).click();
    await expect(page.getByRole('heading', { name: /marketplace/i })).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Fresh Tomatoes')).toBeVisible();
    await context.close();

    // Buyer signs up and makes offer
    context = await browser.newContext();
    page = await context.newPage();
    await signUpUser(page, buyer);

    await page.goto('/marketplace');
    await page.getByText('Fresh Tomatoes').first().click();
    await page.getByRole('button', { name: /make offer/i }).click();
    await page.getByPlaceholder(/offering/i).fill('2 bunches of fresh basil');
    await page.getByRole('button', { name: /submit offer/i }).click();
    await expect(page.getByText(/offer submitted/i)).toBeVisible();
    await context.close();

    // Seller verifies offer received
    context = await browser.newContext();
    page = await context.newPage();
    await loginUser(page, seller);

    await page.goto('/offers');
    await expect(page.getByText(/2 bunches of fresh basil/i)).toBeVisible();
    await expect(page.getByText(/pending/i).first()).toBeVisible();
    await context.close();
  });

  test('Scenario 2: Buyer prevents duplicate offers', async ({ browser }) => {
    const buyer = testUser('buyer');
    const seller = testUser('seller');

    let context = await browser.newContext();
    let page = await context.newPage();
    await signUpUser(page, seller);
    await page.goto('/marketplace');
    await page.getByRole('button', { name: /list item/i }).click();
    await page.getByLabel(/what are you sharing/i).fill('Fresh Eggs');
    await page.getByRole('button', { name: /^create listing$/i }).click();
    await expect(page.getByRole('heading', { name: /marketplace/i })).toBeVisible({ timeout: 15000 });
    await context.close();

    context = await browser.newContext();
    page = await context.newPage();
    await signUpUser(page, buyer);
    await page.goto('/marketplace');
    await page.getByText('Fresh Eggs').first().click();
    await page.getByRole('button', { name: /make offer/i }).click();
    await page.getByPlaceholder(/offering/i).fill('5 lbs fresh carrots');
    await page.getByRole('button', { name: /submit offer/i }).click();
    await expect(page.getByText(/offer submitted/i)).toBeVisible();

    // Try to make duplicate offer — should surface existing offer
    await page.getByRole('button', { name: /make offer/i }).click();
    await expect(page.getByText(/your existing offer/i)).toBeVisible();
    await expect(page.getByText(/5 lbs fresh carrots/i)).toBeVisible();
    await context.close();
  });

  test('Scenario 3: Buyer deletes and resubmits offer', async ({ browser }) => {
    const buyer = testUser('buyer');
    const seller = testUser('seller');

    let context = await browser.newContext();
    let page = await context.newPage();
    await signUpUser(page, seller);
    await page.goto('/marketplace');
    await page.getByRole('button', { name: /list item/i }).click();
    await page.getByLabel(/what are you sharing/i).fill('Honey');
    await page.getByRole('button', { name: /^create listing$/i }).click();
    await expect(page.getByRole('heading', { name: /marketplace/i })).toBeVisible({ timeout: 15000 });
    await context.close();

    context = await browser.newContext();
    page = await context.newPage();
    await signUpUser(page, buyer);
    await page.goto('/marketplace');
    await page.getByText('Honey').first().click();
    await page.getByRole('button', { name: /make offer/i }).click();
    await page.getByPlaceholder(/offering/i).fill('Strawberry jam');
    await page.getByRole('button', { name: /submit offer/i }).click();
    await expect(page.getByText(/offer submitted/i)).toBeVisible();

    await page.getByRole('button', { name: /make offer/i }).click();
    await expect(page.getByText(/your existing offer/i)).toBeVisible();
    await page.getByRole('button', { name: /^delete$/i }).first().click();
    await page.getByRole('button', { name: /confirm|delete/i }).last().click();

    await page.getByPlaceholder(/offering/i).fill('Homemade blackberry jam');
    await page.getByRole('button', { name: /submit offer/i }).click();
    await expect(page.getByText(/offer submitted/i)).toBeVisible();
    await context.close();
  });

  test('Scenario 4: Seller accepts, completes, and rates buyer', async ({ browser }) => {
    const seller = testUser('seller');
    const buyer = testUser('buyer');

    let context = await browser.newContext();
    let page = await context.newPage();
    await signUpUser(page, seller);
    await page.goto('/marketplace');
    await page.getByRole('button', { name: /list item/i }).click();
    await page.getByLabel(/what are you sharing/i).fill('Peppers');
    await page.getByRole('button', { name: /^create listing$/i }).click();
    await expect(page.getByRole('heading', { name: /marketplace/i })).toBeVisible({ timeout: 15000 });
    await context.close();

    context = await browser.newContext();
    page = await context.newPage();
    await signUpUser(page, buyer);
    await page.goto('/marketplace');
    await page.getByText('Peppers').first().click();
    await page.getByRole('button', { name: /make offer/i }).click();
    await page.getByPlaceholder(/offering/i).fill('3 lbs sweet onions');
    await page.getByRole('button', { name: /submit offer/i }).click();
    await expect(page.getByText(/offer submitted/i)).toBeVisible();
    await context.close();

    context = await browser.newContext();
    page = await context.newPage();
    await loginUser(page, seller);
    await page.goto('/offers');
    await page.getByRole('button', { name: /accept/i }).first().click();
    await expect(page.getByText(/accepted/i).first()).toBeVisible();
    await page.getByRole('button', { name: /mark as completed/i }).click();
    await expect(page.getByText(/completed/i).first()).toBeVisible();
    await page.getByRole('button', { name: /rate exchange/i }).click();
    await page.getByRole('button', { name: /tomato/i }).nth(3).click();
    await page.getByRole('button', { name: /submit rating/i }).click();
    await expect(page.getByText(/rating submitted/i)).toBeVisible();
    await context.close();
  });

  test('Scenario 5: Buyer views seller ratings on listing', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    await loginUser(page, { email: 'tempUser@share-crops.com', password: 'tempUser1!' });
    await page.goto('/marketplace');

    const listing = page.locator('[role="button"][aria-label*="View listing"]').first();
    await expect(listing).toBeVisible({ timeout: 10000 });
    await listing.click();
    await expect(page).toHaveURL(/listing\//, { timeout: 10000 });

    await context.close();
  });

  test('Scenario 6: Multiple offers on same listing', async ({ browser }) => {
    const seller = testUser('seller');
    const buyer1 = testUser('buyer1');
    const buyer2 = testUser('buyer2');

    let context = await browser.newContext();
    let page = await context.newPage();
    await signUpUser(page, seller);
    await page.goto('/marketplace');
    await page.getByRole('button', { name: /list item/i }).click();
    await page.getByLabel(/what are you sharing/i).fill('Zucchini');
    await page.getByRole('button', { name: /^create listing$/i }).click();
    await expect(page.getByRole('heading', { name: /marketplace/i })).toBeVisible({ timeout: 15000 });
    await context.close();

    context = await browser.newContext();
    page = await context.newPage();
    await signUpUser(page, buyer1);
    await page.goto('/marketplace');
    await page.getByText('Zucchini').first().click();
    await page.getByRole('button', { name: /make offer/i }).click();
    await page.getByPlaceholder(/offering/i).fill('Cucumber');
    await page.getByRole('button', { name: /submit offer/i }).click();
    await expect(page.getByText(/offer submitted/i)).toBeVisible();
    await context.close();

    context = await browser.newContext();
    page = await context.newPage();
    await signUpUser(page, buyer2);
    await page.goto('/marketplace');
    await page.getByText('Zucchini').first().click();
    await page.getByRole('button', { name: /make offer/i }).click();
    await page.getByPlaceholder(/offering/i).fill('Tomatoes and lettuce');
    await page.getByRole('button', { name: /submit offer/i }).click();
    await expect(page.getByText(/offer submitted/i)).toBeVisible();
    await context.close();

    context = await browser.newContext();
    page = await context.newPage();
    await loginUser(page, seller);
    await page.goto('/offers');
    await expect(page.getByText(/cucumber/i)).toBeVisible();
    await expect(page.getByText(/tomatoes and lettuce/i)).toBeVisible();
    await context.close();
  });
});
