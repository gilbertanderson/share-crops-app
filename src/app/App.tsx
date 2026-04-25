import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate, Outlet, useLocation, useNavigate } from 'react-router';
import { useAuth } from './context/AuthContext';
import { Auth } from './components/Auth';
import { CommunitySetup, CommunitySelection } from './components/CommunitySetup';
import { Marketplace } from './components/Marketplace';
import { ListingDetail } from './components/ListingDetail';
import { Offers } from './components/Offers';
import { ChatList, ChatThread } from './components/Chat';
import { Profile } from './components/Profile';
import { ResetPassword } from './components/ResetPassword';
import OAuthCallback from './components/OAuthCallback';
import { TomatoLoader } from './components/ui/tomato-loader';
import { useNotificationBadges } from './hooks/useNotificationBadges';
import { AuthManager } from '../utils/api';

export default function App() {
  const {
    isAuthenticated,
    hasCompletedSetup,
    communityCount,
    loading: authLoading,
    refreshAuth,
    logout,
  } = useAuth();
  const [phase, setPhase] = useState<'loading' | 'completing' | 'ready'>('loading');

  useEffect(() => {
    if (!authLoading) {
      setPhase('completing');
      const t = setTimeout(() => setPhase('ready'), 420);
      return () => clearTimeout(t);
    }
  }, [authLoading]);

  if (phase !== 'ready') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          {phase === 'completing' ? (
            <div className="tomato-complete-pop">
              <svg viewBox="0 0 48 48" className="w-20 h-20 mx-auto" fill="none" aria-hidden="true">
                <circle cx="24" cy="28" r="16" fill="var(--tomato-filled)" />
                <path
                  d="M24 12V8M20 10.5C20 10.5 21 12 24 12C27 12 28 10.5 28 10.5M18 8C18 8 19 10 22 11M30 8C30 8 29 10 26 11"
                  stroke="#4a7c3f" strokeWidth="2" strokeLinecap="round"
                />
              </svg>
              <p className="text-muted-foreground">Loading Share Crops...</p>
            </div>
          ) : (
            <TomatoLoader size="lg" label="Loading Share Crops..." />
          )}
        </div>
      </div>
    );
  }

  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md focus:shadow-lg"
      >
        Skip to main content
      </a>
      <ScrollToTop />
      <Routes>
      {/* Public */}
      <Route
        path="/login"
        element={
          isAuthenticated
            ? <Navigate to={getPostLoginPath(communityCount)} replace />
            : <Auth onSuccess={refreshAuth} />
        }
      />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/auth/callback" element={<OAuthCallback />} />

      {/* Authenticated but needs community setup */}
      <Route
        path="/community-setup"
        element={
          !isAuthenticated
            ? <Navigate to="/login" replace />
            : hasCompletedSetup
            ? <Navigate to={getPostLoginPath(communityCount)} replace />
            : <CommunitySetup onComplete={refreshAuth} onLogout={logout} />
        }
      />

      <Route
        path="/community-select"
        element={
          !isAuthenticated
            ? <Navigate to="/login" replace />
            : !hasCompletedSetup
            ? <Navigate to="/community-setup" replace />
            : AuthManager.hasSelectedCommunityThisSession()
            ? <Navigate to="/marketplace" replace />
            : <CommunitySelection onComplete={refreshAuth} onLogout={logout} />
        }
      />

      {/* Authenticated + setup required — wrapped in layout with bottom nav */}
      <Route
        element={
          <RequireAuth
            isAuthenticated={isAuthenticated}
            hasSetup={hasCompletedSetup}
            hasChosenCommunity={AuthManager.hasSelectedCommunityThisSession()}
          />
        }
      >
        <Route element={<AppLayout />}>
          <Route path="/marketplace" element={<Marketplace />} />
          <Route path="/listing/:id" element={<ListingDetail />} />
          <Route path="/offers" element={<Offers />} />
          <Route path="/messages" element={<ChatList />} />
          <Route path="/messages/:threadId" element={<ChatThread />} />
          <Route path="/profile" element={<Profile />} />
        </Route>
      </Route>

      {/* Catch-all — intercepts Supabase recovery redirects that land at the wrong path
           (happens when redirect_to isn't whitelisted in the Supabase dashboard) */}
      <Route path="*" element={<CatchAll />} />
    </Routes>
    </>
  );
}

function getPostLoginPath(communityCount: number) {
  if (communityCount === 0) return '/community-setup';
  if (!AuthManager.hasSelectedCommunityThisSession()) return '/community-select';
  return '/marketplace';
}

function CatchAll() {
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const query = new URLSearchParams(window.location.search);
  // Recovery token landed at wrong URL because redirect_to wasn't whitelisted in Supabase
  if (hash.get('type') === 'recovery' || query.get('type') === 'recovery') {
    return <Navigate to={'/reset-password' + window.location.search + window.location.hash} replace />;
  }
  return <Navigate to="/marketplace" replace />;
}

function RequireAuth({
  isAuthenticated,
  hasSetup,
  hasChosenCommunity,
}: {
  isAuthenticated: boolean;
  hasSetup: boolean;
  hasChosenCommunity: boolean;
}) {
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!hasSetup) return <Navigate to="/community-setup" replace />;
  if (!hasChosenCommunity) return <Navigate to="/community-select" replace />;
  return <Outlet />;
}

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

type NavTab = 'marketplace' | 'offers' | 'messages' | 'profile';

function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const isChatThread = location.pathname.startsWith('/messages/');
  const { hasNewOffers, hasNewMessages } = useNotificationBadges();

  const activeTab = (): NavTab => {
    if (location.pathname.startsWith('/offers')) return 'offers';
    if (location.pathname.startsWith('/messages')) return 'messages';
    if (location.pathname.startsWith('/profile')) return 'profile';
    return 'marketplace';
  };

  return (
    <div className={`min-h-screen bg-background ${isChatThread ? 'pb-0' : 'pb-20'}`}>
      <main id="main-content" tabIndex={-1} className="outline-none">
        <Outlet />
      </main>

      {!isChatThread && (
      <nav aria-label="Main navigation" className="fixed bottom-0 left-0 right-0 bg-background border-t border-border z-50 safe-area-inset-bottom">
        <div className="flex items-center justify-around h-20 px-4">
          <NavButton
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
            }
            filledIcon={
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2.25a.75.75 0 01.53.22l9 9a.75.75 0 01-1.06 1.06l-.72-.72V19.5A2.25 2.25 0 0117.5 21.75h-3.75A.75.75 0 0113 21v-4.5a.75.75 0 00-.75-.75h-.5a.75.75 0 00-.75.75V21a.75.75 0 01-.75.75H6.5A2.25 2.25 0 014.25 19.5v-7.69l-.72.72a.75.75 0 01-1.06-1.06l9-9a.75.75 0 01.53-.22z" />
              </svg>
            }
            label="Home"
            active={activeTab() === 'marketplace'}
            onClick={() => navigate('/marketplace')}
          />
          <NavButton
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            }
            filledIcon={
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                <path d="M7.5 3A2.5 2.5 0 005 5.5v13A2.5 2.5 0 007.5 21h9a2.5 2.5 0 002.5-2.5v-9a1.5 1.5 0 00-.44-1.06l-4-4A1.5 1.5 0 0013.5 4h-6zm2.75 6.25a.75.75 0 010-1.5h2.5a.75.75 0 010 1.5h-2.5zm0 3.75a.75.75 0 010-1.5h5.5a.75.75 0 010 1.5h-5.5zm0 3.75a.75.75 0 010-1.5h5.5a.75.75 0 010 1.5h-5.5z" />
              </svg>
            }
            label="Offers"
            active={activeTab() === 'offers'}
            showBadge={hasNewOffers}
            onClick={() => navigate('/offers')}
          />
          <NavButton
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            }
            filledIcon={
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 3c-4.97 0-9 3.582-9 8 0 1.574.512 3.042 1.395 4.28L3 19l4.745-1.051A9.863 9.863 0 0012 19c4.97 0 9-3.582 9-8s-4.03-8-9-8zm-4 7.25a1 1 0 110 2 1 1 0 010-2zm4 0a1 1 0 110 2 1 1 0 010-2zm4 0a1 1 0 110 2 1 1 0 010-2z" />
              </svg>
            }
            label="Chat"
            active={activeTab() === 'messages'}
            showBadge={hasNewMessages}
            onClick={() => navigate('/messages')}
          />
          <NavButton
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            }
            filledIcon={
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 12a4.5 4.5 0 100-9 4.5 4.5 0 000 9zm-7.5 8.25A6.75 6.75 0 0111.25 13.5h1.5A6.75 6.75 0 0119.5 20.25a.75.75 0 01-.75.75H5.25a.75.75 0 01-.75-.75z" />
              </svg>
            }
            label="Profile"
            active={activeTab() === 'profile'}
            onClick={() => navigate('/profile')}
          />
        </div>
      </nav>
      )}
    </div>
  );
}

function NavButton({ icon, filledIcon, label, active, showBadge = false, onClick }: {
  icon: React.ReactNode;
  filledIcon: React.ReactNode;
  label: string;
  active: boolean;
  showBadge?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={`group flex flex-col items-center gap-1 min-w-[64px] rounded-md transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
        active ? 'text-primary' : 'text-muted-foreground hover:text-primary focus-visible:text-primary'
      }`}
    >
      <span className="relative inline-flex">
        <span className="block group-hover:hidden group-focus-visible:hidden">
          {icon}
        </span>
        <span className="hidden group-hover:block group-focus-visible:block">
          {filledIcon}
        </span>
        {showBadge ? (
          <span
            className="absolute -top-1 -right-1 inline-flex items-center justify-center leading-none"
            aria-hidden="true"
          >
            <svg viewBox="0 0 48 48" className="block h-4 w-4" fill="none">
              <circle cx="24" cy="28" r="16" fill="#E63946" />
              <path
                d="M24 12V8M20 10.5C20 10.5 21 12 24 12C27 12 28 10.5 28 10.5M18 8C18 8 19 10 22 11M30 8C30 8 29 10 26 11"
                stroke="#4a7c3f"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </span>
        ) : null}
      </span>
      <span className="text-xs font-medium">{label}</span>
    </button>
  );
}
