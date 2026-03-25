export type PrivacyLevel = 'everyone' | 'contacts' | 'nobody';

export interface User {
  id:                 string;
  phone:              string;
  name:               string;
  avatar_url:         string | null;
  bio:                string | null;
  area_id:            string | null;
  province:           string | null;
  bubble_color:       string | null;
  show_last_seen:     PrivacyLevel;
  show_online_status: PrivacyLevel;
  show_profile_photo: PrivacyLevel;
  read_receipts:      boolean;
  show_phone:         boolean;
}

/** Shape returned by Convex auth.register / auth.login */
export interface AuthResponse {
  sessionId: string;
  user:      User;
}

export type AlertTag = 'Utility' | 'Safety' | 'Traffic' | 'Water' | 'Weather' | 'Community';

export interface Post {
  id:             string;
  author_id:      string;
  content:        string;
  image_url:      string | null;
  alert_tag:      string | null;
  area_id:        string | null;
  likes_count:    number;
  comments_count: number;
  created_at:     string;
  is_liked:       boolean;
  author:         { id: string; name: string; avatar_url: string | null } | null;
}

export interface Message {
  id:              string;
  conversation_id: string;
  sender_id:       string;
  content:         string | null;
  type:            'text' | 'image' | 'video' | 'system';
  media_url:       string | null;
  status:          'sent' | 'delivered' | 'read';
  created_at:      string;
  deleted_at:      string | null;
}

export interface Conversation {
  id:         string;
  type:       'direct' | 'group';
  name:       string | null;
  image_url:  string | null;
  created_by: string;
  created_at: string;
}
