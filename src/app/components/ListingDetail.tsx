import React, { useState, useEffect } from 'react';
import { API, AuthManager } from '../../utils/api';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { TomatoRatingDisplay, TomatoRating } from './TomatoRating';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Avatar, AvatarImage, AvatarFallback } from './ui/avatar';

interface ListingDetailProps {
  listingId: string;
  onBack: () => void;
  onChat: (threadId: string) => void;
}

export function ListingDetail({ listingId, onBack, onChat }: ListingDetailProps) {
  const [listing, setListing] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showOfferDialog, setShowOfferDialog] = useState(false);
  const currentUser = AuthManager.getUser();

  useEffect(() => {
    loadListing();
  }, [listingId]);

  const loadListing = async () => {
    setLoading(true);
    try {
      const data = await API.getListing(listingId);
      setListing(data.listing);
    } catch (err) {
      console.error('Failed to load listing', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStartChat = async () => {
    try {
      const data = await API.createThread(listingId, listing.sellerId);
      onChat(data.thread.id);
    } catch (err) {
      console.error('Failed to start chat', err);
    }
  };

  const handleDeleteListing = async () => {
    const confirmed = window.confirm('Delete this listing? This action cannot be undone.');
    if (!confirmed) return;

    try {
      await API.deleteListing(listingId);
      onBack();
    } catch (err: any) {
      alert(err.message || 'Failed to delete listing');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Listing not found</p>
      </div>
    );
  }

  const isOwnListing = currentUser?.id === listing.sellerId;

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-10 bg-background border-b border-border">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Photo Gallery */}
        {listing.photos && listing.photos.length > 0 && (
          <div className="rounded-xl overflow-hidden bg-muted">
            <img
              src={listing.photos[0]}
              alt={listing.title}
              className="w-full aspect-square object-cover"
            />
          </div>
        )}

        {/* Listing Info */}
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h1 className="text-2xl font-bold">{listing.title}</h1>
              {listing.quantity && (
                <p className="text-lg text-muted-foreground mt-1">Quantity: {listing.quantity}</p>
              )}
            </div>
            <Badge className="bg-secondary text-secondary-foreground">
              ZIP {listing.zipCode}
            </Badge>
          </div>

          <p className="text-foreground leading-relaxed">{listing.description}</p>

          {listing.expiresAt && (
            <p className="text-sm text-muted-foreground">
              Expires {new Date(listing.expiresAt).toLocaleDateString()}
            </p>
          )}

          {listing.lookingFor && (
            <div className="bg-muted rounded-lg p-4">
              <p className="text-sm font-medium text-muted-foreground mb-1">Looking for:</p>
              <p className="text-foreground">{listing.lookingFor}</p>
            </div>
          )}
        </div>

        {/* Seller Info */}
        {listing.seller && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Avatar className="w-12 h-12">
                  <AvatarImage src={listing.seller.profilePhotoUrl} />
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    {listing.seller.name?.charAt(0)?.toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="font-medium">{listing.seller.name}</p>
                  {listing.seller.ratingCount > 0 && (
                    <TomatoRatingDisplay
                      rating={listing.seller.rating}
                      count={listing.seller.ratingCount}
                    />
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        {!isOwnListing && (
          <div className="flex gap-3 sticky bottom-4">
            <Button
              onClick={handleStartChat}
              variant="outline"
              className="flex-1"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              Message
            </Button>
            <Button
              onClick={() => setShowOfferDialog(true)}
              className="flex-1 bg-primary hover:bg-primary-hover text-primary-foreground"
            >
              Make Offer
            </Button>
          </div>
        )}

        {isOwnListing && (
          <div className="sticky bottom-4">
            <Button
              onClick={handleDeleteListing}
              variant="outline"
              className="w-full border-error text-error hover:bg-error/10"
            >
              Delete Listing
            </Button>
          </div>
        )}
      </div>

      {showOfferDialog && (
        <MakeOfferDialog
          listingId={listingId}
          onClose={() => setShowOfferDialog(false)}
          onSuccess={() => {
            setShowOfferDialog(false);
            alert('Offer submitted! The seller will be notified.');
          }}
        />
      )}
    </div>
  );
}

function MakeOfferDialog({ listingId, onClose, onSuccess }: { listingId: string; onClose: () => void; onSuccess: () => void }) {
  const [offeredProduce, setOfferedProduce] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!offeredProduce.trim()) {
      setError('Please specify what you are offering');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await API.createOffer(listingId, offeredProduce, message);
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to submit offer');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Make a Barter Offer</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="offeredProduce">What are you offering?*</Label>
            <Input
              id="offeredProduce"
              placeholder="e.g., 2 dozen eggs"
              value={offeredProduce}
              onChange={(e) => setOfferedProduce(e.target.value)}
              className="bg-input-background border-input-border"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Message (optional)</Label>
            <Textarea
              id="message"
              placeholder="Add a message to the seller..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              className="bg-input-background border-input-border resize-none"
            />
          </div>

          {error && (
            <div className="bg-error/10 border border-error rounded-md p-3">
              <p className="text-sm text-error">{error}</p>
            </div>
          )}

          <div className="flex gap-2">
            <Button
              onClick={onClose}
              variant="outline"
              className="flex-1"
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              className="flex-1 bg-primary hover:bg-primary-hover text-primary-foreground"
              disabled={loading}
            >
              {loading ? 'Submitting...' : 'Submit Offer'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function SubmitRatingDialog({ offerId, ratedUserId, onClose, onSuccess }: {
  offerId: string;
  ratedUserId: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (rating === 0) {
      setError('Please select a rating');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await API.createRating(offerId, rating, comment);
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to submit rating');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Rate This Exchange</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="space-y-4">
            <Label className="text-center block">How was your experience?</Label>
            <TomatoRating
              rating={rating}
              onChange={setRating}
              size="lg"
              showLabel={true}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="comment">Comment (optional)</Label>
            <Textarea
              id="comment"
              placeholder="Share your experience..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              className="bg-input-background border-input-border resize-none"
            />
          </div>

          {error && (
            <div className="bg-error/10 border border-error rounded-md p-3">
              <p className="text-sm text-error">{error}</p>
            </div>
          )}

          <div className="flex gap-2">
            <Button
              onClick={onClose}
              variant="outline"
              className="flex-1"
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              className="flex-1 bg-primary hover:bg-primary-hover text-primary-foreground"
              disabled={loading || rating === 0}
            >
              {loading ? 'Submitting...' : 'Submit Rating'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
