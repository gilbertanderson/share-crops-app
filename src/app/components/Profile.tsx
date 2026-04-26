import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { API } from '../../utils/api';
import { useAuth } from '../context/AuthContext';
import { useMobileScrollActive } from '../hooks/useMobileScrollActive';
import type { User, Listing, Rating, Community } from '../../types';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Card, CardContent } from './ui/card';
import { Avatar, AvatarImage, AvatarFallback } from './ui/avatar';
import { TomatoRatingDisplay } from './TomatoRating';
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
import { TomatoLoader } from './ui/tomato-loader';

export function Profile() {
  const navigate = useNavigate();
  const { logout, isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [confirmLeaveId, setConfirmLeaveId] = useState<string | null>(null);
  const [leavingCommunityId, setLeavingCommunityId] = useState<string | null>(null);
  const [leaveError, setLeaveError] = useState('');
  const [showEditDialog, setShowEditDialog] = useState(false);

  const { data: meData, isLoading } = useQuery({
    queryKey: ['me'],
    queryFn: () => API.getMe(),
  });
  const user: User | null = meData?.user ?? null;

  const { data: listingsData } = useQuery({
    queryKey: ['my-listings', user?.id],
    queryFn: () => API.getUserListings(user!.id),
    enabled: !!user?.id,
  });
  const listings: Listing[] = listingsData?.listings ?? [];
  const visibleListings = listings.slice(0, 6);
  const { containerRef: profileListingsRef, activeId: activeProfileListingId } = useMobileScrollActive(
    visibleListings.map((listing) => listing.id)
  );

  const { data: ratingsData } = useQuery({
    queryKey: ['my-ratings', user?.id],
    queryFn: () => API.getUserRatings(user!.id),
    enabled: !!user?.id,
  });
  const ratings: Rating[] = ratingsData?.ratings ?? [];

  const { data: communitiesData } = useQuery({
    queryKey: ['my-communities'],
    queryFn: () => API.getMyCommunities(),
  });
  const communities: Community[] = communitiesData?.communities ?? [];
  const activeCommunityId: string | null = communitiesData?.activeCommunityId ?? null;

  const [deletingRatingId, setDeletingRatingId] = useState<string | null>(null);

  const handleDeleteRating = async (ratingId: string) => {
    setDeletingRatingId(ratingId);
    try {
      await API.deleteRating(ratingId);
      queryClient.invalidateQueries({ queryKey: ['my-ratings', user?.id] });
    } catch (err) {
      console.error('Failed to delete rating', err);
    } finally {
      setDeletingRatingId(null);
    }
  };

  const handleLeaveCommunity = async () => {
    if (!confirmLeaveId) return;
    setLeaveError('');
    setLeavingCommunityId(confirmLeaveId);
    try {
      await API.leaveCommunity(confirmLeaveId);
      setConfirmLeaveId(null);
      queryClient.invalidateQueries({ queryKey: ['my-communities'] });
    } catch (err: unknown) {
      setLeaveError(err instanceof Error ? err.message : 'Failed to leave community');
    } finally {
      setLeavingCommunityId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <TomatoLoader label="Loading..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-10 bg-background border-b border-border">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold">Profile</h1>
          <Button
            onClick={logout}
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-foreground"
          >
            Log Out
          </Button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="flex items-start gap-4">
              <Avatar className="w-12 h-12">
                <AvatarImage src={user?.profilePhotoUrl} alt={user?.name ? `${user.name}'s profile photo` : 'Profile photo'} />
                <AvatarFallback className="bg-primary text-primary-foreground text-lg">
                  {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <h2 className="text-xl font-bold">{user?.name}</h2>
                <p className="text-sm text-muted-foreground">{user?.email}</p>
                {user && user.ratingCount > 0 && (
                  <div className="mt-2">
                    <TomatoRatingDisplay rating={user.rating} count={user.ratingCount} />
                  </div>
                )}
              </div>
            </div>

            {user?.bio && (
              <div className="pt-2">
                <p className="text-sm text-foreground">{user.bio}</p>
              </div>
            )}

            {user?.socialUrl && (
              <div className="flex items-center gap-2 text-sm">
                <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
                <a
                  href={user.socialUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline truncate"
                >
                  {user.socialUrl}
                </a>
              </div>
            )}

            <Button
              onClick={() => setShowEditDialog(true)}
              className="w-full bg-primary hover:bg-primary-hover text-primary-foreground"
            >
              Edit Profile
            </Button>
          </CardContent>
        </Card>

        <div className="space-y-3">
          <h3 className="font-semibold">My Listings</h3>
          {listings.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground">
                No listings yet
              </CardContent>
            </Card>
          ) : (
            <div ref={profileListingsRef} className="grid grid-cols-2 sm:grid-cols-3 gap-3 mobile-vertical-carousel">
              {visibleListings.map((listing) => (
                <Card
                  key={listing.id}
                  onClick={() => navigate(`/listing/${listing.id}`)}
                  onPointerDown={(e) => {
                    if (e.pointerType === 'touch' || e.pointerType === 'pen') {
                      (e.currentTarget as HTMLElement).focus();
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  aria-label={`View listing: ${listing.title}`}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      navigate(`/listing/${listing.id}`);
                    }
                  }}
                  data-mobile-card-id={listing.id}
                  className={[
                    'cursor-pointer transition-all duration-200 hover:shadow-xl hover:-translate-y-0.5 mobile-focus-shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
                    activeProfileListingId === listing.id ? 'mobile-scroll-active-xl' : '',
                  ].join(' ')}
                >
                  <div className="relative w-full aspect-square bg-muted rounded-t-lg overflow-hidden">
                    {listing.photos?.[0] ? (
                      <img
                        src={listing.photos[0]}
                        alt={listing.title}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <svg className="w-6 h-6 text-muted-foreground opacity-50" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 22C16.4183 22 20 18.4183 20 14C20 9.58172 16.4183 6 12 6C7.58172 6 4 9.58172 4 14C4 18.4183 7.58172 22 12 22Z" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <CardContent className="p-3">
                    <p className="font-medium text-sm truncate">{listing.title}</p>
                    <p className="text-xs text-muted-foreground capitalize">{listing.status}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-3">
          <h3 className="font-semibold">My Communities</h3>
          {communities.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground">
                You are not in any communities
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {communities.map((community) => (
                <Card key={community.id}>
                  <CardContent className="p-4 flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium">{community.name}</p>
                      <p className="text-sm text-muted-foreground">ZIP {community.zipCode}</p>
                      {activeCommunityId === community.id && (
                        <p className="text-xs text-primary mt-1">Active community</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-0.5">{community.memberCount} {community.memberCount === 1 ? 'member' : 'members'}</p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => { setLeaveError(''); setConfirmLeaveId(community.id); }}
                      disabled={leavingCommunityId === community.id}
                      className="border-error text-error hover:bg-error/10"
                    >
                      {leavingCommunityId === community.id ? 'Leaving...' : 'Leave'}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {ratings.length > 0 && (
          <div className="space-y-3">
            <h3 className="font-semibold">Recent Reviews</h3>
            {ratings.slice(0, 3).map((rating) => (
              <Card key={rating.id}>
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <TomatoRatingDisplay rating={rating.rating} />
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {new Date(rating.createdAt).toLocaleDateString()}
                      </span>
                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() => handleDeleteRating(rating.id)}
                          disabled={deletingRatingId === rating.id}
                          aria-label="Delete review"
                          className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                  {rating.comment && (
                    <p className="text-sm text-foreground">{rating.comment}</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <AlertDialog open={!!confirmLeaveId} onOpenChange={(open) => !open && setConfirmLeaveId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Leave this community?</AlertDialogTitle>
            <AlertDialogDescription>
              You can rejoin later if it is still available.
              {leaveError && (
                <span className="block mt-2 text-error">{leaveError}</span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleLeaveCommunity}
              className="bg-error text-error-foreground hover:bg-error/90"
            >
              Leave
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {showEditDialog && (
        <EditProfileDialog
          user={user}
          onClose={() => setShowEditDialog(false)}
          onSuccess={() => {
            setShowEditDialog(false);
            queryClient.invalidateQueries({ queryKey: ['me'] });
          }}
        />
      )}
    </div>
  );
}

function EditProfileDialog({ user, onClose, onSuccess }: {
  user: User | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [name, setName] = useState(user?.name || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [socialUrl, setSocialUrl] = useState(user?.socialUrl || '');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setPhotoFile(file);
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    try {
      let profilePhotoUrl = user?.profilePhotoUrl;
      if (photoFile) {
        setUploading(true);
        const uploadData = await API.uploadPhoto(photoFile);
        profilePhotoUrl = uploadData.url;
        setUploading(false);
      }
      await API.updateProfile({ name, bio, socialUrl, profilePhotoUrl });
      onSuccess();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Profile Photo</Label>
            <div className="flex items-center gap-4">
              <Avatar className="w-20 h-20">
                <AvatarImage src={photoFile ? URL.createObjectURL(photoFile) : user?.profilePhotoUrl} alt={user?.name ? `${user.name}'s profile photo` : 'Profile photo'} />
                <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
                  {name?.charAt(0)?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <label className="flex-1">
                <input type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.preventDefault();
                    (e.currentTarget.parentElement as HTMLLabelElement)
                      .querySelector('input')
                      ?.click();
                  }}
                >
                  Change Photo
                </Button>
              </label>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-input-background border-input-border"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell others about yourself..."
              rows={3}
              className="bg-input-background border-input-border resize-none"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="socialUrl">Social Media Link</Label>
            <Input
              id="socialUrl"
              type="url"
              value={socialUrl}
              onChange={(e) => setSocialUrl(e.target.value)}
              placeholder="https://..."
              className="bg-input-background border-input-border"
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
              disabled={loading || uploading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              className="flex-1 bg-primary hover:bg-primary-hover text-primary-foreground"
              disabled={loading || uploading}
            >
              {uploading ? 'Uploading...' : loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
