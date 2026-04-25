import React, { useState, useEffect } from 'react';
import { AuthManager, API } from '../utils/api';
import { initializeSecurity } from '../utils/security';
import { Auth } from './components/Auth';
import { CommunitySetup } from './components/CommunitySetup';
import { Marketplace, CreateListing } from './components/Marketplace';
import { ListingDetail } from './components/ListingDetail';
import { Offers } from './components/Offers';
import { ChatList, ChatThread } from './components/Chat';
import { Profile } from './components/Profile';

type Screen =
  | { type: 'marketplace' }
  | { type: 'listing-detail'; listingId: string }
  | { type: 'offers' }
  | { type: 'chat-list' }
  | { type: 'chat-thread'; threadId: string }
  | { type: 'profile' };

type NavTab = 'marketplace' | 'offers' | 'chat' | 'profile';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [hasCompletedSetup, setHasCompletedSetup] = useState(false);
  const [activeTab, setActiveTab] = useState<NavTab>('marketplace');
  const [screen, setScreen] = useState<Screen>({ type: 'marketplace' });
  const [showCreateListing, setShowCreateListing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Initialize security on app startup
    initializeSecurity();
  }, []);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const authenticated = AuthManager.isAuthenticated();
    setIsAuthenticated(authenticated);

    if (authenticated) {
      try {
        await API.getMe();
        const communityData = await API.getMyCommunity();
        setHasCompletedSetup(!!communityData.community);
      } catch (err) {
        setHasCompletedSetup(false);
      }
    }

    setLoading(false);
  };

  const handleAuthSuccess = async () => {
    await checkAuth();
  };

  const handleSetupComplete = () => {
    setHasCompletedSetup(true);
  };

  const handleLogout = () => {
    AuthManager.clearToken();
    setIsAuthenticated(false);
    setHasCompletedSetup(false);
    setActiveTab('marketplace');
    setScreen({ type: 'marketplace' });
  };

  const handleTabChange = (tab: NavTab) => {
    setActiveTab(tab);
    switch (tab) {
      case 'marketplace':
        setScreen({ type: 'marketplace' });
        break;
      case 'offers':
        setScreen({ type: 'offers' });
        break;
      case 'chat':
        setScreen({ type: 'chat-list' });
        break;
      case 'profile':
        setScreen({ type: 'profile' });
        break;
    }
  };

  const handleViewListing = (listingId: string) => {
    setScreen({ type: 'listing-detail', listingId });
  };

  const handleBackToMarketplace = () => {
    setScreen({ type: 'marketplace' });
  };

  const handleOpenChat = (threadId: string) => {
    setScreen({ type: 'chat-thread', threadId });
  };

  const handleBackToChats = () => {
    setScreen({ type: 'chat-list' });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <svg
            viewBox="0 0 48 48"
            className="w-20 h-20 mx-auto"
            fill="none"
            aria-hidden="true"
          >
            <defs>
              <clipPath id="app-loading-tomato-clip">
                <circle cx="24" cy="28" r="16" />
              </clipPath>
            </defs>

            <circle cx="24" cy="28" r="16" fill="var(--tomato-empty)" />

            <g className="tomato-loader-fill" clipPath="url(#app-loading-tomato-clip)">
              <rect x="8" y="44" width="32" height="0" fill="var(--tomato-filled)">
                <animate attributeName="y" values="44;12" dur="1.8s" repeatCount="indefinite" />
                <animate attributeName="height" values="0;32" dur="1.8s" repeatCount="indefinite" />
              </rect>
            </g>

            <circle className="tomato-loader-static-fill" cx="24" cy="28" r="16" fill="var(--tomato-filled)" />

            <path
              d="M24 12V8M20 10.5C20 10.5 21 12 24 12C27 12 28 10.5 28 10.5M18 8C18 8 19 10 22 11M30 8C30 8 29 10 26 11"
              stroke="#4a7c3f"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
          <p className="text-muted-foreground">Loading Share Crops...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Auth onSuccess={handleAuthSuccess} />;
  }

  if (!hasCompletedSetup) {
    return <CommunitySetup onComplete={handleSetupComplete} onLogout={handleLogout} />;
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Main Content */}
      <div className="min-h-[calc(100vh-5rem)]">
        {screen.type === 'marketplace' && (
          <Marketplace
            onCreateListing={() => setShowCreateListing(true)}
            onViewListing={handleViewListing}
          />
        )}

        {screen.type === 'listing-detail' && (
          <ListingDetail
            listingId={screen.listingId}
            onBack={handleBackToMarketplace}
            onChat={handleOpenChat}
          />
        )}

        {screen.type === 'offers' && <Offers />}

        {screen.type === 'chat-list' && (
          <ChatList onSelectThread={handleOpenChat} />
        )}

        {screen.type === 'chat-thread' && (
          <ChatThread
            threadId={screen.threadId}
            onBack={handleBackToChats}
          />
        )}

        {screen.type === 'profile' && <Profile onLogout={handleLogout} />}
      </div>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-background border-t border-border z-50 safe-area-inset-bottom">
        <div className="flex items-center justify-around h-20 px-4">
          <NavButton
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
            }
            label="Home"
            active={activeTab === 'marketplace'}
            onClick={() => handleTabChange('marketplace')}
          />

          <NavButton
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            }
            label="Offers"
            active={activeTab === 'offers'}
            onClick={() => handleTabChange('offers')}
          />

          <NavButton
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            }
            label="Chat"
            active={activeTab === 'chat'}
            onClick={() => handleTabChange('chat')}
          />

          <NavButton
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            }
            label="Profile"
            active={activeTab === 'profile'}
            onClick={() => handleTabChange('profile')}
          />
        </div>
      </nav>

      {/* Create Listing Dialog */}
      {showCreateListing && (
        <CreateListing
          onClose={() => setShowCreateListing(false)}
          onSuccess={() => {
            setShowCreateListing(false);
            setScreen({ type: 'marketplace' });
            setActiveTab('marketplace');
          }}
        />
      )}
    </div>
  );
}

function NavButton({
  icon,
  label,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-1 min-w-[64px] transition-colors ${
        active ? 'text-primary' : 'text-muted-foreground'
      }`}
    >
      {icon}
      <span className="text-xs font-medium">{label}</span>
    </button>
  );
}