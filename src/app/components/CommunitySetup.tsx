import React, { useState, useEffect } from 'react';
import { API } from '../../utils/api';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';

interface CommunitySetupProps {
  onComplete: () => void;
  onLogout?: () => void;
}

export function CommunitySetup({ onComplete, onLogout }: CommunitySetupProps) {
  const [mode, setMode] = useState<'choose' | 'create' | 'join'>('choose');
  const [zipCode, setZipCode] = useState('');
  const [communityName, setCommunityName] = useState('');
  const [communities, setCommunities] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchPerformed, setSearchPerformed] = useState(false);

  const searchCommunities = async () => {
    if (!zipCode || zipCode.length < 5) {
      setError('Please enter a valid 5-digit ZIP code');
      return;
    }

    setError('');
    setLoading(true);
    setSearchPerformed(true);

    try {
      const data = await API.searchCommunities(zipCode);
      setCommunities(data.communities || []);

      if (data.communities.length === 0) {
        setMode('create');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to search communities');
    } finally {
      setLoading(false);
    }
  };

  const createCommunity = async () => {
    if (!communityName.trim()) {
      setError('Please enter a community name');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const data = await API.createCommunity(communityName, zipCode);
      if (data.community) {
        onComplete();
      }
    } catch (err: any) {
      if (err.message.includes('already exists')) {
        setError(
          'A community with this name already exists in your ZIP code. Please choose a different name or join the existing community.'
        );
      } else {
        setError(err.message || 'Failed to create community');
      }
    } finally {
      setLoading(false);
    }
  };

  const joinCommunity = async (communityId: string) => {
    setLoading(true);
    setError('');

    try {
      await API.joinCommunity(communityId);
      onComplete();
    } catch (err: any) {
      setError(err.message || 'Failed to join community');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <CardTitle>Join Your Community</CardTitle>
            {onLogout && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onLogout}
                className="text-muted-foreground hover:text-foreground"
              >
                Log Out
              </Button>
            )}
          </div>
          <CardDescription>
            Find or create a produce exchange community in your area
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {mode === 'choose' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="zipCode">ZIP Code</Label>
                <Input
                  id="zipCode"
                  type="text"
                  placeholder="12345"
                  value={zipCode}
                  onChange={(e) => setZipCode(e.target.value.replace(/\D/g, '').slice(0, 5))}
                  maxLength={5}
                  className="bg-input-background border-input-border"
                />
              </div>

              <Button
                onClick={searchCommunities}
                disabled={loading || zipCode.length !== 5}
                className="w-full bg-primary hover:bg-primary-hover text-primary-foreground"
              >
                {loading ? 'Searching...' : 'Find Communities'}
              </Button>

              {searchPerformed && communities.length > 0 && (
                <div className="space-y-3 pt-4 border-t">
                  <h3 className="font-medium text-sm text-muted-foreground">
                    Communities in {zipCode}
                  </h3>
                  {communities.map((community) => (
                    <div
                      key={community.id}
                      className="flex items-center justify-between p-3 bg-muted rounded-lg"
                    >
                      <div>
                        <p className="font-medium">{community.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {community.memberCount} member{community.memberCount !== 1 ? 's' : ''}
                        </p>
                      </div>
                      <Button
                        onClick={() => joinCommunity(community.id)}
                        disabled={loading}
                        size="sm"
                        className="bg-secondary hover:bg-secondary-hover text-secondary-foreground"
                      >
                        Join
                      </Button>
                    </div>
                  ))}

                  <div className="pt-2">
                    <Button
                      onClick={() => setMode('create')}
                      variant="outline"
                      className="w-full"
                    >
                      Create New Community
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}

          {mode === 'create' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="zipCode">ZIP Code</Label>
                <Input
                  id="zipCode"
                  type="text"
                  placeholder="12345"
                  value={zipCode}
                  onChange={(e) => setZipCode(e.target.value.replace(/\D/g, '').slice(0, 5))}
                  maxLength={5}
                  disabled={searchPerformed}
                  className="bg-input-background border-input-border"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="communityName">Community Name</Label>
                <Input
                  id="communityName"
                  type="text"
                  placeholder="e.g., Riverside Gardeners"
                  value={communityName}
                  onChange={(e) => setCommunityName(e.target.value)}
                  className="bg-input-background border-input-border"
                />
                <p className="text-xs text-muted-foreground">
                  Choose a unique name for your neighborhood community
                </p>
              </div>

              <Button
                onClick={createCommunity}
                disabled={loading || !communityName.trim() || zipCode.length !== 5}
                className="w-full bg-primary hover:bg-primary-hover text-primary-foreground"
              >
                {loading ? 'Creating...' : 'Create Community'}
              </Button>

              {searchPerformed && (
                <Button
                  onClick={() => setMode('choose')}
                  variant="ghost"
                  className="w-full"
                >
                  Back to Search
                </Button>
              )}
            </>
          )}

          {error && (
            <div className="bg-error/10 border border-error rounded-md p-3">
              <p className="text-sm text-error">{error}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export function CommunitySwitcher({ community, onSwitch }: { community: any; onSwitch: () => void }) {
  if (!community) return null;

  return (
    <button
      onClick={onSwitch}
      className="flex items-center gap-2 px-3 py-2 bg-muted hover:bg-muted/80 rounded-lg transition-colors w-full"
    >
      <div className="flex-1 text-left">
        <p className="text-sm font-medium">{community.name}</p>
        <p className="text-xs text-muted-foreground">ZIP {community.zipCode}</p>
      </div>
      <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    </button>
  );
}
