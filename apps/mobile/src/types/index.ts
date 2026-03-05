export interface User {
  id: string;
  phone: string;
  name: string;
  avatar_url: string | null;
  bio: string | null;
  area_id: string | null;
  province: string | null;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
}

export interface AuthResponse {
  user: User;
  access_token: string;
  refresh_token: string;
}

export type AlertTag = 'Utility' | 'Safety' | 'Traffic' | 'Water' | 'Weather' | 'Community';

export interface Post {
  id: string;
  author_id: string;
  content: string | null;
  image_url: string | null;
  alert_tag: AlertTag | null;
  area_id: string | null;
  created_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string | null;
  type: 'text' | 'image' | 'video' | 'audio' | 'system';
  media_url: string | null;
  status: 'sent' | 'delivered' | 'read';
  created_at: string;
}

export interface Conversation {
  id: string;
  type: 'direct' | 'group';
  name: string | null;
  image_url: string | null;
  created_by: string;
  created_at: string;
}
