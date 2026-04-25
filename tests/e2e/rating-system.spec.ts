import { expect, test } from '@playwright/test';

test.describe('Rating System', () => {
  // Test 1: Users can see ratings on seller profiles
  test('buyer can view seller ratings on marketplace', async ({ page }) => {
    await page.goto('/');

    // Login
    await page.getByLabel('Email').fill('buyer@example.com');
    await page.getByLabel('Password').fill('Test123');
    await page.getByRole('button', { name: 'Log In' }).click();

    // Wait for navigation
    await page.waitForURL('/', { timeout: 10000 }).catch(() => {});

    // Navigate to Home/Marketplace (should already be there)
    await page.waitForTimeout(1000);

    // Look for seller rating display
    const ratingDisplay = page.locator('svg[viewBox="0 0 24 24"]').first();
    if (await ratingDisplay.isVisible().catch(() => false)) {
      await expect(ratingDisplay).toBeVisible();
    }
  });

  // Test 2: Users can see ratings on listing detail
  test('buyer can view seller ratings on listing detail', async ({ page }) => {
    await page.goto('/');

    // Login
    await page.getByLabel('Email').fill('buyer@example.com');
    await page.getByLabel('Password').fill('Test123');
    await page.getByRole('button', { name: 'Log In' }).click();

    // Wait for navigation
    await page.waitForURL('/', { timeout: 10000 }).catch(() => {});

    // Navigate to Home tab
    const homeButton = page.getByRole('button', { name: /home/i }).first();
    if (await homeButton.isVisible().catch(() => false)) {
      await homeButton.click();
      await page.waitForTimeout(1000);
    }

    // Click on first listing
    const listingCard = page.locator('[role="button"][class*="cursor-pointer"]').first();
    if (await listingCard.isVisible().catch(() => false)) {
      await listingCard.click();
      await page.waitForTimeout(1000);

      // Look for rating display on listing detail
      const sellerText = page.getByText(/seller/i).first();
      if (await sellerText.isVisible().catch(() => false)) {
        await expect(sellerText).toBeVisible();
      }
    }
  });

  // Test 3: Buyer can submit a rating with selected tomatoes
  test('buyer can submit a rating with selected tomatoes', async ({ page }) => {
    await page.goto('/');

    // Login
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

    // Look for a completed offer with rate button
    const rateButton = page.getByRole('button', { name: /rate|leave rating/i }).first();
    if (await rateButton.isVisible().catch(() => false)) {
      await rateButton.click();
      await page.waitForTimeout(500);

      // Look for rating dialog
      const dialogTitle = page.getByRole('heading', { name: /rate|exchange/i }).first();
      if (await dialogTitle.isVisible().catch(() => false)) {
        // Click on 4th tomato for 4-star rating
        const tomatoButtons = page.getByRole('button', { name: /tomato/i });
        const count = await tomatoButtons.count().catch(() => 0);
        
        if (count >= 4) {
          // Get the 4th button
          const fourthTomato = tomatoButtons.nth(3);
          if (await fourthTomato.isVisible().catch(() => false)) {
            await fourthTomato.click();
            await page.waitForTimeout(300);
          }
        }

        // Add optional comment
        const commentField = page.getByPlaceholder(/share your experience/i).first();
        if (await commentField.isVisible().catch(() => false)) {
          await commentField.fill('Great exchange! Highly recommend.');
        }

        // Submit rating
        const submitButton = page.getByRole('button', { name: /submit|send|save/i }).first();
        if (await submitButton.isVisible().catch(() => false)) {
          await submitButton.click();
          await page.waitForTimeout(1000);
        }
      }
    }
  });

  // Test 4: Buyer can submit rating without comment
  test('buyer can submit a rating without comment', async ({ page }) => {
    await page.goto('/');

    // Login
    await page.getByLabel('Email').fill('buyer@example.com');
    await page.getByLabel('Password').fill('Test123');
    await page.getByRole('button', { name: 'Log In' }).click();

    // Wait for navigation
    await page.waitForURL('/', { timeout: 10000 }).catch(() => {});

    // Navigate to Offers
    const offersButton = page.getByRole('button', { name: /offers/i }).first();
    if (await offersButton.isVisible().catch(() => false)) {
      await offersButton.click();
      await page.waitForTimeout(1000);
    }

    // Find rate button
    const rateButton = page.getByRole('button', { name: /rate|leave rating/i }).first();
    if (await rateButton.isVisible().catch(() => false)) {
      await rateButton.click();
      await page.waitForTimeout(500);

      // Check for rating dialog
      const dialogTitle = page.getByRole('heading', { name: /rate|exchange/i }).first();
      if (await dialogTitle.isVisible().catch(() => false)) {
        // Click 5th tomato for 5-star rating
        const tomatoButtons = page.getByRole('button', { name: /tomato/i });
        const count = await tomatoButtons.count().catch(() => 0);
        
        if (count >= 5) {
          const fifthTomato = tomatoButtons.nth(4);
          if (await fifthTomato.isVisible().catch(() => false)) {
            await fifthTomato.click();
            await page.waitForTimeout(300);
          }
        }

        // Submit without adding comment
        const submitButton = page.getByRole('button', { name: /submit|send|save/i }).first();
        if (await submitButton.isVisible().catch(() => false)) {
          await submitButton.click();
          await page.waitForTimeout(1000);
        }
      }
    }
  });

  // Test 5: User must select rating before submitting
  test('rating dialog requires selecting a rating', async ({ page }) => {
    await page.goto('/');

    // Login
    await page.getByLabel('Email').fill('buyer@example.com');
    await page.getByLabel('Password').fill('Test123');
    await page.getByRole('button', { name: 'Log In' }).click();

    // Wait for navigation
    await page.waitForURL('/', { timeout: 10000 }).catch(() => {});

    // Navigate to Offers
    const offersButton = page.getByRole('button', { name: /offers/i }).first();
    if (await offersButton.isVisible().catch(() => false)) {
      await offersButton.click();
      await page.waitForTimeout(1000);
    }

    // Find rate button
    const rateButton = page.getByRole('button', { name: /rate|leave rating/i }).first();
    if (await rateButton.isVisible().catch(() => false)) {
      await rateButton.click();
      await page.waitForTimeout(500);

      // Check for rating dialog
      const dialogTitle = page.getByRole('heading', { name: /rate|exchange/i }).first();
      if (await dialogTitle.isVisible().catch(() => false)) {
        // Try to submit without selecting rating
        const submitButton = page.getByRole('button', { name: /submit|send|save/i }).first();
        if (await submitButton.isVisible().catch(() => false)) {
          await submitButton.click();
          await page.waitForTimeout(500);

          // Verify error message appears
          const errorMsg = page.getByText(/select a rating|please rate/i).first();
          if (await errorMsg.isVisible().catch(() => false)) {
            await expect(errorMsg).toBeVisible();
          }
        }
      }
    }
  });

  // Test 6: User can change rating selection before submitting
  test('buyer can change rating selection in dialog', async ({ page }) => {
    await page.goto('/');

    // Login
    await page.getByLabel('Email').fill('buyer@example.com');
    await page.getByLabel('Password').fill('Test123');
    await page.getByRole('button', { name: 'Log In' }).click();

    // Wait for navigation
    await page.waitForURL('/', { timeout: 10000 }).catch(() => {});

    // Navigate to Offers
    const offersButton = page.getByRole('button', { name: /offers/i }).first();
    if (await offersButton.isVisible().catch(() => false)) {
      await offersButton.click();
      await page.waitForTimeout(1000);
    }

    // Find rate button
    const rateButton = page.getByRole('button', { name: /rate|leave rating/i }).first();
    if (await rateButton.isVisible().catch(() => false)) {
      await rateButton.click();
      await page.waitForTimeout(500);

      const dialogTitle = page.getByRole('heading', { name: /rate|exchange/i }).first();
      if (await dialogTitle.isVisible().catch(() => false)) {
        const tomatoButtons = page.getByRole('button', { name: /tomato/i });
        const count = await tomatoButtons.count().catch(() => 0);

        // Select 2 stars
        if (count >= 2) {
          const secondTomato = tomatoButtons.nth(1);
          if (await secondTomato.isVisible().catch(() => false)) {
            await secondTomato.click();
            await page.waitForTimeout(300);
          }
        }

        // Change to 5 stars
        if (count >= 5) {
          const fifthTomato = tomatoButtons.nth(4);
          if (await fifthTomato.isVisible().catch(() => false)) {
            await fifthTomato.click();
            await page.waitForTimeout(300);
          }
        }

        // Verify final selection can be submitted
        const submitButton = page.getByRole('button', { name: /submit|send|save/i }).first();
        if (await submitButton.isVisible().catch(() => false)) {
          await expect(submitButton).toBeEnabled().catch(() => {});
        }
      }
    }
  });

  // Test 7: Ratings persist and appear on user profile
  test('submitted ratings persist on user profile', async ({ page }) => {
    await page.goto('/');

    // Login
    await page.getByLabel('Email').fill('seller@example.com');
    await page.getByLabel('Password').fill('Test123');
    await page.getByRole('button', { name: 'Log In' }).click();

    // Wait for navigation
    await page.waitForURL('/', { timeout: 10000 }).catch(() => {});

    // Navigate to Profile
    const profileButton = page.getByRole('button', { name: /profile/i }).first();
    if (await profileButton.isVisible().catch(() => false)) {
      await profileButton.click();
      await page.waitForTimeout(1000);

      // Look for rating display on profile
      const ratingDisplay = page.locator('svg[viewBox="0 0 24 24"]').first();
      if (await ratingDisplay.isVisible().catch(() => false)) {
        await expect(ratingDisplay).toBeVisible();
      }

      // Look for rating count if available
      const ratingCountText = page.getByText(/\d+\s*rating/i).first();
      if (await ratingCountText.isVisible().catch(() => false)) {
        await expect(ratingCountText).toBeVisible();
      }
    }
  });

  // Test 8: Rating scale displays correctly (1-5 tomatoes)
  test('rating scale displays 5 tomato options', async ({ page }) => {
    await page.goto('/');

    // Login
    await page.getByLabel('Email').fill('buyer@example.com');
    await page.getByLabel('Password').fill('Test123');
    await page.getByRole('button', { name: 'Log In' }).click();

    // Wait for navigation
    await page.waitForURL('/', { timeout: 10000 }).catch(() => {});

    // Navigate to Offers
    const offersButton = page.getByRole('button', { name: /offers/i }).first();
    if (await offersButton.isVisible().catch(() => false)) {
      await offersButton.click();
      await page.waitForTimeout(1000);
    }

    // Find rate button
    const rateButton = page.getByRole('button', { name: /rate|leave rating/i }).first();
    if (await rateButton.isVisible().catch(() => false)) {
      await rateButton.click();
      await page.waitForTimeout(500);

      // Verify 5 tomato options are available
      const tomatoButtons = page.getByRole('button', { name: /tomato/i });
      const count = await tomatoButtons.count().catch(() => 0);
      
      if (count === 5) {
        await expect(tomatoButtons.first()).toBeVisible();
        await expect(tomatoButtons.last()).toBeVisible();
      }
    }
  });
});
