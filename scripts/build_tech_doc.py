#!/usr/bin/env python3
"""Connex — Technical Development Plan & Build Guide"""

from docx import Document
from docx.shared import Pt, Inches, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml.ns import qn
from docx.oxml import OxmlElement

FONT      = 'Garamond'
NAVY      = RGBColor(0x0D, 0x1B, 0x2A)
GREEN     = RGBColor(0x00, 0x6B, 0x3C)
DARK_GREY = RGBColor(0x3A, 0x3A, 0x3A)
MID_GREY  = RGBColor(0x72, 0x72, 0x72)
WHITE     = RGBColor(0xFF, 0xFF, 0xFF)
HDR_BG    = '0D1B2A'
ALT_BG    = 'EFF4F1'

def set_cell_bg(cell, hex_color):
    tc = cell._tc; tcPr = tc.get_or_add_tcPr()
    shd = OxmlElement('w:shd')
    shd.set(qn('w:val'), 'clear'); shd.set(qn('w:color'), 'auto')
    shd.set(qn('w:fill'), hex_color.lstrip('#')); tcPr.append(shd)

def green_underline(p):
    pPr = p._p.get_or_add_pPr(); pBdr = OxmlElement('w:pBdr')
    b = OxmlElement('w:bottom')
    b.set(qn('w:val'), 'single'); b.set(qn('w:sz'), '12')
    b.set(qn('w:space'), '1'); b.set(qn('w:color'), '006B3C')
    pBdr.append(b); pPr.append(pBdr)

def set_default_font(doc):
    doc.styles['Normal'].font.name = FONT
    doc.styles['Normal'].font.size = Pt(11)

def para(doc, text='', bold=False, italic=False, size=11, color=None,
         align=WD_ALIGN_PARAGRAPH.LEFT, sb=0, sa=7):
    p = doc.add_paragraph()
    p.alignment = align
    p.paragraph_format.space_before = Pt(sb)
    p.paragraph_format.space_after  = Pt(sa)
    p.paragraph_format.line_spacing = Pt(17)
    if text:
        r = p.add_run(text)
        r.bold = bold; r.italic = italic
        r.font.name = FONT; r.font.size = Pt(size)
        r.font.color.rgb = color or DARK_GREY
    return p

def code(doc, text):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(4)
    p.paragraph_format.space_after  = Pt(4)
    p.paragraph_format.left_indent  = Inches(0.3)
    r = p.add_run(text)
    r.font.name = 'Courier New'; r.font.size = Pt(9)
    r.font.color.rgb = RGBColor(0x00, 0x55, 0x00)
    return p

def h1(doc, text):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(24); p.paragraph_format.space_after = Pt(10)
    r = p.add_run(text.upper())
    r.bold = True; r.font.name = FONT; r.font.size = Pt(14); r.font.color.rgb = NAVY
    green_underline(p); return p

def h2(doc, text):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(16); p.paragraph_format.space_after = Pt(5)
    r = p.add_run(text)
    r.bold = True; r.font.name = FONT; r.font.size = Pt(12); r.font.color.rgb = NAVY
    return p

def h3(doc, text):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(10); p.paragraph_format.space_after = Pt(3)
    r = p.add_run(text)
    r.bold = True; r.font.name = FONT; r.font.size = Pt(11); r.font.color.rgb = GREEN
    return p

def bullet(doc, text, level=1):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(2); p.paragraph_format.space_after = Pt(2)
    indent = 0.35 + (level - 1) * 0.3
    p.paragraph_format.left_indent = Inches(indent)
    p.paragraph_format.first_line_indent = Inches(-0.2)
    sym = '•' if level == 1 else '◦'
    r1 = p.add_run(f'{sym}  '); r1.font.name = FONT; r1.font.size = Pt(10); r1.font.color.rgb = GREEN
    r2 = p.add_run(text); r2.font.name = FONT; r2.font.size = Pt(11); r2.font.color.rgb = DARK_GREY

def labeled(doc, label, text):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(4); p.paragraph_format.space_after = Pt(3)
    p.paragraph_format.left_indent = Inches(0.3)
    r1 = p.add_run(f'{label}:  '); r1.bold = True; r1.font.name = FONT; r1.font.size = Pt(11); r1.font.color.rgb = NAVY
    r2 = p.add_run(text); r2.font.name = FONT; r2.font.size = Pt(11); r2.font.color.rgb = DARK_GREY

def spacer(doc, n=1):
    for _ in range(n):
        p = doc.add_paragraph()
        p.paragraph_format.space_before = Pt(0); p.paragraph_format.space_after = Pt(0)

def pb(doc): doc.add_page_break()

def tbl(doc, headers, rows, widths=None, alt=True):
    t = doc.add_table(rows=1 + len(rows), cols=len(headers))
    t.style = 'Table Grid'; t.alignment = WD_TABLE_ALIGNMENT.CENTER
    hdr = t.rows[0].cells
    for i, h in enumerate(headers):
        set_cell_bg(hdr[i], HDR_BG)
        p = hdr[i].paragraphs[0]; p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p.paragraph_format.space_before = Pt(5); p.paragraph_format.space_after = Pt(5)
        r = p.add_run(h); r.bold = True; r.font.name = FONT; r.font.size = Pt(10); r.font.color.rgb = WHITE
    for ri, row_data in enumerate(rows):
        cells = t.rows[ri + 1].cells
        for ci, val in enumerate(row_data):
            if alt and ri % 2 == 1: set_cell_bg(cells[ci], ALT_BG)
            p = cells[ci].paragraphs[0]
            p.paragraph_format.space_before = Pt(4); p.paragraph_format.space_after = Pt(4)
            r = p.add_run(str(val)); r.font.name = FONT; r.font.size = Pt(10); r.font.color.rgb = DARK_GREY
    if widths:
        for wi, w in enumerate(widths):
            for row in t.rows: row.cells[wi].width = Inches(w)
    return t

# ══════════════════════════════════════════════════════════════════════════════
doc = Document()
set_default_font(doc)
for s in doc.sections:
    s.top_margin = Inches(1.0); s.bottom_margin = Inches(1.0)
    s.left_margin = Inches(1.25); s.right_margin = Inches(1.25)

# ── COVER ──────────────────────────────────────────────────────────────────────
spacer(doc, 6)
p = doc.add_paragraph(); p.alignment = WD_ALIGN_PARAGRAPH.CENTER
r = p.add_run('CONNEX'); r.bold = True; r.font.name = FONT; r.font.size = Pt(48); r.font.color.rgb = NAVY
p = doc.add_paragraph(); p.alignment = WD_ALIGN_PARAGRAPH.CENTER; p.paragraph_format.space_after = Pt(4)
r = p.add_run('TECHNICAL DEVELOPMENT PLAN & BUILD GUIDE'); r.bold = True; r.font.name = FONT; r.font.size = Pt(16); r.font.color.rgb = GREEN
p = doc.add_paragraph(); p.alignment = WD_ALIGN_PARAGRAPH.CENTER
r = p.add_run('From First Line of Code to Alpha Launch — Complete Developer Reference'); r.italic = True; r.font.name = FONT; r.font.size = Pt(12); r.font.color.rgb = DARK_GREY
spacer(doc, 8)
p = doc.add_paragraph(); p.alignment = WD_ALIGN_PARAGRAPH.CENTER
r = p.add_run('Version 1.0  —  March 2026  —  Internal Use Only'); r.font.name = FONT; r.font.size = Pt(10); r.font.color.rgb = MID_GREY; r.italic = True
pb(doc)

# ── TABLE OF CONTENTS ──────────────────────────────────────────────────────────
h1(doc, 'Table of Contents')
toc = [
    ('1.',   'Purpose of This Document'),
    ('2.',   'Tech Stack — Tools, Choices & Why'),
    ('3.',   'Development Environment Setup'),
    ('4.',   'Project Architecture Overview'),
    ('5.',   'Folder Structure — Every File and What It Does'),
    ('6.',   'Database Design — All Tables and Fields'),
    ('7.',   'Backend API Design — All Endpoints'),
    ('8.',   'Mobile App Screen Map & Navigation'),
    ('9.',   'Phase 1 — Step-by-Step Build Plan'),
    ('10.',  'Component Library Plan'),
    ('11.',  'Third-Party Integrations'),
    ('12.',  'Code Conventions & Standards'),
    ('13.',  'Git Workflow'),
    ('14.',  'Testing Strategy'),
    ('15.',  'Deployment Plan'),
    ('16.',  'Phases 2, 3 & 4 — Technical Overview'),
]
for num, title in toc:
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(3); p.paragraph_format.space_after = Pt(3)
    p.paragraph_format.left_indent = Inches(0.2)
    r1 = p.add_run(f'{num:<6}'); r1.bold = True; r1.font.name = FONT; r1.font.size = Pt(11); r1.font.color.rgb = GREEN
    r2 = p.add_run(title); r2.font.name = FONT; r2.font.size = Pt(11); r2.font.color.rgb = DARK_GREY
pb(doc)

# ══ 1. PURPOSE ════════════════════════════════════════════════════════════════
h1(doc, '1. Purpose of This Document')
para(doc,
     'This document is the single source of truth for building the Connex MVP. It covers '
     'every technical decision, every file that needs to be created, every API endpoint, '
     'every database table, and every build step — in the exact order they should be '
     'executed. Whether you are an AI coding assistant or a human developer, this document '
     'tells you precisely what to build, where to put it, and how it connects to everything else.')
para(doc,
     'The MVP covers Phase 1: Connex Chat (with SOS and integrated alerts), '
     'Connex Feed (with the community Alerts tab), and Connex Edu (past paper library). '
     'Phases 2 through 4 are outlined at a high level for planning purposes.')
spacer(doc)
para(doc, 'How to use this document:', bold=True, sa=4)
for b in [
    'Read Sections 1–5 fully before writing a single line of code — understanding the full picture first prevents rework',
    'Follow Section 9 (Phase 1 Build Plan) step by step — each step builds on the previous one',
    'Refer to Sections 6 and 7 for exact database tables and API endpoints as you build each feature',
    'Refer to Section 8 for the screen map whenever building a new screen',
    'Use the Excel tracker (Connex_Project_Tracker.xlsx) to mark tasks as complete as you go',
]:
    bullet(doc, b)
pb(doc)

# ══ 2. TECH STACK ════════════════════════════════════════════════════════════
h1(doc, '2. Tech Stack — Tools, Choices & Why')
para(doc,
     'Every tool in this stack was chosen for three reasons: it is free at the scale we '
     'need for MVP, it is well-documented so AI coding assistants can work with it reliably, '
     'and it is production-grade so we never need to rebuild when we scale.', sa=10)

h2(doc, '2.1  Mobile Application')
tbl(doc,
    ['Tool', 'Version', 'Purpose', 'Why Chosen'],
    [
        ['React Native',   'Latest',    'Cross-platform mobile framework',         'One codebase for iOS and Android — halves build time'],
        ['Expo',           'SDK 51+',   'Build toolchain and device APIs',         'Handles camera, notifications, fonts without native config'],
        ['TypeScript',     '5.x',       'Typed JavaScript',                        'Catches errors before runtime — essential with AI coding'],
        ['React Navigation','6.x',      'Screen routing and tab navigation',       'Industry standard, well-documented, works perfectly with Expo'],
        ['Zustand',        '4.x',       'Global state management',                 'Simpler than Redux, perfect for this app size'],
        ['Axios',          '1.x',       'HTTP requests to backend API',            'Clean syntax, interceptors for auth headers'],
        ['NativeWind',     '4.x',       'Tailwind CSS styling for React Native',   'Consistent styling system, fast to write'],
        ['Expo Notifications','Latest', 'Push notifications',                      'Handles FCM and APNs in one package via Expo'],
        ['React Native Maps','Latest',  'Maps for SOS location (Phase 2)',         'OpenStreetMap compatible — no Google Maps fees'],
        ['AsyncStorage',   'Latest',    'Local device storage',                    'Offline paper storage for Edu, cached user data'],
    ],
    widths=[1.6, 0.7, 1.8, 2.3])
spacer(doc)

h2(doc, '2.2  Backend')
tbl(doc,
    ['Tool', 'Version', 'Purpose', 'Why Chosen'],
    [
        ['Node.js',   '20 LTS', 'Backend runtime',              'JavaScript everywhere — same language as frontend'],
        ['Express',   '4.x',    'HTTP server and API routing',  'Minimal, flexible, enormous ecosystem'],
        ['TypeScript','5.x',    'Type safety on backend',       'Consistent with frontend, catches bugs early'],
        ['Supabase',  'Latest', 'PostgreSQL DB + Auth + Realtime + Storage', 'Free tier covers MVP — replaces 4 separate tools'],
        ['Redis',     '7.x',    'Session cache, rate limiting, queues', 'Redis Cloud free tier (30MB) covers MVP needs'],
        ['Zod',       '3.x',    'Request validation',           'Type-safe validation that matches TypeScript types'],
        ['JWT',       'Latest', 'Authentication tokens',        'Stateless auth — works perfectly with Supabase'],
        ['Bcrypt',    'Latest', 'Password hashing',             'Industry standard — never store plain passwords'],
        ['Multer',    'Latest', 'File upload handling',         'For profile pictures and media uploads'],
        ['node-cron', 'Latest', 'Scheduled jobs',               'Fetches EskomSePush data on schedule'],
    ],
    widths=[1.3, 0.7, 1.8, 2.6])
spacer(doc)

h2(doc, '2.3  Database & Infrastructure')
tbl(doc,
    ['Service', 'Free Tier', 'What We Use It For'],
    [
        ['Supabase (PostgreSQL)', '500MB DB, 50K MAU auth, 1GB storage, realtime', 'All structured data: users, messages, posts, alerts, papers'],
        ['Redis Cloud',           '30MB free forever',                              'Session tokens, rate limiting, notification queues'],
        ['Firebase FCM',          'Free for standard volumes',                      'Push notifications to iOS and Android devices'],
        ['EskomSePush API',       '50 free calls/day',                              'Official loadshedding schedules by suburb'],
        ['SA Weather Service',    'Free public API',                                'Official weather alerts and forecasts'],
        ['Railway',               '$5/month credit free',                           'Hosting the Node.js backend server'],
        ['Expo EAS',              'Free build credits/month',                       'Building and distributing the React Native app'],
        ['GitHub',                'Free unlimited private repos',                   'Code hosting, version control, CI/CD via Actions'],
    ],
    widths=[1.8, 2.2, 2.4])
spacer(doc)
pb(doc)

# ══ 3. DEV ENVIRONMENT SETUP ════════════════════════════════════════════════
h1(doc, '3. Development Environment Setup')
para(doc,
     'Follow these steps exactly before writing any application code. '
     'Getting the environment right first prevents hours of debugging later.', sa=10)

h2(doc, '3.1  Required Software to Install')
tbl(doc,
    ['Software', 'Where to Get It', 'Notes'],
    [
        ['Node.js 20 LTS',        'nodejs.org/en/download',           'Install the LTS version — not the Current version'],
        ['npm or Bun',            'Comes with Node / bun.sh',         'We use npm by default. Bun is faster if preferred.'],
        ['Git',                   'git-scm.com',                      'Version control — required'],
        ['VS Code',               'code.visualstudio.com',            'Recommended editor'],
        ['Expo Go (phone)',        'App Store / Google Play',          'Install on your physical phone for testing'],
        ['Postman',               'postman.com',                      'For testing API endpoints during development'],
        ['Supabase CLI',          'supabase.com/docs/guides/cli',     'For managing database locally'],
    ],
    widths=[1.6, 2.2, 2.6])
spacer(doc)

h2(doc, '3.2  VS Code Extensions to Install')
for b in [
    'ESLint — catches code errors in real time',
    'Prettier — auto-formats code on save',
    'TypeScript and JavaScript Language Features — built in, make sure it is enabled',
    'React Native Tools — debugging support',
    'GitLens — see git history inline',
    'Tailwind CSS IntelliSense — autocomplete for NativeWind classes',
    'Thunder Client — lightweight API testing inside VS Code',
]:
    bullet(doc, b)
spacer(doc)

h2(doc, '3.3  Accounts to Create (All Free)')
tbl(doc,
    ['Service', 'URL', 'What to Do'],
    [
        ['GitHub',       'github.com',           'Create account, create private repo named "connex"'],
        ['Supabase',     'supabase.com',          'Create account, create new project named "connex-dev"'],
        ['Railway',      'railway.app',           'Create account, connect to GitHub repo'],
        ['Redis Cloud',  'redis.com/try-free',    'Create account, create free 30MB database'],
        ['Firebase',     'firebase.google.com',   'Create project named "connex", enable Cloud Messaging'],
        ['EskomSePush',  'eskomsepush.com/api',   'Register for free API key (50 calls/day)'],
        ['Expo',         'expo.dev',              'Create account, install Expo Go on your phone'],
    ],
    widths=[1.3, 2.0, 3.1])
spacer(doc)

h2(doc, '3.4  Environment Variables')
para(doc,
     'Create a file called .env in the backend folder. Never commit this file to GitHub. '
     'Add .env to your .gitignore immediately.', sa=6)
for line in [
    '# Supabase',
    'SUPABASE_URL=your_supabase_project_url',
    'SUPABASE_ANON_KEY=your_supabase_anon_key',
    'SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key',
    '',
    '# Database',
    'DATABASE_URL=your_supabase_postgres_connection_string',
    '',
    '# Redis',
    'REDIS_URL=your_redis_cloud_connection_string',
    '',
    '# JWT',
    'JWT_SECRET=a_long_random_string_minimum_32_characters',
    'JWT_EXPIRES_IN=7d',
    '',
    '# Firebase',
    'FIREBASE_PROJECT_ID=your_firebase_project_id',
    'FIREBASE_PRIVATE_KEY=your_firebase_private_key',
    'FIREBASE_CLIENT_EMAIL=your_firebase_client_email',
    '',
    '# EskomSePush',
    'ESKOMSEPUSH_TOKEN=your_api_token',
    '',
    '# Server',
    'PORT=3000',
    'NODE_ENV=development',
]:
    code(doc, line)
pb(doc)

# ══ 4. ARCHITECTURE OVERVIEW ═════════════════════════════════════════════════
h1(doc, '4. Project Architecture Overview')
para(doc,
     'Connex uses a standard client-server architecture. The mobile app (React Native) '
     'communicates with the backend (Node.js) via a REST API. Real-time features like chat '
     'use Supabase Realtime directly from the mobile app. Push notifications go through '
     'Firebase Cloud Messaging via Expo.', sa=10)

h2(doc, '4.1  How the Pieces Connect')
tbl(doc,
    ['Layer', 'Technology', 'Communicates With', 'How'],
    [
        ['Mobile App',          'React Native + Expo',   'Backend API',         'HTTPS REST calls via Axios'],
        ['Mobile App',          'React Native + Expo',   'Supabase Realtime',   'WebSocket — for live chat messages'],
        ['Mobile App',          'React Native + Expo',   'Firebase FCM',        'Receives push notifications'],
        ['Backend API',         'Node.js + Express',     'Supabase DB',         'Supabase JS client / direct SQL'],
        ['Backend API',         'Node.js + Express',     'Redis',               'Session cache, rate limiting'],
        ['Backend API',         'Node.js + Express',     'EskomSePush API',     'Scheduled HTTP fetch (cron job)'],
        ['Backend API',         'Node.js + Express',     'Firebase Admin SDK',  'Sends push notifications'],
        ['Supabase',            'PostgreSQL',            'Backend + Mobile',    'SQL queries + Realtime subscriptions'],
    ],
    widths=[1.4, 1.8, 1.6, 1.8])
spacer(doc)

h2(doc, '4.2  Data Flow Examples')
h3(doc, 'Sending a Chat Message')
for b in [
    'User types message and taps Send in Connex Chat screen',
    'Mobile app writes message directly to Supabase (messages table) via Supabase JS client',
    'Supabase Realtime broadcasts the new message to all subscribers in that conversation',
    'Other user\'s app receives the message via their Realtime subscription — updates UI instantly',
    'Backend cron job (separately) sends FCM push notification if recipient app is closed',
]:
    bullet(doc, b, level=1)
spacer(doc)

h3(doc, 'Loadshedding Alert Push')
for b in [
    'Backend cron job runs every 30 minutes, calls EskomSePush API for latest schedules',
    'Backend compares new data against last stored data in database',
    'If there are changes, backend queries users whose saved suburb is affected',
    'Backend calls Firebase Admin SDK to send push notification to each affected user\'s device token',
    'User receives push notification — opens app — sees alert in Chat notifications and Feed Alerts tab',
]:
    bullet(doc, b, level=1)
spacer(doc)

h3(doc, 'Community Alert Post')
for b in [
    'User writes a post on Connex Feed and selects an alert category (e.g. Safety)',
    'Mobile app sends POST request to backend API /api/posts with category field set',
    'Backend saves post to posts table in Supabase with is_alert=true and category',
    'Backend queries users within the same area_id as the post author',
    'Backend sends push notifications to nearby users: "New Safety alert in your area"',
    'Post appears in both the regular Feed and the Alerts tab for users in that area',
]:
    bullet(doc, b, level=1)
pb(doc)

# ══ 5. FOLDER STRUCTURE ══════════════════════════════════════════════════════
h1(doc, '5. Folder Structure — Every File and What It Does')
para(doc,
     'Every folder and file in the project has a specific purpose. '
     'Nothing gets created outside of this structure without a clear reason.', sa=10)

h2(doc, '5.1  Mobile App — apps/mobile/')
tbl(doc,
    ['Path', 'File / Folder', 'Purpose'],
    [
        ['apps/mobile/',             'app.json',              'Expo app configuration — name, icon, splash screen, permissions'],
        ['apps/mobile/',             'App.tsx',               'Root component — sets up navigation and global providers'],
        ['apps/mobile/',             'package.json',          'All npm dependencies'],
        ['apps/mobile/',             'tsconfig.json',         'TypeScript configuration'],
        ['apps/mobile/',             '.env',                  'Mobile environment variables (Supabase URL, keys)'],
        ['apps/mobile/',             '.gitignore',            'Files to exclude from git (node_modules, .env, etc.)'],
        ['src/screens/auth/',        'WelcomeScreen.tsx',     'First screen new users see — Get Started / Log In buttons'],
        ['src/screens/auth/',        'RegisterScreen.tsx',    'New user registration form'],
        ['src/screens/auth/',        'LoginScreen.tsx',       'Existing user login form'],
        ['src/screens/auth/',        'OnboardingScreen.tsx',  'Profile setup after registration (name, photo, suburb, emergency contacts)'],
        ['src/screens/chat/',        'ChatListScreen.tsx',    'List of all conversations (DMs and groups)'],
        ['src/screens/chat/',        'ChatRoomScreen.tsx',    'Individual conversation — messages, media, SOS button'],
        ['src/screens/chat/',        'NewChatScreen.tsx',     'Start a new conversation or create a group'],
        ['src/screens/chat/',        'GroupInfoScreen.tsx',   'Group settings, members, admin controls'],
        ['src/screens/chat/',        'StatusScreen.tsx',      'View and post status updates'],
        ['src/screens/feed/',        'FeedScreen.tsx',        'Main social feed with Tab bar (For You / Alerts / Following)'],
        ['src/screens/feed/',        'PostDetailScreen.tsx',  'Single post with replies and reactions'],
        ['src/screens/feed/',        'NewPostScreen.tsx',     'Compose a new post — with optional alert category selector'],
        ['src/screens/feed/',        'AlertsTabScreen.tsx',   'Alerts-only tab — filtered by category and location'],
        ['src/screens/feed/',        'UserProfileScreen.tsx', 'Any user\'s public profile and posts'],
        ['src/screens/edu/',         'EduHomeScreen.tsx',     'Education home — search bar, subject grid, recent papers'],
        ['src/screens/edu/',         'SubjectScreen.tsx',     'All papers for a selected subject'],
        ['src/screens/edu/',         'PaperViewerScreen.tsx', 'PDF viewer for a single past paper'],
        ['src/screens/edu/',         'DownloadedScreen.tsx',  'Papers saved for offline use'],
        ['src/screens/sos/',         'SOSContactsScreen.tsx', 'Manage emergency contacts — send/accept requests'],
        ['src/screens/alerts/',      'AlertDetailScreen.tsx', 'Full detail view of a community alert post'],
        ['src/navigation/',          'AppNavigator.tsx',      'Root navigator — switches between Auth and Main stacks'],
        ['src/navigation/',          'AuthNavigator.tsx',     'Stack navigator for Welcome, Register, Login, Onboarding'],
        ['src/navigation/',          'MainNavigator.tsx',     'Bottom tab navigator: Chat, Feed, Edu, Profile'],
        ['src/navigation/',          'ChatNavigator.tsx',     'Stack navigator within the Chat tab'],
        ['src/navigation/',          'FeedNavigator.tsx',     'Stack navigator within the Feed tab'],
        ['src/navigation/',          'EduNavigator.tsx',      'Stack navigator within the Edu tab'],
        ['src/store/',               'authStore.ts',          'Zustand store: current user, token, login/logout actions'],
        ['src/store/',               'chatStore.ts',          'Zustand store: conversations list, unread counts'],
        ['src/store/',               'feedStore.ts',          'Zustand store: posts cache, alerts cache'],
        ['src/store/',               'eduStore.ts',           'Zustand store: downloaded papers, search history'],
        ['src/store/',               'alertStore.ts',         'Zustand store: active community alerts for user\'s area'],
        ['src/services/api/',        'client.ts',             'Axios instance with base URL and auth header interceptor'],
        ['src/services/api/',        'authApi.ts',            'register(), login(), logout(), refreshToken() calls'],
        ['src/services/api/',        'chatApi.ts',            'getConversations(), sendMessage(), createGroup() calls'],
        ['src/services/api/',        'feedApi.ts',            'getPosts(), createPost(), likePost(), getAlerts() calls'],
        ['src/services/api/',        'eduApi.ts',             'getPapers(), searchPapers(), downloadPaper() calls'],
        ['src/services/api/',        'userApi.ts',            'getProfile(), updateProfile(), searchUsers() calls'],
        ['src/services/alerts/',     'eskomService.ts',       'Fetches and caches loadshedding data for user\'s suburb'],
        ['src/services/notifications/','notificationService.ts','Registers device token, handles incoming push notifications'],
        ['src/hooks/',               'useAuth.ts',            'Auth state, login/logout helpers'],
        ['src/hooks/',               'useChat.ts',            'Supabase Realtime subscription for active conversation'],
        ['src/hooks/',               'useAlerts.ts',          'Subscribes to community alerts for user\'s area'],
        ['src/hooks/',               'useLocation.ts',        'Gets user\'s current suburb/area for alert filtering'],
        ['src/constants/',           'colors.ts',             'All app colours: NAVY, GREEN, GREY, WHITE, etc.'],
        ['src/constants/',           'fonts.ts',              'Font family names and size scale'],
        ['src/constants/',           'routes.ts',             'All screen route name constants'],
        ['src/constants/',           'config.ts',             'API base URL, Supabase URL, other env-derived constants'],
        ['src/types/',               'user.types.ts',         'User, Profile, EmergencyContact TypeScript interfaces'],
        ['src/types/',               'chat.types.ts',         'Conversation, Message, Group TypeScript interfaces'],
        ['src/types/',               'feed.types.ts',         'Post, Alert, Reaction TypeScript interfaces'],
        ['src/types/',               'edu.types.ts',          'Paper, Subject, Download TypeScript interfaces'],
        ['src/types/',               'navigation.types.ts',   'Navigation param list types for type-safe routing'],
        ['src/utils/',               'formatters.ts',         'Date formatting, text truncation, file size helpers'],
        ['src/utils/',               'validators.ts',         'Email, phone, password validation functions'],
        ['src/utils/',               'storage.ts',            'AsyncStorage read/write wrappers'],
        ['src/utils/',               'permissions.ts',        'Camera, notification, location permission request helpers'],
    ],
    widths=[2.2, 1.9, 2.3])
spacer(doc)

h2(doc, '5.2  Backend — backend/')
tbl(doc,
    ['Path', 'File / Folder', 'Purpose'],
    [
        ['backend/',              'server.ts',              'Entry point — creates Express app, connects DB, starts server'],
        ['backend/',              'package.json',           'All npm dependencies'],
        ['backend/',              'tsconfig.json',          'TypeScript configuration'],
        ['backend/',              '.env',                   'All environment variables'],
        ['backend/',              '.gitignore',             'Files excluded from git'],
        ['src/config/',           'database.ts',            'Supabase client initialisation'],
        ['src/config/',           'redis.ts',               'Redis client initialisation'],
        ['src/config/',           'firebase.ts',            'Firebase Admin SDK initialisation'],
        ['src/middleware/',       'auth.middleware.ts',     'JWT token verification — protects all private routes'],
        ['src/middleware/',       'rateLimit.middleware.ts','Redis-based rate limiting — prevents abuse'],
        ['src/middleware/',       'validate.middleware.ts', 'Zod schema validation for request bodies'],
        ['src/middleware/',       'error.middleware.ts',    'Global error handler — catches and formats all errors'],
        ['src/routes/',           'auth.routes.ts',         'POST /register, POST /login, POST /logout, POST /refresh'],
        ['src/routes/',           'user.routes.ts',         'GET /profile, PUT /profile, GET /search, POST /emergency-contacts'],
        ['src/routes/',           'chat.routes.ts',         'GET /conversations, POST /conversations, GET /messages'],
        ['src/routes/',           'feed.routes.ts',         'GET /posts, POST /posts, POST /posts/:id/like, DELETE /posts/:id'],
        ['src/routes/',           'alerts.routes.ts',       'GET /alerts, GET /loadshedding/:suburb, GET /community-alerts'],
        ['src/routes/',           'edu.routes.ts',          'GET /papers, GET /papers/search, GET /papers/:id/download'],
        ['src/routes/',           'sos.routes.ts',          'POST /sos/trigger, GET /sos/contacts, POST /sos/contacts/request'],
        ['src/controllers/',      'auth.controller.ts',     'Handles register, login, logout, token refresh logic'],
        ['src/controllers/',      'user.controller.ts',     'Handles profile get/update, user search, emergency contacts'],
        ['src/controllers/',      'chat.controller.ts',     'Handles conversation and message operations'],
        ['src/controllers/',      'feed.controller.ts',     'Handles post creation, retrieval, reactions, alerts feed'],
        ['src/controllers/',      'edu.controller.ts',      'Handles paper search, metadata, download URL generation'],
        ['src/controllers/',      'sos.controller.ts',      'Handles SOS trigger, contact management, notifications'],
        ['src/models/',           'user.model.ts',          'SQL queries for users table'],
        ['src/models/',           'message.model.ts',       'SQL queries for messages table'],
        ['src/models/',           'post.model.ts',          'SQL queries for posts and alerts tables'],
        ['src/models/',           'paper.model.ts',         'SQL queries for edu_papers table'],
        ['src/services/',         'notification.service.ts','Sends FCM push notifications via Firebase Admin'],
        ['src/services/',         'eskom.service.ts',       'Fetches EskomSePush data, stores in DB, triggers notifications'],
        ['src/services/',         'sos.service.ts',         'SOS trigger logic — finds contacts, sends alerts, logs event'],
        ['src/utils/',            'jwt.utils.ts',           'Sign, verify, and decode JWT tokens'],
        ['src/utils/',            'hash.utils.ts',          'bcrypt password hash and compare functions'],
        ['src/utils/',            'response.utils.ts',      'Standardised API response format helpers'],
    ],
    widths=[2.0, 2.0, 2.4])
pb(doc)

# ══ 6. DATABASE DESIGN ════════════════════════════════════════════════════════
h1(doc, '6. Database Design — All Tables and Fields')
para(doc,
     'All data lives in Supabase (PostgreSQL). Every table is listed below with all '
     'columns, types, and relationships. Create these tables in Supabase in the order '
     'listed — later tables reference earlier ones.', sa=10)

h2(doc, '6.1  users')
para(doc, 'Stores every registered user\'s core data.', sa=4)
tbl(doc,
    ['Column', 'Type', 'Nullable', 'Description'],
    [
        ['id',                  'UUID',        'NO',  'Primary key — auto-generated by Supabase Auth'],
        ['email',               'TEXT',        'NO',  'Unique email address — used for login'],
        ['phone',               'TEXT',        'YES', 'Optional SA phone number'],
        ['display_name',        'TEXT',        'NO',  'User\'s chosen display name'],
        ['username',            'TEXT',        'NO',  'Unique @username for the platform'],
        ['avatar_url',          'TEXT',        'YES', 'Profile picture URL — stored in Supabase Storage'],
        ['bio',                 'TEXT',        'YES', 'Short profile bio'],
        ['suburb',              'TEXT',        'YES', 'User\'s suburb — used for location-based alerts'],
        ['area_id',             'TEXT',        'YES', 'Area/region code used for alert filtering'],
        ['province',            'TEXT',        'YES', 'South African province'],
        ['device_token',        'TEXT',        'YES', 'Firebase FCM device token for push notifications'],
        ['is_verified',         'BOOLEAN',     'NO',  'Whether account is verified — default false'],
        ['is_business',         'BOOLEAN',     'NO',  'Whether this is a business account — default false'],
        ['created_at',          'TIMESTAMPTZ', 'NO',  'Account creation timestamp'],
        ['updated_at',          'TIMESTAMPTZ', 'NO',  'Last profile update timestamp'],
        ['last_seen_at',        'TIMESTAMPTZ', 'YES', 'Last time user was online'],
    ],
    widths=[1.6, 1.0, 0.7, 3.1])
spacer(doc)

h2(doc, '6.2  conversations')
para(doc, 'Each row is a chat thread — either a direct message or a group.', sa=4)
tbl(doc,
    ['Column', 'Type', 'Nullable', 'Description'],
    [
        ['id',           'UUID',        'NO',  'Primary key'],
        ['type',         'TEXT',        'NO',  '"direct" or "group"'],
        ['name',         'TEXT',        'YES', 'Group name — null for direct messages'],
        ['avatar_url',   'TEXT',        'YES', 'Group avatar — null for direct messages'],
        ['created_by',   'UUID',        'NO',  'Foreign key → users.id — who created this conversation'],
        ['created_at',   'TIMESTAMPTZ', 'NO',  'Creation timestamp'],
        ['updated_at',   'TIMESTAMPTZ', 'NO',  'Last message timestamp — used for sorting conversation list'],
    ],
    widths=[1.6, 1.0, 0.7, 3.1])
spacer(doc)

h2(doc, '6.3  conversation_members')
para(doc, 'Junction table linking users to conversations they belong to.', sa=4)
tbl(doc,
    ['Column', 'Type', 'Nullable', 'Description'],
    [
        ['id',             'UUID',        'NO',  'Primary key'],
        ['conversation_id','UUID',        'NO',  'Foreign key → conversations.id'],
        ['user_id',        'UUID',        'NO',  'Foreign key → users.id'],
        ['role',           'TEXT',        'NO',  '"member" or "admin"'],
        ['joined_at',      'TIMESTAMPTZ', 'NO',  'When the user joined this conversation'],
        ['last_read_at',   'TIMESTAMPTZ', 'YES', 'Last message timestamp this user has read — for unread counts'],
    ],
    widths=[1.6, 1.0, 0.7, 3.1])
spacer(doc)

h2(doc, '6.4  messages')
para(doc, 'Every message sent in any conversation.', sa=4)
tbl(doc,
    ['Column', 'Type', 'Nullable', 'Description'],
    [
        ['id',               'UUID',        'NO',  'Primary key'],
        ['conversation_id',  'UUID',        'NO',  'Foreign key → conversations.id'],
        ['sender_id',        'UUID',        'NO',  'Foreign key → users.id'],
        ['content',          'TEXT',        'YES', 'Message text — null if media-only message'],
        ['type',             'TEXT',        'NO',  '"text", "image", "video", "audio", "document", "sos_alert"'],
        ['media_url',        'TEXT',        'YES', 'Supabase Storage URL for media messages'],
        ['reply_to_id',      'UUID',        'YES', 'Foreign key → messages.id — for threaded replies'],
        ['is_deleted',       'BOOLEAN',     'NO',  'Soft delete — default false'],
        ['created_at',       'TIMESTAMPTZ', 'NO',  'Sent timestamp'],
    ],
    widths=[1.6, 1.0, 0.7, 3.1])
spacer(doc)

h2(doc, '6.5  sos_events')
para(doc, 'Logs every SOS button press.', sa=4)
tbl(doc,
    ['Column', 'Type', 'Nullable', 'Description'],
    [
        ['id',           'UUID',        'NO',  'Primary key'],
        ['triggered_by', 'UUID',        'NO',  'Foreign key → users.id — who pressed SOS'],
        ['latitude',     'DECIMAL',     'YES', 'Location at time of press — Phase 2'],
        ['longitude',    'DECIMAL',     'YES', 'Location at time of press — Phase 2'],
        ['status',       'TEXT',        'NO',  '"active", "resolved", "false_alarm"'],
        ['resolved_at',  'TIMESTAMPTZ', 'YES', 'When SOS was resolved'],
        ['created_at',   'TIMESTAMPTZ', 'NO',  'When SOS was triggered'],
    ],
    widths=[1.6, 1.0, 0.7, 3.1])
spacer(doc)

h2(doc, '6.6  sos_contacts')
para(doc, 'Mutual emergency contact relationships between users.', sa=4)
tbl(doc,
    ['Column', 'Type', 'Nullable', 'Description'],
    [
        ['id',           'UUID',        'NO',  'Primary key'],
        ['user_id',      'UUID',        'NO',  'Foreign key → users.id — the user who owns this contact'],
        ['contact_id',   'UUID',        'NO',  'Foreign key → users.id — the emergency contact'],
        ['status',       'TEXT',        'NO',  '"pending", "accepted", "declined"'],
        ['created_at',   'TIMESTAMPTZ', 'NO',  'Request sent timestamp'],
        ['accepted_at',  'TIMESTAMPTZ', 'YES', 'When request was accepted'],
    ],
    widths=[1.6, 1.0, 0.7, 3.1])
spacer(doc)

h2(doc, '6.7  posts')
para(doc, 'All Feed posts — regular social posts and community alert posts.', sa=4)
tbl(doc,
    ['Column', 'Type', 'Nullable', 'Description'],
    [
        ['id',           'UUID',        'NO',  'Primary key'],
        ['author_id',    'UUID',        'NO',  'Foreign key → users.id'],
        ['content',      'TEXT',        'NO',  'Post text content'],
        ['media_urls',   'TEXT[]',      'YES', 'Array of media URLs from Supabase Storage'],
        ['is_alert',     'BOOLEAN',     'NO',  'True if this post was tagged as a community alert'],
        ['alert_category','TEXT',       'YES', '"utility", "safety", "traffic", "water", "weather", "community"'],
        ['area_id',      'TEXT',        'YES', 'Area/region this alert applies to — copied from author\'s area_id'],
        ['suburb',       'TEXT',        'YES', 'Specific suburb this alert relates to'],
        ['likes_count',  'INTEGER',     'NO',  'Denormalised like count for performance — default 0'],
        ['replies_count','INTEGER',     'NO',  'Denormalised reply count — default 0'],
        ['is_deleted',   'BOOLEAN',     'NO',  'Soft delete — default false'],
        ['created_at',   'TIMESTAMPTZ', 'NO',  'Posted timestamp'],
        ['updated_at',   'TIMESTAMPTZ', 'NO',  'Last edited timestamp'],
    ],
    widths=[1.6, 1.0, 0.7, 3.1])
spacer(doc)

h2(doc, '6.8  post_reactions')
para(doc, 'Likes and reactions on posts.', sa=4)
tbl(doc,
    ['Column', 'Type', 'Nullable', 'Description'],
    [
        ['id',       'UUID',        'NO', 'Primary key'],
        ['post_id',  'UUID',        'NO', 'Foreign key → posts.id'],
        ['user_id',  'UUID',        'NO', 'Foreign key → users.id'],
        ['type',     'TEXT',        'NO', '"like", "heart", "fire", "alert" — reaction type'],
        ['created_at','TIMESTAMPTZ','NO', 'Reaction timestamp'],
    ],
    widths=[1.6, 1.0, 0.7, 3.1])
spacer(doc)

h2(doc, '6.9  follows')
para(doc, 'User follow relationships on the Feed.', sa=4)
tbl(doc,
    ['Column', 'Type', 'Nullable', 'Description'],
    [
        ['id',           'UUID',        'NO', 'Primary key'],
        ['follower_id',  'UUID',        'NO', 'Foreign key → users.id — the user who follows'],
        ['following_id', 'UUID',        'NO', 'Foreign key → users.id — the user being followed'],
        ['created_at',   'TIMESTAMPTZ', 'NO', 'Follow timestamp'],
    ],
    widths=[1.6, 1.0, 0.7, 3.1])
spacer(doc)

h2(doc, '6.10  loadshedding_schedules')
para(doc, 'Cached loadshedding data fetched from EskomSePush API.', sa=4)
tbl(doc,
    ['Column', 'Type', 'Nullable', 'Description'],
    [
        ['id',          'UUID',        'NO',  'Primary key'],
        ['suburb_name', 'TEXT',        'NO',  'Suburb name as returned by EskomSePush'],
        ['area_id',     'TEXT',        'NO',  'EskomSePush area ID'],
        ['stage',       'INTEGER',     'NO',  'Loadshedding stage number'],
        ['start_time',  'TIMESTAMPTZ', 'NO',  'Schedule start time'],
        ['end_time',    'TIMESTAMPTZ', 'NO',  'Schedule end time'],
        ['source',      'TEXT',        'NO',  '"eskomsepush" — data source'],
        ['fetched_at',  'TIMESTAMPTZ', 'NO',  'When this data was fetched from the API'],
    ],
    widths=[1.6, 1.0, 0.7, 3.1])
spacer(doc)

h2(doc, '6.11  edu_papers')
para(doc, 'Metadata for all DBE past papers. Actual PDFs stored in Supabase Storage.', sa=4)
tbl(doc,
    ['Column', 'Type', 'Nullable', 'Description'],
    [
        ['id',           'UUID',    'NO',  'Primary key'],
        ['subject',      'TEXT',    'NO',  'Subject name e.g. "Mathematics", "English Home Language"'],
        ['grade',        'INTEGER', 'NO',  'Grade number: 10, 11, or 12'],
        ['year',         'INTEGER', 'NO',  'Exam year e.g. 2023'],
        ['term',         'TEXT',    'NO',  '"June" or "November" or "Supplementary"'],
        ['paper_number', 'INTEGER', 'YES', '1 or 2 or 3 — some subjects have multiple papers'],
        ['language',     'TEXT',    'NO',  '"English" or "Afrikaans"'],
        ['type',         'TEXT',    'NO',  '"question_paper" or "memo"'],
        ['storage_path', 'TEXT',    'NO',  'Path in Supabase Storage bucket'],
        ['file_size_kb', 'INTEGER', 'YES', 'File size in kilobytes'],
        ['created_at',   'TIMESTAMPTZ','NO','When this record was added to the database'],
    ],
    widths=[1.6, 1.0, 0.7, 3.1])
pb(doc)

# ══ 7. API DESIGN ════════════════════════════════════════════════════════════
h1(doc, '7. Backend API Design — All Endpoints')
para(doc,
     'All endpoints use the base URL: https://your-railway-app.railway.app/api\n'
     'All protected endpoints require an Authorization: Bearer <token> header.\n'
     'All responses follow the format: { success: boolean, data: any, message: string }', sa=10)

h2(doc, '7.1  Authentication — /api/auth')
tbl(doc,
    ['Method', 'Endpoint', 'Auth', 'Description', 'Request Body'],
    [
        ['POST', '/auth/register',       'None',      'Register new user',          'email, password, display_name, username'],
        ['POST', '/auth/login',          'None',      'Login existing user',        'email, password'],
        ['POST', '/auth/logout',         'Required',  'Logout and revoke token',    'none'],
        ['POST', '/auth/refresh',        'None',      'Get new access token',       'refresh_token'],
        ['POST', '/auth/device-token',   'Required',  'Save FCM device token',      'device_token'],
    ],
    widths=[0.6, 1.6, 0.7, 1.8, 1.7])
spacer(doc)

h2(doc, '7.2  Users — /api/users')
tbl(doc,
    ['Method', 'Endpoint', 'Auth', 'Description', 'Key Params'],
    [
        ['GET',  '/users/me',                  'Required', 'Get own profile',                 'none'],
        ['PUT',  '/users/me',                  'Required', 'Update own profile',              'display_name, bio, suburb, area_id, avatar_url'],
        ['GET',  '/users/:id',                 'Required', 'Get any user\'s public profile',  'id in URL'],
        ['GET',  '/users/search',              'Required', 'Search users by name/username',   'q query param'],
        ['POST', '/users/sos-contacts',        'Required', 'Send SOS contact request',        'contact_id'],
        ['PUT',  '/users/sos-contacts/:id',    'Required', 'Accept or decline SOS request',   'status: "accepted" or "declined"'],
        ['GET',  '/users/sos-contacts',        'Required', 'Get own SOS contact list',        'none'],
        ['DELETE','/users/sos-contacts/:id',   'Required', 'Remove an SOS contact',           'id in URL'],
    ],
    widths=[0.7, 1.9, 0.7, 1.7, 1.4])
spacer(doc)

h2(doc, '7.3  Chat — /api/chat')
tbl(doc,
    ['Method', 'Endpoint', 'Auth', 'Description', 'Key Params'],
    [
        ['GET',  '/chat/conversations',           'Required', 'Get all conversations for user',         'none'],
        ['POST', '/chat/conversations',           'Required', 'Create DM or group conversation',       'type, members[], name (group only)'],
        ['GET',  '/chat/conversations/:id',       'Required', 'Get single conversation details',        'id in URL'],
        ['GET',  '/chat/conversations/:id/messages','Required','Get messages in a conversation',        'limit, before (cursor pagination)'],
        ['POST', '/chat/conversations/:id/members','Required', 'Add member to group',                  'user_id'],
        ['DELETE','/chat/conversations/:id/members/:uid','Required','Remove member from group',         'ids in URL'],
    ],
    widths=[0.7, 2.4, 0.7, 1.5, 1.1])
spacer(doc)

h2(doc, '7.4  Feed — /api/feed')
tbl(doc,
    ['Method', 'Endpoint', 'Auth', 'Description', 'Key Params'],
    [
        ['GET',  '/feed/posts',         'Required', 'Get feed posts (paginated)',              'limit, before, type: "for_you" or "following"'],
        ['POST', '/feed/posts',         'Required', 'Create new post',                        'content, media_urls[], is_alert, alert_category, suburb'],
        ['GET',  '/feed/posts/:id',     'Required', 'Get single post with replies',           'id in URL'],
        ['DELETE','/feed/posts/:id',    'Required', 'Delete own post',                        'id in URL'],
        ['POST', '/feed/posts/:id/like','Required', 'Like or unlike a post',                  'type: reaction type'],
        ['POST', '/feed/posts/:id/reply','Required','Reply to a post',                        'content'],
        ['GET',  '/feed/alerts',        'Required', 'Get community alerts for user\'s area',  'category (optional filter), suburb'],
        ['POST', '/feed/follow/:id',    'Required', 'Follow a user',                          'id in URL'],
        ['DELETE','/feed/follow/:id',   'Required', 'Unfollow a user',                        'id in URL'],
    ],
    widths=[0.7, 1.7, 0.7, 1.7, 1.6])
spacer(doc)

h2(doc, '7.5  Alerts — /api/alerts')
tbl(doc,
    ['Method', 'Endpoint', 'Auth', 'Description', 'Key Params'],
    [
        ['GET', '/alerts/loadshedding',          'Required', 'Get loadshedding schedule for user\'s suburb', 'suburb query param'],
        ['GET', '/alerts/loadshedding/:area_id', 'Required', 'Get schedule by EskomSePush area ID',          'area_id in URL'],
        ['GET', '/alerts/community',             'Required', 'Get all community alerts for an area',         'area_id, category'],
        ['GET', '/alerts/categories',            'None',     'Get list of alert categories',                 'none'],
    ],
    widths=[0.7, 2.2, 0.7, 1.7, 1.1])
spacer(doc)

h2(doc, '7.6  Education — /api/edu')
tbl(doc,
    ['Method', 'Endpoint', 'Auth', 'Description', 'Key Params'],
    [
        ['GET', '/edu/papers',          'Required', 'Get all papers (filterable)',    'subject, grade, year, term, language'],
        ['GET', '/edu/papers/search',   'Required', 'Search papers by keyword',      'q query param'],
        ['GET', '/edu/papers/:id',      'Required', 'Get single paper metadata',     'id in URL'],
        ['GET', '/edu/papers/:id/url',  'Required', 'Get signed download URL',       'id in URL — URL expires in 1 hour'],
        ['GET', '/edu/subjects',        'None',     'Get list of all subjects',       'grade (optional filter)'],
    ],
    widths=[0.7, 1.8, 0.7, 1.8, 1.4])
spacer(doc)

h2(doc, '7.7  SOS — /api/sos')
tbl(doc,
    ['Method', 'Endpoint', 'Auth', 'Description', 'Key Params'],
    [
        ['POST', '/sos/trigger',    'Required', 'Trigger SOS — notifies all accepted contacts', 'latitude, longitude (Phase 2 — optional now)'],
        ['POST', '/sos/resolve',    'Required', 'Resolve an active SOS event',                  'sos_event_id, status'],
        ['GET',  '/sos/history',    'Required', 'Get own SOS event history',                    'none'],
    ],
    widths=[0.7, 1.5, 0.7, 2.2, 1.3])
pb(doc)

# ══ 8. SCREEN MAP & NAVIGATION ════════════════════════════════════════════════
h1(doc, '8. Mobile App Screen Map & Navigation')
para(doc,
     'This section maps every screen in the app, which navigator it lives in, '
     'and what it connects to. Follow this map exactly when building navigation.', sa=10)

h2(doc, '8.1  Navigation Structure')
para(doc, 'The app has two top-level stacks that swap based on auth state:', sa=6)
for b in [
    'AUTH STACK — shown when user is not logged in: Welcome → Register / Login → Onboarding',
    'MAIN STACK — shown when user is logged in: Bottom Tab Navigator with Chat, Feed, Edu, Profile tabs',
]:
    bullet(doc, b)
spacer(doc)

h2(doc, '8.2  Full Screen Inventory')
tbl(doc,
    ['Screen', 'Navigator', 'Route Name', 'Navigates To'],
    [
        ['WelcomeScreen',      'AuthNavigator',  'Welcome',       'RegisterScreen, LoginScreen'],
        ['RegisterScreen',     'AuthNavigator',  'Register',      'OnboardingScreen'],
        ['LoginScreen',        'AuthNavigator',  'Login',         'Main app (on success)'],
        ['OnboardingScreen',   'AuthNavigator',  'Onboarding',    'Main app (on complete)'],
        ['ChatListScreen',     'ChatNavigator',  'ChatList',      'ChatRoomScreen, NewChatScreen'],
        ['ChatRoomScreen',     'ChatNavigator',  'ChatRoom',      'GroupInfoScreen, UserProfileScreen'],
        ['NewChatScreen',      'ChatNavigator',  'NewChat',       'ChatRoomScreen'],
        ['GroupInfoScreen',    'ChatNavigator',  'GroupInfo',     'UserProfileScreen'],
        ['StatusScreen',       'ChatNavigator',  'Status',        'ChatRoomScreen'],
        ['SOSContactsScreen',  'ChatNavigator',  'SOSContacts',   'UserProfileScreen'],
        ['FeedScreen',         'FeedNavigator',  'Feed',          'PostDetailScreen, NewPostScreen, AlertDetailScreen, UserProfileScreen'],
        ['PostDetailScreen',   'FeedNavigator',  'PostDetail',    'UserProfileScreen, NewPostScreen (reply)'],
        ['NewPostScreen',      'FeedNavigator',  'NewPost',       'Feed (on submit)'],
        ['AlertDetailScreen',  'FeedNavigator',  'AlertDetail',   'UserProfileScreen, PostDetailScreen'],
        ['UserProfileScreen',  'FeedNavigator',  'UserProfile',   'ChatRoomScreen, PostDetailScreen'],
        ['EduHomeScreen',      'EduNavigator',   'EduHome',       'SubjectScreen, PaperViewerScreen, DownloadedScreen'],
        ['SubjectScreen',      'EduNavigator',   'Subject',       'PaperViewerScreen'],
        ['PaperViewerScreen',  'EduNavigator',   'PaperViewer',   'Back'],
        ['DownloadedScreen',   'EduNavigator',   'Downloaded',    'PaperViewerScreen'],
        ['ProfileScreen',      'ProfileNavigator','Profile',      'EditProfileScreen, SOSContactsScreen'],
        ['EditProfileScreen',  'ProfileNavigator','EditProfile',  'ProfileScreen (on save)'],
        ['SettingsScreen',     'ProfileNavigator','Settings',     'Profile (on back)'],
    ],
    widths=[1.8, 1.4, 1.3, 2.1])
pb(doc)

# ══ 9. PHASE 1 BUILD PLAN ════════════════════════════════════════════════════
h1(doc, '9. Phase 1 — Step-by-Step Build Plan')
para(doc,
     'Follow these steps in order. Each step must be complete and tested before '
     'moving to the next. Do not skip ahead.', sa=10)

steps = [
    ('Step 1', 'Project Initialisation', [
        ('What to build',
         'Create the Expo React Native project and Node.js backend project from scratch. '
         'Set up TypeScript, folder structure, and base configuration for both.'),
        ('Mobile commands',
         'npx create-expo-app apps/mobile --template expo-template-blank-typescript'),
        ('Backend commands',
         'mkdir backend && cd backend && npm init -y && npm install typescript ts-node express'),
        ('Install mobile dependencies',
         'cd apps/mobile && npx expo install react-navigation react-native-screens '
         'react-native-safe-area-context zustand axios @supabase/supabase-js nativewind'),
        ('Install backend dependencies',
         'npm install express cors helmet zod bcrypt jsonwebtoken @supabase/supabase-js '
         'ioredis firebase-admin node-cron multer && npm install -D typescript @types/node @types/express'),
        ('Create .env files',
         'Create backend/.env with all variables from Section 3.4. Create apps/mobile/.env with SUPABASE_URL and SUPABASE_ANON_KEY.'),
        ('Set up folder structure',
         'Create all folders from Section 5 — empty for now but named correctly.'),
        ('Commit',
         'git init && git add . && git commit -m "chore: initial project setup"'),
    ]),
    ('Step 2', 'Database Setup (Supabase)', [
        ('What to build',
         'Create all database tables in Supabase in the order listed in Section 6. '
         'Set up Row Level Security (RLS) policies so users can only access their own data.'),
        ('Create tables in order',
         '1. users → 2. conversations → 3. conversation_members → 4. messages → '
         '5. sos_events → 6. sos_contacts → 7. posts → 8. post_reactions → '
         '9. follows → 10. loadshedding_schedules → 11. edu_papers'),
        ('Enable Realtime',
         'In Supabase dashboard → Database → Replication → Enable realtime for: messages, posts'),
        ('Enable Row Level Security',
         'For every table: enable RLS, then add policies. Example for messages: '
         '"Users can only read messages in conversations they are a member of"'),
        ('Create Storage buckets',
         'avatars (public), chat-media (private), edu-papers (private)'),
        ('Save credentials',
         'Copy Supabase URL and anon key to apps/mobile/.env and backend/.env'),
    ]),
    ('Step 3', 'Backend Server Setup', [
        ('What to build',
         'Get the Node.js backend running with a working health check endpoint, '
         'database connection, Redis connection, and all middleware in place.'),
        ('Files to create first',
         'backend/server.ts, src/config/database.ts, src/config/redis.ts, '
         'src/middleware/error.middleware.ts, src/utils/response.utils.ts'),
        ('Test',
         'Run npm run dev. Hit GET /api/health — should return { success: true, message: "Connex API running" }'),
        ('Deploy to Railway',
         'Connect GitHub repo to Railway. Set all .env variables in Railway dashboard. Deploy.'),
    ]),
    ('Step 4', 'Authentication', [
        ('What to build',
         'Full register → login → token refresh flow. '
         'Users can create an account, log in, and receive a JWT token that protects all other routes.'),
        ('Backend files',
         'src/routes/auth.routes.ts, src/controllers/auth.controller.ts, '
         'src/middleware/auth.middleware.ts, src/utils/jwt.utils.ts, src/utils/hash.utils.ts, src/models/user.model.ts'),
        ('Mobile files',
         'src/screens/auth/WelcomeScreen.tsx, RegisterScreen.tsx, LoginScreen.tsx, '
         'src/store/authStore.ts, src/services/api/client.ts, src/services/api/authApi.ts, '
         'src/navigation/AuthNavigator.tsx, src/navigation/AppNavigator.tsx'),
        ('Build order',
         '1. Backend auth endpoints → 2. Test with Postman → 3. Build mobile auth screens → 4. Connect screens to API'),
        ('Test',
         'Register a new user via Postman. Log in. Use returned token to hit a protected route. Confirm it works.'),
    ]),
    ('Step 5', 'Onboarding & Profile', [
        ('What to build',
         'After registration, users set their display name, profile picture, suburb, '
         'and area (for alert targeting). This data is critical — alerts will not work without suburb/area.'),
        ('Backend files',
         'src/routes/user.routes.ts, src/controllers/user.controller.ts'),
        ('Mobile files',
         'src/screens/auth/OnboardingScreen.tsx, src/screens/ProfileScreen.tsx, '
         'src/screens/EditProfileScreen.tsx, src/utils/permissions.ts (camera)'),
        ('Key functionality',
         'Profile picture upload to Supabase Storage avatars bucket. Suburb input with autocomplete. Area_id selection.'),
    ]),
    ('Step 6', 'Connex Chat — Core Messaging', [
        ('What to build',
         'Full real-time chat. Users can start conversations, send messages, '
         'and receive messages in real time via Supabase Realtime.'),
        ('Backend files',
         'src/routes/chat.routes.ts, src/controllers/chat.controller.ts, src/models/message.model.ts'),
        ('Mobile files',
         'src/screens/chat/ChatListScreen.tsx, ChatRoomScreen.tsx, NewChatScreen.tsx, '
         'src/components/chat/MessageBubble.tsx, MessageInput.tsx, ConversationItem.tsx, '
         'src/hooks/useChat.ts, src/store/chatStore.ts, src/services/api/chatApi.ts, '
         'src/navigation/ChatNavigator.tsx'),
        ('Realtime setup',
         'In useChat.ts: subscribe to Supabase channel for the conversation_id. '
         'On new message event → append to local state. On unmount → unsubscribe.'),
        ('Build order',
         '1. Chat list screen with dummy data → 2. Chat room screen with static messages → '
         '3. Wire up Supabase Realtime → 4. Message sending → 5. New conversation flow → '
         '6. Group conversations'),
        ('Test',
         'Open app on two devices/simulators. Send message from device 1. Confirm it appears on device 2 in real time.'),
    ]),
    ('Step 7', 'SOS Button (Phase 1)', [
        ('What to build',
         'SOS button in the ChatRoomScreen header. Press-and-hold triggers it. '
         'Sends immediate push notifications to all accepted SOS contacts.'),
        ('Backend files',
         'src/routes/sos.routes.ts, src/controllers/sos.controller.ts, '
         'src/services/sos.service.ts, src/config/firebase.ts, src/services/notification.service.ts'),
        ('Mobile files',
         'src/components/chat/SOSButton.tsx (press-and-hold component), '
         'src/screens/sos/SOSContactsScreen.tsx, src/services/api/userApi.ts (SOS contact endpoints)'),
        ('SOS flow',
         '1. User presses and holds SOS button for 3 seconds → 2. Confirmation modal appears → '
         '3. User confirms → 4. POST /api/sos/trigger → 5. Backend finds accepted SOS contacts → '
         '6. Backend sends FCM push to each contact → 7. Contact receives "EMERGENCY: [Name] has triggered SOS"'),
        ('Test',
         'Trigger SOS from one account. Confirm notification arrives on the emergency contact\'s device within 5 seconds.'),
    ]),
    ('Step 8', 'Alert Notifications (Loadshedding)', [
        ('What to build',
         'Backend cron job that fetches EskomSePush data every 30 minutes, '
         'finds users in affected suburbs, and sends push notifications.'),
        ('Backend files',
         'src/services/eskom.service.ts, src/routes/alerts.routes.ts, src/controllers/alerts.controller.ts'),
        ('Mobile files',
         'src/services/notifications/notificationService.ts (register device token on login), '
         'src/hooks/useAlerts.ts, src/services/alerts/eskomService.ts'),
        ('Cron job logic',
         '1. Every 30 minutes: fetch latest schedules from EskomSePush API → '
         '2. Compare with last stored data → '
         '3. For any new/changed schedules: find users where suburb matches → '
         '4. Send FCM push notification to each affected user\'s device_token'),
        ('Test',
         'Manually call the eskom service function. Confirm loadshedding data is stored in the database. '
         'Confirm a test push notification is received on the device.'),
    ]),
    ('Step 9', 'Connex Feed — Core Social', [
        ('What to build',
         'The main social feed. Users can create posts, see posts from people they follow '
         'and from their area, like and reply to posts.'),
        ('Backend files',
         'src/routes/feed.routes.ts, src/controllers/feed.controller.ts, src/models/post.model.ts'),
        ('Mobile files',
         'src/screens/feed/FeedScreen.tsx, PostDetailScreen.tsx, NewPostScreen.tsx, '
         'src/components/feed/PostCard.tsx, PostComposer.tsx, ReactionBar.tsx, '
         'src/store/feedStore.ts, src/services/api/feedApi.ts, src/navigation/FeedNavigator.tsx'),
        ('Build order',
         '1. Feed screen with static posts → 2. Post card component → 3. Wire up GET /feed/posts → '
         '4. Post creation → 5. Like/reaction → 6. Reply thread → 7. User profile screen → 8. Follow/unfollow'),
    ]),
    ('Step 10', 'Alerts Tab & Community Self-Tagging', [
        ('What to build',
         'The Alerts tab within the Feed. The alert category selector in NewPostScreen. '
         'Location-aware filtering so users only see alerts for their area.'),
        ('Backend changes',
         'Update POST /feed/posts to handle is_alert, alert_category, suburb fields. '
         'Create GET /feed/alerts endpoint that filters posts where is_alert=true for the user\'s area_id. '
         'When a new alert post is created: trigger push notifications to users in that area_id.'),
        ('Mobile files',
         'Update FeedScreen.tsx to add tab bar: For You / Alerts / Following. '
         'Update NewPostScreen.tsx to add alert category selector (only shown optionally). '
         'src/screens/feed/AlertsTabScreen.tsx, src/screens/alerts/AlertDetailScreen.tsx'),
        ('Alert category selector',
         'In NewPostScreen: add a toggle "Tag as Community Alert". If toggled on, show a '
         'category picker: Utility / Safety / Traffic / Water / Weather / Community. '
         'Selected category is sent with the post.'),
        ('Test',
         'Post a safety alert. Confirm it appears in the Alerts tab. Confirm a push notification '
         'is sent to another user in the same area_id.'),
    ]),
    ('Step 11', 'Connex Edu — Past Papers', [
        ('What to build',
         'The education screen with full past paper library, search, PDF viewer, and offline download.'),
        ('Database',
         'Populate edu_papers table with metadata for all available DBE papers. '
         'Upload PDFs to Supabase Storage edu-papers bucket.'),
        ('Backend files',
         'src/routes/edu.routes.ts, src/controllers/edu.controller.ts, src/models/paper.model.ts'),
        ('Mobile files',
         'src/screens/edu/EduHomeScreen.tsx, SubjectScreen.tsx, PaperViewerScreen.tsx, DownloadedScreen.tsx, '
         'src/components/edu/SubjectCard.tsx, PaperItem.tsx, '
         'src/store/eduStore.ts, src/services/api/eduApi.ts, src/navigation/EduNavigator.tsx'),
        ('PDF viewer',
         'Use expo-file-system for downloads and expo-document-picker or a WebView to display PDFs. '
         'Downloaded papers stored in device filesystem via AsyncStorage paths.'),
        ('Build order',
         '1. Edu home with subject grid → 2. Subject screen with paper list → '
         '3. Paper viewer (online) → 4. Download to device → 5. Downloaded papers screen → 6. Search'),
    ]),
    ('Step 12', 'Push Notifications Setup', [
        ('What to build',
         'Device token registration on login, background notification handling, '
         'and notification tap routing (tapping a notification opens the right screen).'),
        ('Mobile files',
         'Update src/services/notifications/notificationService.ts — register token on login, '
         'set up notification listeners, handle foreground and background notifications.'),
        ('Notification routing',
         'chat_message → open ChatRoomScreen for that conversation_id. '
         'sos_alert → open SOSContactsScreen. '
         'loadshedding → open AlertsTabScreen filtered to Utility. '
         'community_alert → open AlertDetailScreen for that post_id.'),
    ]),
    ('Step 13', 'Status Updates', [
        ('What to build',
         'WhatsApp-style status — users post a photo or text that disappears after 24 hours. '
         'Visible to contacts only.'),
        ('Files',
         'src/screens/chat/StatusScreen.tsx, src/components/chat/StatusRing.tsx (circle around avatar), '
         'Backend: add statuses table — id, user_id, media_url, content, expires_at, created_at'),
    ]),
    ('Step 14', 'Polish, Testing & Alpha Prep', [
        ('What to do',
         'Fix all known bugs. Test every flow end to end on both iOS and Android. '
         'Check performance — smooth scroll in chat and feed, fast paper search. '
         'Add loading states and error states to every screen that makes an API call.'),
        ('Error states required',
         'No internet connection screen, Empty state for feed (no posts yet), '
         'Empty state for chat (no conversations), Error state for failed API calls with retry button'),
        ('Alpha build',
         'Run npx eas build --platform all --profile preview in apps/mobile. '
         'Distribute via Expo Go or TestFlight/Firebase App Distribution to initial test users.'),
    ]),
]

for step_num, step_title, items in steps:
    h2(doc, f'{step_num}: {step_title}')
    for label, text in items:
        labeled(doc, label, text)
    spacer(doc)

pb(doc)

# ══ 10. COMPONENT LIBRARY ════════════════════════════════════════════════════
h1(doc, '10. Component Library Plan')
para(doc,
     'These are the reusable components that will be used across multiple screens. '
     'Build the shared ones first — they save time everywhere else.', sa=10)

h2(doc, '10.1  Shared Components — src/components/shared/')
tbl(doc,
    ['Component', 'File', 'Used In', 'Description'],
    [
        ['Avatar',          'Avatar.tsx',          'Everywhere',          'User profile picture with fallback initials'],
        ['Button',          'Button.tsx',          'All forms',           'Primary, secondary, danger button variants'],
        ['Input',           'Input.tsx',           'All forms',           'Text input with label, error state, icon support'],
        ['LoadingSpinner',  'LoadingSpinner.tsx',  'All screens',         'Full-screen and inline loading states'],
        ['ErrorState',      'ErrorState.tsx',      'All screens',         'Error message with retry button'],
        ['EmptyState',      'EmptyState.tsx',      'List screens',        'Illustration and message for empty lists'],
        ['Modal',           'Modal.tsx',           'SOS, confirmations',  'Reusable bottom sheet modal'],
        ['Badge',           'Badge.tsx',           'Chat, alerts',        'Unread count badge, alert category badge'],
        ['Divider',         'Divider.tsx',         'Lists',               'Thin horizontal divider line'],
        ['SafeScreen',      'SafeScreen.tsx',      'All screens',         'Wrapper with SafeAreaView and keyboard handling'],
    ],
    widths=[1.4, 1.5, 1.4, 2.3])
spacer(doc)

h2(doc, '10.2  Chat Components — src/components/chat/')
tbl(doc,
    ['Component', 'File', 'Description'],
    [
        ['MessageBubble',    'MessageBubble.tsx',   'Individual message — sent (right, green) and received (left, grey) variants'],
        ['MessageInput',     'MessageInput.tsx',    'Text input bar at bottom of chat — with send, attachment, and voice note buttons'],
        ['ConversationItem', 'ConversationItem.tsx','Row in conversation list — avatar, name, last message preview, unread count'],
        ['SOSButton',        'SOSButton.tsx',       'Press-and-hold SOS button — shows countdown, triggers SOS on hold complete'],
        ['StatusRing',       'StatusRing.tsx',      'Coloured ring around avatar indicating an active status update'],
        ['TypingIndicator',  'TypingIndicator.tsx', 'Animated dots showing "Name is typing..."'],
    ],
    widths=[1.6, 1.8, 3.0])
spacer(doc)

h2(doc, '10.3  Feed Components — src/components/feed/')
tbl(doc,
    ['Component', 'File', 'Description'],
    [
        ['PostCard',        'PostCard.tsx',        'Full post with avatar, name, content, media, reaction bar, reply count'],
        ['AlertBadge',      'AlertBadge.tsx',      'Coloured category label on alert posts: ⚡ Utility, 🚨 Safety, etc.'],
        ['ReactionBar',     'ReactionBar.tsx',     'Like, reply, reshare buttons row at bottom of each post'],
        ['PostComposer',    'PostComposer.tsx',    'Compact new-post input on feed screen with camera and alert tag buttons'],
        ['AlertCategoryPicker','AlertCategoryPicker.tsx','Category selector shown in NewPostScreen when alert toggle is on'],
        ['TrendingItem',    'TrendingItem.tsx',    'Row in trending topics list'],
    ],
    widths=[1.8, 1.8, 2.8])
spacer(doc)

h2(doc, '10.4  Edu Components — src/components/edu/')
tbl(doc,
    ['Component', 'File', 'Description'],
    [
        ['SubjectCard',    'SubjectCard.tsx',   'Grid card for each subject on the Edu home screen'],
        ['PaperItem',      'PaperItem.tsx',     'Row in paper list — subject, year, paper number, download button, offline indicator'],
        ['SearchBar',      'SearchBar.tsx',     'Edu-specific search bar with filter chips (grade, year)'],
        ['DownloadButton', 'DownloadButton.tsx','Download/downloaded state button — shows progress, confirms when done'],
    ],
    widths=[1.6, 1.8, 3.0])
pb(doc)

# ══ 11. THIRD-PARTY INTEGRATIONS ═════════════════════════════════════════════
h1(doc, '11. Third-Party Integrations')
tbl(doc,
    ['Service', 'Where Integrated', 'Files', 'Setup Steps'],
    [
        ['Supabase Auth',
         'Backend + Mobile',
         'backend/src/config/database.ts\napps/mobile/src/services/api/client.ts',
         '1. Create project in Supabase dashboard\n2. Copy URL and keys to .env files\n3. Initialise client in both backend and mobile'],
        ['Supabase Realtime',
         'Mobile only',
         'apps/mobile/src/hooks/useChat.ts',
         '1. Enable realtime on messages table in Supabase dashboard\n2. Subscribe to channel in useChat hook\n3. Unsubscribe on unmount'],
        ['Supabase Storage',
         'Backend + Mobile',
         'backend/src/controllers/user.controller.ts\nmobile/src/utils/storage.ts',
         '1. Create buckets: avatars, chat-media, edu-papers\n2. Set bucket policies (avatars=public, others=private)\n3. Upload via Supabase client'],
        ['Firebase FCM',
         'Backend sends, Mobile receives',
         'backend/src/config/firebase.ts\nbackend/src/services/notification.service.ts\nmobile/src/services/notifications/notificationService.ts',
         '1. Create Firebase project\n2. Add Android and iOS apps in Firebase console\n3. Download google-services.json (Android) and GoogleService-Info.plist (iOS)\n4. Install Firebase Admin SDK on backend\n5. Use Expo Notifications on mobile'],
        ['EskomSePush API',
         'Backend only',
         'backend/src/services/eskom.service.ts',
         '1. Register at eskomsepush.com for free API token\n2. Add token to backend .env\n3. Call GET https://developer.sepush.co.za/business/2.0/area?id={area_id}\n4. Set up cron job to call every 30 minutes'],
        ['Redis Cloud',
         'Backend only',
         'backend/src/config/redis.ts\nbackend/src/middleware/rateLimit.middleware.ts',
         '1. Create free instance at redis.com\n2. Copy connection string to .env\n3. Use for session cache and rate limiting'],
        ['SA Weather Service',
         'Backend only',
         'backend/src/services/weather.service.ts',
         '1. Register at weathersa.co.za for API access\n2. Fetch warnings on schedule\n3. Store in DB and push to affected users'],
        ['Expo EAS Build',
         'Mobile build pipeline',
         'apps/mobile/eas.json',
         '1. Install EAS CLI: npm install -g eas-cli\n2. Run eas login\n3. Run eas build:configure\n4. Build: eas build --platform all --profile preview'],
    ],
    widths=[1.3, 1.4, 1.8, 2.0])
pb(doc)

# ══ 12. CODE CONVENTIONS ═════════════════════════════════════════════════════
h1(doc, '12. Code Conventions & Standards')
para(doc,
     'Every file in this project follows these conventions. Consistent code means '
     'AI coding assistants produce consistent results and human developers can '
     'read each other\'s work without confusion.', sa=10)

h2(doc, '12.1  File & Folder Naming')
for b in [
    'React Native screen files: PascalCase ending in Screen — e.g. ChatRoomScreen.tsx',
    'React Native component files: PascalCase — e.g. MessageBubble.tsx',
    'Service files: camelCase ending in Service or Api — e.g. chatApi.ts, eskomService.ts',
    'Store files: camelCase ending in Store — e.g. authStore.ts',
    'Hook files: camelCase starting with use — e.g. useChat.ts',
    'Utility files: camelCase ending in Utils — e.g. jwt.utils.ts',
    'Type files: camelCase ending in .types — e.g. user.types.ts',
    'Route files: feature name ending in .routes — e.g. auth.routes.ts',
    'Controller files: feature name ending in .controller — e.g. auth.controller.ts',
]:
    bullet(doc, b)
spacer(doc)

h2(doc, '12.2  TypeScript Rules')
for b in [
    'No "any" types — ever. If you don\'t know the type, define an interface.',
    'All function parameters and return types must be explicitly typed',
    'Use interfaces for objects, type for unions and primitives',
    'All API response types must have a corresponding interface in the types/ folder',
    'Zod schemas on the backend must match the TypeScript types exactly',
]:
    bullet(doc, b)
spacer(doc)

h2(doc, '12.3  Component Structure')
para(doc, 'Every React Native screen component follows this structure:', sa=4)
for line in [
    '// 1. Imports',
    'import React from "react"',
    'import { View, Text } from "react-native"',
    '',
    '// 2. TypeScript interface for props',
    'interface Props { ... }',
    '',
    '// 3. Component function',
    'export const ChatRoomScreen = ({ navigation, route }: Props) => {',
    '  // 4. Hooks (useState, useEffect, custom hooks)',
    '  // 5. Event handlers',
    '  // 6. Return JSX',
    '  return ( <View>...</View> )',
    '}',
]:
    code(doc, line)
spacer(doc)

h2(doc, '12.4  API Response Format')
para(doc, 'Every backend endpoint returns this exact structure:', sa=4)
for line in [
    '// Success',
    '{ "success": true, "data": { ... }, "message": "Users retrieved" }',
    '',
    '// Error',
    '{ "success": false, "data": null, "message": "Invalid credentials", "error": "INVALID_CREDENTIALS" }',
]:
    code(doc, line)
pb(doc)

# ══ 13. GIT WORKFLOW ═════════════════════════════════════════════════════════
h1(doc, '13. Git Workflow')
para(doc,
     'Every change to the codebase goes through this workflow. '
     'No code gets committed directly to the main branch.', sa=10)

h2(doc, '13.1  Branch Naming')
tbl(doc,
    ['Type', 'Pattern', 'Example'],
    [
        ['New feature',  'feature/description',  'feature/chat-realtime'],
        ['Bug fix',      'fix/description',      'fix/sos-notification-not-sending'],
        ['Setup/config', 'chore/description',    'chore/supabase-setup'],
        ['Database',     'db/description',       'db/add-sos-events-table'],
        ['UI work',      'ui/description',       'ui/feed-alerts-tab'],
    ],
    widths=[1.2, 1.8, 2.4])
spacer(doc)

h2(doc, '13.2  Commit Message Format')
for line in [
    'feat: add SOS button press-and-hold to ChatRoomScreen',
    'fix: messages not loading after 50 in conversation',
    'chore: add EskomSePush cron job every 30 minutes',
    'db: add area_id column to users table',
    'ui: build AlertBadge component with category colours',
]:
    code(doc, line)
spacer(doc)

h2(doc, '13.3  Workflow Steps')
for b in [
    'Pull latest main: git checkout main && git pull origin main',
    'Create feature branch: git checkout -b feature/your-feature-name',
    'Write code — commit often with clear messages',
    'Before finishing: test the feature manually end to end',
    'Push branch: git push origin feature/your-feature-name',
    'Merge to main when feature is complete and tested',
    'Delete feature branch after merge',
]:
    bullet(doc, b)
pb(doc)

# ══ 14. TESTING ══════════════════════════════════════════════════════════════
h1(doc, '14. Testing Strategy')
para(doc,
     'For the MVP, testing is pragmatic. We test manually and thoroughly '
     'before each merge to main. Automated tests come after MVP launch.', sa=10)

h2(doc, '14.1  Manual Testing Checklist — Before Every Merge')
tbl(doc,
    ['Feature', 'Test Case', 'Pass Condition'],
    [
        ['Auth',          'Register new user',                  'User created in Supabase, lands on Onboarding screen'],
        ['Auth',          'Login existing user',                'JWT token returned, lands on Chat screen'],
        ['Auth',          'Login with wrong password',          'Error message shown, no token'],
        ['Chat',          'Send message in DM',                 'Message appears on both devices in under 2 seconds'],
        ['Chat',          'Create group with 3 members',        'All 3 members see the group in their chat list'],
        ['Chat',          'Send photo in chat',                 'Photo uploads and displays correctly'],
        ['SOS',           'Trigger SOS button',                 'Push notification received by emergency contact in under 5 seconds'],
        ['SOS',           'SOS contact request',               'Request received by target user, accept works, contact added'],
        ['Alerts',        'Receive loadshedding notification',  'Notification arrives, tapping it opens Alerts tab'],
        ['Feed',          'Create regular post',                'Post appears in feed, other users can see it'],
        ['Feed',          'Create alert post',                  'Post appears in Alerts tab for users in same area_id'],
        ['Feed',          'Like a post',                        'Like count increments, unlike decrements'],
        ['Feed',          'Reply to post',                      'Reply appears nested under original post'],
        ['Edu',           'Browse subjects',                    'All subjects show with correct paper counts'],
        ['Edu',           'Search for paper',                   'Correct papers returned for subject + grade + year'],
        ['Edu',           'Download paper',                     'Paper saves to device, available offline in Downloaded screen'],
        ['Offline',       'Open app with no internet',         'Downloaded papers still accessible, rest shows offline message'],
    ],
    widths=[0.8, 2.2, 2.4])
pb(doc)

# ══ 15. DEPLOYMENT ══════════════════════════════════════════════════════════
h1(doc, '15. Deployment Plan')

h2(doc, '15.1  Backend — Railway')
for b in [
    'Connect GitHub repo to Railway project',
    'Set all environment variables in Railway dashboard (same as .env file)',
    'Railway auto-deploys whenever main branch is updated',
    'Backend URL format: https://connex-api.railway.app',
    'Set this URL as API_BASE_URL in apps/mobile/.env',
]:
    bullet(doc, b)
spacer(doc)

h2(doc, '15.2  Mobile — Expo EAS')
tbl(doc,
    ['Profile', 'Command', 'Purpose', 'Distribution'],
    [
        ['development', 'eas build --profile development', 'Dev build with dev client',       'Internal only — Expo Dev Client'],
        ['preview',     'eas build --profile preview',     'Alpha/Beta testing builds',       'TestFlight (iOS) + Firebase App Distribution (Android)'],
        ['production',  'eas build --profile production',  'App Store / Play Store builds',   'Public release'],
    ],
    widths=[1.0, 2.2, 1.8, 1.8])
spacer(doc)

h2(doc, '15.3  Alpha Launch Checklist')
for b in [
    'All 14 build steps complete and tested',
    'Backend deployed to Railway and responding correctly',
    'EAS preview build generated for iOS and Android',
    'At least 10 internal test users registered and active',
    'EskomSePush cron job running and delivering notifications',
    'At least 200 DBE past papers loaded into edu_papers table',
    'Error monitoring set up (use free tier of Sentry or similar)',
    'Basic analytics tracking (Expo Analytics or Mixpanel free tier)',
    'Privacy policy and terms of service pages created (required for app stores)',
]:
    bullet(doc, b)
pb(doc)

# ══ 16. PHASES 2–4 TECHNICAL ════════════════════════════════════════════════
h1(doc, '16. Phases 2, 3 & 4 — Technical Overview')
para(doc,
     'This section is for planning visibility only. Do not build any of this '
     'during Phase 1. These phases begin after the Phase 1 launch reaches '
     'sufficient user scale and trust.', sa=10)

h2(doc, '16.1  Phase 2 — Connex Pay')
tbl(doc,
    ['Component', 'Technical Approach'],
    [
        ['Digital Wallet',          'New wallets table in Supabase. Balance stored as integer (cents) to avoid float errors.'],
        ['SA Bank Linking',         'Integration with Stitch or Peach Payments API for South African bank account linking and verification.'],
        ['P2P Transfers',           'Transactional database operation — debit sender wallet, credit receiver wallet atomically. Never split into two queries.'],
        ['Airtime Top-Up',          'Integration with FlipFlop or Moja API for airtime across all SA networks.'],
        ['QR Payments',             'Generate QR code from wallet ID. Scan to initiate payment. Confirm via PIN.'],
        ['FSCA Licensing',          'Begin application process Q4 2026. Required before public launch of Pay. Partner with licensed processor (Peach Payments) in the interim.'],
        ['KYC / AML',               'ID verification required before wallet activation. Integrate with Smile Identity or similar for SA ID verification.'],
        ['Security',                '2FA required for all transactions above R500. Biometric authentication for wallet access.'],
    ],
    widths=[1.6, 4.2])
spacer(doc)

h2(doc, '16.2  Phase 3 — Connex Clips')
tbl(doc,
    ['Component', 'Technical Approach'],
    [
        ['Video Upload',     'Upload directly to Supabase Storage or Cloudflare R2 for large files. Max file size: 100MB.'],
        ['Video Processing', 'Use FFmpeg via a Railway worker to compress and generate thumbnails after upload.'],
        ['Video Streaming',  'Serve via CDN (Cloudflare). Adaptive bitrate streaming for low-bandwidth connections.'],
        ['For You Feed',     'Recommendation algorithm based on: watched time, likes, follows, area similarity, subject tags.'],
        ['Livestreaming',    'Integrate with Agora.io (has free tier) or 100ms for real-time video streaming.'],
        ['Moderation',       'AI content moderation via Google Vision API or Amazon Rekognition before video is made public.'],
    ],
    widths=[1.6, 4.2])
spacer(doc)

h2(doc, '16.3  Phase 4 — Connex Logistics')
tbl(doc,
    ['Component', 'Technical Approach'],
    [
        ['Ride Matching',     'New tables: ride_requests, drivers, driver_locations. Matching algorithm based on proximity (PostGIS for geospatial queries).'],
        ['Live Location',     'Driver location updates every 5 seconds via WebSocket. Displayed on React Native Maps with OpenStreetMap tiles.'],
        ['Driver App',        'Separate screen stack within Connex for driver mode. Toggled from profile settings after driver registration and background check.'],
        ['Pricing Engine',    'Base fare + per-km rate + surge multiplier during peak hours. Surge calculated from demand/supply ratio by area.'],
        ['Food Delivery',     'New tables: restaurants, menus, orders, order_items. Restaurant portal (web) for menu management.'],
        ['Payment',           'All transactions processed via Connex Pay — drivers paid directly to their wallet after each completed trip/delivery.'],
        ['Background Checks', 'Driver registration requires SA ID verification (Smile Identity) + police clearance certificate upload.'],
    ],
    widths=[1.6, 4.2])

# ── BACK ───────────────────────────────────────────────────────────────────────
pb(doc)
spacer(doc, 12)
p = doc.add_paragraph(); p.alignment = WD_ALIGN_PARAGRAPH.CENTER
r = p.add_run('CONNEX — TECHNICAL DEVELOPMENT PLAN'); r.bold = True; r.font.name = FONT; r.font.size = Pt(16); r.font.color.rgb = NAVY
p = doc.add_paragraph(); p.alignment = WD_ALIGN_PARAGRAPH.CENTER
r = p.add_run('Version 1.0  —  March 2026  —  Internal Use Only'); r.italic = True; r.font.name = FONT; r.font.size = Pt(10); r.font.color.rgb = MID_GREY

OUTPUT = '/Users/vulture/Desktop/Connex/docs/technical/Connex_Technical_Development_Plan.docx'
doc.save(OUTPUT)
print(f'Saved: {OUTPUT}')
