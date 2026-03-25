/**
 * messageStore — kept minimal.
 * With Convex reactive queries, push notifications are only needed to wake
 * the app. The actual message data is loaded by useQuery automatically.
 * This store just holds the conversation ID from the last push tap so the
 * app can navigate to the right chat room.
 */
import { create } from 'zustand';

interface MessageStoreState {
  incomingConversationId: string | null;
  setIncomingConversation: (conversationId: string) => void;
  clearIncomingConversation: () => void;
}

export const useMessageStore = create<MessageStoreState>((set) => ({
  incomingConversationId: null,
  setIncomingConversation:  (id) => set({ incomingConversationId: id }),
  clearIncomingConversation: ()  => set({ incomingConversationId: null }),
}));
