import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type FontSize          = 'small' | 'medium' | 'large';
export type MediaAutoDownload = 'wifi' | 'mobile' | 'never';

interface SettingsState {
  notificationsEnabled: boolean;
  notificationPreview:  boolean;
  notificationSound:    boolean;
  notificationVibrate:  boolean;
  fontSize:             FontSize;
  mediaAutoDownload:    MediaAutoDownload;
  set: (patch: Partial<Omit<SettingsState, 'set'>>) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      notificationsEnabled: true,
      notificationPreview:  true,
      notificationSound:    true,
      notificationVibrate:  true,
      fontSize:             'medium',
      mediaAutoDownload:    'wifi',
      set: (patch) => set(patch),
    }),
    {
      name:    'connex-settings',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
