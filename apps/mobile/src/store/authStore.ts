import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { User } from '../types';

interface AuthState {
  user:            User | null;
  sessionId:       string | null;   // Convex session ID (replaces access/refresh tokens)
  isAuthenticated: boolean;

  setAuth:    (user: User, sessionId: string) => void;
  clearAuth:  () => void;
  updateUser: (partial: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user:            null,
      sessionId:       null,
      isAuthenticated: false,

      setAuth: (user, sessionId) =>
        set({ user, sessionId, isAuthenticated: true }),

      clearAuth: () =>
        set({ user: null, sessionId: null, isAuthenticated: false }),

      updateUser: (partial) =>
        set((state) => ({ user: state.user ? { ...state.user, ...partial } : state.user })),
    }),
    {
      name:    'connex-auth',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
