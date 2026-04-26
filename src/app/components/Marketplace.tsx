import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { API } from '../../utils/api';
import type { Listing } from '../../types';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { TomatoLoader } from './ui/tomato-loader';
import { ListingCard } from './ListingCard';
import { isProduceInSeason } from '../../utils/seasonalProduce';
import { useMobileScrollActive } from '../hooks/useMobileScrollActive';

function TrendingSection({
  zipCode,
  communityId,
  communityName,
}: {
  zipCode: string;
  communityId: string;
  communityName: string;
}) {
  const { data, isLoading } = useQuery({
    queryKey: ['trending', zipCode],
    queryFn: () => API.getTrendingByZip(zipCode),
    staleTime: 60_000,
  });

  const items = (data?.items ?? [])
    .filter((item) => item.listing.communityId === communityId)
    .slice(0, 5);
  const topItems = items.filter((i) => i.offerCount > 0);

  if (isLoading) return null;
  if (topItems.length === 0) return null;

  return (
    <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 mb-6">
      <div className="flex items-center gap-2 mb-3">
        <svg className="w-4 h-4 text-primary shrink-0" fill="currentColor" viewBox="0 0 24 24">
          <path d="M13 3L4 14h7l-2 7 9-11h-7l2-7z" />
        </svg>
        <span className="text-sm font-semibold text-primary">Most requested in {communityName}</span>
      </div>
      <ol className="space-y-1.5">
        {topItems.map((item, idx) => (
          <li key={item.listing.id} className="flex items-center gap-2">
            <span className="text-xs font-bold text-muted-foreground w-4 shrink-0">{idx + 1}.</span>
            <span className="text-sm font-medium text-foreground truncate flex-1">{item.listing.title}</span>
            <span className="text-xs text-muted-foreground shrink-0">
              {item.offerCount} {item.offerCount === 1 ? 'offer' : 'offers'}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

export function Marketplace() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<'zip' | 'community'>('community');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreate, setShowCreate] = useState(false);

  const { data: communityData, isLoading: isCommunityLoading } = useQuery({
    queryKey: ['my-community'],
    queryFn: () => API.getMyCommunity(),
  });
  const community = communityData?.community ?? null;

  const { data: listingsData, isLoading: isListingsLoading } = useQuery({
    queryKey: ['listings', filter, community?.id ?? null],
    queryFn: () =>
      API.getListings(filter === 'community' && community ? { communityId: community.id } : {}),
    enabled: filter === 'zip' || !!community,
  });
  const listings: Listing[] = listingsData?.listings ?? [];

  const { data: rankingData } = useQuery({
    queryKey: ['trending', community?.zipCode],
    queryFn: () => API.getTrendingByZip(community!.zipCode),
    enabled: !!community?.zipCode,
    staleTime: 60_000,
  });

  // Avoid flashing empty state before community context resolves and listings query can start.
  const showListingsLoader =
    isCommunityLoading || (filter === 'community' && communityData === undefined) || isListingsLoading;

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const filteredListings = normalizedQuery
    ? listings.filter(
        (l) =>
          l.title?.toLowerCase().includes(normalizedQuery) ||
          l.description?.toLowerCase().includes(normalizedQuery)
      )
    : listings;

  const visibleListings = [...filteredListings].sort((a, b) => {
    const aIn = isProduceInSeason(a.title, a.description);
    const bIn = isProduceInSeason(b.title, b.description);
    return aIn === bIn ? 0 : aIn ? -1 : 1;
  });

  const { containerRef: listingsRef, activeId: activeListingId } = useMobileScrollActive(
    visibleListings.map((listing) => listing.id)
  );

  const rankByListingId = new Map<string, number>();
  (rankingData?.items ?? [])
    .filter((item) => item.offerCount > 0 && item.listing.communityId === community?.id)
    .forEach((item, index) => {
      rankByListingId.set(item.listing.id, index + 1);
    });

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-10 bg-background border-b border-border">
        <div className="max-w-4xl mx-auto px-4 py-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Marketplace</h1>
              {community ? (
                <p className="text-sm text-muted-foreground">
                  {community.name} · ZIP {community.zipCode}
                </p>
              ) : null}
            </div>
            <Button
              onClick={() => setShowCreate(true)}
              size="sm"
              className="bg-primary hover:bg-primary-hover text-primary-foreground"
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              List Item
            </Button>
          </div>

          {community && (
            <div className="flex gap-2">
              <Button
                variant={filter === 'community' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('community')}
                className={filter === 'community' ? 'bg-primary text-primary-foreground' : ''}
              >
                {community.name}
              </Button>
              <Button
                variant={filter === 'zip' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('zip')}
                className={filter === 'zip' ? 'bg-primary text-primary-foreground' : ''}
              >
                All ZIP {community.zipCode}
              </Button>
            </div>
          )}

          <div className="relative">
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by item name..."
              className="bg-input-background border-input-border pr-10"
              aria-label="Search items by name"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label="Clear search"
              >
                ×
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {filter === 'zip' && community?.id && (
          <TrendingSection
            zipCode={community.zipCode}
            communityId={community.id}
            communityName={community.name}
          />
        )}
        {showListingsLoader ? (
          <TomatoLoader label="Loading..." className="py-12" />
        ) : listings.length === 0 ? (
          <div className="text-center py-12 space-y-4">
            <svg className="w-16 h-16 mx-auto text-muted-foreground opacity-50" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 22C16.4183 22 20 18.4183 20 14C20 9.58172 16.4183 6 12 6C7.58172 6 4 9.58172 4 14C4 18.4183 7.58172 22 12 22Z" />
            </svg>
            <div>
              <p className="text-lg font-medium text-muted-foreground">No listings yet</p>
              <p className="text-sm text-muted-foreground mt-1">Be the first to share your produce!</p>
            </div>
            <Button onClick={() => setShowCreate(true)} className="bg-primary hover:bg-primary-hover text-primary-foreground">
              Create First Listing
            </Button>
          </div>
        ) : visibleListings.length === 0 ? (
          <div className="text-center py-12 space-y-2">
            <p className="text-lg font-medium text-muted-foreground">No matching items</p>
            <p className="text-sm text-muted-foreground">
              No listings match "{searchQuery}". Try another item name.
            </p>
          </div>
        ) : (
          <div ref={listingsRef} className="grid grid-cols-1 sm:grid-cols-2 gap-4 mobile-vertical-carousel">
            {visibleListings.map((listing) => (
              <ListingCard
                key={listing.id}
                listing={listing}
                mobileActive={activeListingId === listing.id}
                rank={rankByListingId.get(listing.id) ?? null}
                onClick={() => navigate(`/listing/${listing.id}`)}
              />
            ))}
          </div>
        )}
      </div>

      {showCreate && (
        <CreateListing
          onClose={() => setShowCreate(false)}
          onSuccess={() => setShowCreate(false)}
        />
      )}
    </div>
  );
}

export function CreateListing({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [quantity, setQuantity] = useState('');
  const [lookingFor, setLookingFor] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [expiresInDays, setExpiresInDays] = useState(7);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    setError('');
    try {
      const uploadedUrls: string[] = [];
      for (let i = 0; i < Math.min(files.length, 5 - photos.length); i++) {
        const data = await API.uploadPhoto(files[i]);
        if (data.url) uploadedUrls.push(data.url);
      }
      setPhotos([...photos, ...uploadedUrls]);
    } catch {
      setError('Failed to upload photos. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!title.trim() || !description.trim()) {
      setError('Title and description are required');
      return;
    }
    if (!Number.isInteger(expiresInDays) || expiresInDays < 1 || expiresInDays > 30) {
      setError('Expiration must be between 1 and 30 days');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await API.createListing({ title, description, quantity, photos, lookingFor, expiresInDays });
      queryClient.invalidateQueries({ queryKey: ['listings'] });
      onSuccess();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create listing');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>List Your Produce</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">What are you sharing?</Label>
            <Input id="title" placeholder="e.g., Fresh Tomatoes" value={title} onChange={(e) => setTitle(e.target.value)} className="bg-input-background border-input-border" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" placeholder="Tell others about your produce..." value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="bg-input-background border-input-border resize-none" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="quantity">Quantity (optional)</Label>
            <Input id="quantity" placeholder="e.g., 10 lbs, 2 dozen" value={quantity} onChange={(e) => setQuantity(e.target.value)} className="bg-input-background border-input-border" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="lookingFor">Looking for (optional)</Label>
            <Input id="lookingFor" placeholder="e.g., Fresh eggs, herbs" value={lookingFor} onChange={(e) => setLookingFor(e.target.value)} className="bg-input-background border-input-border" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="expiresInDays">Auto-delete after (days)</Label>
            <Input id="expiresInDays" type="number" min={1} max={30} value={expiresInDays} onChange={(e) => setExpiresInDays(Number(e.target.value) || 1)} className="bg-input-background border-input-border" />
            <p className="text-xs text-muted-foreground">Choose 1 to 30 days.</p>
          </div>

          <div className="space-y-2">
            <Label>Photos (up to 5)</Label>
            <div className="grid grid-cols-3 gap-2">
              {photos.map((url, index) => (
                <div key={index} className="relative aspect-square bg-muted rounded-lg overflow-hidden">
                  <img src={url} alt={`Photo ${index + 1}`} className="w-full h-full object-cover" loading="lazy" />
                  <button type="button" aria-label={`Remove photo ${index + 1}`} onClick={() => setPhotos(photos.filter((_, i) => i !== index))} className="absolute top-1 right-1 bg-error text-error-foreground rounded-full w-6 h-6 flex items-center justify-center"><span aria-hidden="true">×</span></button>
                </div>
              ))}
              {photos.length < 5 && (
                <label className="aspect-square bg-muted rounded-lg border-2 border-dashed border-border flex items-center justify-center cursor-pointer hover:bg-muted/80">
                  <input type="file" accept="image/*" multiple onChange={handlePhotoUpload} className="hidden" disabled={uploading} />
                  {uploading ? <span className="text-xs text-muted-foreground">Uploading...</span> : (
                    <svg className="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  )}
                </label>
              )}
            </div>
          </div>

          {error && <div className="bg-error/10 border border-error rounded-md p-3"><p className="text-sm text-error">{error}</p></div>}

          <div className="flex gap-2 pt-2">
            <Button onClick={onClose} variant="outline" className="flex-1" disabled={loading}>Cancel</Button>
            <Button onClick={handleSubmit} className="flex-1 bg-primary hover:bg-primary-hover text-primary-foreground" disabled={loading || uploading}>
              {loading ? 'Creating...' : 'Create Listing'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
