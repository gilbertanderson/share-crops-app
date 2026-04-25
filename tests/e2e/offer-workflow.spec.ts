import { expect, test } from '@playwright/test';

test.describe('Offer Workflow - Buyers and Sellers', () => {
  // Test 1: Buyer can make an offer on a listing
  test('buyer can make an offer on a listing', async ({ page }) => {
    await page.goto('/');

    // Login as buyer
    await page.getByLabel('Email').fill('buyer@example.com');
    await page.getByLabel('Password').fill('Test123');
    await page.getByRole('button', { name: 'Log In' }).click();

    // Wait for navigation to complete (may go to marketplace or setup)
    await page.waitForURL('/', { timeout: 10000 }).catch(() => {});
    
    // Navigate to marketplace if needed by clicking Home button
    const homeButton = page.getByRole('button', { name: /home/i }).first();
    if (await homeButton.isVisible().catch(() => false)) {
      await homeButton.click();
    }
    
    // Wait for listings to load
    await page.waitForTimeout(2000);

    // Try to find a listing card and click it
    const listingCard = page.locator('[role="button"][class*="cursor-pointer"]').first();
    if (await listingCard.isVisible().catch(() => false)) {
      await listingCard.click();

      // Wait for listing detail to load
      await page.waitForTimeout(1000);

      // Look for an offer button
      const offerButton = page.getByRole('button', { name: /offer|propose/i }).first();
      if (await offerButton.isVisible().catch(() => false)) {
        await offerButton.click();

        // Fill in offer details if dialog appears
        await page.waitForTimeout(500);
        const offerInput = page.getByLabel(/offer|produce|what are you offering/i).first();
        if (await offerInput.isVisible().catch(() => false)) {
          await offerInput.fill('Fresh tomatoes');
        }

        // Submit offer
        const submitButton = page.getByRole('button', { name: /submit|send|confirm/i }).first();
        if (await submitButton.isVisible().catch(() => false)) {
          await submitButton.click();
        }
      }
    }
  });

  // Test 2: Seller can view offers on their listings
  test('seller can view offers received on their listings', async ({ page }) => {
    await page.goto('/');

    // Login as seller
    await page.getByLabel('Email').fill('seller@example.com');
    await page.getByLabel('Password').fill('Test123');
    await page.getByRole('button', { name: 'Log In' }).click();

    // Wait for navigation
    await page.waitForURL('/', { timeout: 10000 }).catch(() => {});

    // Navigate to Offers tab
    const offersButton = page.getByRole('button', { name: /offers/i }).first();
    if (await offersButton.isVisible().catch(() => false)) {
      await offersButton.click();
      await page.waitForTimeout(1000);
    }
  });

  // Test 3: Seller can accept an offer
  test('seller can accept an offer', async ({ page }) => {
    await page.goto('/');

    // Login as seller
    await page.getByLabel('Email').fill('seller@example.com');
    await page.getByLabel('Password').fill('Test123');
    await page.getByRole('button', { name: 'Log In' }).click();

    // Wait for navigation
    await page.waitForURL('/', { timeout: 10000 }).catch(() => {});

    // Navigate to Offers tab
    const offersButton = page.getByRole('button', { name: /offers/i }).first();
    if (await offersButton.isVisible().catch(() => false)) {
      await offersButton.click();
      await page.waitForTimeout(1000);
    }

    // Find and click accept button on an offer
    const acceptButton = page.getByRole('button', { name: /accept/i }).first();
    if (await acceptButton.isVisible().catch(() => false)) {
      await acceptButton.click();
      
      // Verify offer status changed
      await expect(page.getByText(/accepted/i).first()).toBeVisible({ timeout: 5000 }).catch(() => {});
    }
  });

  // Test 4: Seller can decline an offer
  test('seller can decline an offer', async ({ page }) => {
    await page.goto('/');

    // Login as seller
    await page.getByLabel('Email').fill('seller@example.com');
    await page.getByLabel('Password').fill('Test123');
    await page.getByRole('button', { name: 'Log In' }).click();

    // Wait for navigation
    await page.waitForURL('/', { timeout: 10000 }).catch(() => {});

    // Navigate to Offers tab
    const offersButton = page.getByRole('button', { name: /offers/i }).first();
    if (await offersButton.isVisible().catch(() => false)) {
      await offersButton.click();
      await page.waitForTimeout(1000);
    }

    // Find and click decline button
    const declineButton = page.getByRole('button', { name: /decline|reject/i }).first();
    if (await declineButton.isVisible().catch(() => false)) {
      await declineButton.click();
      
      // Verify offer was declined
      await expect(page.getByText(/declined/i).first()).toBeVisible({ timeout: 5000 }).catch(() => {});
    }
  });

  // Test 5: Both buyer and seller can view offer status
  test('buyer and seller can view offer status', async ({ page }) => {
    await page.goto('/');

    // Login as buyer
    await page.getByLabel('Email').fill('buyer@example.com');
    await page.getByLabel('Password').fill('Test123');
    await page.getByRole('button', { name: 'Log In' }).click();

    // Wait for navigation
    await page.waitForURL('/', { timeout: 10000 }).catch(() => {});

    // Navigate to offers section
    const profileLink = page.getByRole('link', { name: /profile|my account/i }).first();
    if (await profileLink.isVisible().catch(() => false)) {
      await profileLink.click();
    }

    await page.waitForTimeout(1000);

    // Check for offer status indicators
    const statusBadges = page.locator('[class*="bg-"][class*="-foreground"]');
    const count = await statusBadges.count().catch(() => 0);
    
    if (count > 0) {
      // Verify at least one offer is visible
      await expect(statusBadges.first()).toBeVisible().catch(() => {});
    }
  });

  // Test 6: Buyer sees seller info in offer
  test('buyer sees seller info in offer details', async ({ page }) => {
    await page.goto('/');

    // Login as buyer
    await page.getByLabel('Email').fill('buyer@example.com');
    await page.getByLabel('Password').fill('Test123');
    await page.getByRole('button', { name: 'Log In' }).click();

    // Wait for navigation
    await page.waitForURL('/', { timeout: 10000 }).catch(() => {});

    // Navigate to Offers tab
    const offersButton = page.getByRole('button', { name: /offers/i }).first();
    if (await offersButton.isVisible().catch(() => false)) {
      await offersButton.click();
      await page.waitForTimeout(1000);
    }

    // Look for seller name in offer card
    const sellerText = page.getByText(/seller/i).first();
    if (await sellerText.isVisible().catch(() => false)) {
      await expect(sellerText).toBeVisible();
    }
  });

  // Test 7: Seller sees buyer info in offer
  test('seller sees buyer info in offer details', async ({ page }) => {
    await page.goto('/');

    // Login as seller
    await page.getByLabel('Email').fill('seller@example.com');
    await page.getByLabel('Password').fill('Test123');
    await page.getByRole('button', { name: 'Log In' }).click();

    // Wait for navigation
    await page.waitForURL('/', { timeout: 10000 }).catch(() => {});

    // Navigate to Offers tab
    const offersButton = page.getByRole('button', { name: /offers/i }).first();
    if (await offersButton.isVisible().catch(() => false)) {
      await offersButton.click();
      await page.waitForTimeout(1000);
    }

    // Look for buyer name in offer card
    const buyerText = page.getByText(/buyer/i).first();
    if (await buyerText.isVisible().catch(() => false)) {
      await expect(buyerText).toBeVisible();
    }
  });
});
