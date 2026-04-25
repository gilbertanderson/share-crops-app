# ShareCrops Features Update - April 25, 2026

## New Features Implemented

### 1. Duplicate Offer Prevention ✓
**Problem**: Buyers could spam sellers with multiple identical offers for the same produce on the same listing.

**Solution**: 
- Backend validation prevents creating duplicate offers (same listing + buyer + offered produce)
- Duplicate defined as: same listing_id + buyer_id + offered_produce text (different messages OK)
- Allows re-offering after declining a previous attempt

**Implementation**:
- Backend: `POST /offers` now checks for existing offers before creating new ones
- Error message: "You already have an offer for this produce on this listing. Delete your existing offer to submit a new one."

### 2. Offer Deletion ✓
**Problem**: Buyers couldn't fix mistakes or change their minds after submitting an offer.

**Solution**:
- Buyers can delete their own offers (pending or accepted status only)
- Works from both MakeOfferDialog and Offers page
- After deletion, buyer can immediately submit a corrected offer

**Implementation**:
- Backend: `DELETE /offers/:id` endpoint (buyer-only access)
- Frontend: Delete buttons in two locations:
  1. MakeOfferDialog - shows existing offers inline with delete option
  2. Offers page - delete button per offer card for buyers

### 3. Enhanced MakeOfferDialog UI ✓
- Shows existing pending/accepted offers before creating new one
- Allows inline deletion of existing offers
- Clear messaging: "Delete your existing offer to submit a new one"
- Prevents accidental duplicate submissions

### 4. Offers Page Improvements ✓
- Delete buttons visible for buyers on pending/accepted offers
- Confirmation dialog before deletion
- Cannot delete completed or declined offers (no need to)

## API Changes

### New Endpoint
```
DELETE /offers/:id
- Requires: buyer user (must be offer.buyerId)
- Returns: { success: true }
- Deletes from all KV store keys
```

### Updated Endpoint
```
POST /offers
- Added: Duplicate offer validation
- Checks: listing_id + buyer_id + offered_produce
- Skips: declined offers (allows re-offering)
- Error: Returns 400 if duplicate found
```

### New API Method
```typescript
static async deleteOffer(offerId: string): Promise<{ success: boolean }>
```

## Test Coverage

### New E2E Tests (user-scenarios.spec.ts)
1. **Scenario 1**: New seller creates listing and receives offer
2. **Scenario 2**: Buyer prevents duplicate offers ← NEW
3. **Scenario 3**: Buyer deletes and resubmits offer ← NEW
4. **Scenario 4**: Seller accepts, completes, and rates buyer
5. **Scenario 5**: Buyer views seller ratings on listing
6. **Scenario 6**: Multiple offers on same listing

## Files Modified

1. **Backend**: `supabase/functions/server/index.tsx`
   - Added duplicate validation in POST /offers handler
   - Added DELETE /offers/:id handler
   - ~40 lines added

2. **Frontend API**: `src/utils/api.ts`
   - Added deleteOffer() method
   - ~3 lines added

3. **Frontend UI**: `src/app/components/ListingDetail.tsx`
   - Enhanced MakeOfferDialog with existing offer display
   - Added delete functionality inline
   - Added Offer import type
   - ~80 lines modified

4. **Frontend UI**: `src/app/components/Offers.tsx`
   - Added delete button to OfferCard
   - Added delete confirmation dialog
   - Added AlertDialogCancel import
   - ~50 lines modified

5. **Tests**: `tests/e2e/user-scenarios.spec.ts`
   - New comprehensive test file
   - 6 major user scenarios
   - ~400 lines

## User Experience Flow

### Duplicate Prevention Flow
1. User browses marketplace
2. Clicks "Make Offer" on a listing
3. Dialog shows if they already have an offer:
   - Shows existing offer details
   - Delete button available inline
   - Message: "Delete your existing offer to submit a new one"
4. User can either:
   - Delete existing offer, then submit corrected one
   - Keep existing offer and close dialog

### Offer Deletion Options
**From MakeOfferDialog**:
1. Click "Make Offer"
2. See existing offers
3. Click Delete
4. Confirm deletion
5. Submit new offer

**From Offers Page**:
1. Go to My Offers → As Buyer
2. Find the offer to delete
3. Click Delete button
4. Confirm deletion
5. Return to listing to submit new offer if desired

## Goals Achieved ✓
- ✓ Prevent spam (multiple identical offers)
- ✓ Allow users to fix mistakes
- ✓ Allow users to change their minds
- ✓ Maintain data integrity
- ✓ Provide clear UI/UX guidance
- ✓ Add comprehensive test coverage

## Video Recording
All E2E tests run with video recording enabled to `test-results/` directory.
