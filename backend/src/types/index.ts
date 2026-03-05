// ─── Database row types (mirror the Supabase schema) ─────────────────────────

export interface DbUser {
  id: string;
  phone: string;
  name: string;
  bio: string | null;
  avatar_url: string | null;
  area_id: string | null;
  province: string | null;
  password_hash: string;
  fcm_token: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DbConversation {
  id: string;
  type: 'direct' | 'group';
  name: string | null;
  image_url: string | null;
  created_by: string;
  created_at: string;
}

export interface DbConversationMember {
  id: string;
  conversation_id: string;
  user_id: string;
  role: 'member' | 'admin';
  joined_at: string;
  last_read_at: string | null;
}

export interface DbMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string | null;
  type: 'text' | 'image' | 'video' | 'audio' | 'system';
  media_url: string | null;
  status: 'sent' | 'delivered' | 'read';
  created_at: string;
}

export interface DbPost {
  id: string;
  author_id: string;
  content: string | null;
  image_url: string | null;
  alert_tag: 'Utility' | 'Safety' | 'Traffic' | 'Water' | 'Weather' | 'Community' | null;
  area_id: string | null;
  is_deleted: boolean;
  created_at: string;
}

export interface DbSosContact {
  id: string;
  user_id: string;
  contact_id: string;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
}

export interface DbEduPaper {
  id: string;
  subject: string;
  grade: 10 | 11 | 12;
  year: number;
  paper_num: number;
  language: string;
  type: 'question' | 'memo';
  storage_path: string;
  created_at: string;
}

// ─── API response types ───────────────────────────────────────────────────────

export interface PublicUser {
  id: string;
  name: string;
  avatar_url: string | null;
  bio: string | null;
  area_id: string | null;
  province: string | null;
}

export type AlertTag = 'Utility' | 'Safety' | 'Traffic' | 'Water' | 'Weather' | 'Community';

export const ALERT_TAGS: AlertTag[] = [
  'Utility',
  'Safety',
  'Traffic',
  'Water',
  'Weather',
  'Community',
];
