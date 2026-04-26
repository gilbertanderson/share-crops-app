import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { API } from '../../utils/api';
import type { Listing, User, Community } from '../../types';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { TomatoLoader } from './ui/tomato-loader';
import { ListingCard } from './ListingCard';
import { isProduceInSeason } from '../../utils/seasonalProduce';
import { useMobileScrollActive } from '../hooks/useMobileScrollActive';
import { useAuth } from '../context/AuthContext';
import { Avatar, AvatarImage, AvatarFallback } from './ui/avatar';

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

function AdminMembersModal({
  community,
  onClose,
}: {
  community: Community;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [removingId, setRemovingId] = useState<string | null>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['community-members', community.id],
    queryFn: () => API.getCommunityMembers(community.id),
  });
  const members: User[] = data?.members ?? [];

  const handleRemove = async (userId: string) => {
    setRemovingId(userId);
    try {
      await API.removeCommunityMember(community.id, userId);
      await refetch();
      queryClient.invalidateQueries({ queryKey: ['listings'] });
    } catch (err) {
      console.error('Failed to remove member', err);
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{community.name} — Members</DialogTitle>
        </DialogHeader>
        {isLoading ? (
          <TomatoLoader label="Loading..." className="py-8" />
        ) : members.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No members found.</p>
        ) : (
          <div className="space-y-2">
            {members.map((member) => (
              <div key={member.id} className="flex items-center justify-between gap-3 py-2 border-b border-border last:border-0">
                <div className="flex items-center gap-2 min-w-0">
                  <Avatar className="w-8 h-8 shrink-0">
                    <AvatarImage src={member.profilePhotoUrl} />
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                      {member.name?.charAt(0)?.toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{member.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleRemove(member.id)}
                  disabled={removingId === member.id}
                  className="shrink-0 border-error text-error hover:bg-error/10 text-xs"
                >
                  {removingId === member.id ? 'Removing...' : 'Remove'}
                </Button>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function CommunitySearchModal({ onClose, onJoined }: { onClose: () => void; onJoined: () => void }) {
  const queryClient = useQueryClient();
  const [zipCode, setZipCode] = useState('');
  const [communityName, setCommunityName] = useState('');
  const [results, setResults] = useState<Community[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = async () => {
    if (zipCode.length < 5) { setError('Enter a valid 5-digit ZIP code'); return; }
    setError('');
    setLoading(true);
    try {
      const data = await API.searchCommunities(zipCode);
      setResults(data.communities ?? []);
    } catch (err: any) {
      setError(err.message || 'Search failed');
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async (communityId: string) => {
    setLoading(true);
    setError('');
    try {
      await API.joinCommunity(communityId);
      queryClient.invalidateQueries({ queryKey: ['my-community'] });
      queryClient.invalidateQueries({ queryKey: ['my-communities'] });
      onJoined();
    } catch (err: any) {
      setError(err.message || 'Failed to join');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!communityName.trim()) { setError('Enter a community name'); return; }
    setLoading(true);
    setError('');
    try {
      await API.createCommunity(communityName.trim(), zipCode);
      queryClient.invalidateQueries({ queryKey: ['my-community'] });
      queryClient.invalidateQueries({ queryKey: ['my-communities'] });
      onJoined();
    } catch (err: any) {
      setError(err.message || 'Failed to create community');
    } finally {
      setLoading(false);
    }
  };

  const noResults = results !== null && results.length === 0;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Find a Community</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="flex gap-2">
            <Input
              placeholder="ZIP code"
              value={zipCode}
              maxLength={5}
              onChange={(e) => { setZipCode(e.target.value.replace(/\D/g, '').slice(0, 5)); setResults(null); }}
              className="bg-input-background border-input-border"
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
            <Button onClick={handleSearch} disabled={loading} className="bg-primary hover:bg-primary-hover text-primary-foreground shrink-0">
              Search
            </Button>
          </div>

          {results !== null && results.length > 0 && (
            <div className="space-y-2">
              {results.map((c) => (
                <div key={c.id} className="flex items-center justify-between gap-3 p-3 border border-border rounded-lg">
                  <div>
                    <p className="font-medium text-sm">{c.name}</p>
                    <p className="text-xs text-muted-foreground">{c.memberCount} {c.memberCount === 1 ? 'member' : 'members'}</p>
                  </div>
                  <Button size="sm" onClick={() => handleJoin(c.id)} disabled={loading} className="bg-primary hover:bg-primary-hover text-primary-foreground shrink-0">
                    Join
                  </Button>
                </div>
              ))}
            </div>
          )}

          {noResults && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">No communities found in ZIP {zipCode}. Create one:</p>
              <div className="flex gap-2">
                <Input
                  placeholder="Community name"
                  value={communityName}
                  onChange={(e) => setCommunityName(e.target.value)}
                  className="bg-input-background border-input-border"
                  onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                />
                <Button onClick={handleCreate} disabled={loading} className="bg-primary hover:bg-primary-hover text-primary-foreground shrink-0">
                  Create
                </Button>
              </div>
            </div>
          )}

          {error && <p className="text-sm text-error">{error}</p>}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function Marketplace() {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [filter, setFilter] = useState<'all' | 'community' | 'global'>('community');
  const [searchQuery, setSearchQuery] = useState('');
  const [sort, setSort] = useState<'default' | 'date-desc' | 'date-asc' | 'alpha-asc' | 'alpha-desc'>('default');
  const [showCreate, setShowCreate] = useState(false);
  const [managingCommunity, setManagingCommunity] = useState<Community | null>(null);
  const [showCommunitySearch, setShowCommunitySearch] = useState(false);

  const { data: communityData, isLoading: isCommunityLoading } = useQuery({
    queryKey: ['my-community'],
    queryFn: () => API.getMyCommunity(),
  });
  const community = communityData?.community ?? null;

  const { data: listingsData, isLoading: isListingsLoading } = useQuery({
    queryKey: ['listings', filter, community?.id ?? null],
    queryFn: () =>
      filter === 'community' && community
        ? API.getListings({ communityId: community.id })
        : API.getListings({}),
    enabled: filter === 'global' || filter === 'all' || !!community,
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
    (filter !== 'global' && isCommunityLoading) ||
    (filter === 'community' && communityData === undefined) ||
    isListingsLoading;

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const filteredListings = normalizedQuery
    ? listings.filter(
        (l) =>
          l.title?.toLowerCase().includes(normalizedQuery) ||
          l.description?.toLowerCase().includes(normalizedQuery)
      )
    : listings;

  const rankByListingId = new Map<string, number>();
  (rankingData?.items ?? [])
    .filter((item) => item.offerCount > 0 && item.listing.communityId === community?.id)
    .forEach((item, index) => {
      rankByListingId.set(item.listing.id, index + 1);
    });

  const visibleListings = [...filteredListings].sort((a, b) => {
    if (sort === 'date-desc') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    if (sort === 'date-asc')  return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    if (sort === 'alpha-asc') return a.title.localeCompare(b.title);
    if (sort === 'alpha-desc') return b.title.localeCompare(a.title);
    // Default: in-season → community rank → A–Z
    const aIn = isProduceInSeason(a.title, a.description);
    const bIn = isProduceInSeason(b.title, b.description);
    if (aIn !== bIn) return aIn ? -1 : 1;
    const aRank = rankByListingId.get(a.id) ?? Infinity;
    const bRank = rankByListingId.get(b.id) ?? Infinity;
    if (aRank !== bRank) return aRank - bRank;
    return a.title.localeCompare(b.title);
  });

  const { containerRef: listingsRef, activeId: activeListingId } = useMobileScrollActive(
    visibleListings.map((listing) => listing.id)
  );

  const isDateSort = sort === 'date-desc' || sort === 'date-asc';
  const isAlphaSort = sort === 'alpha-asc' || sort === 'alpha-desc';

  const handleDateSort = () => {
    if (sort === 'date-desc') setSort('date-asc');
    else if (sort === 'date-asc') setSort('date-desc');
    else setSort('date-desc');
  };

  const handleAlphaSort = () => {
    if (sort === 'alpha-asc') setSort('alpha-desc');
    else if (sort === 'alpha-desc') setSort('alpha-asc');
    else setSort('alpha-asc');
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-10 bg-background border-b border-border">
        <div className="max-w-4xl mx-auto px-4 py-4 space-y-3">
          <div>
            <h1 className="text-2xl font-bold">Marketplace</h1>
            {community ? (
              <p className="text-sm text-muted-foreground">
                {community.name} · ZIP {community.zipCode}
              </p>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-2">
            {community && (
              <>
                <Button
                  variant={filter === 'community' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilter('community')}
                  className={filter === 'community' ? 'bg-primary text-primary-foreground' : ''}
                >
                  {community.name}
                </Button>
                {isAdmin && filter === 'community' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setManagingCommunity(community)}
                    className="text-muted-foreground hover:text-foreground px-2"
                    aria-label="Manage community members"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  </Button>
                )}
                <Button
                  variant={filter === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilter('all')}
                  className={filter === 'all' ? 'bg-primary text-primary-foreground' : ''}
                >
                  All ZIP {community.zipCode}
                </Button>
              </>
            )}
            {isAdmin && (
              <Button
                variant={filter === 'global' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('global')}
                className={filter === 'global' ? 'bg-primary text-primary-foreground' : ''}
              >
                All Communities
              </Button>
            )}
          </div>

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

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground shrink-0">Sort:</span>
              <Button
                size="sm"
                variant={isDateSort ? 'default' : 'outline'}
                onClick={handleDateSort}
                className={isDateSort ? 'bg-primary text-primary-foreground h-7 text-xs px-2.5' : 'h-7 text-xs px-2.5'}
              >
                {sort === 'date-asc' ? 'Old → New' : 'New → Old'}
              </Button>
              <Button
                size="sm"
                variant={isAlphaSort ? 'default' : 'outline'}
                onClick={handleAlphaSort}
                className={isAlphaSort ? 'bg-primary text-primary-foreground h-7 text-xs px-2.5' : 'h-7 text-xs px-2.5'}
              >
                {sort === 'alpha-desc' ? 'Z → A' : 'A → Z'}
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCommunitySearch(true)}
                className="text-muted-foreground"
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Community
              </Button>
              <Button
                onClick={() => setShowCreate(true)}
                size="sm"
                className="bg-primary hover:bg-primary-hover text-primary-foreground"
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                List
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {filter === 'all' && community?.id && (
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

      {managingCommunity && (
        <AdminMembersModal
          community={managingCommunity}
          onClose={() => setManagingCommunity(null)}
        />
      )}

      {showCommunitySearch && (
        <CommunitySearchModal
          onClose={() => setShowCommunitySearch(false)}
          onJoined={() => {
            setShowCommunitySearch(false);
            setFilter('community');
          }}
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
