import React, { useState, useEffect } from 'react';
import { API, AuthManager } from '../../utils/api';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { TomatoRatingDisplay } from './TomatoRating';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';

interface ListingCardProps {
  listing: any;
  onClick: () => void;
}

function ListingCard({ listing, onClick }: ListingCardProps) {
  const [seller, setSeller] = useState<any>(null);

  useEffect(() => {
    const loadSeller = async () => {
      try {
        const data = await API.getProfile(listing.sellerId);
        setSeller(data.profile);
      } catch (err) {
        console.error('Failed to load seller', err);
      }
    };
    loadSeller();
  }, [listing.sellerId]);

  return (
    <Card
      onClick={onClick}
      className="cursor-pointer hover:shadow-lg transition-shadow overflow-hidden"
    >
      <div className="relative aspect-square bg-muted">
        {listing.photos?.[0] ? (
          <img
            src={listing.photos[0]}
            alt={listing.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <svg className="w-16 h-16 text-muted-foreground opacity-50" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 22C16.4183 22 20 18.4183 20 14C20 9.58172 16.4183 6 12 6C7.58172 6 4 9.58172 4 14C4 18.4183 7.58172 22 12 22Z" />
            </svg>
          </div>
        )}
      </div>
      <CardContent className="p-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold line-clamp-1">{listing.title}</h3>
          <Badge variant="secondary" className="shrink-0 text-xs">
            {listing.zipCode}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground line-clamp-2">{listing.description}</p>
        {listing.quantity && (
          <p className="text-sm font-medium text-foreground">Qty: {listing.quantity}</p>
        )}
        {seller && seller.ratingCount > 0 && (
          <div className="pt-1">
            <TomatoRatingDisplay rating={seller.rating} count={seller.ratingCount} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function Marketplace({ onCreateListing, onViewListing }: { onCreateListing: () => void; onViewListing: (id: string) => void }) {
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'community'>('community');
  const [searchQuery, setSearchQuery] = useState('');
  const [community, setCommunity] = useState<any>(null);

  useEffect(() => {
    loadData();
  }, [filter]);

  const loadData = async () => {
    setLoading(true);
    try {
      const communityData = await API.getMyCommunity();
      setCommunity(communityData.community);

      const filters = filter === 'community' && communityData.community
        ? { communityId: communityData.community.id }
        : {};

      const data = await API.getListings(filters);
      setListings(data.listings || []);
    } catch (err) {
      console.error('Failed to load listings', err);
    } finally {
      setLoading(false);
    }
  };

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const visibleListings = normalizedQuery
    ? listings.filter((listing) =>
        listing.title?.toLowerCase().includes(normalizedQuery) ||
        listing.description?.toLowerCase().includes(normalizedQuery)
      )
    : listings;

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-10 bg-background border-b border-border">
        <div className="max-w-4xl mx-auto px-4 py-4 space-y-3">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">Marketplace</h1>
            <Button
              onClick={onCreateListing}
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
                My Community
              </Button>
              <Button
                variant={filter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('all')}
                className={filter === 'all' ? 'bg-primary text-primary-foreground' : ''}
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
        {loading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading...</p>
          </div>
        ) : listings.length === 0 ? (
          <div className="text-center py-12 space-y-4">
            <svg className="w-16 h-16 mx-auto text-muted-foreground opacity-50" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 22C16.4183 22 20 18.4183 20 14C20 9.58172 16.4183 6 12 6C7.58172 6 4 9.58172 4 14C4 18.4183 7.58172 22 12 22Z" />
            </svg>
            <div>
              <p className="text-lg font-medium text-muted-foreground">No listings yet</p>
              <p className="text-sm text-muted-foreground mt-1">Be the first to share your produce!</p>
            </div>
            <Button onClick={onCreateListing} className="bg-primary hover:bg-primary-hover text-primary-foreground">
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {visibleListings.map((listing) => (
              <ListingCard
                key={listing.id}
                listing={listing}
                onClick={() => onViewListing(listing.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function CreateListing({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
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
        const file = files[i];
        const data = await API.uploadPhoto(file);
        if (data.url) {
          uploadedUrls.push(data.url);
        }
      }

      setPhotos([...photos, ...uploadedUrls]);
    } catch (err: any) {
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
      await API.createListing({
        title,
        description,
        quantity,
        photos,
        lookingFor,
        expiresInDays,
      });
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to create listing');
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
            <Input
              id="title"
              placeholder="e.g., Fresh Tomatoes"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="bg-input-background border-input-border"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Tell others about your produce..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="bg-input-background border-input-border resize-none"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="quantity">Quantity (optional)</Label>
            <Input
              id="quantity"
              placeholder="e.g., 10 lbs, 2 dozen"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="bg-input-background border-input-border"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="lookingFor">Looking for (optional)</Label>
            <Input
              id="lookingFor"
              placeholder="e.g., Fresh eggs, herbs"
              value={lookingFor}
              onChange={(e) => setLookingFor(e.target.value)}
              className="bg-input-background border-input-border"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="expiresInDays">Auto-delete after (days)</Label>
            <Input
              id="expiresInDays"
              type="number"
              min={1}
              max={30}
              value={expiresInDays}
              onChange={(e) => setExpiresInDays(Number(e.target.value) || 1)}
              className="bg-input-background border-input-border"
            />
            <p className="text-xs text-muted-foreground">Choose 1 to 30 days.</p>
          </div>

          <div className="space-y-2">
            <Label>Photos (up to 5)</Label>
            <div className="grid grid-cols-3 gap-2">
              {photos.map((url, index) => (
                <div key={index} className="relative aspect-square bg-muted rounded-lg overflow-hidden">
                  <img src={url} alt={`Photo ${index + 1}`} className="w-full h-full object-cover" />
                  <button
                    onClick={() => setPhotos(photos.filter((_, i) => i !== index))}
                    className="absolute top-1 right-1 bg-error text-error-foreground rounded-full w-6 h-6 flex items-center justify-center"
                  >
                    ×
                  </button>
                </div>
              ))}
              {photos.length < 5 && (
                <label className="aspect-square bg-muted rounded-lg border-2 border-dashed border-border flex items-center justify-center cursor-pointer hover:bg-muted/80">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handlePhotoUpload}
                    className="hidden"
                    disabled={uploading}
                  />
                  {uploading ? (
                    <span className="text-xs text-muted-foreground">Uploading...</span>
                  ) : (
                    <svg className="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  )}
                </label>
              )}
            </div>
          </div>

          {error && (
            <div className="bg-error/10 border border-error rounded-md p-3">
              <p className="text-sm text-error">{error}</p>
            </div>
          )}

          <div className="flex gap-2 pt-2">
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
              disabled={loading || uploading}
            >
              {loading ? 'Creating...' : 'Create Listing'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
