import { API_URL } from '../constants/api';
import type { Conversation, Message } from '../types';

async function request<T>(
  method: string,
  path: string,
  token: string,
  body?: object,
): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? 'Request failed');
  return data as T;
}

export interface ConvoWithMeta extends Conversation {
  last_message:  Message | null;
  other_user:    { id: string; name: string; avatar_url: string | null } | null;
  unread_count:  number;
}

export interface MessageWithSender extends Message {
  sender: { id: string; name: string; avatar_url: string | null };
}

export const chatService = {
  searchUsers(q: string, token: string) {
    return request<{ users: { id: string; name: string; phone: string; avatar_url: string | null }[] }>(
      'GET', `/chat/users/search?q=${encodeURIComponent(q)}`, token,
    );
  },

  getConversations(token: string) {
    return request<{ conversations: ConvoWithMeta[] }>('GET', '/chat/conversations', token);
  },

  createConversation(
    type: 'direct' | 'group',
    memberIds: string[],
    name: string | undefined,
    token: string,
  ) {
    return request<{ conversation: Conversation; existed: boolean }>(
      'POST', '/chat/conversations', token,
      { type, member_ids: memberIds, name },
    );
  },

  getMessages(conversationId: string, token: string, before?: string, after?: string) {
    const qs = new URLSearchParams();
    if (before) qs.set('before', before);
    if (after)  qs.set('after', after);
    const query = qs.toString() ? `?${qs.toString()}` : '';
    return request<{ messages: MessageWithSender[] }>(
      'GET', `/chat/conversations/${conversationId}/messages${query}`, token,
    );
  },

  sendMessage(conversationId: string, content: string, token: string) {
    return request<{ message: MessageWithSender }>(
      'POST', `/chat/conversations/${conversationId}/messages`, token,
      { content, type: 'text' },
    );
  },

  markRead(conversationId: string, token: string) {
    return request<{ ok: boolean }>(
      'PATCH', `/chat/conversations/${conversationId}/read`, token,
    );
  },
};
