import { create } from 'zustand';
import type { MessageWithSender } from '../services/chat';

interface MessageStoreState {
  // Set by the push notification handler when a new message arrives
  lastPushedMessage: MessageWithSender | null;
  // Set when any conversation has a new message (triggers ChatList refresh)
  newMessageConversationId: string | null;

  setPushedMessage: (msg: MessageWithSender) => void;
  clearPushedMessage: () => void;
}

export const useMessageStore = create<MessageStoreState>((set) => ({
  lastPushedMessage:        null,
  newMessageConversationId: null,

  setPushedMessage: (msg) =>
    set({ lastPushedMessage: msg, newMessageConversationId: msg.conversation_id }),

  clearPushedMessage: () =>
    set({ lastPushedMessage: null }),
}));
