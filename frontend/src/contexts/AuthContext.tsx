/* eslint-disable react-refresh/only-export-components */
import { createContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { User } from '../types';
import {
  getProfile,
  getStoredTokens,
  login as apiLogin,
  register as apiRegister,
  logout as apiLogout,
  clearTokens,
  oauthSignIn,
} from '../services/api';

export interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName: string) => Promise<void>;
  oauthLogin: (provider: string, idToken: string, displayName?: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const profile = await getProfile();
      setUser(profile);
    } catch {
      setUser(null);
      clearTokens();
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const init = async () => {
      const { access } = getStoredTokens();
      if (access) {
        await refreshUser();
      }
      if (!cancelled) setLoading(false);
    };
    init();
    return () => { cancelled = true; };
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
  };

  const oauthLogin = async (provider: string, idToken: string, displayName?: string) => {
    queryClient.clear();
    await oauthSignIn(provider, idToken, displayName);
    await refreshUser();
  };

  const logout = () => {
    setUser(null);
    queryClient.clear();
    apiLogout();
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, oauthLogin, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}
