-- ============================================================================
-- CONNEX SUPERAPP — SUPABASE DATABASE SCHEMA
-- Run this entire file in the Supabase SQL Editor (app.supabase.com)
-- Project: Supabase → SQL Editor → New Query → paste → Run
-- ============================================================================

-- Enable UUID generation (already enabled on Supabase but just in case)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- TABLE: users
-- Core user identity. Created on registration.
-- ============================================================================
CREATE TABLE IF NOT EXISTS users (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  phone        VARCHAR(20) NOT NULL UNIQUE,   -- E.164 format: +27821234567
  name         VARCHAR(100) NOT NULL,
  bio          TEXT,
  avatar_url   TEXT,                          -- Supabase Storage public URL
  area_id      VARCHAR(50),                   -- Township / suburb identifier
  province     VARCHAR(50),                   -- e.g. Gauteng
  is_active    BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_area_id ON users(area_id);

-- ============================================================================
-- TABLE: conversations
-- Holds both 1:1 (direct) and group chats.
-- ============================================================================
CREATE TABLE IF NOT EXISTS conversations (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  type         VARCHAR(10) NOT NULL DEFAULT 'direct', -- 'direct' | 'group'
  name         VARCHAR(100),                          -- Group name (NULL for direct)
  image_url    TEXT,                                  -- Group avatar
  created_by   UUID        NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- TABLE: conversation_members
-- Who is in each conversation.
-- ============================================================================
CREATE TABLE IF NOT EXISTS conversation_members (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id   UUID        NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id           UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role              VARCHAR(10) NOT NULL DEFAULT 'member', -- 'member' | 'admin'
  joined_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_read_at      TIMESTAMPTZ,                           -- For unread count calculation
  UNIQUE(conversation_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_conv_members_conversation ON conversation_members(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conv_members_user ON conversation_members(user_id);

-- ============================================================================
-- TABLE: messages
-- Every message in every conversation.
-- ============================================================================
CREATE TABLE IF NOT EXISTS messages (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id   UUID        NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id         UUID        NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  content           TEXT,                                  -- NULL for media-only messages
  type              VARCHAR(20) NOT NULL DEFAULT 'text',   -- text|image|video|audio|system
  media_url         TEXT,                                  -- Supabase Storage URL
  status            VARCHAR(20) NOT NULL DEFAULT 'sent',   -- sent|delivered|read
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at   ON messages(created_at);

-- ============================================================================
-- TABLE: sos_contacts
-- Emergency contacts — requires mutual consent (both users must accept).
-- ============================================================================
CREATE TABLE IF NOT EXISTS sos_contacts (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,  -- Who added
  contact_id   UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,  -- The contact
  status       VARCHAR(20) NOT NULL DEFAULT 'pending',  -- pending|accepted|rejected
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, contact_id)
);

CREATE INDEX IF NOT EXISTS idx_sos_contacts_user    ON sos_contacts(user_id);
CREATE INDEX IF NOT EXISTS idx_sos_contacts_contact ON sos_contacts(contact_id);

-- ============================================================================
-- TABLE: sos_events
-- Triggered SOS incidents. Phase 1: notification only.
-- Phase 2 adds live location (latitude/longitude).
-- ============================================================================
CREATE TABLE IF NOT EXISTS sos_events (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status          VARCHAR(20) NOT NULL DEFAULT 'active',  -- active|cancelled|resolved
  latitude        FLOAT,    -- Phase 2: live location
  longitude       FLOAT,    -- Phase 2: live location
  triggered_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at     TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_sos_events_user        ON sos_events(user_id);
CREATE INDEX IF NOT EXISTS idx_sos_events_triggered   ON sos_events(triggered_at);

-- ============================================================================
-- TABLE: posts
-- Social feed posts. alert_tag makes it surface in the Alerts tab.
-- ============================================================================
CREATE TABLE IF NOT EXISTS posts (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content      TEXT,
  image_url    TEXT,                   -- Supabase Storage URL
  alert_tag    VARCHAR(20),            -- NULL = normal post
                                       -- 'Utility'|'Safety'|'Traffic'|'Water'|'Weather'|'Community'
  area_id      VARCHAR(50),            -- Copied from user.area_id at post time
  is_deleted   BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_posts_author      ON posts(author_id);
CREATE INDEX IF NOT EXISTS idx_posts_alert_tag   ON posts(alert_tag);
CREATE INDEX IF NOT EXISTS idx_posts_area_id     ON posts(area_id);
CREATE INDEX IF NOT EXISTS idx_posts_created_at  ON posts(created_at DESC);

-- ============================================================================
-- TABLE: post_reactions
-- Likes / reactions on posts.
-- ============================================================================
CREATE TABLE IF NOT EXISTS post_reactions (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id      UUID        NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id      UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type         VARCHAR(20) NOT NULL DEFAULT 'like',  -- like|love|support|alert
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(post_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_reactions_post ON post_reactions(post_id);

-- ============================================================================
-- TABLE: follows
-- User follow / unfollow graph.
-- ============================================================================
CREATE TABLE IF NOT EXISTS follows (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,  -- Who follows
  following_id   UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,  -- Who is followed
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(follower_id, following_id)
);

CREATE INDEX IF NOT EXISTS idx_follows_follower  ON follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following ON follows(following_id);

-- ============================================================================
-- TABLE: loadshedding_schedules
-- Cached EskomSePush data. Refreshed every 4 hours by backend cron job.
-- DO NOT query EskomSePush API directly from mobile — always go through backend.
-- ============================================================================
CREATE TABLE IF NOT EXISTS loadshedding_schedules (
  id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  suburb_id     VARCHAR(50)  NOT NULL,    -- EskomSePush suburb ID
  suburb_name   VARCHAR(100) NOT NULL,
  stage         INTEGER      NOT NULL DEFAULT 0,  -- Current national stage (0 = no shedding)
  schedule      JSONB        NOT NULL DEFAULT '{}',  -- Full schedule JSON from ESP API
  fetched_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_loadshedding_suburb   ON loadshedding_schedules(suburb_id);
CREATE INDEX IF NOT EXISTS idx_loadshedding_fetched  ON loadshedding_schedules(fetched_at DESC);

-- ============================================================================
-- TABLE: edu_papers
-- DBE matric past papers. PDFs stored in Supabase Storage.
-- ============================================================================
CREATE TABLE IF NOT EXISTS edu_papers (
  id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  subject       VARCHAR(100) NOT NULL,          -- e.g. Mathematics
  grade         INTEGER      NOT NULL,           -- 10, 11, or 12
  year          INTEGER      NOT NULL,           -- e.g. 2023
  paper_num     INTEGER      DEFAULT 1,          -- 1, 2, or 3 where applicable
  language      VARCHAR(20)  NOT NULL DEFAULT 'English',  -- English|Afrikaans
  type          VARCHAR(20)  NOT NULL DEFAULT 'question', -- question|memo
  storage_path  TEXT         NOT NULL,           -- Supabase Storage path (NOT public URL)
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_edu_grade   ON edu_papers(grade);
CREATE INDEX IF NOT EXISTS idx_edu_year    ON edu_papers(year);
CREATE INDEX IF NOT EXISTS idx_edu_subject ON edu_papers(subject);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- Enable RLS on all tables. Users can only read/write their own data.
-- The backend uses the service_role key which BYPASSES RLS.
-- The mobile app should NEVER use the service_role key.
-- ============================================================================

ALTER TABLE users                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations          ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_members   ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages               ENABLE ROW LEVEL SECURITY;
ALTER TABLE sos_contacts           ENABLE ROW LEVEL SECURITY;
ALTER TABLE sos_events             ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_reactions         ENABLE ROW LEVEL SECURITY;
ALTER TABLE follows                ENABLE ROW LEVEL SECURITY;
ALTER TABLE loadshedding_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE edu_papers             ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- REALTIME
-- Enable Realtime on messages table for live chat.
-- In Supabase dashboard: Database → Replication → enable for 'messages' table.
-- ============================================================================
-- Note: Realtime is enabled via the Supabase Dashboard, not SQL.
-- Go to: Database > Replication > Tables and toggle ON for 'messages'.

-- ============================================================================
-- STORAGE BUCKETS
-- Create these in Supabase Dashboard → Storage → New Bucket
-- ============================================================================
-- Bucket: 'avatars'         (public: true)   — user profile pictures
-- Bucket: 'post-media'      (public: true)   — images attached to feed posts
-- Bucket: 'chat-media'      (public: false)  — images/files sent in chat (private)
-- Bucket: 'status-media'    (public: false)  — 24h status images/videos (private)
-- Bucket: 'edu-papers'      (public: false)  — DBE PDF files (signed URLs only)

-- ============================================================================
-- DONE — Schema created successfully.
-- Next steps:
--   1. Verify all tables are visible in Supabase → Table Editor
--   2. Enable Realtime on 'messages' table (Dashboard → Database → Replication)
--   3. Create Storage buckets listed above
--   4. Copy SUPABASE_URL and SUPABASE_ANON_KEY into .env files
-- ============================================================================
