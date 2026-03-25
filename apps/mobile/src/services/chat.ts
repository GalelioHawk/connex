/**
 * Chat service — one-off mutations only.
 * Reactive data (message list, conversation list) comes from useQuery in screens.
 */
import { convex } from "./convex";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

type SessionId = Id<"sessions">;

export const chatService = {
  createConversation(
    sessionId: string,
    type: "direct" | "group",
    memberIds: string[],
    name?: string,
  ) {
    return convex.mutation(api.chat.createConversation, {
      sessionId: sessionId as SessionId,
      type,
      memberIds: memberIds as Id<"users">[],
      name,
    });
  },

  sendMessage(sessionId: string, conversationId: string, content: string) {
    return convex.mutation(api.chat.sendMessage, {
      sessionId:      sessionId      as SessionId,
      conversationId: conversationId as Id<"conversations">,
      content,
    });
  },

  markRead(sessionId: string, conversationId: string) {
    return convex.mutation(api.chat.markRead, {
      sessionId:      sessionId      as SessionId,
      conversationId: conversationId as Id<"conversations">,
    });
  },

  markDelivered(sessionId: string, messageId: string) {
    return convex.mutation(api.chat.markDelivered, {
      sessionId: sessionId as SessionId,
      messageId: messageId as Id<"messages">,
    });
  },

  deleteMessage(sessionId: string, messageId: string, deleteForEveryone: boolean) {
    return convex.mutation(api.chat.deleteMessage, {
      sessionId:         sessionId as SessionId,
      messageId:         messageId as Id<"messages">,
      deleteForEveryone,
    });
  },

  searchUsers(sessionId: string, q: string) {
    return convex.query(api.users.search, {
      sessionId: sessionId as SessionId,
      q,
    });
  },
};

// Re-export types so screens don't need to import from Convex directly
export type { Id };
