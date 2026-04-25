# Mock Data & Ratings System - Implementation Summary

## Overview

Added automatic mock ratings data initialization to the Edge Functions server. When the server starts, it will automatically populate demonstration ratings for listings on the marketplace.

## What Was Implemented

### 1. **Automatic Mock Data Initialization**

- Location: [supabase/functions/server/index.tsx](supabase/functions/server/index.tsx)
- Function: `initMockData()` - runs on server startup
- Runs once per deployment (uses `mock_data:initialized` flag to prevent re-initialization)

### 2. **Mock Data Strategy**

The system creates demo ratings in two ways:

**A. Existing User Ratings (Primary)**

- Finds all real users in the KV store
- Adds 3-5 ratings to each of the first 5 users
- Sets ratings to 4-5 stars (high quality demo data)
- Includes realistic comments
- Updates user's `rating` and `ratingCount` fields

**B. Mock Sellers (Fallback)**

- Creates 3 sample sellers:
  - John's Garden (4.5 stars, 8 ratings)
  - Alice's Farmers Market (4.8 stars, 12 ratings)
  - Bob's Community Farm (4.2 stars, 5 ratings)
- Generates individual mock ratings for each seller

### 3. **Data Structure**

Ratings are stored in KV with multiple keys for efficient retrieval:

```
rating:{ratingId}                          - Full rating object
rating:user:{userId}:{ratingId}            - For fetching all user ratings
```

User profiles are updated with:

```json
{
  "rating": 4.5, // Average rating (0-5)
  "ratingCount": 8 // Total number of ratings
}
```

## How It Works

1. **On Server Startup**
   - `initMockData()` is called
   - Checks if flag `mock_data:initialized` exists
   - If not initialized, proceeds to create demo data

2. **When Marketplace Loads**
   - Frontend fetches listings via `GET /listings`
   - For each listing, fetches seller profile via `GET /profile/{sellerId}`
   - Seller profile includes `rating` and `ratingCount`
   - TomatoRatingDisplay component shows the ratings as tomato icons

3. **When Viewing Listing Details**
   - Fetches seller's individual ratings via `GET /ratings/user/{sellerId}`
   - Displays each rating with comment and star count

## Testing

Run the E2E tests to verify everything works:

```bash
# Test marketplace displays ratings
npm run test:e2e -- rating-system.spec.ts

# Test mock data loads without errors
npm run test:e2e -- mock-data-display.spec.ts
```

## Resetting Mock Data

To reinitialize mock data (for development), delete the flag from KV:

- Manually clear the `mock_data:initialized` key from Supabase KV Storage
- Or redeploy the Edge Functions

## Sample Rating Comments

The mock data includes realistic comments:

- "Great exchange! Highly recommend."
- "Fresh produce, very reliable seller."
- "Perfect quality and communication."
- "Will definitely buy again."
- "Best seller in our community."
- "Amazing vegetables and fair pricing."
- "Professional and trustworthy."
- And more...

## Files Modified

1. **[supabase/functions/server/index.tsx](supabase/functions/server/index.tsx)**
   - Added `initMockData()` function (~150 lines)
   - Called at server startup after `initStorage()`
   - Adds ratings to existing users and creates mock sellers

## Integration Points

- **Marketplace Component** - Displays seller ratings from profiles
- **ListingDetail Component** - Shows individual ratings
- **TomatoRatingDisplay** - Renders ratings as tomato icons
- **API.getUserRatings()** - Fetches ratings from KV
- **API.getProfile()** - Fetches user with rating/ratingCount

## Future Enhancements

- Add endpoint to manually trigger mock data reset
- Create fixture/seed file for consistent test data
- Add mock data analytics dashboard
- Support seeding different rating distributions
