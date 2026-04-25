import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { AuthManager, API } from '../../utils/api';

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
      setState({ isAuthenticated: true, hasCompletedSetup: false, loading: false });
    }
  }, []);

  const logout = useCallback(() => {
    AuthManager.clearToken();
    setState({ isAuthenticated: false, hasCompletedSetup: false, loading: false });
  }, []);

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
