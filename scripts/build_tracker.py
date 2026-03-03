"""
build_tracker.py — Connex Project Tracker (Excel)
Generates: docs/technical/Connex_Project_Tracker.xlsx
Sheets:
  1. Master Build Tracker
  2. Screen Inventory
  3. API Endpoints
  4. Database Schema
  5. Dependencies
  6. Phase Roadmap
  7. Integration Tracker
"""

import openpyxl
from openpyxl.styles import (
    Font, PatternFill, Alignment, Border, Side, GradientFill
)
from openpyxl.utils import get_column_letter
from openpyxl.worksheet.table import Table, TableStyleInfo

NAVY   = "0D1B2A"
GREEN  = "006B3C"
LGREY  = "F2F4F7"
WHITE  = "FFFFFF"
DGREY  = "D0D5DD"
AMBER  = "B45309"
RED    = "991B1B"
LGREEN = "D1FAE5"
LRED   = "FEE2E2"
LAMBER = "FEF3C7"
LBLUE  = "DBEAFE"
LPURP  = "EDE9FE"

OUTPUT = "/Users/vulture/Desktop/Connex/docs/technical/Connex_Project_Tracker.xlsx"

wb = openpyxl.Workbook()
wb.remove(wb.active)  # remove default sheet

# ─────────────────────────────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────────────────────────────

def make_font(bold=False, size=11, color=None, italic=False):
    return Font(name="Garamond", bold=bold, size=size,
                color=color or "000000", italic=italic)

def navy_fill():
    return PatternFill("solid", fgColor=NAVY)

def green_fill():
    return PatternFill("solid", fgColor=GREEN)

def lgrey_fill():
    return PatternFill("solid", fgColor=LGREY)

def lgreen_fill():
    return PatternFill("solid", fgColor=LGREEN)

def lred_fill():
    return PatternFill("solid", fgColor=LRED)

def lamber_fill():
    return PatternFill("solid", fgColor=LAMBER)

def lblue_fill():
    return PatternFill("solid", fgColor=LBLUE)

def lpurp_fill():
    return PatternFill("solid", fgColor=LPURP)

def thin_border():
    s = Side(style="thin", color=DGREY)
    return Border(left=s, right=s, top=s, bottom=s)

def center():
    return Alignment(horizontal="center", vertical="center", wrap_text=True)

def left():
    return Alignment(horizontal="left", vertical="center", wrap_text=True)

def write_header_row(ws, row, cols, bg=NAVY, fg=WHITE, size=11):
    for col_idx, text in enumerate(cols, 1):
        c = ws.cell(row=row, column=col_idx, value=text)
        c.font = make_font(bold=True, size=size, color=fg)
        c.fill = PatternFill("solid", fgColor=bg)
        c.alignment = center()
        c.border = thin_border()

def write_data_row(ws, row, values, fills=None, bold_col=None):
    for col_idx, val in enumerate(values, 1):
        c = ws.cell(row=row, column=col_idx, value=val)
        c.font = make_font(bold=(bold_col == col_idx))
        c.alignment = left()
        c.border = thin_border()
        if fills and col_idx <= len(fills) and fills[col_idx-1]:
            c.fill = fills[col_idx-1]
        elif row % 2 == 0:
            c.fill = lgrey_fill()

def title_row(ws, row, text, colspan, bg=NAVY, size=14):
    ws.merge_cells(start_row=row, start_column=1, end_row=row, end_column=colspan)
    c = ws.cell(row=row, column=1, value=text)
    c.font = make_font(bold=True, size=size, color=WHITE)
    c.fill = PatternFill("solid", fgColor=bg)
    c.alignment = center()

def set_col_widths(ws, widths):
    for i, w in enumerate(widths, 1):
        ws.column_dimensions[get_column_letter(i)].width = w

def freeze(ws, cell="A2"):
    ws.freeze_panes = cell

# status fills
STATUS_FILLS = {
    "Not Started": PatternFill("solid", fgColor=LGREY),
    "In Progress": lamber_fill(),
    "Done":        lgreen_fill(),
    "Blocked":     lred_fill(),
    "Testing":     lblue_fill(),
}

def status_fill(status):
    return STATUS_FILLS.get(status, lgrey_fill())

# ─────────────────────────────────────────────────────────────────
# SHEET 1 — MASTER BUILD TRACKER
# ─────────────────────────────────────────────────────────────────

ws1 = wb.create_sheet("Master Build Tracker")
ws1.sheet_view.showGridLines = False
ws1.row_dimensions[1].height = 40

title_row(ws1, 1, "CONNEX — MASTER BUILD TRACKER", 8)

headers = ["#", "Phase", "Epic", "Task", "Owner", "Priority", "Status", "Notes"]
write_header_row(ws1, 2, headers, bg=GREEN, size=10)
ws1.row_dimensions[2].height = 30
freeze(ws1, "A3")

tasks = [
    # Phase 0 — Setup
    ("0.1", "Phase 0: Setup", "Project Init", "Create Expo managed React Native project with TypeScript template", "Dev", "Critical", "Not Started", "npx create-expo-app connex --template"),
    ("0.2", "Phase 0: Setup", "Project Init", "Create Node.js + Express + TypeScript backend project", "Dev", "Critical", "Not Started", "mkdir backend && npm init"),
    ("0.3", "Phase 0: Setup", "Project Init", "Set up Supabase project — create DB, enable Auth, Realtime, Storage", "Dev", "Critical", "Not Started", "app.supabase.com"),
    ("0.4", "Phase 0: Setup", "Project Init", "Create GitHub repo, set up main/dev/feature branch strategy", "Dev", "Critical", "Not Started", "Never commit directly to main"),
    ("0.5", "Phase 0: Setup", "Dev Env", "Install VS Code extensions (ESLint, Prettier, Tailwind, GitLens)", "Dev", "High", "Not Started", "See tech doc Section 3"),
    ("0.6", "Phase 0: Setup", "Dev Env", "Configure .env files for mobile (Expo) and backend (Node)", "Dev", "Critical", "Not Started", "Never commit .env to GitHub"),
    ("0.7", "Phase 0: Setup", "Dev Env", "Set up ESLint + Prettier with project config files", "Dev", "High", "Not Started", "Consistent code style"),
    ("0.8", "Phase 0: Setup", "Infrastructure", "Create Railway account and link backend project", "Dev", "High", "Not Started", "Free tier: $5/month credit"),
    ("0.9", "Phase 0: Setup", "Infrastructure", "Create Upstash Redis instance for session caching", "Dev", "Medium", "Not Started", "Free tier sufficient for MVP"),
    ("0.10", "Phase 0: Setup", "Infrastructure", "Register Firebase project for push notifications (FCM)", "Dev", "Medium", "Not Started", "Needed for SOS + chat alerts"),
    # Phase 1 — Auth
    ("1.1", "Phase 1: Auth", "Backend", "Create users table in Supabase with all required columns", "Dev", "Critical", "Not Started", "See DB Schema sheet"),
    ("1.2", "Phase 1: Auth", "Backend", "Build POST /auth/register endpoint (phone + password)", "Dev", "Critical", "Not Started", "Hash password with bcrypt"),
    ("1.3", "Phase 1: Auth", "Backend", "Build POST /auth/login endpoint — return JWT + refresh token", "Dev", "Critical", "Not Started", "Store refresh token in Redis"),
    ("1.4", "Phase 1: Auth", "Backend", "Build POST /auth/logout — invalidate tokens", "Dev", "High", "Not Started", "Delete from Redis"),
    ("1.5", "Phase 1: Auth", "Backend", "Build GET /users/:id — fetch user profile", "Dev", "High", "Not Started", "Auth middleware required"),
    ("1.6", "Phase 1: Auth", "Backend", "Build PATCH /users/:id — update profile (name, bio, avatar)", "Dev", "High", "Not Started", "Validate with Zod"),
    ("1.7", "Phase 1: Auth", "Mobile", "Build OnboardingScreen — app intro / value prop slides", "Dev", "High", "Not Started", "3 slides: Chat, Feed, Edu"),
    ("1.8", "Phase 1: Auth", "Mobile", "Build RegisterScreen — phone, name, password fields", "Dev", "Critical", "Not Started", "Phone OTP via Supabase Auth"),
    ("1.9", "Phase 1: Auth", "Mobile", "Build LoginScreen — phone + password", "Dev", "Critical", "Not Started", ""),
    ("1.10", "Phase 1: Auth", "Mobile", "Build ProfileSetupScreen — avatar upload + bio", "Dev", "High", "Not Started", "Image upload to Supabase Storage"),
    ("1.11", "Phase 1: Auth", "Mobile", "Build ProfileScreen (view own) + EditProfileScreen", "Dev", "High", "Not Started", ""),
    ("1.12", "Phase 1: Auth", "Mobile", "Implement Zustand auth store (token, user, isLoggedIn)", "Dev", "Critical", "Not Started", "Persisted with AsyncStorage"),
    # Phase 1 — Chat
    ("2.1", "Phase 1: Chat", "Backend", "Create conversations + conversation_members tables", "Dev", "Critical", "Not Started", "See DB Schema sheet"),
    ("2.2", "Phase 1: Chat", "Backend", "Create messages table with sender, content, type, status", "Dev", "Critical", "Not Started", ""),
    ("2.3", "Phase 1: Chat", "Backend", "Build POST /chat/conversations — create 1:1 or group chat", "Dev", "Critical", "Not Started", ""),
    ("2.4", "Phase 1: Chat", "Backend", "Build GET /chat/conversations — list user's chats", "Dev", "Critical", "Not Started", "Include last message + unread count"),
    ("2.5", "Phase 1: Chat", "Backend", "Build POST /chat/messages — send a message", "Dev", "Critical", "Not Started", "Broadcast via Supabase Realtime"),
    ("2.6", "Phase 1: Chat", "Backend", "Build GET /chat/messages/:convo_id — paginated message history", "Dev", "High", "Not Started", "Cursor pagination"),
    ("2.7", "Phase 1: Chat", "Backend", "Supabase Realtime channel — subscribe to new messages", "Dev", "Critical", "Not Started", "Row Level Security on messages table"),
    ("2.8", "Phase 1: Chat", "Mobile", "Build ChatListScreen — list all conversations", "Dev", "Critical", "Not Started", "Show avatar, name, last msg, time"),
    ("2.9", "Phase 1: Chat", "Mobile", "Build ChatRoomScreen — real-time message view + input", "Dev", "Critical", "Not Started", "FlatList inverted + keyboard avoid"),
    ("2.10", "Phase 1: Chat", "Mobile", "Build NewChatScreen — search users + start conversation", "Dev", "High", "Not Started", ""),
    ("2.11", "Phase 1: Chat", "Mobile", "Build GroupCreateScreen — name, image, add members", "Dev", "High", "Not Started", ""),
    ("2.12", "Phase 1: Chat", "Mobile", "Implement message status: sent / delivered / read receipts", "Dev", "High", "Not Started", "Double tick logic"),
    ("2.13", "Phase 1: Chat", "Mobile", "Build StatusListScreen + StatusViewScreen (24h stories)", "Dev", "Medium", "Not Started", "Supabase Storage for status media"),
    # Phase 1 — SOS
    ("3.1", "Phase 1: SOS", "Backend", "Create sos_contacts + sos_events tables", "Dev", "Critical", "Not Started", "Mutual consent required"),
    ("3.2", "Phase 1: SOS", "Backend", "Build POST /sos/contacts — add emergency contact (requires accept)", "Dev", "Critical", "Not Started", "Notify contact via FCM"),
    ("3.3", "Phase 1: SOS", "Backend", "Build POST /sos/contacts/:id/accept — accept SOS contact request", "Dev", "Critical", "Not Started", ""),
    ("3.4", "Phase 1: SOS", "Backend", "Build POST /sos/trigger — trigger SOS event", "Dev", "Critical", "Not Started", "Notify all accepted contacts via FCM"),
    ("3.5", "Phase 1: SOS", "Backend", "Build POST /sos/cancel — cancel active SOS event", "Dev", "High", "Not Started", "Notify contacts that user is safe"),
    ("3.6", "Phase 1: SOS", "Mobile", "Build SOSScreen — press-and-hold button (3s activation)", "Dev", "Critical", "Not Started", "Haptic feedback + countdown"),
    ("3.7", "Phase 1: SOS", "Mobile", "Build SOSContactsScreen — manage emergency contacts", "Dev", "High", "Not Started", "Pending / accepted states"),
    ("3.8", "Phase 1: SOS", "Mobile", "Handle incoming SOS push notification (alert banner)", "Dev", "Critical", "Not Started", "Wake screen if app in background"),
    # Phase 1 — Feed
    ("4.1", "Phase 1: Feed", "Backend", "Create posts + post_reactions + follows tables", "Dev", "Critical", "Not Started", ""),
    ("4.2", "Phase 1: Feed", "Backend", "Build POST /feed/posts — create post (text/image + optional alert_tag)", "Dev", "Critical", "Not Started", "alert_tag: Utility/Safety/Traffic/Water/Weather/Community"),
    ("4.3", "Phase 1: Feed", "Backend", "Build GET /feed/posts — paginated home feed (following + local)", "Dev", "Critical", "Not Started", "Cursor pagination"),
    ("4.4", "Phase 1: Feed", "Backend", "Build GET /feed/posts/alerts — filter by alert_tag + area_id", "Dev", "Critical", "Not Started", "Powers the Alerts tab"),
    ("4.5", "Phase 1: Feed", "Backend", "Build POST /feed/reactions — like/react to a post", "Dev", "High", "Not Started", ""),
    ("4.6", "Phase 1: Feed", "Backend", "Build POST /feed/follow + DELETE /feed/follow — follow/unfollow", "Dev", "High", "Not Started", ""),
    ("4.7", "Phase 1: Feed", "Mobile", "Build FeedHomeScreen — scrollable post feed", "Dev", "Critical", "Not Started", "Tab: For You / Following"),
    ("4.8", "Phase 1: Feed", "Mobile", "Build AlertsTabScreen — filter by 6 alert categories", "Dev", "Critical", "Not Started", "Category chips: All/Utility/Safety/Traffic/Water/Weather/Community"),
    ("4.9", "Phase 1: Feed", "Mobile", "Build CreatePostScreen — text + image + alert tag picker", "Dev", "High", "Not Started", "Image from camera or gallery"),
    ("4.10", "Phase 1: Feed", "Mobile", "Build PostDetailScreen — post + reactions + comments thread", "Dev", "High", "Not Started", ""),
    ("4.11", "Phase 1: Feed", "Mobile", "Build ExploreScreen — search users and posts", "Dev", "Medium", "Not Started", ""),
    # Phase 1 — Alerts (official data)
    ("5.1", "Phase 1: Alerts", "Backend", "Create loadshedding_schedules table", "Dev", "Critical", "Not Started", ""),
    ("5.2", "Phase 1: Alerts", "Backend", "Build EskomSePush integration — fetch schedule by suburb", "Dev", "Critical", "Not Started", "50 free API calls/day — cache aggressively"),
    ("5.3", "Phase 1: Alerts", "Backend", "Cron job: refresh loadshedding data every 4 hours", "Dev", "High", "Not Started", "node-cron + Redis cache"),
    ("5.4", "Phase 1: Alerts", "Backend", "Build GET /alerts/loadshedding?suburb=x — serve cached data", "Dev", "High", "Not Started", ""),
    ("5.5", "Phase 1: Alerts", "Mobile", "Build AlertsMapScreen — show user's local alerts on map", "Dev", "Medium", "Not Started", "react-native-maps"),
    # Phase 1 — Edu
    ("6.1", "Phase 1: Edu", "Backend", "Create edu_papers table (subject, grade, year, url)", "Dev", "High", "Not Started", ""),
    ("6.2", "Phase 1: Edu", "Backend", "Seed DBE past papers (Grades 10-12, last 5 years)", "Dev", "High", "Not Started", "PDFs stored in Supabase Storage"),
    ("6.3", "Phase 1: Edu", "Backend", "Build GET /edu/papers?grade=x&subject=y — filter papers", "Dev", "High", "Not Started", ""),
    ("6.4", "Phase 1: Edu", "Mobile", "Build EduHomeScreen — grade selector + subject grid", "Dev", "High", "Not Started", ""),
    ("6.5", "Phase 1: Edu", "Mobile", "Build PaperListScreen — list papers by subject + year", "Dev", "High", "Not Started", ""),
    ("6.6", "Phase 1: Edu", "Mobile", "Build PaperViewerScreen — in-app PDF viewer", "Dev", "High", "Not Started", "react-native-pdf"),
    # Phase 1 — Final
    ("7.1", "Phase 1: Final", "QA", "Manual test: full auth flow (register, login, logout)", "QA", "Critical", "Not Started", "See Testing sheet"),
    ("7.2", "Phase 1: Final", "QA", "Manual test: send/receive messages in real time", "QA", "Critical", "Not Started", ""),
    ("7.3", "Phase 1: Final", "QA", "Manual test: SOS trigger + contact notification", "QA", "Critical", "Not Started", ""),
    ("7.4", "Phase 1: Final", "QA", "Manual test: create post with alert tag — appears in Alerts tab", "QA", "Critical", "Not Started", ""),
    ("7.5", "Phase 1: Final", "QA", "Manual test: download + view past paper PDF", "QA", "High", "Not Started", ""),
    ("7.6", "Phase 1: Final", "Deployment", "Deploy backend to Railway — set production env vars", "Dev", "Critical", "Not Started", ""),
    ("7.7", "Phase 1: Final", "Deployment", "Build mobile app with Expo EAS — internal distribution APK", "Dev", "Critical", "Not Started", "For investor demo devices"),
    ("7.8", "Phase 1: Final", "Deployment", "Register for Google Play Console ($25 one-time fee)", "Founder", "High", "Not Started", "Needed before public launch"),
]

for i, row_data in enumerate(tasks, 3):
    num, phase, epic, task, owner, priority, status, notes = row_data
    fills = [None, None, None, None, None, None, status_fill(status), None]
    write_data_row(ws1, i, list(row_data), fills=fills)
    ws1.row_dimensions[i].height = 22

set_col_widths(ws1, [6, 18, 16, 50, 10, 10, 12, 40])

# ─────────────────────────────────────────────────────────────────
# SHEET 2 — SCREEN INVENTORY
# ─────────────────────────────────────────────────────────────────

ws2 = wb.create_sheet("Screen Inventory")
ws2.sheet_view.showGridLines = False
ws2.row_dimensions[1].height = 40

title_row(ws2, 1, "CONNEX — SCREEN INVENTORY", 7)
headers2 = ["Screen Name", "Navigator", "Section", "File Path", "Auth Required", "Phase", "Notes"]
write_header_row(ws2, 2, headers2, bg=GREEN, size=10)
ws2.row_dimensions[2].height = 30
freeze(ws2, "A3")

screens = [
    ("OnboardingScreen",     "Root Stack",          "Auth",     "src/screens/auth/OnboardingScreen.tsx",      "No",  "1", "App intro slides — shown once"),
    ("RegisterScreen",       "Auth Stack",           "Auth",     "src/screens/auth/RegisterScreen.tsx",        "No",  "1", "Phone + name + password"),
    ("LoginScreen",          "Auth Stack",           "Auth",     "src/screens/auth/LoginScreen.tsx",           "No",  "1", "Phone + password"),
    ("ProfileSetupScreen",   "Auth Stack",           "Auth",     "src/screens/auth/ProfileSetupScreen.tsx",    "No",  "1", "Post-register: avatar + bio"),
    ("ChatListScreen",       "Chat Stack",           "Chat",     "src/screens/chat/ChatListScreen.tsx",        "Yes", "1", "All conversations"),
    ("ChatRoomScreen",       "Chat Stack",           "Chat",     "src/screens/chat/ChatRoomScreen.tsx",        "Yes", "1", "Real-time message thread"),
    ("NewChatScreen",        "Chat Stack",           "Chat",     "src/screens/chat/NewChatScreen.tsx",         "Yes", "1", "Search users, start convo"),
    ("GroupCreateScreen",    "Chat Stack",           "Chat",     "src/screens/chat/GroupCreateScreen.tsx",     "Yes", "1", "Name + image + add members"),
    ("StatusListScreen",     "Chat Stack",           "Chat",     "src/screens/chat/StatusListScreen.tsx",      "Yes", "1", "WhatsApp-style status list"),
    ("StatusViewScreen",     "Chat Stack",           "Chat",     "src/screens/chat/StatusViewScreen.tsx",      "Yes", "1", "Full-screen status view"),
    ("SOSScreen",            "Chat Stack",           "SOS",      "src/screens/sos/SOSScreen.tsx",              "Yes", "1", "Press-hold 3s activation"),
    ("SOSContactsScreen",    "Chat Stack",           "SOS",      "src/screens/sos/SOSContactsScreen.tsx",      "Yes", "1", "Manage emergency contacts"),
    ("FeedHomeScreen",       "Feed Stack",           "Feed",     "src/screens/feed/FeedHomeScreen.tsx",        "Yes", "1", "Home feed + Following tab"),
    ("AlertsTabScreen",      "Feed Stack",           "Alerts",   "src/screens/feed/AlertsTabScreen.tsx",       "Yes", "1", "6 alert category filters"),
    ("AlertsMapScreen",      "Feed Stack",           "Alerts",   "src/screens/feed/AlertsMapScreen.tsx",       "Yes", "1", "Map view of local alerts"),
    ("CreatePostScreen",     "Feed Stack",           "Feed",     "src/screens/feed/CreatePostScreen.tsx",      "Yes", "1", "Text + image + alert tag"),
    ("PostDetailScreen",     "Feed Stack",           "Feed",     "src/screens/feed/PostDetailScreen.tsx",      "Yes", "1", "Post + comments + reactions"),
    ("ExploreScreen",        "Feed Stack",           "Feed",     "src/screens/feed/ExploreScreen.tsx",         "Yes", "1", "Search users and posts"),
    ("EduHomeScreen",        "Edu Stack",            "Edu",      "src/screens/edu/EduHomeScreen.tsx",          "Yes", "1", "Grade selector + subject grid"),
    ("PaperListScreen",      "Edu Stack",            "Edu",      "src/screens/edu/PaperListScreen.tsx",        "Yes", "1", "Papers by subject + year"),
    ("PaperViewerScreen",    "Edu Stack",            "Edu",      "src/screens/edu/PaperViewerScreen.tsx",      "Yes", "1", "In-app PDF viewer"),
    ("ProfileScreen",        "Profile Stack",        "Profile",  "src/screens/profile/ProfileScreen.tsx",      "Yes", "1", "View own or other user profile"),
    ("EditProfileScreen",    "Profile Stack",        "Profile",  "src/screens/profile/EditProfileScreen.tsx",  "Yes", "1", "Edit name, bio, avatar"),
    ("SettingsScreen",       "Profile Stack",        "Settings", "src/screens/profile/SettingsScreen.tsx",     "Yes", "1", "App settings + logout"),
    ("NotificationsScreen",  "Root Stack",           "System",   "src/screens/NotificationsScreen.tsx",        "Yes", "1", "Push notification history"),
    # Phase 2+
    ("PayHomeScreen",        "Pay Stack",            "Pay",      "src/screens/pay/PayHomeScreen.tsx",          "Yes", "2", "Phase 2: Connex Pay wallet"),
    ("SendMoneyScreen",      "Pay Stack",            "Pay",      "src/screens/pay/SendMoneyScreen.tsx",        "Yes", "2", "Phase 2: P2P transfer"),
    ("ClipsHomeScreen",      "Clips Stack",          "Clips",    "src/screens/clips/ClipsHomeScreen.tsx",      "Yes", "3", "Phase 3: Short-form video feed"),
    ("LogisticsHomeScreen",  "Logistics Stack",      "Logistics","src/screens/logistics/LogisticsHomeScreen.tsx","Yes","4","Phase 4: Ride/delivery/parcels"),
]

for i, row_data in enumerate(screens, 3):
    name, nav, section, path, auth, phase, notes = row_data
    phase_fill = {
        "1": lgreen_fill(),
        "2": lblue_fill(),
        "3": lamber_fill(),
        "4": lpurp_fill(),
    }.get(phase, lgrey_fill())
    fills = [None, None, None, None,
             lgreen_fill() if auth == "Yes" else lred_fill(),
             phase_fill, None]
    write_data_row(ws2, i, list(row_data), fills=fills)
    ws2.row_dimensions[i].height = 20

set_col_widths(ws2, [24, 18, 10, 48, 14, 8, 40])

# ─────────────────────────────────────────────────────────────────
# SHEET 3 — API ENDPOINTS
# ─────────────────────────────────────────────────────────────────

ws3 = wb.create_sheet("API Endpoints")
ws3.sheet_view.showGridLines = False
ws3.row_dimensions[1].height = 40

title_row(ws3, 1, "CONNEX — API ENDPOINTS", 7)
headers3 = ["Method", "Endpoint", "Group", "Description", "Auth", "Phase", "Notes"]
write_header_row(ws3, 2, headers3, bg=GREEN, size=10)
ws3.row_dimensions[2].height = 30
freeze(ws3, "A3")

METHOD_FILLS = {
    "GET":    PatternFill("solid", fgColor="DBEAFE"),
    "POST":   PatternFill("solid", fgColor="D1FAE5"),
    "PATCH":  PatternFill("solid", fgColor="FEF3C7"),
    "PUT":    PatternFill("solid", fgColor="FEF3C7"),
    "DELETE": PatternFill("solid", fgColor="FEE2E2"),
}

endpoints = [
    # Auth
    ("POST",   "/auth/register",                  "Auth",    "Register new user (phone, name, password)",             "No",  "1", "Hash pw with bcrypt"),
    ("POST",   "/auth/login",                     "Auth",    "Login — returns JWT + refresh token",                   "No",  "1", "Store refresh in Redis"),
    ("POST",   "/auth/logout",                    "Auth",    "Logout — invalidate JWT and refresh token",             "Yes", "1", ""),
    ("POST",   "/auth/refresh",                   "Auth",    "Refresh JWT using refresh token",                       "No",  "1", ""),
    # Users
    ("GET",    "/users/:id",                      "Users",   "Get user profile by ID",                                "Yes", "1", ""),
    ("PATCH",  "/users/:id",                      "Users",   "Update profile (name, bio, avatar_url)",                "Yes", "1", "Own profile only"),
    ("GET",    "/users/search?q=x",               "Users",   "Search users by name or phone",                         "Yes", "1", "For NewChatScreen"),
    # Chat
    ("POST",   "/chat/conversations",             "Chat",    "Create new conversation (1:1 or group)",                "Yes", "1", ""),
    ("GET",    "/chat/conversations",             "Chat",    "List all conversations for auth user",                  "Yes", "1", "Includes last msg + unread count"),
    ("GET",    "/chat/conversations/:id",         "Chat",    "Get single conversation details + members",             "Yes", "1", ""),
    ("PATCH",  "/chat/conversations/:id",         "Chat",    "Update group name or image",                            "Yes", "1", "Group admin only"),
    ("POST",   "/chat/conversations/:id/members", "Chat",    "Add member to group conversation",                      "Yes", "1", ""),
    ("DELETE", "/chat/conversations/:id/members/:uid","Chat","Remove member from group",                              "Yes", "1", ""),
    ("POST",   "/chat/messages",                  "Chat",    "Send a message in a conversation",                      "Yes", "1", "Triggers Realtime broadcast"),
    ("GET",    "/chat/messages/:convo_id",        "Chat",    "Get paginated message history (cursor-based)",          "Yes", "1", ""),
    ("PATCH",  "/chat/messages/:id/read",         "Chat",    "Mark message as read (update status)",                  "Yes", "1", ""),
    # Feed
    ("POST",   "/feed/posts",                     "Feed",    "Create post (text, image_url, optional alert_tag)",     "Yes", "1", "alert_tag triggers Alerts tab"),
    ("GET",    "/feed/posts",                     "Feed",    "Paginated home feed (following + area)",                "Yes", "1", "Cursor pagination"),
    ("GET",    "/feed/posts/alerts",              "Feed",    "Get alert posts — filter by tag + area_id",             "Yes", "1", "Powers Alerts tab"),
    ("GET",    "/feed/posts/:id",                 "Feed",    "Get single post with reactions + comments",             "Yes", "1", ""),
    ("DELETE", "/feed/posts/:id",                 "Feed",    "Delete own post",                                       "Yes", "1", ""),
    ("POST",   "/feed/reactions",                 "Feed",    "Like or react to a post",                               "Yes", "1", ""),
    ("DELETE", "/feed/reactions/:post_id",        "Feed",    "Remove reaction from post",                             "Yes", "1", ""),
    ("POST",   "/feed/follow",                    "Feed",    "Follow a user",                                         "Yes", "1", ""),
    ("DELETE", "/feed/follow/:user_id",           "Feed",    "Unfollow a user",                                       "Yes", "1", ""),
    # Alerts
    ("GET",    "/alerts/loadshedding",            "Alerts",  "Get loadshedding schedule for suburb (cached)",         "Yes", "1", "?suburb=x Query param required"),
    ("GET",    "/alerts/loadshedding/stage",      "Alerts",  "Get current national loadshedding stage",               "Yes", "1", "Updated every 30min"),
    # SOS
    ("POST",   "/sos/contacts",                   "SOS",     "Add emergency contact (sends accept request)",          "Yes", "1", "Mutual consent required"),
    ("GET",    "/sos/contacts",                   "SOS",     "List own SOS contacts (pending + accepted)",            "Yes", "1", ""),
    ("POST",   "/sos/contacts/:id/accept",        "SOS",     "Accept incoming SOS contact request",                   "Yes", "1", ""),
    ("DELETE", "/sos/contacts/:id",               "SOS",     "Remove emergency contact",                              "Yes", "1", ""),
    ("POST",   "/sos/trigger",                    "SOS",     "Trigger SOS event — notify all accepted contacts",      "Yes", "1", "FCM push to all contacts"),
    ("POST",   "/sos/cancel",                     "SOS",     "Cancel active SOS — notify contacts user is safe",      "Yes", "1", ""),
    ("GET",    "/sos/events",                     "SOS",     "Get SOS event history",                                 "Yes", "1", ""),
    # Edu
    ("GET",    "/edu/papers",                     "Edu",     "Get papers — filter by grade, subject, year",           "Yes", "1", "?grade=12&subject=Maths&year=2023"),
    ("GET",    "/edu/papers/:id",                 "Edu",     "Get single paper metadata + download URL",              "Yes", "1", "Signed Supabase Storage URL"),
    ("GET",    "/edu/subjects",                   "Edu",     "List all available subjects",                           "Yes", "1", ""),
    ("GET",    "/edu/grades",                     "Edu",     "List available grades (10, 11, 12)",                    "Yes", "1", ""),
    # Phase 2+
    ("POST",   "/pay/wallet",                     "Pay",     "Create Connex Pay wallet for user",                     "Yes", "2", "Phase 2"),
    ("POST",   "/pay/transfer",                   "Pay",     "P2P money transfer between users",                      "Yes", "2", "Phase 2"),
    ("GET",    "/pay/transactions",               "Pay",     "Get transaction history",                               "Yes", "2", "Phase 2"),
]

for i, row_data in enumerate(endpoints, 3):
    method, endpoint, group, desc, auth, phase, notes = row_data
    mfill = METHOD_FILLS.get(method, lgrey_fill())
    phase_fill = {
        "1": lgreen_fill(),
        "2": lblue_fill(),
    }.get(phase, lgrey_fill())
    fills = [mfill, None, None, None,
             lgreen_fill() if auth == "Yes" else lred_fill(),
             phase_fill, None]
    write_data_row(ws3, i, list(row_data), fills=fills)
    ws3.row_dimensions[i].height = 20

set_col_widths(ws3, [9, 38, 10, 52, 8, 8, 35])

# ─────────────────────────────────────────────────────────────────
# SHEET 4 — DATABASE SCHEMA
# ─────────────────────────────────────────────────────────────────

ws4 = wb.create_sheet("Database Schema")
ws4.sheet_view.showGridLines = False
ws4.row_dimensions[1].height = 40

title_row(ws4, 1, "CONNEX — DATABASE SCHEMA (Supabase / PostgreSQL)", 7)
headers4 = ["Table", "Column", "Type", "Nullable", "Default / FK", "Index", "Notes"]
write_header_row(ws4, 2, headers4, bg=GREEN, size=10)
ws4.row_dimensions[2].height = 30
freeze(ws4, "A3")

schema = [
    # users
    ("users", "id",             "UUID",        "No",  "gen_random_uuid()",     "PK",          "Primary key"),
    ("users", "phone",          "VARCHAR(20)", "No",  "UNIQUE",                "UNIQUE",       "E.164 format: +27..."),
    ("users", "name",           "VARCHAR(100)","No",  "",                      "",             "Display name"),
    ("users", "bio",            "TEXT",        "Yes", "",                      "",             ""),
    ("users", "avatar_url",     "TEXT",        "Yes", "",                      "",             "Supabase Storage URL"),
    ("users", "area_id",        "VARCHAR(50)", "Yes", "",                      "INDEX",        "Township / suburb identifier"),
    ("users", "province",       "VARCHAR(50)", "Yes", "",                      "",             "e.g. Gauteng"),
    ("users", "is_active",      "BOOLEAN",     "No",  "true",                  "",             "Soft disable account"),
    ("users", "created_at",     "TIMESTAMPTZ", "No",  "now()",                 "",             ""),
    ("users", "updated_at",     "TIMESTAMPTZ", "No",  "now()",                 "",             ""),
    # conversations
    ("conversations", "id",           "UUID",        "No",  "gen_random_uuid()",  "PK",    ""),
    ("conversations", "type",         "VARCHAR(10)", "No",  "'direct'",           "",      "direct | group"),
    ("conversations", "name",         "VARCHAR(100)","Yes", "",                   "",      "Group name (null for direct)"),
    ("conversations", "image_url",    "TEXT",        "Yes", "",                   "",      "Group avatar"),
    ("conversations", "created_by",   "UUID",        "No",  "FK → users.id",      "FK",    ""),
    ("conversations", "created_at",   "TIMESTAMPTZ", "No",  "now()",              "",      ""),
    # conversation_members
    ("conversation_members","id",           "UUID",       "No","gen_random_uuid()","PK",  ""),
    ("conversation_members","conversation_id","UUID",     "No","FK → conversations.id","FK","CASCADE DELETE"),
    ("conversation_members","user_id",      "UUID",       "No","FK → users.id",    "FK",  ""),
    ("conversation_members","role",         "VARCHAR(10)","No","'member'",         "",    "member | admin"),
    ("conversation_members","joined_at",    "TIMESTAMPTZ","No","now()",            "",    ""),
    ("conversation_members","last_read_at", "TIMESTAMPTZ","Yes","",               "",    "For unread count calc"),
    # messages
    ("messages", "id",              "UUID",        "No",  "gen_random_uuid()",       "PK",    ""),
    ("messages", "conversation_id", "UUID",        "No",  "FK → conversations.id",   "FK+IDX",""),
    ("messages", "sender_id",       "UUID",        "No",  "FK → users.id",           "FK",    ""),
    ("messages", "content",         "TEXT",        "Yes", "",                         "",     "Null for media-only"),
    ("messages", "type",            "VARCHAR(20)", "No",  "'text'",                   "",     "text|image|video|audio|system"),
    ("messages", "media_url",       "TEXT",        "Yes", "",                         "",     "Supabase Storage URL"),
    ("messages", "status",          "VARCHAR(20)", "No",  "'sent'",                   "",     "sent|delivered|read"),
    ("messages", "created_at",      "TIMESTAMPTZ", "No",  "now()",                    "IDX",  "Sort order"),
    # sos_contacts
    ("sos_contacts", "id",          "UUID",        "No",  "gen_random_uuid()",    "PK",  ""),
    ("sos_contacts", "user_id",     "UUID",        "No",  "FK → users.id",        "FK",  "Who added the contact"),
    ("sos_contacts", "contact_id",  "UUID",        "No",  "FK → users.id",        "FK",  "The emergency contact"),
    ("sos_contacts", "status",      "VARCHAR(20)", "No",  "'pending'",            "",    "pending|accepted|rejected"),
    ("sos_contacts", "created_at",  "TIMESTAMPTZ", "No",  "now()",                "",    ""),
    # sos_events
    ("sos_events", "id",            "UUID",        "No",  "gen_random_uuid()",    "PK",  ""),
    ("sos_events", "user_id",       "UUID",        "No",  "FK → users.id",        "FK",  "Who triggered SOS"),
    ("sos_events", "status",        "VARCHAR(20)", "No",  "'active'",             "",    "active|cancelled|resolved"),
    ("sos_events", "latitude",      "FLOAT",       "Yes", "",                     "",    "Phase 2: live location"),
    ("sos_events", "longitude",     "FLOAT",       "Yes", "",                     "",    "Phase 2: live location"),
    ("sos_events", "triggered_at",  "TIMESTAMPTZ", "No",  "now()",                "IDX", ""),
    ("sos_events", "resolved_at",   "TIMESTAMPTZ", "Yes", "",                     "",    ""),
    # posts
    ("posts", "id",          "UUID",        "No",  "gen_random_uuid()",  "PK",    ""),
    ("posts", "author_id",   "UUID",        "No",  "FK → users.id",      "FK",    ""),
    ("posts", "content",     "TEXT",        "Yes", "",                   "",      ""),
    ("posts", "image_url",   "TEXT",        "Yes", "",                   "",      "Supabase Storage URL"),
    ("posts", "alert_tag",   "VARCHAR(20)", "Yes", "NULL",               "IDX",   "Utility|Safety|Traffic|Water|Weather|Community"),
    ("posts", "area_id",     "VARCHAR(50)", "Yes", "",                   "IDX",   "Inherited from user.area_id at post time"),
    ("posts", "is_deleted",  "BOOLEAN",     "No",  "false",              "",      "Soft delete"),
    ("posts", "created_at",  "TIMESTAMPTZ", "No",  "now()",              "IDX",   ""),
    # post_reactions
    ("post_reactions", "id",       "UUID",       "No","gen_random_uuid()","PK",  ""),
    ("post_reactions", "post_id",  "UUID",       "No","FK → posts.id",    "FK",  "CASCADE DELETE"),
    ("post_reactions", "user_id",  "UUID",       "No","FK → users.id",    "FK",  ""),
    ("post_reactions", "type",     "VARCHAR(20)","No","'like'",           "",    "like|love|support|alert"),
    ("post_reactions", "created_at","TIMESTAMPTZ","No","now()",           "",    ""),
    # follows
    ("follows", "id",           "UUID",        "No","gen_random_uuid()","PK",  ""),
    ("follows", "follower_id",  "UUID",        "No","FK → users.id",    "FK",  "Who is following"),
    ("follows", "following_id", "UUID",        "No","FK → users.id",    "FK",  "Who is being followed"),
    ("follows", "created_at",   "TIMESTAMPTZ", "No","now()",            "",    ""),
    # loadshedding_schedules
    ("loadshedding_schedules","id",         "UUID",        "No","gen_random_uuid()","PK",  ""),
    ("loadshedding_schedules","suburb_id",  "VARCHAR(50)", "No","",               "IDX",  "EskomSePush suburb ID"),
    ("loadshedding_schedules","suburb_name","VARCHAR(100)","No","",               "",     ""),
    ("loadshedding_schedules","stage",      "INTEGER",     "No","0",              "",     "Current national stage"),
    ("loadshedding_schedules","schedule",   "JSONB",       "No","'{}'",           "",     "Full schedule JSON from ESP"),
    ("loadshedding_schedules","fetched_at", "TIMESTAMPTZ", "No","now()",          "IDX",  "Last API fetch time"),
    # edu_papers
    ("edu_papers","id",         "UUID",        "No","gen_random_uuid()","PK",    ""),
    ("edu_papers","subject",    "VARCHAR(100)","No","",               "",        "e.g. Mathematics"),
    ("edu_papers","grade",      "INTEGER",     "No","",               "IDX",     "10, 11, or 12"),
    ("edu_papers","year",       "INTEGER",     "No","",               "IDX",     "e.g. 2023"),
    ("edu_papers","paper_num",  "INTEGER",     "Yes","1",             "",        "1, 2, or 3 where applicable"),
    ("edu_papers","language",   "VARCHAR(20)", "No","'English'",      "",        "English|Afrikaans"),
    ("edu_papers","type",       "VARCHAR(20)", "No","'question'",     "",        "question|memo"),
    ("edu_papers","storage_url","TEXT",        "No","",               "",        "Supabase Storage path"),
    ("edu_papers","created_at", "TIMESTAMPTZ", "No","now()",          "",        ""),
]

prev_table = None
for i, row_data in enumerate(schema, 3):
    table, col, dtype, nullable, default, idx, notes = row_data
    table_fill = None
    if table != prev_table:
        table_fill = green_fill()
        prev_table = table
        # write table name bold
        c = ws4.cell(row=i, column=1, value=table)
        c.font = make_font(bold=True, color=WHITE)
        c.fill = green_fill()
        c.alignment = left()
        c.border = thin_border()
        for col_idx, val in enumerate([col, dtype, nullable, default, idx, notes], 2):
            cell = ws4.cell(row=i, column=col_idx, value=val)
            cell.font = make_font(bold=True, color=WHITE)
            cell.fill = green_fill()
            cell.alignment = left()
            cell.border = thin_border()
    else:
        fills = [None] * 7
        if i % 2 == 0:
            fills = [lgrey_fill()] * 7
        write_data_row(ws4, i, list(row_data), fills=fills)
    ws4.row_dimensions[i].height = 18

set_col_widths(ws4, [26, 22, 16, 10, 24, 8, 40])

# ─────────────────────────────────────────────────────────────────
# SHEET 5 — DEPENDENCIES
# ─────────────────────────────────────────────────────────────────

ws5 = wb.create_sheet("Dependencies")
ws5.sheet_view.showGridLines = False
ws5.row_dimensions[1].height = 40

title_row(ws5, 1, "CONNEX — DEPENDENCIES & PACKAGES", 6)
headers5 = ["Package", "Version", "Location", "Purpose", "Install Command", "Notes"]
write_header_row(ws5, 2, headers5, bg=GREEN, size=10)
ws5.row_dimensions[2].height = 30
freeze(ws5, "A3")

deps = [
    # Mobile
    ("expo",                        "~52.x",   "Mobile", "Core Expo managed framework",              "npx create-expo-app",    ""),
    ("react-native",                "0.76.x",  "Mobile", "Core mobile framework",                   "Bundled with Expo",       ""),
    ("typescript",                  "^5.x",    "Mobile", "Static type checking",                    "Bundled with template",   ""),
    ("@react-navigation/native",    "^6.x",    "Mobile", "Navigation container",                    "npx expo install",        ""),
    ("@react-navigation/stack",     "^6.x",    "Mobile", "Stack navigator (auth flow)",             "npx expo install",        ""),
    ("@react-navigation/bottom-tabs","^6.x",   "Mobile", "Bottom tab bar navigator",               "npx expo install",        ""),
    ("zustand",                     "^5.x",    "Mobile", "Lightweight global state management",     "npm install zustand",     ""),
    ("nativewind",                  "^4.x",    "Mobile", "Tailwind CSS for React Native",           "npm install nativewind",  ""),
    ("tailwindcss",                 "^3.x",    "Mobile", "Tailwind config (NativeWind peer)",       "npm install tailwindcss", ""),
    ("@supabase/supabase-js",       "^2.x",    "Mobile", "Supabase client (auth, DB, Realtime)",   "npm install @supabase/supabase-js",""),
    ("expo-notifications",          "~0.29.x", "Mobile", "Push notification handling",              "npx expo install",        "Works with FCM"),
    ("expo-image-picker",           "~16.x",   "Mobile", "Pick images from gallery / camera",      "npx expo install",        ""),
    ("expo-file-system",            "~18.x",   "Mobile", "File access for PDF download",           "npx expo install",        ""),
    ("expo-haptics",                "~14.x",   "Mobile", "Haptic feedback for SOS hold button",    "npx expo install",        ""),
    ("react-native-maps",           "^1.x",    "Mobile", "Map view for Alerts screen",             "npx expo install",        ""),
    ("react-native-pdf",            "^6.x",    "Mobile", "In-app PDF viewer for Edu",              "npm install react-native-pdf",""),
    ("@react-native-async-storage/async-storage","^2.x","Mobile","Persist Zustand auth store","npx expo install",""),
    ("dayjs",                       "^1.x",    "Mobile", "Date/time formatting",                    "npm install dayjs",       "Lightweight moment.js alternative"),
    ("zod",                         "^3.x",    "Mobile", "Runtime schema validation",               "npm install zod",         "Shared with backend"),
    # Backend
    ("express",                     "^4.x",    "Backend","HTTP server framework",                   "npm install express",     ""),
    ("typescript",                  "^5.x",    "Backend","Static type checking",                   "npm install -D typescript",""),
    ("ts-node",                     "^10.x",   "Backend","Run TS directly in dev",                 "npm install -D ts-node",   ""),
    ("nodemon",                     "^3.x",    "Backend","Auto-restart on file change",            "npm install -D nodemon",   ""),
    ("@supabase/supabase-js",       "^2.x",    "Backend","Supabase admin client",                  "npm install @supabase/supabase-js","Use service_role key"),
    ("jsonwebtoken",                "^9.x",    "Backend","JWT creation and verification",           "npm install jsonwebtoken", ""),
    ("bcryptjs",                    "^2.x",    "Backend","Password hashing",                       "npm install bcryptjs",     "Never store plain passwords"),
    ("zod",                         "^3.x",    "Backend","Request body validation",                 "npm install zod",          ""),
    ("ioredis",                     "^5.x",    "Backend","Redis client for Upstash",               "npm install ioredis",      ""),
    ("node-cron",                   "^3.x",    "Backend","Scheduled jobs (loadshedding refresh)",  "npm install node-cron",    ""),
    ("axios",                       "^1.x",    "Backend","HTTP client for EskomSePush API",        "npm install axios",        ""),
    ("cors",                        "^2.x",    "Backend","CORS middleware",                         "npm install cors",         ""),
    ("helmet",                      "^8.x",    "Backend","Security headers middleware",             "npm install helmet",       ""),
    ("express-rate-limit",          "^7.x",    "Backend","Rate limiting for auth endpoints",       "npm install express-rate-limit",""),
    ("dotenv",                      "^16.x",   "Backend","Load .env files",                        "npm install dotenv",       ""),
    ("firebase-admin",              "^12.x",   "Backend","Send FCM push notifications",            "npm install firebase-admin",""),
    ("multer",                      "^1.x",    "Backend","File upload handling",                   "npm install multer",       "For image uploads"),
    ("uuid",                        "^9.x",    "Backend","Generate UUIDs (if not using Supabase)", "npm install uuid",         ""),
]

for i, row_data in enumerate(deps, 3):
    pkg, ver, loc, purpose, install, notes = row_data
    loc_fill = lblue_fill() if loc == "Mobile" else lamber_fill()
    fills = [None, None, loc_fill, None, None, None]
    write_data_row(ws5, i, list(row_data), fills=fills)
    ws5.row_dimensions[i].height = 18

set_col_widths(ws5, [36, 12, 10, 44, 40, 30])

# ─────────────────────────────────────────────────────────────────
# SHEET 6 — PHASE ROADMAP
# ─────────────────────────────────────────────────────────────────

ws6 = wb.create_sheet("Phase Roadmap")
ws6.sheet_view.showGridLines = False
ws6.row_dimensions[1].height = 40

title_row(ws6, 1, "CONNEX — PHASE ROADMAP & BUSINESS MILESTONES", 7)
headers6 = ["Phase", "Name", "Key Features", "Monetization", "Target ARR", "Timeline", "Status"]
write_header_row(ws6, 2, headers6, bg=GREEN, size=10)
ws6.row_dimensions[2].height = 30
freeze(ws6, "A3")

PHASE_COLORS = ["D1FAE5", "DBEAFE", "FEF3C7", "EDE9FE", "FEE2E2"]

phases = [
    ("0", "Setup & Architecture",
     "Project init, Supabase setup, GitHub repo, dev environment, folder structure, CI skeleton",
     "No revenue — build foundation",
     "R0",
     "Weeks 1–2",
     "Not Started"),
    ("1", "MVP: Chat + Feed + Edu",
     "Chat (real-time, groups, WhatsApp-style status)\nSOS button (press-hold, FCM alerts to contacts, mutual consent)\nFeed (posts, reactions, follows)\nAlerts tab (6 categories, self-tagged + EskomSePush)\nEdu (DBE past papers, in-app PDF viewer)",
     "No direct revenue\nFocus: User acquisition, organic growth, investor demo readiness",
     "R0 (pre-revenue)",
     "Weeks 3–14",
     "Not Started"),
    ("2", "Connex Pay",
     "In-app digital wallet\nP2P money transfers (phone-to-phone)\nQR code payments\nTransaction history\nBill pay (electricity, data, DSTV)\nRegulatory: SARB compliance pathway",
     "Transaction fees (1–2%)\nFloat interest income\nBusiness payment acceptance fee\nConnex Premium subscription launch",
     "R35M/yr at scale",
     "Month 4–8",
     "Not Started"),
    ("3", "Connex Clips",
     "Short-form vertical video feed (TikTok-style)\nRecord in-app or upload\nAudio overlay, filters, text\nDiscover feed (algorithm)\nCreator profiles\nLive streaming (Phase 3B)",
     "Video ads (mid-roll, sponsored)\nCreator monetization share\nBoosted content / promoted clips\nBrand partnerships with local SA brands",
     "R15M/yr",
     "Month 9–14",
     "Not Started"),
    ("4", "Connex Logistics",
     "Ride-hailing (Uber-equivalent, township-first pricing)\nFood delivery (local restaurants + township traders)\nParcel delivery (person-to-person, SME fulfilment)\nGrocery delivery\nConnex for Business (SME merchant dashboard)\nDriver/courier partner app",
     "Commission per trip/order (15–25%)\nSubscription: Connex Business tier\nSurge pricing (peak hours)\nDelivery insurance upsell\nWhite-label logistics API for enterprises",
     "R68M/yr at scale",
     "Month 15–24",
     "Not Started"),
    ("5+", "Connex Enterprise & Expansion",
     "Multi-country expansion (Zimbabwe, Nigeria, Kenya, Ghana)\nConnex Data & API licensing (anonymised community data)\nGovernment & NGO integrations (civic alerts, healthcare)\nConnex for Schools (Edu premium)\nSAPS / emergency services SOS integration",
     "Data licensing\nGovernment contracts\nEnterprise API access\nFranchise/partner model per country",
     "R180M+/yr",
     "Year 3–5",
     "Not Started"),
]

for i, row_data in enumerate(phases, 3):
    phase, name, features, mon, arr, timeline, status = row_data
    ph_idx = min(int(phase.replace("+","")) if phase.replace("+","").isdigit() else 5, 5)
    bg = PHASE_COLORS[min(ph_idx, len(PHASE_COLORS)-1)]
    pfill = PatternFill("solid", fgColor=bg)
    sfill = status_fill(status)
    for col_idx, val in enumerate(list(row_data), 1):
        c = ws6.cell(row=i, column=col_idx, value=val)
        c.font = make_font(bold=(col_idx == 1))
        c.fill = pfill if col_idx not in (6, 7) else (lgrey_fill() if col_idx == 6 else sfill)
        c.alignment = left()
        c.border = thin_border()
    ws6.row_dimensions[i].height = 80

set_col_widths(ws6, [8, 22, 55, 50, 18, 14, 14])

# ─────────────────────────────────────────────────────────────────
# SHEET 7 — INTEGRATION TRACKER
# ─────────────────────────────────────────────────────────────────

ws7 = wb.create_sheet("Integration Tracker")
ws7.sheet_view.showGridLines = False
ws7.row_dimensions[1].height = 40

title_row(ws7, 1, "CONNEX — THIRD-PARTY INTEGRATION TRACKER", 8)
headers7 = ["Service", "Type", "Used For", "Free Tier", "Cost at Scale", "Phase", "Status", "Docs / Notes"]
write_header_row(ws7, 2, headers7, bg=GREEN, size=10)
ws7.row_dimensions[2].height = 30
freeze(ws7, "A3")

integrations = [
    ("Supabase",           "BaaS",           "DB (PostgreSQL), Auth, Realtime (chat), Storage (media/PDFs)",
     "500MB DB, 1GB storage, 50k MAU",       "Pro: $25/month",                  "1", "Not Started",
     "supabase.com — use service_role key on backend only"),
    ("Railway",            "Hosting",        "Node.js backend deployment + auto SSL",
     "$5/month credit (free to start)",      "~$10–30/month (scales with usage)", "1", "Not Started",
     "railway.app — connect GitHub repo for auto-deploy"),
    ("Upstash Redis",      "Cache / KV",     "JWT session cache, rate limiting, loadshedding data cache",
     "10k commands/day free",               "Pay-per-use: very cheap",           "1", "Not Started",
     "upstash.com — serverless Redis, works with Railway"),
    ("Firebase FCM",       "Push Notifications","SOS alerts, chat notifications, feed mentions",
     "Unlimited push (free)",               "Free — no cost for FCM",            "1", "Not Started",
     "console.firebase.google.com — use Admin SDK on backend"),
    ("Expo EAS",           "Build & Deploy",  "Build APK/AAB, OTA updates, internal distribution",
     "Free for personal (30 builds/month)", "Production: $99/month",             "1", "Not Started",
     "expo.dev — use eas build --profile preview for investor APK"),
    ("EskomSePush API",    "Data Feed",      "Official loadshedding schedule + stage data",
     "50 free API calls/day",              "Paid tier: R999+/month",             "1", "Not Started",
     "eskomsepush.app — cache AGGRESSIVELY in Redis to stay in free tier"),
    ("Google Play Console","App Distribution","Publish Android app to Play Store",
     "$25 one-time dev registration fee",  "$25 once (no monthly fee)",          "1", "Not Started",
     "play.google.com/console — register before alpha test on device"),
    ("Apple App Store",    "App Distribution","Publish iOS app to App Store",
     "None — $99/year required",           "$99/year developer account",         "1", "Not Started",
     "developer.apple.com — MVP can be Android-only initially"),
    ("Cloudinary",         "Media CDN",      "Image/video optimisation and CDN delivery (optional fallback)",
     "25GB storage, 25GB bandwidth/month", "$89/month (Plus)",                   "1", "Not Started",
     "Alternative to Supabase Storage for heavy media — Phase 3+"),
    ("OpenWeatherMap API", "Data Feed",      "Weather alerts for Alerts tab",
     "1000 calls/day free",               "Professional: $40/month",             "2", "Not Started",
     "openweathermap.org — Phase 2 addition to alerts"),
    ("Flutterwave",        "Payments",       "ZAR card payments, bank transfers for Connex Pay",
     "No monthly fee (per-transaction)",   "2.9% + R1.50 per transaction",       "2", "Not Started",
     "flutterwave.com — SA-registered business required"),
    ("Paystack",           "Payments",       "Alternative SA payment gateway for Connex Pay",
     "No setup fee",                       "1.5% per transaction (cap R2000)",   "2", "Not Started",
     "paystack.com — also owned by Stripe, solid SA coverage"),
    ("AWS S3 / Rekognition","AI/Storage",   "Video storage for Clips + content moderation",
     "5GB S3 free 12 months",              "$0.023/GB/month storage",            "3", "Not Started",
     "Phase 3 — scale media beyond Supabase Storage"),
    ("Google Maps Platform","Mapping",      "Ride-hailing routing, driver tracking, ETA calculation",
     "$300/month credit (90-day)",         "$0.005 per request at scale",        "4", "Not Started",
     "Phase 4 — required for logistics"),
    ("Twilio",             "Comms",         "OTP SMS verification (phone number auth)",
     "Trial credit $15",                   "~$0.0075 per SMS",                   "1", "Not Started",
     "Alternative: Supabase Auth built-in OTP (use this first)"),
    ("Sentry",             "Monitoring",    "Error tracking for mobile + backend",
     "5k errors/month free",              "Team: $26/month",                     "1", "Not Started",
     "sentry.io — essential for production crash tracking"),
    ("PostHog",            "Analytics",     "Product analytics, user funnels, session recording",
     "1M events/month free",              "Scale: $450/month",                   "1", "Not Started",
     "posthog.com — open source, POPIA-friendly"),
]

for i, row_data in enumerate(integrations, 3):
    service, itype, used, free, cost, phase, status, docs = row_data
    phase_fill = {
        "1": lgreen_fill(),
        "2": lblue_fill(),
        "3": lamber_fill(),
        "4": lpurp_fill(),
    }.get(phase, lgrey_fill())
    sfill = status_fill(status)
    fills = [None, None, None, None, None, phase_fill, sfill, None]
    write_data_row(ws7, i, list(row_data), fills=fills)
    ws7.row_dimensions[i].height = 35

set_col_widths(ws7, [20, 16, 50, 32, 24, 8, 13, 55])

# ─────────────────────────────────────────────────────────────────
# SAVE
# ─────────────────────────────────────────────────────────────────
wb.save(OUTPUT)
print(f"Saved: {OUTPUT}")
