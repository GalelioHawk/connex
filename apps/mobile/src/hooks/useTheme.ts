import { useThemeStore } from '../store/themeStore';
import { useSettingsStore } from '../store/settingsStore';
import { dark, light, ThemeColors } from '../theme/colors';

// Semantic font sizes — content text only (UI chrome stays fixed)
const BASE = { xs: 11, sm: 13, md: 15, body: 16, lg: 17, xl: 20, xxl: 24 };
export type AppFonts = typeof BASE;

export function useTheme(): { colors: ThemeColors; isDark: boolean; fonts: AppFonts } {
  const isDark   = useThemeStore((s) => s.isDark);
  const fontSize = useSettingsStore((s) => s.fontSize);
  const scale    = fontSize === 'small' ? 0.88 : fontSize === 'large' ? 1.15 : 1.0;
  const fonts    = Object.fromEntries(
    Object.entries(BASE).map(([k, v]) => [k, Math.round(v * scale)]),
  ) as AppFonts;
  return { colors: isDark ? dark : light, isDark, fonts };
}
