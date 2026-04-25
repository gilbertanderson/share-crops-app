import React, { useState, useEffect, useRef } from 'react';
import { API, AuthManager } from '../../utils/api';
import type { Thread, Message, User } from '../../types';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Avatar, AvatarImage, AvatarFallback } from './ui/avatar';
import { TomatoLoader } from './ui/tomato-loader';
import { ThreadCard } from './ThreadCard';

export function ChatList({ onSelectThread }: { onSelectThread: (threadId: string) => void }) {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);
  const currentUser = AuthManager.getUser();

  useEffect(() => {
    loadThreads();
    const interval = setInterval(loadThreads, 10000);
    return () => clearInterval(interval);
  }, []);

  const loadThreads = async () => {
    try {
      const data = await API.getThreads();
      setThreads(data.threads || []);
    } catch (err) {
      console.error('Failed to load threads', err);
    } finally {
      setLoading(false);
    }
  };

  const getOtherUserId = (thread: Thread) => {
    return thread.participants.find((id) => id !== currentUser?.id) ?? '';
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-10 bg-background border-b border-border">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold">Messages</h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {loading ? (
          <TomatoLoader label="Loading..." className="py-12" />
        ) : threads.length === 0 ? (
          <div className="text-center py-12 space-y-2">
            <svg className="w-16 h-16 mx-auto text-muted-foreground opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <p className="text-lg font-medium text-muted-foreground">No messages yet</p>
            <p className="text-sm text-muted-foreground">
              Start a conversation from a listing
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {threads.map((thread) => (
              <ThreadCard
                key={thread.id}
                thread={thread}
                otherUserId={getOtherUserId(thread)}
                onClick={() => onSelectThread(thread.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function ChatThread({ threadId, onBack }: { threadId: string; onBack: () => void }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [thread, setThread] = useState<Thread | null>(null);
  const [otherUser, setOtherUser] = useState<User | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const currentUser = AuthManager.getUser();

  useEffect(() => {
    loadMessages();
    const interval = setInterval(loadMessages, 5000);
    return () => clearInterval(interval);
  }, [threadId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadMessages = async () => {
    try {
      const data = await API.getMessages(threadId);
      setMessages(data.messages || []);

      if (!thread) {
        const threadData = await API.getThreads();
        const foundThread = threadData.threads.find((t) => t.id === threadId);
        if (foundThread) {
          setThread(foundThread);
          const otherUserId = foundThread.participants.find((id) => id !== currentUser?.id);
          if (otherUserId) {
            const userData = await API.getProfile(otherUserId);
            setOtherUser(userData.profile);
          }
        }
      }
    } catch (err) {
      console.error('Failed to load messages', err);
    } finally {
      setLoading(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    setSending(true);
    const messageText = newMessage;
    setNewMessage('');

    try {
      await API.sendMessage(threadId, messageText);
      await loadMessages();
    } catch (err) {
      console.error('Failed to send message', err);
      setNewMessage(messageText);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="sticky top-0 z-10 bg-background border-b border-border">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              aria-label="Back"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <Avatar className="w-10 h-10 shrink-0">
              <AvatarImage src={otherUser?.profilePhotoUrl} />
              <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                {otherUser?.name?.charAt(0)?.toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium">{otherUser?.name || 'Loading...'}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 py-6">
          {loading ? (
            <TomatoLoader label="Loading messages..." className="py-12" />
          ) : messages.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No messages yet. Say hello!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message) => {
                const isOwn = message.senderId === currentUser?.id;
                return (
                  <div
                    key={message.id}
                    className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[75%] rounded-lg px-4 py-2 ${
                        isOwn
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-foreground'
                      }`}
                    >
                      <p className="text-sm">{message.content}</p>
                      <p className={`text-xs mt-1 ${isOwn ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                        {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </div>

      <div className="sticky bottom-0 bg-background border-t border-border">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <form onSubmit={handleSend} className="flex gap-2">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              disabled={sending}
              className="flex-1 bg-input-background border-input-border"
            />
            <Button
              type="submit"
              disabled={sending || !newMessage.trim()}
              className="bg-primary hover:bg-primary-hover text-primary-foreground"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
