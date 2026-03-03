"""
update_master_workbook.py
Rewrites Connex_Master_Workbook.xlsx in-place, updating all 6 sheets
to align with confirmed product & tech decisions from the technical plan.

Key changes applied:
  - Roadmap: Chat+Feed+Edu together from day 1 (not Alerts-first), correct tech stack
  - Financial: Phase-based revenue model matching business report
  - Free Tools: Remove MongoDB/Redis Cloud/Vercel/Next.js refs; add Upstash, correct stack
  - Fundraising Scripts: Updated product description to match confirmed features
  - Market Analysis: Updated date + competitive landscape to reflect actual product
  - Investor Tracker: Keep intact, just date/deadline corrections
"""

import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

# ─── THEME ───────────────────────────────────────────────────────────────────
NAVY   = "0D1B2A"
GREEN  = "006B3C"
LGREY  = "F2F4F7"
DGREY  = "D0D5DD"
WHITE  = "FFFFFF"
AMBER  = "FEF3C7"
LGREEN = "D1FAE5"
LRED   = "FEE2E2"
LBLUE  = "DBEAFE"
LPURP  = "EDE9FE"
GOLD   = "FEF9C3"

TARGET = "docs/business/Connex_Master_Workbook.xlsx"

# ─── STYLE HELPERS ───────────────────────────────────────────────────────────
def f(bold=False, size=11, color="000000", italic=False):
    return Font(name="Garamond", bold=bold, size=size, color=color, italic=italic)

def fill(hex_color):
    return PatternFill("solid", fgColor=hex_color)

def border():
    s = Side(style="thin", color=DGREY)
    return Border(left=s, right=s, top=s, bottom=s)

def center(wrap=True):
    return Alignment(horizontal="center", vertical="center", wrap_text=wrap)

def left(wrap=True):
    return Alignment(horizontal="left", vertical="center", wrap_text=wrap)

def cell(ws, row, col, value, bold=False, size=11, color="000000",
         bg=None, align="left", italic=False, border_on=True):
    c = ws.cell(row=row, column=col, value=value)
    c.font = f(bold=bold, size=size, color=color, italic=italic)
    if bg:
        c.fill = bg if isinstance(bg, PatternFill) else fill(bg)
    c.alignment = center() if align == "center" else left()
    if border_on:
        c.border = border()
    return c

def title(ws, row, text, colspan, bg=NAVY, size=16):
    ws.merge_cells(start_row=row, start_column=1,
                   end_row=row, end_column=colspan)
    c = ws.cell(row=row, column=1, value=text)
    c.font = f(bold=True, size=size, color=WHITE)
    c.fill = fill(bg)
    c.alignment = center()
    ws.row_dimensions[row].height = 36

def subtitle(ws, row, text, colspan, bg=LGREY, size=10, color="444444"):
    ws.merge_cells(start_row=row, start_column=1,
                   end_row=row, end_column=colspan)
    c = ws.cell(row=row, column=1, value=text)
    c.font = f(italic=True, size=size, color=color)
    c.fill = fill(bg)
    c.alignment = left()
    ws.row_dimensions[row].height = 18

def section(ws, row, text, colspan, bg=GREEN):
    ws.merge_cells(start_row=row, start_column=1,
                   end_row=row, end_column=colspan)
    c = ws.cell(row=row, column=1, value=text)
    c.font = f(bold=True, size=11, color=WHITE)
    c.fill = fill(bg)
    c.alignment = left()
    ws.row_dimensions[row].height = 22

def hdr(ws, row, cols, bg=NAVY, size=10):
    for ci, text in enumerate(cols, 1):
        c = ws.cell(row=row, column=ci, value=text)
        c.font = f(bold=True, size=size, color=WHITE)
        c.fill = fill(bg)
        c.alignment = center()
        c.border = border()
    ws.row_dimensions[row].height = 28

def row_data(ws, row, values, fills=None, h=20, bold_first=False):
    for ci, val in enumerate(values, 1):
        bg = None
        if fills and ci <= len(fills) and fills[ci-1]:
            bg = fills[ci-1]
        elif row % 2 == 0:
            bg = LGREY
        cell(ws, row, ci, val, bg=bg, bold=(bold_first and ci == 1))
    ws.row_dimensions[row].height = h

def blank(ws, row):
    ws.row_dimensions[row].height = 8

def colw(ws, widths):
    for i, w in enumerate(widths, 1):
        ws.column_dimensions[get_column_letter(i)].width = w

def freeze(ws, ref="A3"):
    ws.freeze_panes = ref

def sfill(status):
    m = {
        "To Do":       None,
        "In Progress": fill(AMBER),
        "Done":        fill(LGREEN),
        "URGENT":      fill(LRED),
        "High":        fill(LBLUE),
    }
    return m.get(status)

# ─── LOAD WORKBOOK ───────────────────────────────────────────────────────────
wb = openpyxl.load_workbook(TARGET)

# We'll delete and recreate all sheets in order
existing = wb.sheetnames[:]
for sname in existing:
    del wb[sname]

# ═══════════════════════════════════════════════════════════════════════════════
# SHEET 1 — MARKET ANALYSIS
# ═══════════════════════════════════════════════════════════════════════════════
ws = wb.create_sheet("Market Analysis")
ws.sheet_view.showGridLines = False
N = 5

title(ws, 1, "CONNEX SUPERAPP — AFRICAN MARKET ANALYSIS", N)
subtitle(ws, 2, "Confidential | March 2026", N)
blank(ws, 3)

section(ws, 4, "A. AFRICAN DIGITAL MARKET SIZE", N)
hdr(ws, 5, ["Metric", "2023 / Current", "2026 Estimate", "2030 / 2034 Target", "Source"])

market_rows = [
    ("African Population",               "1.35 billion",    "1.41 billion",     "1.7 billion by 2030",                   "UN Population Division"),
    ("Smartphone Users (Africa)",         "550 million",     "678 million",      "900 million by 2030",                   "GSMA Intelligence"),
    ("Internet Users (Africa)",           "500 million",     "600 million+",     "900 million by 2030",                   "ITU"),
    ("Mobile Money Accounts",             "500 million+",    "600 million+",     "1 billion by 2030",                     "GSMA Mobile Money"),
    ("Africa Mobile Money Market (USD)",  "$5.2 billion",    "$9.18 billion",    "$67.18 billion by 2034 (25.3% CAGR)",  "OpenPR Research"),
    ("African App Revenue (USD)",         "$800 million",    "$1.5 billion",     "$3+ billion by 2028",                   "Adjust / Sensor Tower"),
    ("Global Super App Market (USD)",     "$58.7 billion",   "$120 billion",     "$722 billion by 2032",                  "Allied Market Research"),
    ("Super App Market CAGR",             "28% annually",    "28% annually",     "Sustained growth",                      "Industry Reports"),
    ("SA Internet Users",                 "40 million",      "43 million",       "48 million by 2028",                    "Stats SA / ITU"),
    ("SA Social Media Users",             "36 million",      "39 million",       "44 million by 2028",                    "DataReportal"),
    ("SA Smartphone Users",               "34 million",      "37 million",       "42 million by 2028",                    "GSMA"),
]
for i, r in enumerate(market_rows, 6):
    row_data(ws, i, list(r))

blank(ws, len(market_rows) + 7)
section(ws, len(market_rows) + 8, "B. COMPETITIVE LANDSCAPE", N)
hdr(ws, len(market_rows) + 9, ["Competitor", "Country", "MAUs", "Modules", "Connex Gap / Advantage"])

comp_r = [
    ("VodaPay (Vodacom)",   "South Africa",       "2 million",         "Payments, shopping, some services",
     "No social feed, no Chat, no SOS, no Edu, no community alerts — Connex covers all"),
    ("Ayoba (MTN)",         "Pan-Africa",         "30 million",        "Messaging, content, games",
     "No payments, no Edu, no Alerts tab, no SOS — Connex beats on depth and utility"),
    ("Tingg (Cellulant)",   "34 African countries","220M connected",   "Payments, B2B",
     "Not consumer-first, no social, no chat, no edu — Connex is consumer-first"),
    ("WhatsApp",            "Global",             "500M+ Africa",      "Messaging, calls, status",
     "No community feed, no Alerts tab, no Edu, no Pay, no SOS integration — Connex is fuller"),
    ("TikTok",              "Global",             "200M+ Africa",      "Short video",
     "No payments, no edu, no alerts, no chat — Connex adds all of this for Africa specifically"),
    ("Instagram",           "Global",             "50M+ SA",           "Photo/video social",
     "No payments, no education, no utility — Connex adds real local value"),
    ("Capitec / FNB App",   "South Africa",       "8-10 million",      "Banking, payments",
     "No social, no content, no community alerts — Connex wraps payments inside daily life"),
]
r_start = len(market_rows) + 10
for i, r in enumerate(comp_r, r_start):
    row_data(ws, i, list(r), h=30)

colw(ws, [26, 18, 18, 32, 60])
freeze(ws)

# ═══════════════════════════════════════════════════════════════════════════════
# SHEET 2 — FINANCIAL PROJECTIONS
# ═══════════════════════════════════════════════════════════════════════════════
ws = wb.create_sheet("Financial Projections")
ws.sheet_view.showGridLines = False
N = 6

title(ws, 1, "CONNEX SUPERAPP — PHASE-BASED FINANCIAL PROJECTIONS (ZAR)", N)
subtitle(ws, 2,
    "Phase 1 (MVP) = no revenue; revenue unlocks with each product phase. All figures in ZAR.", N)
blank(ws, 3)

section(ws, 4, "A. USER GROWTH PROJECTIONS", N)
hdr(ws, 5, ["Metric", "Q3 2026 (MVP Launch)", "Q4 2026 (Pay Live)", "2027 Full Year", "2028 Full Year", "Notes"])

user_rows = [
    ("Monthly Active Users (MAUs)", "10,000",   "50,000",    "500,000",    "2,000,000",  "Conservative growth model"),
    ("Daily Active Users (DAUs)",    "4,000",    "20,000",    "200,000",    "800,000",    "40% DAU/MAU ratio target"),
    ("Paying Users",                 "0",        "1,000",     "20,000",     "100,000",    "Phase 2 Pay unlocks monetisation"),
    ("New User CAC (R)",             "R40",      "R30",       "R20",        "R15",        "Decreasing as brand builds"),
    ("Monthly Churn Rate",           "6%",       "4%",        "2.5%",       "2%",         "Super apps retain well — high switching cost"),
    ("DAU/MAU Ratio",                "40%",      "40%",       "40%",        "40%",        "Industry benchmark for super apps"),
]
for i, r in enumerate(user_rows, 6):
    row_data(ws, i, list(r))

blank(ws, 13)
section(ws, 14, "B. REVENUE PROJECTIONS BY STREAM (ZAR)", N)
hdr(ws, 15, ["Revenue Stream", "Q3 2026", "Q4 2026", "2027 Full Year", "2028 Full Year", "Phase / Model"])

rev_rows = [
    ("Phase 1 — MVP Revenue",            "R0",         "R0",          "R0",            "R0",            "Phase 1 is free — build users not revenue"),
    ("Phase 2 — Pay: Transaction Fees",  "R0",         "R150,000",    "R3,000,000",    "R15,000,000",   "1–2% on P2P transfers + bill payments"),
    ("Phase 2 — Pay: Business Accounts", "R0",         "R30,000",     "R600,000",      "R4,000,000",    "R299–R999/month merchant tier"),
    ("Phase 2 — Pay: Airtime Commission","R0",         "R20,000",     "R400,000",      "R3,000,000",    "3–5% margin on top-ups"),
    ("Phase 2 — Advertising (Feed/App)", "R0",         "R50,000",     "R1,200,000",    "R8,000,000",    "CPM/CPC — SA brands targeting youth"),
    ("Phase 3 — Clips: Video Ads",       "R0",         "R0",          "R200,000",      "R5,000,000",    "Phase 3 — mid-roll + sponsored clips"),
    ("Phase 3 — Clips: Creator Share",   "R0",         "R0",          "R100,000",      "R2,000,000",    "30% platform cut on tips + creator subs"),
    ("Phase 4 — Logistics Commission",   "R0",         "R0",          "R0",            "R5,000,000",    "Phase 4 — 15–25% on rides/delivery"),
    ("API / Data Licensing",             "R0",         "R0",          "R200,000",      "R3,000,000",    "Anonymised community alert data"),
    ("Connex Premium Subscription",      "R0",         "R0",          "R100,000",      "R1,000,000",    "R49–R149/month cross-phase premium"),
    ("TOTAL REVENUE",                    "R0",         "R250,000",    "R5,800,000",    "R46,000,000",   "All streams combined"),
]
for i, r in enumerate(rev_rows, 16):
    is_total = r[0].startswith("TOTAL")
    fills = [fill(NAVY) if is_total else None] * 6
    for ci, v in enumerate(list(r), 1):
        c = ws.cell(row=i, column=ci, value=v)
        c.font = f(bold=is_total, color=WHITE if is_total else "000000")
        c.fill = fill(NAVY) if is_total else (fill(LGREY) if i % 2 == 0 else fill(WHITE))
        c.alignment = left()
        c.border = border()
    ws.row_dimensions[i].height = 20

blank(ws, 28)
section(ws, 29, "C. COST STRUCTURE (ZAR) — AI-ASSISTED DEVELOPMENT MODEL", N)
hdr(ws, 30, ["Cost Category", "Q3 2026", "Q4 2026", "2027 Full Year", "2028 Full Year", "Notes"])

cost_rows = [
    ("AI Dev Tools & API Costs",      "R3,000",    "R5,000",     "R60,000",     "R120,000",    "Claude, Cursor, GitHub Copilot — replaces dev salaries early on"),
    ("Freelance / Contract Dev",      "R0",        "R30,000",    "R300,000",    "R1,200,000",  "Bring in human devs for specific sprints as revenue grows"),
    ("Cloud Infrastructure",          "R2,000",    "R8,000",     "R120,000",    "R480,000",    "Railway + Supabase + Upstash — scale from free tiers"),
    ("Marketing & User Acquisition",  "R10,000",   "R50,000",    "R600,000",    "R2,400,000",  "Digital + grassroots township campaigns"),
    ("Legal & Compliance (POPIA/SARB)","R20,000",  "R15,000",    "R150,000",    "R300,000",    "Company reg, POPIA, fintech licensing for Phase 2"),
    ("Operations (SIM, devices, etc)","R5,000",    "R5,000",     "R60,000",     "R120,000",    "Lean remote-first — minimal office costs"),
    ("Content Moderation",            "R0",        "R5,000",     "R80,000",     "R300,000",    "AI-first moderation + human review as scale grows"),
    ("TOTAL COSTS",                   "R40,000",   "R118,000",   "R1,370,000",  "R4,920,000",  "All operating costs"),
]
for i, r in enumerate(cost_rows, 31):
    is_total = r[0].startswith("TOTAL")
    for ci, v in enumerate(list(r), 1):
        c = ws.cell(row=i, column=ci, value=v)
        c.font = f(bold=is_total, color=WHITE if is_total else "000000")
        c.fill = fill(NAVY) if is_total else (fill(LGREY) if i % 2 == 0 else fill(WHITE))
        c.alignment = left()
        c.border = border()
    ws.row_dimensions[i].height = 20

colw(ws, [34, 18, 18, 20, 20, 52])
freeze(ws)

# ═══════════════════════════════════════════════════════════════════════════════
# SHEET 3 — INVESTOR TRACKER
# ═══════════════════════════════════════════════════════════════════════════════
ws = wb.create_sheet("Investor Tracker")
ws.sheet_view.showGridLines = False
N = 8

title(ws, 1, "CONNEX — INVESTOR & ACCELERATOR TRACKER", N)
subtitle(ws, 2, "Track all investor outreach, applications, and status. Update weekly.", N)
blank(ws, 3)

section(ws, 4, "A. VENTURE CAPITAL FIRMS", N)
hdr(ws, 5, ["Firm", "HQ", "Typical Cheque", "Focus", "Website", "Contact Person", "Status", "Next Action"])

vc_rows = [
    ("Partech Africa",   "Senegal/Paris",    "USD 1M–15M",   "Pan-African tech, Series A/B",      "partechpartners.com",  "", "Not contacted", "Research contact & request intro"),
    ("Novastar Ventures","Kenya/UK",         "USD 500K–5M",  "East/West/SA Africa",               "novastarventures.com", "", "Not contacted", "Find warm intro via LinkedIn"),
    ("TLcom Capital",    "Kenya/UK",         "USD 500K–10M", "Pan-Africa, B2B, SaaS",             "tlcom.vc",             "", "Not contacted", "Apply via website"),
    ("Lateral Capital",  "South Africa",     "USD 250K–2M",  "SA tech, early stage",              "lateral.capital",      "", "Not contacted", "Priority — SA-based"),
    ("Kepple Africa",    "Kenya",            "USD 50K–300K", "Early stage, pan-Africa",           "kepple-africa.com",    "", "Not contacted", "Apply online"),
    ("Launch Africa",    "Pan-Africa",       "USD 25K–250K", "Pre-seed to seed",                  "launchafrica.vc",      "", "Not contacted", "Apply online — good for seed"),
    ("Future Africa",    "Nigeria",          "USD 25K–100K", "Pan-Africa, early stage",           "future.africa",        "", "Not contacted", "Apply online"),
    ("Knife Capital",    "South Africa",     "R2M–R20M",     "SA tech scale-ups",                 "knifecap.com",         "", "Not contacted", "Priority — SA-based"),
    ("4Di Capital",      "South Africa",     "R1M–R10M",     "Deep tech, SaaS",                   "4dicapital.com",       "", "Not contacted", "Priority — SA-based"),
    ("HAVAÍC",           "South Africa",     "R500K–R5M",    "SA tech startups",                  "havaics.com",          "", "Not contacted", "Priority — SA-based"),
    ("Quona Capital",    "Global/Africa",    "USD 1M–10M",   "Fintech emerging markets",          "quona.com",            "", "Not contacted", "Relevant for Phase 2 — Connex Pay"),
    ("Orange Ventures",  "France/Africa",    "EUR 500K–5M",  "Telecom adjacent tech",             "orangeventures.com",   "", "Not contacted", "Relevant for Connex Alerts data play"),
]
for i, r in enumerate(vc_rows, 6):
    row_data(ws, i, list(r), h=22)

blank(ws, 19)
section(ws, 20, "B. ANGEL INVESTORS & NETWORKS", N)
hdr(ws, 21, ["Network / Angel", "Type", "Focus", "How to Access", "Website", "Contact", "Status", "Next Action"])

angel_rows = [
    ("SA Business Angel Network (SABAN)", "Angel Network",      "SA startups, various sectors",    "Apply / attend events",    "saban.co.za",     "", "Not contacted", "Apply for membership"),
    ("Angel Hub Africa",                  "Angel Network",      "Pan-African deals",               "Online application",       "angelhub.africa", "", "Not contacted", "Submit pitch"),
    ("E4E Africa",                        "Angel Network",      "SA entrepreneurs",                "Online platform",          "e4e.africa",      "", "Not contacted", "Register and pitch"),
    ("Grindstone Accelerator",            "Accel/Angels",       "Growth-stage SA tech",            "Annual application",       "grindstone.co.za","", "Not contacted", "Apply next cohort"),
    ("Friends & Family Round",            "Personal Network",   "Any",                             "Personal outreach",        "—",               "", "Not started",   "Map network — start conversations"),
    ("Alumni Networks (Wits/UCT/UP)",     "Informal",           "SA business",                     "LinkedIn, events",         "—",               "", "Not started",   "Post in alumni groups"),
]
for i, r in enumerate(angel_rows, 22):
    row_data(ws, i, list(r), h=22)

blank(ws, 29)
section(ws, 30, "C. ACCELERATORS & GRANT PROGRAMMES", N)
hdr(ws, 31, ["Programme", "Equity", "Value", "Deadline", "Website", "Applied?", "Status", "Notes"])

accel_rows = [
    ("Google for Startups Accelerator Africa", "No equity", "USD 350K cloud credits + mentorship", "March 18 2026",    "startup.google.com/programs/accelerator/africa",      "No", "URGENT",        "AI-first focus. Equity free. Apply immediately."),
    ("Google Black Founders Fund Africa",       "No equity", "Cash grants + cloud credits",          "Rolling",          "startup.google.com/programs/black-founders-fund",     "No", "Apply",         "Open to Black-founded startups"),
    ("Microsoft for Startups Founders Hub",     "No equity", "USD 150K Azure credits",               "Rolling",          "foundershub.startups.microsoft.com",                  "No", "Apply now",     "Free credits — apply even if using Railway/Supabase"),
    ("AWS Activate",                            "No equity", "Up to USD 100K credits",               "Rolling",          "aws.amazon.com/activate",                             "No", "Apply now",     "Free cloud hosting credits — useful for Phase 3/4 scale"),
    ("Y Combinator",                            "7% equity", "USD 500K",                             "Sep 2026 batch",   "ycombinator.com/apply",                               "No", "Apply Sep 2026","Global prestige. Very competitive. Build traction first."),
    ("Tony Elumelu Foundation",                 "No equity", "USD 5,000 seed capital",               "Annual (January)", "tonyelumelufoundation.org",                           "No", "Apply Jan 2027","Pan-African entrepreneurs"),
    ("Injini EdTech Accelerator",               "No equity", "Grant + mentorship",                   "Annual cohorts",   "injini.net",                                          "No", "Apply",         "Perfect fit for Connex Edu module"),
    ("Seedstars Africa",                        "Minority",  "USD 500K",                             "Annual",           "seedstars.com",                                       "No", "Research",      "Pan-African competition"),
    ("SEDA (SA Government)",                    "No equity", "Grants + business support",            "Rolling",          "seda.org.za",                                         "No", "Apply",         "SA government support — good for pre-revenue stage"),
    ("IDC (Industrial Dev Corp)",               "Loan/equity","R1M–R100M+",                          "Rolling",          "idc.co.za",                                           "No", "Series A stage","Large ticket SA funding — apply after Phase 2 live"),
    ("Startupbootcamp Africa",                  "6% equity", "EUR 15K + perks worth EUR 500K+",      "Annual",           "startupbootcamp.org/africa",                          "No", "Apply",         "Strong African network"),
    ("Safaricom Spark",                         "No equity", "Grant + support",                      "Annual",           "safaricom.co.ke/spark",                               "No", "Apply",         "Relevant for East Africa expansion (Phase 5+)"),
]
for i, r in enumerate(accel_rows, 32):
    sf = r[6]
    status_bg = {
        "URGENT": LRED, "Apply now": LGREEN, "Apply Sep 2026": LBLUE,
    }.get(sf)
    fills_list = [None] * 8
    if status_bg:
        fills_list[6] = status_bg
    row_data(ws, i, list(r), fills=fills_list, h=24)

colw(ws, [38, 12, 30, 18, 46, 9, 16, 46])
freeze(ws)

# ═══════════════════════════════════════════════════════════════════════════════
# SHEET 4 — ROADMAP 2026 (major overhaul)
# ═══════════════════════════════════════════════════════════════════════════════
ws = wb.create_sheet("Roadmap 2026")
ws.sheet_view.showGridLines = False
N = 7

title(ws, 1, "CONNEX SUPERAPP — PRODUCT & BUSINESS ROADMAP 2026", N)
blank(ws, 2)
hdr(ws, 3, ["Task / Milestone", "Category", "Phase / Quarter", "Priority", "Status", "Owner", "Notes"])
freeze(ws, "A4")

PRIO_FILLS = {
    "Critical": fill(LRED),
    "URGENT":   fill(LRED),
    "High":     fill(LBLUE),
    "Medium":   fill(LGREY),
}
STATUS_FILLS_R = {
    "To Do":       None,
    "In Progress": fill(AMBER),
    "Done":        fill(LGREEN),
}

roadmap = [
    # ── Phase 0: Setup ──────────────────────────────────────────────────────
    ("__SECTION__", "PHASE 0 — PROJECT SETUP & INFRASTRUCTURE (Weeks 1–2)", "", "", "", "", ""),
    ("Register company (Pty Ltd via CIPC)", "Legal", "Phase 0 / Q1", "Critical", "To Do", "Founder", "cipc.co.za — R175 online"),
    ("Open business bank account", "Legal", "Phase 0 / Q1", "Critical", "To Do", "Founder", "Capitec Business or FNB"),
    ("Create Expo + React Native + TypeScript project", "Tech", "Phase 0 / Q1", "Critical", "To Do", "Founder + AI", "npx create-expo-app connex --template — NOT Next.js"),
    ("Create Node.js + Express + TypeScript backend", "Tech", "Phase 0 / Q1", "Critical", "To Do", "Founder + AI", "mkdir backend && npm init — hosted on Railway"),
    ("Set up Supabase project (DB, Auth, Realtime, Storage)", "Tech", "Phase 0 / Q1", "Critical", "To Do", "Founder + AI", "app.supabase.com — PostgreSQL, NO MongoDB"),
    ("Create GitHub repository — main/dev/feature branch strategy", "Tech", "Phase 0 / Q1", "Critical", "To Do", "Founder + AI", "Never commit directly to main"),
    ("Create Upstash Redis instance (session cache, rate limiting)", "Tech", "Phase 0 / Q1", "High", "To Do", "Founder + AI", "upstash.com — serverless Redis, replaces Redis Cloud"),
    ("Register Firebase project for push notifications (FCM)", "Tech", "Phase 0 / Q1", "High", "To Do", "Founder + AI", "console.firebase.google.com — needed for SOS alerts"),
    ("Install VS Code + extensions (ESLint, Prettier, NativeWind, GitLens)", "Tech", "Phase 0 / Q1", "High", "To Do", "Founder", "See Technical Plan Section 3 for full list"),
    ("Configure .env files (mobile + backend) — NEVER commit to GitHub", "Tech", "Phase 0 / Q1", "Critical", "To Do", "Founder + AI", "Supabase URL/keys, JWT secret, FCM key"),
    ("Design system & brand identity in Figma (navy + green palette)", "Design", "Phase 0 / Q1", "High", "To Do", "Founder", "Garamond text, #0D1B2A navy, #006B3C green"),
    ("Apply: Google for Startups Accelerator Africa", "Fundraising", "Phase 0 / Q1", "URGENT", "To Do", "Founder", "DEADLINE: March 18 2026 — apply immediately"),
    ("Apply: Microsoft Founders Hub (free Azure credits)", "Fundraising", "Phase 0 / Q1", "High", "To Do", "Founder", "Rolling — apply now for free credits"),
    ("Apply: AWS Activate (free credits)", "Fundraising", "Phase 0 / Q1", "High", "To Do", "Founder", "Rolling — apply now"),
    # ── Phase 1: MVP Build ──────────────────────────────────────────────────
    ("__SECTION__", "PHASE 1 — MVP BUILD: CHAT + FEED + EDU (Weeks 3–14, Q1–Q2 2026)", "", "", "", "", ""),
    ("Build auth system — register, login, JWT, phone OTP", "Tech", "Phase 1 / Q1", "Critical", "To Do", "Founder + AI", "Supabase Auth + bcrypt + Redis token cache"),
    ("Build real-time Chat (1:1, group, WhatsApp-style status)", "Tech", "Phase 1 / Q1", "Critical", "To Do", "Founder + AI", "Supabase Realtime WebSocket — NOT Signal Protocol"),
    ("Build SOS button — press-hold 3s, FCM alert to emergency contacts", "Tech", "Phase 1 / Q1", "Critical", "To Do", "Founder + AI", "Mutual consent required; integrated inside Chat tab"),
    ("Build SOS contacts system — add/accept/remove emergency contacts", "Tech", "Phase 1 / Q1", "Critical", "To Do", "Founder + AI", "Phase 2 adds live location; Phase 3 adds SAPS integration"),
    ("Integrate EskomSePush API — loadshedding by suburb (cached in Redis)", "Tech", "Phase 1 / Q1", "Critical", "To Do", "Founder + AI", "50 free calls/day — cache aggressively; auto-alerts to users"),
    ("Build social Feed — posts, reactions, follows, For You / Following tabs", "Tech", "Phase 1 / Q2", "Critical", "To Do", "Founder + AI", "Posts can optionally be tagged as alerts"),
    ("Build Alerts tab in Feed — 6 categories: Utility/Safety/Traffic/Water/Weather/Community", "Tech", "Phase 1 / Q2", "Critical", "To Do", "Founder + AI", "Dual layer: user self-tagged posts + official EskomSePush data"),
    ("Community self-tagging: users tag normal posts as alert category", "Tech", "Phase 1 / Q2", "Critical", "To Do", "Founder + AI", "Surfaces in Alerts tab for users in same area_id"),
    ("Build Connex Edu — DBE past papers (Grades 10–12, last 5 years)", "Tech", "Phase 1 / Q2", "High", "To Do", "Founder + AI", "PDFs in Supabase Storage; in-app viewer (react-native-pdf)"),
    ("Build all 22 Phase 1 screens (see Screen Inventory in tracker)", "Tech", "Phase 1 / Q2", "High", "To Do", "Founder + AI", "OnboardingScreen through SettingsScreen"),
    ("Build backend API — 38 endpoints across 7 route groups", "Tech", "Phase 1 / Q2", "Critical", "To Do", "Founder + AI", "Auth, Users, Chat, Feed, Alerts, SOS, Edu"),
    ("Set up Sentry error tracking (mobile + backend)", "Tech", "Phase 1 / Q2", "High", "To Do", "Founder + AI", "sentry.io — free 5k errors/month"),
    ("Set up PostHog product analytics", "Tech", "Phase 1 / Q2", "High", "To Do", "Founder + AI", "posthog.com — 1M events/month free"),
    ("Create investor pitch deck (Figma or Pitch.com)", "Fundraising", "Phase 1 / Q1", "High", "To Do", "Founder", "10–15 slides max. Lead with traction once app is built."),
    ("Build social media presence (X/TikTok daily loadshedding posts)", "Marketing", "Phase 1 / Q1", "High", "To Do", "Founder", "Use Connex Alerts content as free daily marketing"),
    ("Alpha internal test — team + close contacts", "Milestone", "Phase 1 / Q2", "Critical", "To Do", "Founder", "Test: Chat, SOS, Feed, Alerts, Edu — fix critical bugs"),
    ("Deploy backend to Railway (production env vars)", "Tech", "Phase 1 / Q2", "Critical", "To Do", "Founder + AI", "railway.app — auto-deploy from GitHub"),
    ("Build investor-demo APK with Expo EAS", "Milestone", "Phase 1 / Q2", "Critical", "To Do", "Founder + AI", "eas build --profile preview — internal APK distribution"),
    ("Register Google Play Console ($25 once)", "Legal", "Phase 1 / Q2", "High", "To Do", "Founder", "Required before public Play Store listing"),
    ("Seed fundraising outreach (angels + accelerators)", "Fundraising", "Phase 1 / Q2", "High", "To Do", "Founder", "Target: R500K–R2M seed. Use demo APK."),
    ("Township Champion programme launch (50 influencers)", "Marketing", "Phase 1 / Q2", "High", "To Do", "Founder", "Early access + small incentive — drive organic downloads"),
    ("School partnership programme (50 schools in Gauteng — free Edu)", "Marketing", "Phase 1 / Q2", "High", "To Do", "Founder", "Free Edu access drives downloads; builds brand credibility"),
    ("TARGET: Alpha launch — 1,000 downloads", "Milestone", "Phase 1 / Q2", "Critical", "To Do", "All", "June 2026 milestone"),
    # ── Phase 2: Pay ────────────────────────────────────────────────────────
    ("__SECTION__", "PHASE 2 — CONNEX PAY (Month 4–8, Q3 2026)", "", "", "", "", ""),
    ("SARB compliance research + fintech legal pathway", "Legal", "Phase 2 / Q3", "Critical", "To Do", "Founder", "Required before processing real money"),
    ("Integrate Flutterwave or Paystack payment gateway", "Tech", "Phase 2 / Q3", "Critical", "To Do", "Founder + AI", "SA-registered business required for merchant account"),
    ("Build in-app digital wallet (create, top-up, balance)", "Tech", "Phase 2 / Q3", "Critical", "To Do", "Founder + AI", "Real ZAR, not crypto"),
    ("Build P2P money transfer (phone-to-phone)", "Tech", "Phase 2 / Q3", "Critical", "To Do", "Founder + AI", "1–2% transaction fee model"),
    ("Build QR code payment system (merchant QR generation + scan)", "Tech", "Phase 2 / Q3", "High", "To Do", "Founder + AI", ""),
    ("Airtime & data top-up (Vodacom, MTN, Telkom APIs)", "Tech", "Phase 2 / Q3", "High", "To Do", "Founder + AI", "3–5% commission margin"),
    ("Apply: Y Combinator (Sep 2026 batch)", "Fundraising", "Phase 2 / Q3", "High", "To Do", "Founder", "Application opens ~June 2026"),
    ("Seed round close", "Fundraising", "Phase 2 / Q3", "Critical", "To Do", "Founder", "Target: R2M–R5M. Use Pay launch as lever."),
    ("TARGET: 50,000 MAUs", "Milestone", "Phase 2 / Q3", "Critical", "To Do", "All", "Q3 2026 milestone"),
    # ── Phase 3: Clips ──────────────────────────────────────────────────────
    ("__SECTION__", "PHASE 3 — CONNEX CLIPS (Month 9–14, Q4 2026)", "", "", "", "", ""),
    ("Build short-form vertical video feed (TikTok-style)", "Tech", "Phase 3 / Q4", "High", "To Do", "Founder + AI", "Record in-app or upload; For You algorithm"),
    ("Video upload + processing pipeline", "Tech", "Phase 3 / Q4", "High", "To Do", "Founder + AI", "Supabase Storage → AWS S3 at scale"),
    ("Creator profiles and verified accounts", "Tech", "Phase 3 / Q4", "Medium", "To Do", "Founder + AI", "Blue tick verification system"),
    ("Creator monetisation: tips, subs, ad share", "Tech", "Phase 3 / Q4", "High", "To Do", "Founder + AI", "30% platform cut"),
    ("Content moderation pipeline (AI + human review)", "Tech", "Phase 3 / Q4", "Critical", "To Do", "Founder + AI", "Automated first pass — required before public Clips launch"),
    ("App Store & Google Play public launch", "Milestone", "Phase 3 / Q4", "Critical", "To Do", "All", "December 2026 target"),
    ("Pre-Series A fundraising preparation", "Fundraising", "Phase 3 / Q4", "High", "To Do", "Founder", "Target: R5M–R20M from VCs"),
    ("TARGET: 100,000 MAUs — public launch", "Milestone", "Phase 3 / Q4", "Critical", "To Do", "All", "Q4 2026 milestone"),
    # ── Phase 4: Logistics ──────────────────────────────────────────────────
    ("__SECTION__", "PHASE 4 — CONNEX LOGISTICS (Month 15–24, 2027)", "", "", "", "", ""),
    ("Ride-hailing — township-first pricing model", "Tech", "Phase 4 / 2027", "High", "To Do", "Founder + AI", "Google Maps Platform for routing + driver ETA"),
    ("Food delivery — local restaurants + township traders", "Tech", "Phase 4 / 2027", "High", "To Do", "Founder + AI", "15–25% commission per order"),
    ("Parcel delivery — person-to-person, SME fulfilment", "Tech", "Phase 4 / 2027", "High", "To Do", "Founder + AI", ""),
    ("Grocery delivery", "Tech", "Phase 4 / 2027", "Medium", "To Do", "Founder + AI", ""),
    ("Connex for Business — SME merchant dashboard", "Tech", "Phase 4 / 2027", "High", "To Do", "Founder + AI", "Business subscription tier: R299–R999/month"),
    ("Driver/courier partner app (separate app or sub-mode)", "Tech", "Phase 4 / 2027", "High", "To Do", "Founder + AI", ""),
    ("SAPS / emergency services SOS integration", "Tech", "Phase 4 / 2027", "High", "To Do", "Founder + AI", "Phase 4 SOS upgrade — Phase 1 is contacts-only"),
    ("Multi-country expansion preparation (Zimbabwe, Nigeria, Kenya)", "Business", "Phase 4 / 2027", "Medium", "To Do", "Founder", "Localise currency, alerts data, language"),
    ("TARGET: 500,000 MAUs", "Milestone", "Phase 4 / 2027", "Critical", "To Do", "All", "2027 year-end milestone"),
]

r = 4
PRIO_MAP = {"Critical": LRED, "URGENT": LRED, "High": LBLUE, "Medium": LGREY}
for rd in roadmap:
    if rd[0] == "__SECTION__":
        section(ws, r, rd[1], N)
        r += 1
        continue
    task, cat, phase, prio, status, owner, notes = rd
    prio_fill = fill(PRIO_MAP.get(prio, LGREY))
    status_fill_v = STATUS_FILLS_R.get(status)
    fills_list = [None, None, None, prio_fill, status_fill_v, None, None]
    row_data(ws, r, list(rd), fills=fills_list, h=22)
    r += 1

colw(ws, [60, 14, 20, 10, 12, 16, 55])

# ═══════════════════════════════════════════════════════════════════════════════
# SHEET 5 — FREE TOOLS DIRECTORY (corrected for actual stack)
# ═══════════════════════════════════════════════════════════════════════════════
ws = wb.create_sheet("Free Tools Directory")
ws.sheet_view.showGridLines = False
N = 5

title(ws, 1, "CONNEX — FREE TOOLS DIRECTORY (BOOTSTRAP PHASE)", N)
subtitle(ws, 2, "Every tool listed has a free tier covering your needs until you raise funding. Stack is Expo + Node.js + Supabase (mobile-first, no Next.js/web).", N)
blank(ws, 3)

section(ws, 4, "A. DEVELOPMENT & HOSTING (CONFIRMED TECH STACK)", N)
hdr(ws, 5, ["Tool", "Purpose", "Cost", "Website", "Notes"])

dev_tools = [
    ("GitHub",             "Code hosting, version control, CI/CD, project boards",       "Free",                       "github.com",             "Unlimited private repos — use for everything"),
    ("Expo / EAS",         "Build + deploy React Native mobile app (iOS + Android)",      "Free build credits",         "expo.dev",               "eas build --profile preview for investor APK"),
    ("Railway",            "Host Node.js/Express backend — auto SSL, auto-deploy",        "$5/month credit free",       "railway.app",            "Connect GitHub repo — deploys on every push"),
    ("Supabase",           "PostgreSQL DB + Auth + Realtime (chat) + Storage (media)",    "Free: 500MB DB, 1GB storage","supabase.com",           "Replaces Firebase AND MongoDB — use this only"),
    ("Upstash Redis",      "Serverless Redis — JWT cache, rate limiting, alert caching",  "Free: 10k commands/day",     "upstash.com",            "Use this NOT Redis Cloud — fully serverless"),
    ("Firebase FCM",       "Push notifications for SOS + chat alerts + feed mentions",    "Free forever",               "firebase.google.com",    "Best-in-class push — use Admin SDK on backend"),
    ("Cloudflare",         "CDN, DNS, DDoS protection",                                   "Free plan",                  "cloudflare.com",         "Point your domain here for free global CDN"),
    ("Sentry",             "Error tracking — mobile app crashes + backend errors",         "Free: 5k errors/month",      "sentry.io",              "Essential for production — catches crashes before users report"),
    ("PostHog",            "Product analytics, user funnels, session recording",           "Free: 1M events/month",      "posthog.com",            "POPIA-friendly open source analytics"),
]
for i, r in enumerate(dev_tools, 6):
    row_data(ws, i, list(r))

blank(ws, 16)
section(ws, 17, "B. DESIGN & BRAND", N)
hdr(ws, 18, ["Tool", "Purpose", "Cost", "Website", "Notes"])

design_tools = [
    ("Figma",         "UI/UX design, prototyping, wireframing",           "Free for individuals", "figma.com",        "Industry standard — design all 22 screens here first"),
    ("Canva",         "Marketing graphics, social media posts",            "Free tier",            "canva.com",        "Quick graphics for township + social campaigns"),
    ("Lucide Icons",  "Open-source icon library — works in React Native",  "Free + open source",   "lucide.dev",       "Clean, consistent icons — preferred icon set for Connex"),
    ("Unsplash",      "Free high-quality stock photography",               "Free",                 "unsplash.com",     "No attribution required for commercial use"),
    ("Google Fonts",  "Web and mobile typography",                         "Free",                 "fonts.google.com", "Use for web only — Garamond used in documents"),
    ("Coolors",       "Colour palette generator",                          "Free",                 "coolors.co",       "Connex palette: #0D1B2A navy + #006B3C green"),
]
for i, r in enumerate(design_tools, 19):
    row_data(ws, i, list(r))

blank(ws, 26)
section(ws, 27, "C. PRODUCTIVITY & TEAM", N)
hdr(ws, 28, ["Tool", "Purpose", "Cost", "Website", "Notes"])

prod_tools = [
    ("Notion",     "Docs, wiki, roadmap, meeting notes",              "Free for small teams",   "notion.so",             "Use as your company OS until you raise money"),
    ("Linear",     "Sprint and task management",                      "Free up to 250 issues",  "linear.app",            "Better than Jira for small teams — clean UI"),
    ("Slack",      "Team communication",                              "Free (90-day history)",  "slack.com",             "Connect GitHub integration for deploy alerts"),
    ("Google Workspace","Email, Docs, Sheets, Drive, Meet",           "Free (Gmail)",           "workspace.google.com",  "Use Gmail + Drive for all investor documents"),
    ("Loom",       "Record video walkthroughs for investors",         "Free: 25 videos",        "loom.com",              "Record app demo for investors — much better than screenshots"),
    ("Calendly",   "Meeting scheduling for investor calls",           "Free tier",              "calendly.com",          "Share link — investors self-book calls"),
    ("Miro",       "Digital whiteboard for architecture planning",    "Free tier",              "miro.com",              "Map out Connex system architecture visually"),
]
for i, r in enumerate(prod_tools, 29):
    row_data(ws, i, list(r))

blank(ws, 37)
section(ws, 38, "D. FUNDRAISING TOOLS", N)
hdr(ws, 39, ["Tool", "Purpose", "Cost", "Website", "Notes"])

fund_tools = [
    ("Pitch.com",      "Investor pitch deck builder",                             "Free tier",        "pitch.com",      "Beautiful decks — better than PowerPoint"),
    ("DocSend",        "Share pitch deck with tracking (see who views + how long)","Free trial",      "docsend.com",    "Know which investors opened your deck"),
    ("Carta",          "Cap table management",                                     "Free for early",   "carta.com",      "Manage equity professionally from day one"),
    ("AngelList",      "Startup profile + investor discovery",                     "Free",             "angellist.com",  "Create a profile — investors search here"),
    ("Crunchbase",     "Research investors and their portfolios",                  "Free basic",       "crunchbase.com", "Research which VCs invest in SA/Africa"),
    ("LinkedIn Premium","Investor outreach via InMail",                            "Free trial 1mo",   "linkedin.com",   "Use the 1-month free trial strategically for outreach"),
    ("F6S",            "Apply to multiple accelerators in one place",              "Free",             "f6s.com",        "Submit to Google, Microsoft, AWS, Injini — all here"),
]
for i, r in enumerate(fund_tools, 40):
    row_data(ws, i, list(r))

blank(ws, 48)
section(ws, 49, "E. MARKETING & GROWTH", N)
hdr(ws, 50, ["Tool", "Purpose", "Cost", "Website", "Notes"])

mkt_tools = [
    ("Buffer",       "Schedule social media posts",                 "Free: 3 channels",       "buffer.com",              "Schedule loadshedding posts across X, TikTok, Instagram"),
    ("Mailchimp",    "Email marketing to users/investors",          "Free: 500 contacts",     "mailchimp.com",           "Newsletter and investor update emails"),
    ("Mixpanel",     "In-app event tracking and analytics",         "Free: 20M events/month", "mixpanel.com",            "Track user behaviour inside the app — pairs with PostHog"),
    ("Product Hunt", "Launch platform — free exposure",            "Free to launch",          "producthunt.com",         "Launch day can drive 1,000s of signups globally"),
    ("AppFollow",    "App Store reviews management",                "Free tier",              "appfollow.io",            "Monitor + respond to Play Store reviews"),
]
for i, r in enumerate(mkt_tools, 51):
    row_data(ws, i, list(r))

blank(ws, 57)
section(ws, 58, "F. FREE DATA SOURCES FOR CONNEX", N)
hdr(ws, 59, ["Tool", "Purpose", "Cost", "Website", "Notes"])

data_tools = [
    ("EskomSePush API",      "Official loadshedding schedule by suburb",          "Free: 50 calls/day",   "eskomsepush.app",        "Cache in Upstash Redis — 50 calls/day is enough for MVP"),
    ("SA Weather Service",   "Official SA weather data for Alerts tab",           "Free",                 "weathersa.co.za",        "Weather alerts for Connex Alerts module"),
    ("DBE Past Papers",      "All SA matric past papers (Grades 10–12)",          "Free to download",     "education.gov.za",       "Core of Connex Edu — free and legal to use"),
    ("Siyavula Textbooks",   "Open-source SA curriculum textbooks",               "Free + open licence",  "siyavula.com",           "Grades 10–12 Maths and Science — can embed in Edu"),
    ("Open Data South Africa","Government open datasets (crime, census, infra)",  "Free",                 "data.gov.za",            "Future: crime/safety alerts from official government data"),
    ("OpenStreetMap API",    "Mapping and location data (Phase 4 Logistics)",     "Free",                 "openstreetmap.org",      "Use for Phase 4 ride-hailing before Google Maps costs scale"),
]
for i, r in enumerate(data_tools, 60):
    row_data(ws, i, list(r))

colw(ws, [24, 52, 22, 28, 58])

# ═══════════════════════════════════════════════════════════════════════════════
# SHEET 6 — FUNDRAISING SCRIPTS (updated product description)
# ═══════════════════════════════════════════════════════════════════════════════
ws = wb.create_sheet("Fundraising Scripts")
ws.sheet_view.showGridLines = False
N = 3

title(ws, 1, "CONNEX — FUNDRAISING SCRIPTS & EMAIL TEMPLATES", N)
blank(ws, 2)

scripts = [
    ("ONE-LINER (use everywhere — elevator pitch)",
     "Connex is Africa's first true super app — combining real-time messaging with community safety alerts and SOS, a social feed with an integrated Alerts tab, and a free education hub with DBE past papers. Built for South Africa first, then the continent. Launching with Chat + Feed + Edu in Phase 1, then unlocking Pay, Clips, and Logistics in subsequent phases — one app for everything 1.4 billion Africans currently use 10 apps for."),

    ("COLD EMAIL TO INVESTOR",
     """Subject: Connex — Africa's Super App | Seed Round

Hi [Name],

I'm building Connex — Africa's first true super app built for the continent, not adapted for it.

Phase 1 launches three deeply integrated products: Chat (real-time messaging, groups, WhatsApp-style status, plus an SOS emergency button wired to your trusted contacts), Feed (social posts with an integrated Alerts tab covering loadshedding, safety, traffic, water, weather, and community — powered by both official data and community self-tagging), and Edu (free DBE matric past papers for Grades 10–12, in-app PDF viewer).

Why now: Africa has 678M smartphone users, a 28% CAGR super app market, and NO dominant super app. We're in the window that determines who wins.

Why Connex wins: We're not a messaging app that added payments. We're not a payments app that added social. We are building all layers together, in the right order, for people whose daily life includes loadshedding alerts, matric prep, and community safety — things global apps will never serve properly.

Phases 2–4 unlock Pay (P2P wallet, bill payments), Clips (short-form video, creator economy), and Logistics (ride-hailing, food delivery, parcel, grocery — Uber for townships).

Traction: [X] downloads, [X] MAUs, [X] in revenue.

We're raising R[X] at a pre-money valuation of R[X]. I'd love 20 minutes to share the deck.

[Your name]
[Email] | [Phone]"""),

    ("WARM INTRO REQUEST (send to mutual contact)",
     """Hi [Mutual Contact],

Hope you're well! I'm building Connex — an African super app combining messaging, community safety alerts, social, education, and eventually payments and logistics. We're about to raise our seed round and I noticed you're connected to [Investor Name] at [Firm].

Would you be comfortable making a quick intro? I've attached our one-pager — it's literally one page, won't take 2 minutes to read.

No pressure at all if it's not a fit — but if you think there's a match, I'd really appreciate it.

Thanks,
[Your name]"""),

    ("ACCELERATOR APPLICATION OPENING (adapt for each programme)",
     """Connex is solving the biggest friction point in African digital life: fragmentation. The average South African smartphone user toggles between 8–12 apps daily for things Connex delivers in one.

We are building Africa's super app — not a clone of WeChat or Grab, but something designed from the ground up for African realities: loadshedding schedules, matric exam prep, township community safety, and P2P money movement without a bank account.

Phase 1 launches Chat (with SOS emergency contacts + community alerts), Feed (social posts + a dedicated Alerts tab with 6 categories: Utility, Safety, Traffic, Water, Weather, Community), and Edu (free DBE past papers for Grades 10–12). Each module feeds the others — alerts give Chat users content from day one; Edu drives school-age downloads; Feed gives the platform a public social layer.

Subsequent phases add Pay (digital wallet + P2P transfers), Clips (short-form video creator economy), and Logistics (ride-hailing, food delivery, parcels, and grocery — with township SME fulfilment at the core).

Our primary market: South Africa — 61M people, 37M smartphone users, 36M social media users, and the highest data costs relative to income on the continent. If we can win SA, we have the blueprint and the brand to expand across Sub-Saharan Africa.

The African super app market represents a USD 722B global opportunity growing at 28% CAGR. No dominant local player exists. This is our window."""),

    ("PITCH MEETING OPENER — 60-second verbal pitch",
     """Every South African uses 10 apps to do things one app should do. WhatsApp for messages. Some news app for loadshedding. Instagram for photos. TikTok for video. A banking app. A different website every year for matric past papers. It's fragmented, it wastes data, and none of these global apps actually understand what daily life looks like here.

Connex fixes this. We launch with three modules together: Chat — real-time messaging like WhatsApp, but with an SOS emergency button and loadshedding alerts built in. Feed — a social timeline, but with a dedicated Alerts tab where users share and consume community alerts across six categories: power, safety, traffic, water, weather, community. And Edu — a free library of every DBE past paper from Grade 10 to 12.

Then we layer in Pay — a full digital wallet for P2P transfers and bill payments. Then Clips — short-form video and a creator economy for African content. Then Logistics — ride-hailing, food delivery, and parcel services built around township economies.

Africa has 1.4 billion people, 678 million smartphone users, and no super app. WeChat did this for China. Grab did it for Southeast Asia. Connex is doing it for Africa — starting in South Africa, right now."""),
]

row_num = 3
for label, content in scripts:
    ws.merge_cells(start_row=row_num, start_column=1, end_row=row_num, end_column=N)
    c = ws.cell(row=row_num, column=1, value=label)
    c.font = f(bold=True, size=11, color=WHITE)
    c.fill = fill(GREEN)
    c.alignment = left()
    ws.row_dimensions[row_num].height = 22
    row_num += 1

    ws.merge_cells(start_row=row_num, start_column=1, end_row=row_num, end_column=N)
    c = ws.cell(row=row_num, column=1, value=content)
    c.font = f(size=10)
    c.fill = fill(LGREY)
    c.alignment = Alignment(horizontal="left", vertical="top", wrap_text=True)
    line_count = content.count("\n") + 1
    ws.row_dimensions[row_num].height = max(60, line_count * 15)
    row_num += 1

    blank(ws, row_num)
    row_num += 1

colw(ws, [40, 40, 40])

# ─── SAVE ────────────────────────────────────────────────────────────────────
wb.save(TARGET)
print(f"Saved: {TARGET}")
