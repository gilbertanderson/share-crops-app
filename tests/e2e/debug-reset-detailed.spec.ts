import { test } from '@playwright/test';

const IMPLICIT_HASH = '#access_token=fake_token_for_ui_test&refresh_token=fake_refresh&expires_in=3600&token_type=bearer&type=recovery';

test('debug reset password page - detailed', async ({ page }) => {
  // Capture all console messages
  const consoleLogs: string[] = [];
  page.on('console', msg => {
    consoleLogs.push(`[${msg.type()}] ${msg.text()}`);
  });

  // Capture uncaught exceptions
  let uncaughtException: string | null = null;
  page.on('pageerror', error => {
    uncaughtException = error.toString();
    console.log('Uncaught error:', error);
  });

  // Capture request errors
  page.on('requestfailed', request => {
    console.log(`Request failed: ${request.url()} - ${request.failure()?.errorText}`);
  });

  await page.goto(`/reset-password${IMPLICIT_HASH}`);

  // Check final URL
  console.log('Final URL:', page.url());

  // Wait a moment for render
  await page.waitForTimeout(1000);

  // Print console logs
  console.log('Console logs:', consoleLogs);
  console.log('Uncaught exception:', uncaughtException);

  // Try to find the Card component
  const cardSelector = '[data-slot="card"]';
  const cardCount = await page.locator(cardSelector).count();
  console.log('Card count:', cardCount);

  // Try to find CardTitle
  const titleSelector = '[data-slot="card-title"]';
  const titleCount = await page.locator(titleSelector).count();
  console.log('CardTitle count:', titleCount);

  // Try to find CardContent
  const contentSelector = '[data-slot="card-content"]';
  const contentCount = await page.locator(contentSelector).count();
  console.log('CardContent count:', contentCount);

  // Try to find any text
  const bodyText = await page.locator('body').textContent();
  console.log('Body text length:', bodyText?.length);
  console.log('Body text (first 200 chars):', bodyText?.substring(0, 200));

  // Get the full HTML
  const html = await page.content();
  console.log('HTML length:', html.length);
  console.log('HTML (first 1000 chars):', html.substring(0, 1000));

  // Try to evaluate React state if available
  try {
    const reactRoot = await page.evaluate(() => {
      // Try to find React's internal root
      const rootEl = document.getElementById('root');
      if (rootEl && (rootEl as any)._reactRootContainer) {
        return 'React root found';
      }
      if (rootEl && (rootEl as any).__reactInternalInstance) {
        return 'React fiber found';
      }
      return 'No React root found';
    });
    console.log('React state check:', reactRoot);
  } catch (err) {
    console.log('Error checking React state:', err);
  }

  // Check if root element exists and has children
  const rootElement = await page.locator('#root');
  const rootChildCount = await page.locator('#root > *').count();
  console.log('Root element exists:', await rootElement.count());
  console.log('Root element children:', rootChildCount);

  // Screenshot
  await page.screenshot({ path: 'debug-reset-detailed.png' });
});
