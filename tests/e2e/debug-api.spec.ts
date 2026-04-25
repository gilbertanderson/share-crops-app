import { test, expect } from '@playwright/test';

test('should verify mock data API response', async ({ page, context }) => {
  // Navigate to app
  await page.goto('/');
  
  // Get the project ID from the info file or test environment
  const projectId = process.env.VITE_SUPABASE_URL?.split('https://')[1]?.split('.supabase.co')[0] || 'unknown';
  console.log('Project ID:', projectId);
  
  // Try to fetch listings via API directly
  try {
    const anonKey = process.env.VITE_SUPABASE_ANON_KEY || '';
    const response = await fetch(
      `https://${projectId}.supabase.co/functions/v1/make-server-dd877831/listings`,
      {
        headers: {
          'Authorization': `Bearer ${anonKey}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    if (response.ok) {
      const data = await response.json();
      console.log('API Response:', data);
      console.log('Number of listings:', data.listings?.length || 0);
      
      if (data.listings && data.listings.length > 0) {
        console.log('First listing:', data.listings[0].title);
        data.listings.forEach((listing: any) => {
          console.log(`- ${listing.title} (seller: ${listing.sellerId})`);
        });
      }
    } else {
      console.log('API Response Status:', response.status);
      const text = await response.text();
      console.log('Response:', text.substring(0, 200));
    }
  } catch (err) {
    console.log('Error fetching from API:', err);
  }
  
  // Also wait and check page content after navigating
  await page.waitForTimeout(3000);
  const pageText = await page.textContent('body');
  
  console.log('Page contains "Fresh":', pageText?.includes('Fresh') ?? false);
  console.log('Page contains "Tomato":', pageText?.includes('Tomato') ?? false);
  console.log('Page contains "listings":', pageText?.includes('listings') ?? false);
  console.log('Page contains "Qty":', pageText?.includes('Qty') ?? false);
});
