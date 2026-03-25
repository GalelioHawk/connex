import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface ThemeState {
  isDark:      boolean;
  toggleTheme: () => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      isDark:      true,
      toggleTheme: () => set((s) => ({ isDark: !s.isDark })),
    }),
    {
      name:    'connex-theme',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
