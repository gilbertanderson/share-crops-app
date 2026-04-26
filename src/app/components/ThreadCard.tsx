import React, { useState, useEffect } from 'react';
import { API } from '../../utils/api';
import type { Thread, User } from '../../types';
import { Card, CardContent } from './ui/card';
import { Avatar, AvatarImage, AvatarFallback } from './ui/avatar';

interface ThreadCardProps {
  thread: Thread;
  otherUserId: string;
  onClick: () => void;
  mobileActive?: boolean;
}

export function ThreadCard({ thread, otherUserId, onClick, mobileActive = false }: ThreadCardProps) {
  const [otherUser, setOtherUser] = useState<User | null>(null);
  const isSupport = thread.type === 'support';

  useEffect(() => {
    if (isSupport) return;
    const loadUser = async () => {
      try {
        const data = await API.getProfile(otherUserId);
        setOtherUser(data.profile);
      } catch (err) {
        console.error('Failed to load user', err);
      }
    };
    loadUser();
  }, [otherUserId, isSupport]);

  const displayName = isSupport ? (thread.title ?? 'Support Team') : (otherUser?.name || 'Loading...');

  return (
    <Card
      onClick={onClick}
      onPointerDown={(e) => {
        if (e.pointerType === 'touch' || e.pointerType === 'pen') {
          (e.currentTarget as HTMLElement).focus();
        }
      }}
      role="button"
      tabIndex={0}
      data-mobile-card-id={thread.id}
      aria-label={`Message thread with ${displayName}`}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } }}
      className={[
        'cursor-pointer hover:shadow-xl hover:-translate-y-0.5 mobile-focus-shadow-xl transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
        mobileActive ? 'mobile-scroll-active-xl' : '',
      ].join(' ')}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Avatar className="w-10 h-10 shrink-0">
            {isSupport ? null : (
              <AvatarImage src={otherUser?.profilePhotoUrl} alt={`${otherUser?.name}'s profile photo`} />
            )}
            <AvatarFallback className="bg-primary text-primary-foreground text-xs">
              {isSupport ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ) : (
                otherUser?.name?.charAt(0)?.toUpperCase() || 'U'
              )}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">{displayName}</p>
            <p className="text-sm text-muted-foreground truncate">
              {thread.lastMessage || 'No messages yet'}
            </p>
          </div>
          <span className="text-xs text-muted-foreground shrink-0">
            {new Date(thread.lastMessageAt).toLocaleDateString()}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
