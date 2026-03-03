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
| Node.js | 20.x LTS | Runtime |
| Express | ^4.x | HTTP server |
| TypeScript | ^5.x | All code is TypeScript — no plain JS |
| @supabase/supabase-js | ^2.x | Supabase admin client (service_role key) |
| jsonwebtoken | ^9.x | JWT auth tokens |
| bcryptjs | ^2.x | Password hashing |
| Zod | ^3.x | Request body validation |
| ioredis | ^5.x | Upstash Redis client |
| node-cron | ^3.x | Scheduled jobs (loadshedding refresh) |
| axios | ^1.x | HTTP client for EskomSePush API |
| cors | ^2.x | CORS middleware |
| helmet | ^8.x | Security headers |
| express-rate-limit | ^7.x | Rate limiting |
| firebase-admin | ^12.x | Send FCM push notifications |
| dotenv | ^16.x | Load .env |

### Infrastructure
| Service | Purpose |
|---|---|
| Supabase | PostgreSQL DB, Auth, Realtime (chat), Storage |
| Railway | Backend hosting (auto-deploy from GitHub) |
| Upstash Redis | Session cache, rate limiting, loadshedding cache |
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
- Phone number + password (not OTP-only). Supabase Auth for OTP verification.
- JWT stored in AsyncStorage (via Zustand persist).
- Refresh token stored in Redis with TTL matching `JWT_REFRESH_EXPIRES_IN`.

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
- Do NOT use Redis Cloud — use Upstash Redis only.
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
