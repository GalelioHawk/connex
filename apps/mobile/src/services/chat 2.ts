import { authorizedRequest } from './http';
import type { Conversation, Message } from '../types';

export interface ConvoWithMeta extends Conversation {
  last_message: Message | null;
  other_user: { id: string; name: string; avatar_url: string | null } | null;
  unread_count: number;
}

export interface MessageWithSender extends Message {
  sender: { id: string; name: string; avatar_url: string | null };
}

export const chatService = {
  searchUsers(q: string, _token: string) {
    return authorizedRequest<{ users: { id: string; name: string; phone: string; avatar_url: string | null }[] }>(
      'GET',
      `/chat/users/search?q=${encodeURIComponent(q)}`,
    );
  },

  getConversations(_token: string) {
    return authorizedRequest<{ conversations: ConvoWithMeta[] }>('GET', '/chat/conversations');
  },

  createConversation(
    type: 'direct' | 'group',
    memberIds: string[],
    name: string | undefined,
    _token: string,
  ) {
    return authorizedRequest<{ conversation: Conversation; existed: boolean }>(
      'POST',
      '/chat/conversations',
      { type, member_ids: memberIds, name },
    );
  },

  getMessages(conversationId: string, _token: string, before?: string, after?: string) {
    const qs = new URLSearchParams();
    if (before) qs.set('before', before);
    if (after) qs.set('after', after);
    const query = qs.toString() ? `?${qs.toString()}` : '';

    return authorizedRequest<{ messages: MessageWithSender[] }>(
      'GET',
      `/chat/conversations/${conversationId}/messages${query}`,
    );
  },

  sendMessage(conversationId: string, content: string, _token: string) {
    return authorizedRequest<{ message: MessageWithSender }>(
      'POST',
      `/chat/conversations/${conversationId}/messages`,
      { content, type: 'text' },
    );
  },

  markRead(conversationId: string, _token: string) {
    return authorizedRequest<{ ok: boolean }>(
      'PATCH',
      `/chat/conversations/${conversationId}/read`,
    );
  },

  markDelivered(messageId: string, _token: string) {
    return authorizedRequest<{ ok: boolean }>(
      'PATCH',
      `/chat/messages/${messageId}/status`,
      { status: 'delivered' },
    );
  },
};
