export interface ThemeColors {
  // Backgrounds
  background:   string;
  surface:      string;
  surface2:     string;
  // Text
  text:         string;
  textSecondary:string;
  textMuted:    string;
  // UI
  border:       string;
  accent:       string;
  // Chat bubbles
  bubbleMine:       string;
  bubbleTheirs:     string;
  bubbleTextMine:   string;
  bubbleTextTheirs: string;
  tickDefault:      string;
  tickRead:         string;
  // Input bar
  inputBar:   string;
  inputPill:  string;
  inputIcon:  string;
  // Header
  headerBg:   string;
  headerIcon: string;
  // Tab bar
  tabBar:     string;
  // Misc
  avatarBg:   string;
  separator:  string;
  statusBar:  'light-content' | 'dark-content';
}

export const dark: ThemeColors = {
  background:       '#111111',
  surface:          '#1C1C1E',
  surface2:         '#2C2C2E',
  text:             '#FFFFFF',
  textSecondary:    '#8E8E93',
  textMuted:        '#6C6C6E',
  border:           '#2C2C2E',
  accent:           '#00A86B',
  bubbleMine:       '#1E5A9C',
  bubbleTheirs:     '#2C2C2E',
  bubbleTextMine:   '#FFFFFF',
  bubbleTextTheirs: '#FFFFFF',
  tickDefault:      'rgba(255,255,255,0.55)',
  tickRead:         '#34B7F1',
  inputBar:         '#1C1C1E',
  inputPill:        '#2C2C2E',
  inputIcon:        '#EBEBF5',
  headerBg:         '#111111',
  headerIcon:       '#FFFFFF',
  tabBar:           '#2C2C2E',
  avatarBg:         '#1E3A5F',
  separator:        '#3A3A3C',
  statusBar:        'light-content',
};

export const light: ThemeColors = {
  background:       '#FFFFFF',
  surface:          '#F2F2F7',
  surface2:         '#E5E5EA',
  text:             '#000000',
  textSecondary:    '#6B6B6B',
  textMuted:        '#8E8E93',
  border:           '#E5E5EA',
  accent:           '#00A86B',
  bubbleMine:       '#1E5A9C',
  bubbleTheirs:     '#E8EEF9',
  bubbleTextMine:   '#FFFFFF',
  bubbleTextTheirs: '#111111',
  tickDefault:      'rgba(0,0,0,0.35)',
  tickRead:         '#34B7F1',
  inputBar:         '#F0F0F0',
  inputPill:        '#FFFFFF',
  inputIcon:        '#5A5A5E',
  headerBg:         '#FFFFFF',
  headerIcon:       '#111111',
  tabBar:           '#FFFFFF',
  avatarBg:         '#1E3A5F',
  separator:        '#C8C8CC',
  statusBar:        'dark-content',
};
