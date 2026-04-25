import React from 'react';
import { Routes, Route, Navigate, Outlet, useLocation, useNavigate } from 'react-router';
import { useAuth } from './context/AuthContext';
import { Auth } from './components/Auth';
import { CommunitySetup } from './components/CommunitySetup';
import { Marketplace } from './components/Marketplace';
import { ListingDetail } from './components/ListingDetail';
import { Offers } from './components/Offers';
import { ChatList, ChatThread } from './components/Chat';
import { Profile } from './components/Profile';
import { ResetPassword } from './components/ResetPassword';

export default function App() {
  const { isAuthenticated, hasCompletedSetup, loading, refreshAuth, logout } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <svg viewBox="0 0 48 48" className="w-20 h-20 mx-auto" fill="none" aria-hidden="true">
            <defs>
              <clipPath id="app-loading-tomato-clip">
                <circle cx="24" cy="28" r="16" />
              </clipPath>
            </defs>
            <circle cx="24" cy="28" r="16" fill="var(--tomato-empty)" />
            <g clipPath="url(#app-loading-tomato-clip)">
              <rect x="8" y="44" width="32" height="0" fill="var(--tomato-filled)">
                <animate attributeName="y" values="44;12" dur="1.8s" repeatCount="indefinite" />
                <animate attributeName="height" values="0;32" dur="1.8s" repeatCount="indefinite" />
              </rect>
            </g>
            <circle cx="24" cy="28" r="16" fill="var(--tomato-filled)" />
            <path
              d="M24 12V8M20 10.5C20 10.5 21 12 24 12C27 12 28 10.5 28 10.5M18 8C18 8 19 10 22 11M30 8C30 8 29 10 26 11"
              stroke="#4a7c3f" strokeWidth="2" strokeLinecap="round"
            />
          </svg>
          <p className="text-muted-foreground">Loading Share Crops...</p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      {/* Public */}
      <Route
        path="/login"
        element={
          isAuthenticated
            ? <Navigate to="/marketplace" replace />
            : <Auth onSuccess={refreshAuth} />
        }
      />
      <Route path="/reset-password" element={<ResetPassword />} />

      {/* Authenticated but needs community setup */}
      <Route
        path="/community-setup"
        element={
          !isAuthenticated
            ? <Navigate to="/login" replace />
            : hasCompletedSetup
            ? <Navigate to="/marketplace" replace />
            : <CommunitySetup onComplete={refreshAuth} onLogout={logout} />
        }
      />

      {/* Authenticated + setup required — wrapped in layout with bottom nav */}
      <Route element={<RequireAuth isAuthenticated={isAuthenticated} hasSetup={hasCompletedSetup} />}>
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
  );
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

function RequireAuth({ isAuthenticated, hasSetup }: { isAuthenticated: boolean; hasSetup: boolean }) {
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!hasSetup) return <Navigate to="/community-setup" replace />;
  return <Outlet />;
}

type NavTab = 'marketplace' | 'offers' | 'messages' | 'profile';

function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();

  const activeTab = (): NavTab => {
    if (location.pathname.startsWith('/offers')) return 'offers';
    if (location.pathname.startsWith('/messages')) return 'messages';
    if (location.pathname.startsWith('/profile')) return 'profile';
    return 'marketplace';
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <Outlet />

      <nav className="fixed bottom-0 left-0 right-0 bg-background border-t border-border z-50 safe-area-inset-bottom">
        <div className="flex items-center justify-around h-20 px-4">
          <NavButton
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
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
            label="Offers"
            active={activeTab() === 'offers'}
            onClick={() => navigate('/offers')}
          />
          <NavButton
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            }
            label="Chat"
            active={activeTab() === 'messages'}
            onClick={() => navigate('/messages')}
          />
          <NavButton
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            }
            label="Profile"
            active={activeTab() === 'profile'}
            onClick={() => navigate('/profile')}
          />
        </div>
      </nav>
    </div>
  );
}

function NavButton({ icon, label, active, onClick }: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
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
