"""
build_docs.py
Generates three pre-coding documents:
  1. database/schemas/schema.sql       — all CREATE TABLE statements for Supabase
  2. apps/mobile/.env.example          — mobile environment variable template
  3. backend/.env.example              — backend environment variable template
  4. CLAUDE.md                         — AI coder instructions at project root
"""
import os

ROOT = "/Users/vulture/Desktop/Connex"

# ─────────────────────────────────────────────────────────────────────────────
# 1. SQL SCHEMA
# ─────────────────────────────────────────────────────────────────────────────

SCHEMA_SQL = """\
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
"""

# ─────────────────────────────────────────────────────────────────────────────
# 2. MOBILE .env.example
# ─────────────────────────────────────────────────────────────────────────────

MOBILE_ENV = """\
# ============================================================================
# CONNEX MOBILE — ENVIRONMENT VARIABLES
# File: apps/mobile/.env.example
#
# HOW TO USE:
#   1. Copy this file:  cp .env.example .env
#   2. Fill in every value (see comments for where to find each value)
#   3. NEVER commit .env to GitHub — it is in .gitignore
#
# In Expo, prefix all variables with EXPO_PUBLIC_ to access them in app code.
# Variables WITHOUT that prefix are only available in build scripts.
# ============================================================================

# ── SUPABASE ─────────────────────────────────────────────────────────────────
# Found in: Supabase Dashboard → Project Settings → API

EXPO_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here

# !! NEVER put the service_role key here — that key belongs on the backend only !!

# ── BACKEND API ──────────────────────────────────────────────────────────────
# Your Railway-deployed backend URL.
# Local dev: http://localhost:3000
# Production: https://your-app.railway.app

EXPO_PUBLIC_API_URL=http://localhost:3000

# ── FIREBASE (push notifications) ────────────────────────────────────────────
# Found in: Firebase Console → Project Settings → General → Your apps → Android/iOS
# Only the Sender ID is needed on the mobile side.

EXPO_PUBLIC_FIREBASE_SENDER_ID=your-firebase-sender-id

# ── APP CONFIG ────────────────────────────────────────────────────────────────
# Environment: 'development' | 'staging' | 'production'

EXPO_PUBLIC_APP_ENV=development

# ── MAPS (Phase 4 — Logistics only, leave blank until needed) ────────────────
# Found in: Google Cloud Console → APIs & Services → Credentials

EXPO_PUBLIC_GOOGLE_MAPS_KEY=
"""

# ─────────────────────────────────────────────────────────────────────────────
# 3. BACKEND .env.example
# ─────────────────────────────────────────────────────────────────────────────

BACKEND_ENV = """\
# ============================================================================
# CONNEX BACKEND — ENVIRONMENT VARIABLES
# File: backend/.env.example
#
# HOW TO USE:
#   1. Copy this file:  cp .env.example .env
#   2. Fill in every value (see comments for where to find each value)
#   3. NEVER commit .env to GitHub — it is in .gitignore
#
# On Railway: set these in Project → Variables (not in a file)
# ============================================================================

# ── SERVER ───────────────────────────────────────────────────────────────────

PORT=3000
NODE_ENV=development      # development | production

# ── SUPABASE ─────────────────────────────────────────────────────────────────
# Found in: Supabase Dashboard → Project Settings → API
# The SERVICE_ROLE key bypasses Row Level Security — keep it secret.

SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# !! NEVER expose SERVICE_ROLE_KEY to the mobile app !!

# ── REDIS (optional) ──────────────────────────────────────────────────────────
# Leave blank in zero-budget/local setups.
# If REDIS_URL is empty, the backend falls back to an in-memory cache.

REDIS_URL=rediss://default:your-password@your-endpoint.upstash.io:6379

# ── FIREBASE (push notifications) ────────────────────────────────────────────
# Found in: Firebase Console → Project Settings → Service accounts → Generate key
# Download the JSON file and paste the values here (or set GOOGLE_APPLICATION_CREDENTIALS)

FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nyour-key-here\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com

# ── ESKOMSEPUSH API ───────────────────────────────────────────────────────────
# Found in: eskomsepush.app → Register → API Token
# Free tier: 50 calls/day — the backend caches results in Redis for 4 hours

ESKOMSEPUSH_API_KEY=your-api-key-here
ESKOMSEPUSH_CACHE_TTL_SECONDS=14400   # 4 hours

# ── CORS ──────────────────────────────────────────────────────────────────────
# Comma-separated list of allowed origins.
# In development this can be * but lock it down in production.

CORS_ORIGINS=*

# ── RATE LIMITING ─────────────────────────────────────────────────────────────
# Max requests per window per IP. Stored in Redis.

RATE_LIMIT_WINDOW_MS=900000    # 15 minutes
RATE_LIMIT_MAX_REQUESTS=100

# ── PAYMENTS (Phase 2 — Connex Pay, leave blank until needed) ────────────────
# Flutterwave: flutterwave.com → Dashboard → API Keys
# Paystack:    paystack.com   → Settings → API Keys

FLUTTERWAVE_PUBLIC_KEY=
FLUTTERWAVE_SECRET_KEY=
PAYSTACK_PUBLIC_KEY=
PAYSTACK_SECRET_KEY=

# ── STORAGE ───────────────────────────────────────────────────────────────────
# Max file upload size in bytes (default 10MB)

MAX_FILE_SIZE_BYTES=10485760
"""

# ─────────────────────────────────────────────────────────────────────────────
# 4. CLAUDE.md — AI Coder Instructions
# ─────────────────────────────────────────────────────────────────────────────

CLAUDE_MD = """\
# CONNEX — AI CODER INSTRUCTIONS

Read this file completely before writing any code.
This file is the single source of truth for all coding decisions on this project.

---

## WHAT IS CONNEX

Connex is a South African super app. The founder does not code — AI models are the developers.

**Phase 1 (current):** Three modules launching together:
- **Chat** — real-time messaging (groups, 1:1, status), with SOS emergency button wired to trusted contacts, and loadshedding alerts integrated
- **Feed** — social posts + a dedicated Alerts tab (6 categories: Utility, Safety, Traffic, Water, Weather, Community), powered by community self-tagging and official EskomSePush data
- **Edu** — free DBE matric past papers (Grades 10–12), in-app PDF viewer

**Phase 2:** Connex Pay (digital wallet, P2P transfers, bill payments)
**Phase 3:** Connex Clips (short-form video, creator economy)
**Phase 4:** Connex Logistics (ride-hailing, food delivery, parcels, grocery)

---

## CONFIRMED TECH STACK — DO NOT CHANGE

### Mobile
| Tool | Version | Purpose |
|---|---|---|
| Expo (managed workflow) | ~52.x | Core mobile framework |
| React Native | 0.76.x | Bundled with Expo |
| TypeScript | ^5.x | All code is TypeScript — no plain JS |
| React Navigation v6 | ^6.x | Navigation (Stack + BottomTabs) |
| NativeWind | ^4.x | Tailwind CSS styling in React Native |
| Zustand | ^5.x | Global state management |
| @supabase/supabase-js | ^2.x | Supabase client (auth, DB, Realtime) |
| Expo Notifications | ~0.29.x | Push notification handling |
| Expo Image Picker | ~16.x | Camera + gallery image selection |
| Expo Haptics | ~14.x | Haptic feedback (SOS button hold) |
| react-native-pdf | ^6.x | In-app PDF viewer for Edu |
| react-native-maps | ^1.x | Map view for Alerts map screen |
| dayjs | ^1.x | Date/time formatting |
| Zod | ^3.x | Schema validation |

### Backend
| Tool | Version | Purpose |
|---|---|---|
| Node.js | 20.x LTS+ | Runtime |
| Express | ^5.x | HTTP server |
| TypeScript | ^5.x | All code is TypeScript — no plain JS |
| @supabase/supabase-js | ^2.x | Supabase admin + auth clients |
| bcryptjs | ^3.x | Legacy-password migration support |
| Zod | ^4.x | Request body validation |
| ioredis | ^5.x | Optional cache client |
| node-cron | ^4.x | Scheduled jobs (loadshedding refresh) |
| axios | ^1.x | HTTP client for EskomSePush API |
| cors | ^2.x | CORS middleware |
| helmet | ^8.x | Security headers |
| express-rate-limit | ^8.x | Rate limiting |
| firebase-admin | ^13.x | Send FCM push notifications |
| dotenv | ^17.x | Load .env |

### Infrastructure
| Service | Purpose |
|---|---|
| Supabase | PostgreSQL DB, Auth, Realtime (chat), Storage |
| Express backend | Privileged API logic, push delivery, official integrations |
| Upstash Redis | Optional cache, rate limiting, loadshedding cache |
| Firebase FCM | Push notifications |
| Expo EAS | Mobile builds and distribution |

---

## PROJECT FOLDER STRUCTURE

```
connex/
├── apps/
│   └── mobile/                     # Expo React Native app
│       ├── src/
│       │   ├── components/         # Reusable UI components
│       │   │   ├── shared/         # Buttons, inputs, avatars, loaders
│       │   │   ├── chat/           # MessageBubble, ChatInput, ConvoListItem
│       │   │   ├── feed/           # PostCard, AlertBadge, AlertCategoryChip
│       │   │   └── edu/            # PaperCard, SubjectGrid
│       │   ├── screens/            # One file per screen
│       │   │   ├── auth/           # OnboardingScreen, RegisterScreen, LoginScreen
│       │   │   ├── chat/           # ChatListScreen, ChatRoomScreen, etc.
│       │   │   ├── feed/           # FeedHomeScreen, AlertsTabScreen, etc.
│       │   │   ├── edu/            # EduHomeScreen, PaperListScreen, etc.
│       │   │   ├── sos/            # SOSScreen, SOSContactsScreen
│       │   │   └── profile/        # ProfileScreen, EditProfileScreen, SettingsScreen
│       │   ├── navigation/         # Stack and tab navigator definitions
│       │   ├── store/              # Zustand stores (auth, chat, feed, alerts)
│       │   ├── services/           # API call functions (auth.ts, chat.ts, feed.ts, etc.)
│       │   ├── hooks/              # Custom React hooks
│       │   ├── utils/              # Helpers (date, format, storage)
│       │   ├── types/              # Shared TypeScript types/interfaces
│       │   └── constants/          # Colors, API URLs, category lists
│       ├── assets/                 # App icon, splash screen, fonts
│       ├── app.json                # Expo config
│       ├── .env                    # NEVER commit — copy from .env.example
│       └── .env.example            # ✅ committed — template with blank values
│
├── backend/
│   ├── src/
│   │   ├── routes/                 # Express route files
│   │   │   ├── auth.ts             # POST /auth/register, /auth/login, /auth/logout
│   │   │   ├── users.ts            # GET/PATCH /users/:id, GET /users/search
│   │   │   ├── chat.ts             # All /chat/* endpoints
│   │   │   ├── feed.ts             # All /feed/* endpoints
│   │   │   ├── alerts.ts           # GET /alerts/loadshedding, /alerts/loadshedding/stage
│   │   │   ├── sos.ts              # All /sos/* endpoints
│   │   │   └── edu.ts              # All /edu/* endpoints
│   │   ├── middleware/             # Auth middleware, rate limiter, error handler
│   │   ├── services/               # Business logic (separate from routes)
│   │   │   ├── supabase.ts         # Supabase admin client (singleton)
│   │   │   ├── redis.ts            # Upstash Redis client (singleton)
│   │   │   ├── fcm.ts              # Firebase push notification sender
│   │   │   └── eskomsepush.ts      # EskomSePush API + Redis caching
│   │   ├── jobs/                   # node-cron scheduled jobs
│   │   │   └── refreshLoadshedding.ts
│   │   ├── validators/             # Zod schemas for request validation
│   │   ├── types/                  # Shared TypeScript types
│   │   └── app.ts                  # Express app setup + route mounting
│   ├── server.ts                   # Entry point (imports app.ts, starts server)
│   ├── .env                        # NEVER commit — copy from .env.example
│   └── .env.example                # ✅ committed — template with blank values
│
├── database/
│   ├── schemas/
│   │   └── schema.sql              # ✅ All CREATE TABLE statements for Supabase
│   ├── migrations/                 # Future schema changes (numbered: 001_add_column.sql)
│   └── seeds/                      # Test/dev seed data
│
├── docs/
│   ├── business/                   # Business report + master workbook
│   └── technical/                  # Technical plan + project tracker
│
├── config/                         # Shared config (e.g. eslint, prettier, tsconfig base)
├── scripts/                        # Utility scripts (document generators, etc.)
└── CLAUDE.md                       # ← YOU ARE HERE — read before coding
```

---

## CODE CONVENTIONS — FOLLOW THESE EXACTLY

### TypeScript
- **All code is TypeScript.** No `.js` files anywhere in `src/`.
- Define types/interfaces in `src/types/`. Import them where needed.
- Use `interface` for object shapes, `type` for unions/aliases.
- Never use `any`. Use `unknown` and narrow if you must.
- Enable `strict: true` in tsconfig.

### Naming
- Files: `camelCase.ts` for utilities/services, `PascalCase.tsx` for React components/screens
- Components: `PascalCase` (e.g. `MessageBubble`, `PostCard`)
- Functions/variables: `camelCase`
- Constants: `UPPER_SNAKE_CASE`
- Database columns: `snake_case` (PostgreSQL convention)
- API routes: `kebab-case` (e.g. `/chat/conversations/:id/members`)

### React Native / Expo
- Use **NativeWind** (Tailwind) for all styling. No `StyleSheet.create()` unless absolutely necessary.
- Use **React Navigation** for all screen routing. No custom routing.
- Use **Zustand** for global state. No Redux, no Context API for global state.
- One screen per file. One component per file (unless trivially small).
- All API calls go through `src/services/` — never call the API directly from a screen.
- Use custom hooks (`src/hooks/`) for any logic that involves side effects or state.

### Backend (Express)
- All routes validated with **Zod** before any business logic.
- Auth middleware runs before any protected route.
- Never put business logic directly in route handlers — use service functions.
- All database access goes through the Supabase client in `src/services/supabase.ts`.
- All Redis access goes through the client in `src/services/redis.ts`.
- Errors are caught and forwarded to the central error handler middleware.
- Use `async/await` everywhere. No raw `.then()` chains.

### Security — NON-NEGOTIABLE
- **NEVER** put `SUPABASE_SERVICE_ROLE_KEY` in the mobile app. Backend only.
- **NEVER** commit `.env` files. They are in `.gitignore`.
- **ALWAYS** validate request bodies with Zod before processing.
- **ALWAYS** check auth middleware passes before accessing protected data.
- **ALWAYS** hash passwords with bcrypt before storing. Never store plain text.
- Rate limit all auth endpoints (register, login) at a minimum.

---

## KEY PRODUCT DECISIONS — DO NOT REINTERPRET

**Chat:**
- Supabase Realtime (WebSocket) for live messages. NOT WebRTC. NOT Socket.io. NOT Signal Protocol.
- Message status: sent → delivered → read (double tick logic).
- Group chats: name + image + members + admin role.

**SOS:**
- Press-and-hold button (3 seconds) inside the Chat tab.
- Haptic feedback + countdown animation during hold.
- Mutual consent required — both users must accept before they are SOS contacts.
- Phase 1: FCM push notification to all accepted contacts only.
- Phase 2 (later): adds live GPS location.
- Phase 3 (later): adds SAPS/emergency services integration.

**Alerts system (dual layer):**
- Layer 1 (official): EskomSePush API data — fetched every 4 hours by backend cron, cached in Redis, served via `/alerts/loadshedding`.
- Layer 2 (community): Users optionally tag their Feed posts with an alert category (Utility, Safety, Traffic, Water, Weather, Community). These surface in the Feed's Alerts tab, filtered by `area_id`.
- The Alerts tab in the Feed combines BOTH layers.
- `area_id` is set on the user's profile and copied to posts at creation time.

**Edu:**
- Free to all users — no paywall in Phase 1.
- PDFs served via signed Supabase Storage URLs (not public URLs).
- Grade 10, 11, 12 only in Phase 1.

**Authentication:**
- Phone number + password with Supabase Auth as the real session source of truth.
- Mobile sign-in/sign-up uses Supabase directly; backend auth endpoints remain only as a legacy-account bridge.
- Access and refresh tokens are persisted in AsyncStorage by the mobile app and refreshed through Supabase.
- For zero-budget password signup, disable email confirmation in Supabase Auth because the app uses phone-to-email identity mapping behind the scenes.

---

## GIT WORKFLOW

```
main        — production only. Never commit directly here.
dev         — integration branch. Merge feature branches here first.
feature/*   — one branch per feature (e.g. feature/chat-realtime)
fix/*       — bug fixes
```

- Branch from `dev`, not `main`.
- PR to `dev` first. Only merge `dev` → `main` when releasing.
- Commit messages: `type: short description` (e.g. `feat: add SOS trigger endpoint`, `fix: message status not updating`)

---

## WHAT NOT TO DO

- Do NOT install packages not listed in the tech stack without asking first.
- Do NOT use Next.js — this is a mobile app. There is no web frontend in Phase 1.
- Do NOT use MongoDB — the database is Supabase (PostgreSQL) only.
- Do NOT make Redis a hard requirement for local development or zero-budget setups.
- Do NOT use Socket.io — Supabase Realtime handles WebSocket connections.
- Do NOT use React Context API for global state — use Zustand.
- Do NOT hardcode any API keys, URLs, or secrets — use .env variables.
- Do NOT skip Zod validation on any API endpoint.
- Do NOT commit directly to main.
- Do NOT make backend routes publicly accessible without auth middleware (except /auth/register and /auth/login).

---

## USEFUL REFERENCES

- Supabase docs: https://supabase.com/docs
- Expo docs: https://docs.expo.dev
- React Navigation: https://reactnavigation.org/docs/getting-started
- NativeWind: https://www.nativewind.dev/v4/overview
- Zustand: https://docs.pmnd.rs/zustand/getting-started/introduction
- Railway deploy: https://docs.railway.app
- Upstash Redis: https://upstash.com/docs/redis/overall/getstarted
- EskomSePush API: https://eskomsepush.app/
- Firebase Admin SDK: https://firebase.google.com/docs/admin/setup

---

*Last updated: March 2026 | Phase 1 — MVP Build*
"""

# ─────────────────────────────────────────────────────────────────────────────
# WRITE FILES
# ─────────────────────────────────────────────────────────────────────────────

files = {
    f"{ROOT}/database/schemas/schema.sql":  SCHEMA_SQL,
    f"{ROOT}/apps/mobile/.env.example":     MOBILE_ENV,
    f"{ROOT}/backend/.env.example":         BACKEND_ENV,
    f"{ROOT}/CLAUDE.md":                    CLAUDE_MD,
}

for path, content in files.items():
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w") as fh:
        fh.write(content)
    print(f"Saved: {path}")

print("\nAll done.")
