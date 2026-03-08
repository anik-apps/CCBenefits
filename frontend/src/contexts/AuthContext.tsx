import { createContext, useContext, useState, useEffect, useCallback } from 'react';
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
} from '../services/api';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

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
    const { access } = getStoredTokens();
    if (access) {
      refreshUser().finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [refreshUser]);

  const login = async (email: string, password: string) => {
    queryClient.clear();
    await apiLogin(email, password);
    await refreshUser();
  };

  const register = async (email: string, password: string, displayName: string) => {
    queryClient.clear();
    await apiRegister(email, password, displayName);
    await refreshUser();
  };

  const logout = () => {
    setUser(null);
    queryClient.clear();
    apiLogout();
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
