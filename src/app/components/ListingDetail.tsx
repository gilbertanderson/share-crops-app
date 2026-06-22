import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { API, AuthManager } from '../../utils/api';
import { useAuth } from '../context/AuthContext';
import type { Listing, Offer } from '../../types';
import { isProduceInSeason } from '../../utils/seasonalProduce';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Card, CardContent } from './ui/card';
import { TomatoRatingDisplay, TomatoRating } from './TomatoRating';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
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
import { Avatar, AvatarImage, AvatarFallback } from './ui/avatar';
import { TomatoLoader } from './ui/tomato-loader';

export function ListingDetail() {
  const { id: listingId = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showOfferDialog, setShowOfferDialog] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showRelistConfirm, setShowRelistConfirm] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [relistError, setRelistError] = useState('');
  const [relistLoading, setRelistLoading] = useState(false);
  const [offerSuccess, setOfferSuccess] = useState(false);
  const currentUser = AuthManager.getUser();
  const { isAdmin } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ['listing', listingId],
    queryFn: () => API.getListing(listingId),
    enabled: !!listingId,
  });
  const listing: Listing | null = data?.listing ?? null;

  const { data: rankingData } = useQuery({
    queryKey: ['trending', listing?.zipCode],
    queryFn: () => API.getTrendingByZip(listing!.zipCode),
    enabled: !!listing?.zipCode,
    staleTime: 60_000,
  });

  const handleStartChat = async () => {
    if (!listing) return;
    try {
      const result = await API.createThread(listingId, listing.sellerId);
      navigate(`/messages/${result.thread.id}`);
    } catch (err) {
      console.error('Failed to start chat', err);
    }
  };

  const handleDeleteListing = async () => {
    setDeleteError('');
    try {
      await API.deleteListing(listingId);
      queryClient.invalidateQueries({ queryKey: ['listings'] });
      setShowDeleteConfirm(false);
      navigate('/marketplace');
    } catch (err: unknown) {
      setDeleteError(err instanceof Error ? err.message : 'Failed to delete listing');
    }
  };

  const handleRelistItem = async () => {
    if (!listing) return;
    setRelistLoading(true);
    setRelistError('');
    try {
      const newListing = await API.createListing({
        title: listing.title,
        description: listing.description,
        quantity: listing.quantity ?? '',
        photos: listing.photos,
        lookingFor: listing.lookingFor ?? '',
        expiresInDays: 30,
      });
      queryClient.invalidateQueries({ queryKey: ['listings'] });
      setShowRelistConfirm(false);
      navigate(`/listing/${newListing.listing.id}`);
    } catch (err: unknown) {
      setRelistError(err instanceof Error ? err.message : 'Failed to relist item');
    } finally {
      setRelistLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <TomatoLoader label="Loading..." />
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-3">
          <svg viewBox="0 0 48 48" className="w-16 h-16 mx-auto" fill="none" aria-hidden="true">
            <circle cx="24" cy="28" r="16" fill="var(--tomato-empty)" />
            <path
              d="M24 12V8M20 10.5C20 10.5 21 12 24 12C27 12 28 10.5 28 10.5M18 8C18 8 19 10 22 11M30 8C30 8 29 10 26 11"
              stroke="#4a7c3f"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <circle cx="18" cy="25" r="2" fill="var(--muted-foreground)" opacity="0.5" />
            <circle cx="30" cy="31" r="1.6" fill="var(--muted-foreground)" opacity="0.4" />
            <path d="M18 35c2.2-2.2 9.8-2.2 12 0" stroke="var(--muted-foreground)" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <p className="text-muted-foreground">Listing not found</p>
        </div>
      </div>
    );
  }

  const isOwnListing = currentUser?.id === listing.sellerId || isAdmin;
  const inSeason = isProduceInSeason(listing.title, listing.description);
  const rankedItems = (rankingData?.items ?? []).filter(
    (item) => item.offerCount > 0 && item.listing.communityId === listing.communityId
  );
  const communityRank = rankedItems.findIndex((item) => item.listing.id === listing.id) + 1;

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-10 bg-background border-b border-border">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <button
            type="button"
            onClick={() => navigate(-1)}
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
        {listing.photos && listing.photos.length > 0 && (
          <div className="w-full max-w-[398px] mx-auto aspect-square rounded-xl overflow-hidden bg-muted">
            <img
              src={listing.photos[0]}
              alt={listing.title}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </div>
        )}

        <div className="space-y-4">
          <div>
            <h1 className="text-2xl font-bold">{listing.title}</h1>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              {inSeason && (
                <span className="flex items-center gap-1 bg-primary text-primary-foreground text-xs font-semibold px-2 py-0.5 rounded-full">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M17.293 3.293a1 1 0 011.414 1.414l-10 10a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l9.293-9.293z" />
                  </svg>
                  In Season
                </span>
              )}
              {communityRank > 0 && (
                <span className="flex items-center gap-1 bg-primary/10 text-primary text-xs font-semibold px-2 py-0.5 rounded-full border border-primary/20">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M13 3L4 14h7l-2 7 9-11h-7l2-7z" />
                  </svg>
                  Rank #{communityRank}
                </span>
              )}
              {listing.status === 'completed' && (
                <span className="flex items-center gap-1 bg-success text-success-foreground text-xs font-semibold px-2 py-0.5 rounded-full">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M17.293 3.293a1 1 0 011.414 1.414l-10 10a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l9.293-9.293z" />
                  </svg>
                  Exchanged
                </span>
              )}
              <span className="bg-secondary text-secondary-foreground text-xs font-semibold px-2 py-0.5 rounded-full">
                ZIP {listing.zipCode}
              </span>
            </div>
            {listing.quantity && (
              <p className="text-lg text-muted-foreground mt-1">Quantity: {listing.quantity}</p>
            )}
          </div>

          <p className="text-foreground leading-relaxed">{listing.description}</p>

          {listing.expiresAt && (
            <p className="text-sm text-muted-foreground">
              Expires {new Date(listing.expiresAt).toLocaleDateString()}
            </p>
          )}

          {listing.lookingFor && (
            <div className="bg-muted rounded-lg p-4 border-l-4 border-accent">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Looking for</p>
              <p className="text-foreground">{listing.lookingFor}</p>
            </div>
          )}
        </div>

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
                  {listing.seller.ratingCount > 0 ? (
                    <TomatoRatingDisplay
                      rating={listing.seller.rating}
                      count={listing.seller.ratingCount}
                    />
                  ) : (
                    <span className="text-xs text-muted-foreground">New seller</span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {!isOwnListing && (
          <div className="flex gap-3 sticky bottom-4">
            <Button onClick={handleStartChat} variant="outline" className="flex-1">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              Message
            </Button>
            {listing.status === 'active' ? (
              <Button
                onClick={() => setShowOfferDialog(true)}
                className="flex-1 bg-primary hover:bg-primary-hover text-primary-foreground"
              >
                Make Offer
              </Button>
            ) : (
              <Button disabled className="flex-1" variant="outline">
                {listing.status === 'completed' ? 'Already Exchanged' : 'Listing Expired'}
              </Button>
            )}
          </div>
        )}

        {isOwnListing && (
          <div className="sticky bottom-4 space-y-2">
            {listing.status === 'completed' ? (
              <Button
                onClick={() => setShowRelistConfirm(true)}
                className="w-full bg-primary hover:bg-primary-hover text-primary-foreground"
              >
                Relist Item
              </Button>
            ) : null}
            <Button
              onClick={() => setShowDeleteConfirm(true)}
              variant="outline"
              className="w-full border-error text-error hover:bg-error/10"
            >
              {listing.status === 'completed' ? 'Archive Listing' : 'Delete Listing'}
            </Button>
          </div>
        )}
      </div>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this listing?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone.
              {deleteError && (
                <span className="block mt-2 text-error">{deleteError}</span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteListing}
              className="bg-error text-error-foreground hover:bg-error/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showRelistConfirm} onOpenChange={setShowRelistConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Relist this item?</AlertDialogTitle>
            <AlertDialogDescription>
              Create a new listing with the same details to start a new exchange chain. This is perfect for bartering towards a specific goal!
              {relistError && (
                <span className="block mt-2 text-error">{relistError}</span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={relistLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRelistItem}
              disabled={relistLoading}
              className="bg-primary hover:bg-primary-hover text-primary-foreground"
            >
              {relistLoading ? 'Creating...' : 'Relist Item'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={offerSuccess} onOpenChange={setOfferSuccess}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Offer submitted!</AlertDialogTitle>
            <AlertDialogDescription>
              The seller will be notified of your offer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setOfferSuccess(false)}>
              OK
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {showOfferDialog && (
        <MakeOfferDialog
          listingId={listingId}
          onClose={() => setShowOfferDialog(false)}
          onSuccess={() => {
            setShowOfferDialog(false);
            setOfferSuccess(true);
          }}
        />
      )}
    </div>
  );
}

function MakeOfferDialog({ listingId, onClose, onSuccess }: {
  listingId: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [offeredProduce, setOfferedProduce] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const [existingOffers, setExistingOffers] = useState<Offer[]>([]);

  React.useEffect(() => {
    const loadExistingOffers = async () => {
      try {
        const result = await API.getMyOffers('buyer');
        const offers = result.offers.filter(
          (o) => o.listingId === listingId && o.status !== 'declined'
        );
        setExistingOffers(offers);
      } catch (err) {
        console.error('Failed to load existing offers', err);
      }
    };
    loadExistingOffers();
  }, [listingId]);

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
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to submit offer');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteOffer = async (offerId: string) => {
    setDeleting(true);
    try {
      await API.deleteOffer(offerId);
      setExistingOffers(existingOffers.filter(o => o.id !== offerId));
      setError('');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete offer');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Make a Barter Offer</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {existingOffers.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-md p-3">
              <p className="text-sm font-medium text-amber-900 mb-3">Your existing offer(s):</p>
              <div className="space-y-2">
                {existingOffers.map(offer => (
                  <div key={offer.id} className="flex items-start justify-between gap-2 p-2 bg-white rounded border border-amber-100">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{offer.offeredProduce}</p>
                      {offer.message && (
                        <p className="text-xs text-muted-foreground truncate">{offer.message}</p>
                      )}
                      <p className="text-xs text-amber-600 mt-1">Status: {offer.status}</p>
                    </div>
                    <Button
                      onClick={() => handleDeleteOffer(offer.id)}
                      variant="outline"
                      size="sm"
                      disabled={deleting}
                      className="border-error text-error hover:bg-error/10 flex-shrink-0"
                    >
                      Delete
                    </Button>
                  </div>
                ))}
              </div>
              <p className="text-xs text-amber-700 mt-2">Delete your existing offer to submit a new one</p>
            </div>
          )}

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
            <Button onClick={onClose} variant="outline" className="flex-1" disabled={loading || deleting}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              className="flex-1 bg-primary hover:bg-primary-hover text-primary-foreground"
              disabled={loading || deleting}
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
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const TOMATO_LABELS = [
    { value: 1, label: 'Poor' },
    { value: 2, label: 'Fair' },
    { value: 3, label: 'Good' },
    { value: 4, label: 'Very Good' },
    { value: 5, label: 'Excellent' },
  ];

  const displayRating = hoverRating || rating;
  const label = TOMATO_LABELS.find((l) => l.value === Math.floor(displayRating))?.label;

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
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to submit rating');
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
            {/* Fixed-height container to prevent modal from resizing */}
            <div className="h-32 flex flex-col items-center justify-center gap-2">
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((value) => {
                  const isFilled = value <= displayRating;
                  const isHovering = value <= hoverRating;

                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setRating(value)}
                      onMouseEnter={() => setHoverRating(value)}
                      onMouseLeave={() => setHoverRating(0)}
                      className="w-10 h-10 transition-all duration-200 cursor-pointer hover:scale-110 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded"
                      aria-label={`${value} tomato${value > 1 ? 'es' : ''}`}
                    >
                      {value === 1 ? (
                        <svg
                          viewBox="0 0 24 24"
                          xmlns="http://www.w3.org/2000/svg"
                          className="w-full h-full"
                          style={{ opacity: isHovering ? 1 : 1 }}
                        >
                          <circle
                            cx="12"
                            cy="14"
                            r="8"
                            style={{ fill: isFilled ? '#8B4513' : '#E4D8C2' }}
                          />
                          {isFilled && (
                            <>
                              <path
                                d="M 9 11 Q 10 12 11 11"
                                stroke="rgba(0, 0, 0, 0.3)"
                                strokeWidth="0.6"
                                strokeLinecap="round"
                              />
                              <path
                                d="M 13 11 Q 14 12 15 11"
                                stroke="rgba(0, 0, 0, 0.3)"
                                strokeWidth="0.6"
                                strokeLinecap="round"
                              />
                              <path
                                d="M 8 14 Q 9 15 10 14"
                                stroke="rgba(0, 0, 0, 0.25)"
                                strokeWidth="0.6"
                                strokeLinecap="round"
                              />
                              <path
                                d="M 14 14 Q 15 15 16 14"
                                stroke="rgba(0, 0, 0, 0.25)"
                                strokeWidth="0.6"
                                strokeLinecap="round"
                              />
                              <path
                                d="M 10 17 Q 11 18 12 17"
                                stroke="rgba(0, 0, 0, 0.2)"
                                strokeWidth="0.5"
                                strokeLinecap="round"
                              />
                              <path
                                d="M 12 17 Q 13 18 14 17"
                                stroke="rgba(0, 0, 0, 0.2)"
                                strokeWidth="0.5"
                                strokeLinecap="round"
                              />
                            </>
                          )}
                          <path
                            d="M12 6V3M10 4.5C10 4.5 10.5 5.5 12 5.5C13.5 5.5 14 4.5 14 4.5M9 3C9 3 9.5 4 10.5 4.5M15 3C15 3 14.5 4 13.5 4.5"
                            stroke="#4a7c3f"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            opacity={isFilled ? 1 : 0.5}
                          />
                        </svg>
                      ) : (
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                          className="w-full h-full"
                        >
                          <path
                            d="M12 22C16.4183 22 20 18.4183 20 14C20 9.58172 16.4183 6 12 6C7.58172 6 4 9.58172 4 14C4 18.4183 7.58172 22 12 22Z"
                            fill={
                              isFilled
                                ? '#E63946'
                                : '#E4D8C2'
                            }
                            className="transition-colors duration-200"
                          />
                          <path
                            d="M12 6V3M10 4.5C10 4.5 10.5 5.5 12 5.5C13.5 5.5 14 4.5 14 4.5M9 3C9 3 9.5 4 10.5 4.5M15 3C15 3 14.5 4 13.5 4.5"
                            stroke="#4a7c3f"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            opacity={isFilled ? 1 : 0.5}
                          />
                        </svg>
                      )}
                    </button>
                  );
                })}
              </div>
              {/* Fixed-height label space (always visible, content changes on hover) */}
              <div className="h-6 flex items-center justify-center">
                {label && (
                  <span className="text-sm font-medium text-muted-foreground transition-opacity duration-150">
                    {label}
                  </span>
                )}
              </div>
            </div>
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
            <Button onClick={onClose} variant="outline" className="flex-1" disabled={loading}>
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
