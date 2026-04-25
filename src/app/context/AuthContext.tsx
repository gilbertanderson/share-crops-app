import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { AuthManager, API } from '../../utils/api';

const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

interface AuthState {
  isAuthenticated: boolean;
  hasCompletedSetup: boolean;
  loading: boolean;
}

interface AuthContextValue extends AuthState {
  refreshAuth: () => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    isAuthenticated: false,
    hasCompletedSetup: false,
    loading: true,
  });

  const refreshAuth = useCallback(async () => {
    const authenticated = AuthManager.isAuthenticated();
    if (!authenticated) {
      setState({ isAuthenticated: false, hasCompletedSetup: false, loading: false });
      return;
    }
    try {
      await API.getMe();
      const communityData = await API.getMyCommunity();
      setState({
        isAuthenticated: true,
        hasCompletedSetup: !!communityData.community,
        loading: false,
      });
    } catch {
      AuthManager.clearToken();
      setState({ isAuthenticated: false, hasCompletedSetup: false, loading: false });
    }
  }, []);

  const logout = useCallback(() => {
    AuthManager.clearToken();
    setState({ isAuthenticated: false, hasCompletedSetup: false, loading: false });
  }, []);

  // Inactivity auto-logout: reset timer on user activity; logout after 30 min idle
  const inactivityTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!state.isAuthenticated) return;

    const resetTimer = () => {
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
      inactivityTimer.current = setTimeout(() => {
        logout();
      }, INACTIVITY_TIMEOUT_MS);
    };

    const events = ['mousemove', 'keydown', 'touchstart', 'pointerdown', 'scroll'];
    events.forEach((ev) => window.addEventListener(ev, resetTimer, { passive: true }));
    resetTimer(); // start the initial timer

    return () => {
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
      events.forEach((ev) => window.removeEventListener(ev, resetTimer));
    };
  }, [state.isAuthenticated, logout]);

  useEffect(() => {
    refreshAuth();
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, refreshAuth, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
