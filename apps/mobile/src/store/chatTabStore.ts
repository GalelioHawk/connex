import { create } from 'zustand';

// The Chat screen's internal section. Driven by the WhatsApp-style bottom bar
// (Updates / Calls / Communities / Chats) and read by ChatListScreen.
export type ChatTab = 'Texts' | 'Status' | 'Calls' | 'Communities';

interface ChatTabState {
  tab:    ChatTab;
  setTab: (tab: ChatTab) => void;
}

export const useChatTabStore = create<ChatTabState>((set) => ({
  tab:    'Texts',
  setTab: (tab) => set({ tab }),
}));
