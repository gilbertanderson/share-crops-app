import React, { useState, useEffect } from 'react';
import { API, AuthManager } from '../../utils/api';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { SubmitRatingDialog } from './ListingDetail';

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

interface OfferCardProps {
  offer: any;
  viewAs: 'buyer' | 'seller';
  onAction: () => void;
}

function OfferCard({ offer, viewAs, onAction }: OfferCardProps) {
  const [listing, setListing] = useState<any>(null);
  const [otherUser, setOtherUser] = useState<any>(null);
  const [showRatingDialog, setShowRatingDialog] = useState(false);

  useEffect(() => {
    loadData();
  }, [offer]);

  const loadData = async () => {
    try {
      const listingData = await API.getListing(offer.listingId);
      setListing(listingData.listing);

      const otherUserId = viewAs === 'buyer' ? offer.sellerId : offer.buyerId;
      const userData = await API.getProfile(otherUserId);
      setOtherUser(userData.profile);
    } catch (err) {
      console.error('Failed to load offer data', err);
    }
  };

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

  if (!listing) {
    return (
      <Card>
        <CardContent className="p-4">
          <p className="text-sm text-muted-foreground">Loading...</p>
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

          <div className="flex gap-2">
            {viewAs === 'seller' && offer.status === 'pending' && (
              <>
                <Button
                  onClick={handleAccept}
                  size="sm"
                  className="flex-1 bg-success hover:bg-success/90 text-success-foreground"
                >
                  Accept
                </Button>
                <Button
                  onClick={handleDecline}
                  size="sm"
                  variant="outline"
                  className="flex-1"
                >
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

            {offer.status === 'completed' && (
              <Button
                onClick={() => setShowRatingDialog(true)}
                size="sm"
                className="flex-1 bg-accent hover:bg-accent-hover text-accent-foreground"
              >
                Rate Exchange
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
          ratedUserId={viewAs === 'buyer' ? offer.sellerId : offer.buyerId}
          onClose={() => setShowRatingDialog(false)}
          onSuccess={() => {
            setShowRatingDialog(false);
            alert('Thank you for your rating!');
            onAction();
          }}
        />
      )}
    </>
  );
}

export function Offers() {
  const [viewAs, setViewAs] = useState<'buyer' | 'seller'>('buyer');
  const [offers, setOffers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOffers();
  }, [viewAs]);

  const loadOffers = async () => {
    setLoading(true);
    try {
      const data = await API.getMyOffers(viewAs);
      setOffers(data.offers || []);
    } catch (err) {
      console.error('Failed to load offers', err);
    } finally {
      setLoading(false);
    }
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
        {loading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading...</p>
          </div>
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
                onAction={loadOffers}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
