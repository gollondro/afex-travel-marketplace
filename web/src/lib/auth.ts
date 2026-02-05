'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authAPI, User } from './api';

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
  
  login: (email: string, password: string) => Promise<boolean>;
  register: (email: string, password: string, name: string) => Promise<boolean>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isLoading: false,
      error: null,

      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = await authAPI.login(email, password);
          set({
            user: response.user,
            token: response.token,
            isLoading: false,
          });
          return true;
        } catch (error: any) {
          set({
            error: error.message || 'Login failed',
            isLoading: false,
          });
          return false;
        }
      },

      register: async (email: string, password: string, name: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = await authAPI.register({ email, password, name });
          set({
            user: response.user,
            token: response.token,
            isLoading: false,
          });
          return true;
        } catch (error: any) {
          set({
            error: error.message || 'Registration failed',
            isLoading: false,
          });
          return false;
        }
      },

      logout: () => {
        set({ user: null, token: null, error: null });
      },

      refreshUser: async () => {
        const { token } = get();
        if (!token) return;

        try {
          const response = await authAPI.me(token);
          set({ user: response.user });
        } catch (error) {
          // Token invalid, logout
          set({ user: null, token: null });
        }
      },

      clearError: () => {
        set({ error: null });
      },
    }),
    {
      name: 'afex-auth-storage',
      partialize: (state) => ({ user: state.user, token: state.token }),
    }
  )
);

// Hook for checking authentication
export function useAuth() {
  const { user, token, isLoading, error, logout, refreshUser } = useAuthStore();
  
  return {
    user,
    token,
    isLoading,
    error,
    isAuthenticated: !!token && !!user,
    isAdmin: user?.role === 'admin',
    isAgency: user?.role === 'agency',
    logout,
    refreshUser,
  };
}
