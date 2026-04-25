import React, { useState, useEffect } from 'react';
import { API } from '../../utils/api';
import type { Thread, User } from '../../types';
import { Card, CardContent } from './ui/card';
import { Avatar, AvatarImage, AvatarFallback } from './ui/avatar';

interface ThreadCardProps {
  thread: Thread;
  otherUserId: string;
  onClick: () => void;
}

export function ThreadCard({ thread, otherUserId, onClick }: ThreadCardProps) {
  const [otherUser, setOtherUser] = useState<User | null>(null);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const data = await API.getProfile(otherUserId);
        setOtherUser(data.profile);
      } catch (err) {
        console.error('Failed to load user', err);
      }
    };
    loadUser();
  }, [otherUserId]);

  return (
    <Card
      onClick={onClick}
      className="cursor-pointer hover:shadow-md transition-shadow"
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Avatar className="w-10 h-10 shrink-0">
            <AvatarImage src={otherUser?.profilePhotoUrl} />
            <AvatarFallback className="bg-primary text-primary-foreground text-xs">
              {otherUser?.name?.charAt(0)?.toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">{otherUser?.name || 'Loading...'}</p>
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
