import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { API } from '../../utils/api';
import type { Offer, Listing, User } from '../../types';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { SubmitRatingDialog } from './ListingDetail';
import { TomatoLoader } from './ui/tomato-loader';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog';

const STATUS_COLORS = {
  pending: 'bg-warning text-warning-foreground',
  accepted: 'bg-success text-success-foreground',
  declined: 'bg-error text-error-foreground',
  completed: 'bg-info text-info-foreground',
};

const STATUS_LABELS = {
  pending: 'Pending',
  accepted: 'Accepted',
  declined: 'Declined',
  completed: 'Completed',
};

function OfferCard({ offer, viewAs, onAction, queryClient }: {
  offer: Offer;
  viewAs: 'buyer' | 'seller';
  onAction: () => void;
  queryClient: any;
}) {
  const [showRatingDialog, setShowRatingDialog] = useState(false);
  const [ratingSuccess, setRatingSuccess] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const { data: meData } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: () => API.getMe(),
  });
  const currentUserId = meData?.user?.id;

  const { data: listingData } = useQuery({
    queryKey: ['listing', offer.listingId],
    queryFn: () => API.getListing(offer.listingId),
  });
  const listing: Listing | null = listingData?.listing ?? null;

  const otherUserId = viewAs === 'buyer' ? offer.sellerId : offer.buyerId;
  const { data: otherUserData } = useQuery({
    queryKey: ['profile', otherUserId],
    queryFn: () => API.getProfile(otherUserId),
    enabled: !!otherUserId,
  });
  const otherUser: User | null = otherUserData?.profile ?? null;

  const { data: userRatingsData } = useQuery({
    queryKey: ['ratings', 'user', currentUserId],
    queryFn: () => API.getUserRatings(currentUserId!),
    enabled: !!currentUserId,
  });
  const userRatings = userRatingsData?.ratings ?? [];
  const hasRatedThisOffer = userRatings.some((r: any) => r.offerId === offer.id);

  const handleAccept = async () => {
    try {
      await API.acceptOffer(offer.id);
      onAction();
    } catch (err) {
      console.error('Failed to accept offer', err);
    }
  };

  const handleDecline = async () => {
    try {
      await API.declineOffer(offer.id);
      onAction();
    } catch (err) {
      console.error('Failed to decline offer', err);
    }
  };

  const handleComplete = async () => {
    try {
      await API.completeOffer(offer.id);
      onAction();
    } catch (err) {
      console.error('Failed to complete offer', err);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await API.deleteOffer(offer.id);
      setShowDeleteConfirm(false);
      onAction();
    } catch (err) {
      console.error('Failed to delete offer', err);
    } finally {
      setDeleting(false);
    }
  };

  if (!listing) {
    return (
      <Card>
        <CardContent className="p-4">
          <TomatoLoader label="Loading..." size="sm" className="py-1" labelClassName="text-sm" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold truncate">{listing.title}</h3>
              <p className="text-sm text-muted-foreground">
                {viewAs === 'buyer' ? 'Seller' : 'Buyer'}: {otherUser?.name || 'Loading...'}
              </p>
            </div>
            <Badge className={STATUS_COLORS[offer.status as keyof typeof STATUS_COLORS]}>
              {STATUS_LABELS[offer.status as keyof typeof STATUS_LABELS]}
            </Badge>
          </div>

          <div className="bg-muted rounded-lg p-3 space-y-1">
            <p className="text-xs font-medium text-muted-foreground">
              {viewAs === 'buyer' ? 'Your Offer' : 'Their Offer'}
            </p>
            <p className="text-sm font-medium">{offer.offeredProduce}</p>
            {offer.message && (
              <p className="text-sm text-muted-foreground">{offer.message}</p>
            )}
          </div>

          <div className="flex gap-2 flex-wrap">
            {viewAs === 'seller' && offer.status === 'pending' && (
              <>
                <Button
                  onClick={handleAccept}
                  size="sm"
                  className="flex-1 bg-success hover:bg-success/90 text-success-foreground"
                >
                  Accept
                </Button>
                <Button onClick={handleDecline} size="sm" variant="outline" className="flex-1">
                  Decline
                </Button>
              </>
            )}

            {offer.status === 'accepted' && (
              <Button
                onClick={handleComplete}
                size="sm"
                className="flex-1 bg-primary hover:bg-primary-hover text-primary-foreground"
              >
                Mark as Completed
              </Button>
            )}

            {/* Rating buttons - show for both buyers and sellers */}
            {offer.status === 'completed' && !hasRatedThisOffer && (
              <Button
                onClick={() => setShowRatingDialog(true)}
                size="sm"
                className="flex-1 bg-accent hover:bg-accent-hover text-accent-foreground"
              >
                Rate Exchange
              </Button>
            )}

            {offer.status === 'completed' && hasRatedThisOffer && (
              <Button
                disabled
                size="sm"
                variant="outline"
                className="flex-1 text-muted-foreground"
              >
                ✓ You've rated this
              </Button>
            )}

            {viewAs === 'buyer' && offer.status !== 'completed' && offer.status !== 'declined' && (
              <Button
                onClick={() => setShowDeleteConfirm(true)}
                size="sm"
                variant="outline"
                className="border-error text-error hover:bg-error/10"
              >
                Delete
              </Button>
            )}
          </div>

          <p className="text-xs text-muted-foreground">
            {new Date(offer.createdAt).toLocaleDateString()}
          </p>
        </CardContent>
      </Card>

      {showRatingDialog && (
        <SubmitRatingDialog
          offerId={offer.id}
          onClose={() => setShowRatingDialog(false)}
          onSuccess={() => {
            setShowRatingDialog(false);
            setRatingSuccess(true);
            // Refetch ratings immediately to ensure the button state updates
            queryClient.refetchQueries({ queryKey: ['ratings', 'user', currentUserId] });
            onAction();
          }}
        />
      )}

      <AlertDialog open={ratingSuccess} onOpenChange={setRatingSuccess}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rating submitted!</AlertDialogTitle>
            <AlertDialogDescription>
              Thank you for your rating.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setRatingSuccess(false)}>OK</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this offer?</AlertDialogTitle>
            <AlertDialogDescription>
              You can submit a new offer after deleting this one.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-error text-error-foreground hover:bg-error/90"
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export function Offers() {
  const queryClient = useQueryClient();
  const [viewAs, setViewAs] = useState<'buyer' | 'seller'>('buyer');

  const { data, isLoading } = useQuery({
    queryKey: ['offers', viewAs],
    queryFn: () => API.getMyOffers(viewAs),
  });
  const offers: Offer[] = data?.offers ?? [];

  const handleAction = () => {
    queryClient.invalidateQueries({ queryKey: ['offers', viewAs] });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-10 bg-background border-b border-border">
        <div className="max-w-2xl mx-auto px-4 py-4 space-y-3">
          <h1 className="text-2xl font-bold">My Offers</h1>

          <div className="flex gap-2">
            <Button
              variant={viewAs === 'buyer' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewAs('buyer')}
              className={viewAs === 'buyer' ? 'bg-primary text-primary-foreground' : ''}
            >
              As Buyer
            </Button>
            <Button
              variant={viewAs === 'seller' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewAs('seller')}
              className={viewAs === 'seller' ? 'bg-primary text-primary-foreground' : ''}
            >
              As Seller
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {isLoading ? (
          <TomatoLoader label="Loading..." className="py-12" />
        ) : offers.length === 0 ? (
          <div className="text-center py-12 space-y-2">
            <svg className="w-16 h-16 mx-auto text-muted-foreground opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-lg font-medium text-muted-foreground">No offers yet</p>
            <p className="text-sm text-muted-foreground">
              {viewAs === 'buyer'
                ? 'Make offers on listings to start bartering'
                : 'Offers on your listings will appear here'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {offers.map((offer) => (
              <OfferCard
                key={offer.id}
                offer={offer}
                viewAs={viewAs}
                onAction={handleAction}
                queryClient={queryClient}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
