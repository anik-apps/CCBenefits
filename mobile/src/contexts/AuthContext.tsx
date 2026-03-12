import React, { createContext, useState, useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { User } from '../types';
import {
  getProfile,
  getStoredTokens,
  hydrateTokens,
  isHydrated,
  login as apiLogin,
  register as apiRegister,
  logout as apiLogout,
  clearTokens,
  setAuthFailureHandler,
} from '../services/api';
import { getCurrentPushToken, unregisterPushNotifications } from '../services/notifications';
// Note: no resetToAuth needed — clearing user state triggers RootNavigator to show AuthStack

export interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName: string) => Promise<User>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const profile = await getProfile();
      setUser(profile);
    } catch {
      setUser(null);
      await clearTokens();
    }
  }, []);

  // Handle auth failures from API interceptor
  useEffect(() => {
    setAuthFailureHandler(() => {
      setUser(null);
      queryClient.clear();
    });
  }, [queryClient]);

  // Hydrate tokens from SecureStore on startup
  useEffect(() => {
    const init = async () => {
      if (!isHydrated()) {
        await hydrateTokens();
      }
      const { access } = getStoredTokens();
      if (access) {
        await refreshUser();
      }
      setLoading(false);
    };
    init();
  }, [refreshUser]);

  const login = async (email: string, password: string) => {
    queryClient.clear();
    await apiLogin(email, password);
    await refreshUser();
  };

  const register = async (email: string, password: string, displayName: string) => {
    queryClient.clear();
    const response = await apiRegister(email, password, displayName);
    setUser(response.user);
    return response.user;
  };

  const logout = async () => {
    const pushToken = getCurrentPushToken();
    if (pushToken) {
      await unregisterPushNotifications(pushToken);
    }
    setUser(null);
    queryClient.clear();
    await apiLogout();
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}
