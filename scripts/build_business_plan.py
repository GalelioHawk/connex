"""
build_business_plan.py
Generates: docs/business/Connex_Business_Plan.docx
Full formal business plan — Connex (Pty) Ltd
Founder: Tlake Tshabalala
"""

from docx import Document
from docx.shared import Pt, RGBColor, Inches, Cm
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml.ns import qn
from docx.oxml import OxmlElement
import copy

OUTPUT = "/Users/vulture/Desktop/Connex/docs/business/Connex_Business_Plan.docx"

NAVY  = RGBColor(0x0D, 0x1B, 0x2A)
GREEN = RGBColor(0x00, 0x6B, 0x3C)
WHITE = RGBColor(0xFF, 0xFF, 0xFF)
LGREY = RGBColor(0xF2, 0xF4, 0xF7)
DGREY = RGBColor(0x66, 0x66, 0x66)
BLACK = RGBColor(0x00, 0x00, 0x00)
AMBER = RGBColor(0xB4, 0x53, 0x09)

doc = Document()

# ── PAGE SETUP ────────────────────────────────────────────────────────────────
for section in doc.sections:
    section.top_margin    = Cm(2.5)
    section.bottom_margin = Cm(2.5)
    section.left_margin   = Cm(3.0)
    section.right_margin  = Cm(2.5)

# ── HELPERS ───────────────────────────────────────────────────────────────────

def set_cell_bg(cell, hex_color):
    tc   = cell._tc
    tcPr = tc.get_or_add_tcPr()
    shd  = OxmlElement("w:shd")
    shd.set(qn("w:val"),   "clear")
    shd.set(qn("w:color"), "auto")
    shd.set(qn("w:fill"),  hex_color)
    tcPr.append(shd)

def set_cell_border(cell, border_color="D0D5DD"):
    tc   = cell._tc
    tcPr = tc.get_or_add_tcPr()
    tcBorders = OxmlElement("w:tcBorders")
    for side in ("top", "left", "bottom", "right"):
        el = OxmlElement(f"w:{side}")
        el.set(qn("w:val"),   "single")
        el.set(qn("w:sz"),    "4")
        el.set(qn("w:space"), "0")
        el.set(qn("w:color"), border_color)
        tcBorders.append(el)
    tcPr.append(tcBorders)

def add_run(para, text, bold=False, size=11, color=BLACK, italic=False):
    run = para.add_run(text)
    run.bold   = bold
    run.italic = italic
    run.font.name  = "Garamond"
    run.font.size  = Pt(size)
    run.font.color.rgb = color
    return run

def h1(text, num=""):
    doc.add_paragraph()
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(16)
    p.paragraph_format.space_after  = Pt(4)
    label = f"{num}. {text}" if num else text
    run = p.add_run(label.upper())
    run.bold = True
    run.font.name  = "Garamond"
    run.font.size  = Pt(16)
    run.font.color.rgb = NAVY
    # underline rule via bottom border
    pPr = p._p.get_or_add_pPr()
    pBdr = OxmlElement("w:pBdr")
    bottom = OxmlElement("w:bottom")
    bottom.set(qn("w:val"),   "single")
    bottom.set(qn("w:sz"),    "8")
    bottom.set(qn("w:space"), "4")
    bottom.set(qn("w:color"), "006B3C")
    pBdr.append(bottom)
    pPr.append(pBdr)
    return p

def h2(text, num=""):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(12)
    p.paragraph_format.space_after  = Pt(3)
    label = f"{num}  {text}" if num else text
    run = p.add_run(label)
    run.bold = True
    run.font.name  = "Garamond"
    run.font.size  = Pt(13)
    run.font.color.rgb = NAVY
    return p

def h3(text):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(8)
    p.paragraph_format.space_after  = Pt(2)
    run = p.add_run(text)
    run.bold = True
    run.font.name  = "Garamond"
    run.font.size  = Pt(11)
    run.font.color.rgb = GREEN
    return p

def para(text, size=11, color=BLACK, italic=False, indent=False, bold=False):
    p = doc.add_paragraph()
    p.paragraph_format.space_after  = Pt(6)
    p.paragraph_format.space_before = Pt(2)
    if indent:
        p.paragraph_format.left_indent = Inches(0.3)
    run = p.add_run(text)
    run.bold   = bold
    run.italic = italic
    run.font.name  = "Garamond"
    run.font.size  = Pt(size)
    run.font.color.rgb = color
    return p

def bullet(text, level=0, bold_prefix=None):
    p = doc.add_paragraph(style="List Bullet")
    p.paragraph_format.space_after  = Pt(3)
    p.paragraph_format.left_indent  = Inches(0.3 + level * 0.2)
    if bold_prefix:
        r1 = p.add_run(bold_prefix + " ")
        r1.bold = True
        r1.font.name = "Garamond"
        r1.font.size = Pt(11)
        r1.font.color.rgb = NAVY
    r2 = p.add_run(text)
    r2.font.name  = "Garamond"
    r2.font.size  = Pt(11)
    r2.font.color.rgb = BLACK
    return p

def spacer(n=1):
    for _ in range(n):
        p = doc.add_paragraph()
        p.paragraph_format.space_before = Pt(0)
        p.paragraph_format.space_after  = Pt(0)
        run = p.add_run("")
        run.font.size = Pt(4)

def pb():
    doc.add_page_break()

def tbl(headers, rows, col_widths=None, header_bg="0D1B2A", alt_bg="F2F4F7"):
    table = doc.add_table(rows=1 + len(rows), cols=len(headers))
    table.style = "Table Grid"
    table.alignment = WD_TABLE_ALIGNMENT.LEFT

    # Header row
    hdr_row = table.rows[0]
    for i, htext in enumerate(headers):
        cell = hdr_row.cells[i]
        set_cell_bg(cell, header_bg)
        set_cell_border(cell, "FFFFFF")
        cell.vertical_alignment = WD_ALIGN_VERTICAL.CENTER
        p = cell.paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.LEFT
        run = p.add_run(htext)
        run.bold = True
        run.font.name  = "Garamond"
        run.font.size  = Pt(10)
        run.font.color.rgb = WHITE

    # Data rows
    for ri, row_data in enumerate(rows):
        row = table.rows[ri + 1]
        bg = alt_bg if ri % 2 == 1 else "FFFFFF"
        for ci, ctext in enumerate(row_data):
            cell = row.cells[ci]
            set_cell_bg(cell, bg)
            set_cell_border(cell)
            cell.vertical_alignment = WD_ALIGN_VERTICAL.CENTER
            p = cell.paragraphs[0]
            p.alignment = WD_ALIGN_PARAGRAPH.LEFT
            is_first = (ci == 0)
            run = p.add_run(str(ctext))
            run.bold = is_first
            run.font.name  = "Garamond"
            run.font.size  = Pt(10)
            run.font.color.rgb = NAVY if is_first else BLACK

    # Column widths
    if col_widths:
        for ri2, row in enumerate(table.rows):
            for ci2, cell in enumerate(row.cells):
                if ci2 < len(col_widths):
                    cell.width = Inches(col_widths[ci2])

    spacer()
    return table

def highlight_box(text, bg="0D1B2A", color=WHITE, size=11, bold=False):
    """Full-width shaded paragraph."""
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(6)
    p.paragraph_format.space_after  = Pt(6)
    pPr = p._p.get_or_add_pPr()
    shd = OxmlElement("w:shd")
    shd.set(qn("w:val"),   "clear")
    shd.set(qn("w:color"), "auto")
    shd.set(qn("w:fill"),  bg)
    pPr.append(shd)
    run = p.add_run(text)
    run.bold  = bold
    run.font.name  = "Garamond"
    run.font.size  = Pt(size)
    run.font.color.rgb = color
    return p

# ══════════════════════════════════════════════════════════════════════════════
# COVER PAGE
# ══════════════════════════════════════════════════════════════════════════════

spacer(3)

# Company name
p = doc.add_paragraph()
p.alignment = WD_ALIGN_PARAGRAPH.CENTER
run = p.add_run("CONNEX")
run.bold = True
run.font.name  = "Garamond"
run.font.size  = Pt(52)
run.font.color.rgb = NAVY

p = doc.add_paragraph()
p.alignment = WD_ALIGN_PARAGRAPH.CENTER
run = p.add_run("SUPER APP")
run.bold = True
run.font.name  = "Garamond"
run.font.size  = Pt(28)
run.font.color.rgb = GREEN

spacer(1)

p = doc.add_paragraph()
p.alignment = WD_ALIGN_PARAGRAPH.CENTER
run = p.add_run("─────────────────────────────────")
run.font.name  = "Garamond"
run.font.size  = Pt(12)
run.font.color.rgb = GREEN

spacer(1)

p = doc.add_paragraph()
p.alignment = WD_ALIGN_PARAGRAPH.CENTER
run = p.add_run("FORMAL BUSINESS PLAN")
run.bold = True
run.font.name  = "Garamond"
run.font.size  = Pt(18)
run.font.color.rgb = NAVY

spacer(2)

for line, sz, col in [
    ("Tlake Tshabalala", 14, NAVY),
    ("Founder & Chief Executive Officer", 11, DGREY),
    ("", 6, BLACK),
    ("Connex (Pty) Ltd  |  Pending Registration", 11, DGREY),
    ("Heidelberg, Gauteng, South Africa", 11, DGREY),
    ("", 6, BLACK),
    ("+27 67 695 5303", 11, DGREY),
    ("tlaketshabalala22@gmail.com", 11, DGREY),
    ("", 6, BLACK),
    ("March 2026", 11, DGREY),
]:
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_before = Pt(0)
    p.paragraph_format.space_after  = Pt(0)
    run = p.add_run(line)
    run.font.name  = "Garamond"
    run.font.size  = Pt(sz)
    run.font.color.rgb = col
    if sz == 14:
        run.bold = True

spacer(3)

p = doc.add_paragraph()
p.alignment = WD_ALIGN_PARAGRAPH.CENTER
pPr = p._p.get_or_add_pPr()
shd = OxmlElement("w:shd")
shd.set(qn("w:val"), "clear"); shd.set(qn("w:color"), "auto"); shd.set(qn("w:fill"), "FEF3C7")
pPr.append(shd)
run = p.add_run("  CONFIDENTIAL — For authorised recipients only. Not for distribution without prior written consent.  ")
run.bold = True
run.font.name = "Garamond"; run.font.size = Pt(10)
run.font.color.rgb = AMBER
p.alignment = WD_ALIGN_PARAGRAPH.CENTER

pb()

# ══════════════════════════════════════════════════════════════════════════════
# TABLE OF CONTENTS
# ══════════════════════════════════════════════════════════════════════════════

p = doc.add_paragraph()
run = p.add_run("TABLE OF CONTENTS")
run.bold = True; run.font.name = "Garamond"; run.font.size = Pt(18)
run.font.color.rgb = NAVY
p.paragraph_format.space_after = Pt(12)

toc_items = [
    ("1.", "Executive Summary"),
    ("2.", "Business Overview"),
    ("3.", "Problem Statement"),
    ("4.", "The Solution — Connex Super App"),
    ("5.", "Market Analysis"),
    ("6.", "Competitive Analysis"),
    ("7.", "Business Model & Revenue Streams"),
    ("8.", "Marketing & Go-to-Market Strategy"),
    ("9.", "Technology & Operations"),
    ("10.", "Management & Team"),
    ("11.", "Financial Projections"),
    ("12.", "Funding Requirements"),
    ("13.", "Risk Analysis & Mitigation"),
    ("Appendix A.", "Full Technology Stack"),
    ("Appendix B.", "Product Roadmap Summary"),
]
for num, title_text in toc_items:
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(2)
    p.paragraph_format.space_after  = Pt(2)
    r1 = p.add_run(f"{num:<12}")
    r1.bold = True; r1.font.name = "Garamond"; r1.font.size = Pt(11)
    r1.font.color.rgb = GREEN
    r2 = p.add_run(title_text)
    r2.font.name = "Garamond"; r2.font.size = Pt(11)
    r2.font.color.rgb = BLACK

pb()

# ══════════════════════════════════════════════════════════════════════════════
# 1. EXECUTIVE SUMMARY
# ══════════════════════════════════════════════════════════════════════════════

h1("Executive Summary", "1")

highlight_box(
    "Connex is South Africa's first true super app \u2014 a single platform combining real-time messaging, "
    "community safety alerts, social networking, and free education resources, with digital payments, "
    "short-form video, and logistics to follow in subsequent phases.",
    bg="0D1B2A", bold=True, size=12
)
spacer()

para(
    "Africa stands at a defining moment in its digital history. The continent has 678 million smartphone "
    "users and counting, a mobile economy growing at 28% compound annual growth rate, and an internet-connected "
    "population that has expanded by more than 300 million people in a single decade. Yet despite this "
    "explosive growth, Africa remains the only major inhabited region on Earth without a dominant, "
    "locally built super app \u2014 a unified platform that consolidates the essential functions of daily "
    "digital life into a single experience. This is not a minor gap. It is the defining opportunity of "
    "the African technology sector in the next five years, and it is the opportunity that Connex is "
    "purpose-built to seize."
)
para(
    "The problem is not that Africans lack demand for digital services. Quite the opposite. The average "
    "South African smartphone user installs and actively uses between eight and twelve separate applications "
    "to manage the daily tasks that a single well-designed platform could deliver. They use WhatsApp for "
    "messaging, TikTok for entertainment, Instagram for social sharing, a banking app for payments, a "
    "separate website for loadshedding schedules, another platform for matric past papers, and various "
    "community groups scattered across platforms they do not control. This fragmentation has a real cost: "
    "South Africa has among the highest mobile data expenses relative to income on the continent, and "
    "every unnecessary app, every background data process, and every duplicate login drains prepaid data "
    "bundles that millions of South Africans budget carefully every month."
)
para(
    "Connex is the answer to that fragmentation. It is a South African super app built from the ground "
    "up for African realities: loadshedding, high data costs, community self-reliance, township economies, "
    "and a youth population \u2014 median age 27 \u2014 that is mobile-first, digitally native, and deeply "
    "networked. Connex is not a Western product adapted for Africa. It is an African product, designed "
    "by someone embedded in the communities it is built to serve, addressing the specific problems those "
    "communities face every single day."
)
para(
    "The Connex Phase 1 MVP launches three deeply integrated modules simultaneously in June 2026. "
    "Connex Chat is a full-featured real-time messaging system \u2014 1:1 messages, group conversations, "
    "status updates, media sharing, and read receipts \u2014 with two features built natively that no "
    "competitor offers: automatic loadshedding schedule alerts wired directly into the chat interface, "
    "and the SOS Emergency Button, a press-and-hold safety mechanism that instantly notifies a user's "
    "trusted emergency contacts via push notification when activated. Connex Feed is a social timeline "
    "with a dedicated Alerts tab that combines official EskomSePush loadshedding data with community "
    "self-tagged posts across six alert categories: Utility, Safety, Traffic, Water, Weather, and "
    "Community. Connex Edu is a free, permanently accessible library of all Department of Basic Education "
    "matric past papers for Grades 10, 11, and 12, served through an in-app PDF viewer at no cost to "
    "any user, ever. Each module is engineered to drive adoption of the others, solving the cold-start "
    "problem that defeats most new social platforms: Chat needs a network, Feed needs content, Edu needs "
    "users. With 1.2 million matric candidates writing exams annually in South Africa, Edu alone provides "
    "a mass adoption driver that costs nothing to market."
)
para(
    "The business model is phase-gated and freemium. Phase 1 is entirely free, focused on building a "
    "large, engaged user base. Revenue activates with Phase 2 (Connex Pay \u2014 a digital wallet with "
    "peer-to-peer transfers, QR merchant payments, and airtime top-up), and compounds through Phase 3 "
    "(Connex Clips \u2014 short-form video with advertising) and Phase 4 (Connex Logistics \u2014 "
    "ride-hailing, food delivery, parcel services). Financial projections place Connex at R250,000 "
    "revenue in Q4 2026, R5.8 million in FY 2027, and R46 million in FY 2028 as all phases operate "
    "in parallel. The company reaches cash-flow positive in Q4 2026."
)
para(
    "Connex is founded and led by Tlake Tshabalala, based in Heidelberg, Gauteng. The business employs "
    "an AI-assisted development model \u2014 using Anthropic's Claude Code and Cursor as the primary "
    "development engine \u2014 which eliminates the need for a large engineering team in the pre-revenue "
    "phase and reduces the monthly burn rate from the industry-standard R100,000 or more (for a "
    "traditional two-to-three developer team) to under R10,000 per month for tools and infrastructure. "
    "This structural cost advantage means the majority of raised seed capital is deployed directly into "
    "user acquisition and community growth rather than engineering overhead."
)
para(
    "Connex is currently raising R500,000 to R2,000,000 in seed funding to accelerate user acquisition, "
    "complete legal and POPIA compliance infrastructure, and initiate the SARB regulatory pathway for "
    "Connex Pay. In parallel, the company is pursuing non-dilutive grant funding through the Google for "
    "Startups Accelerator Africa programme, Microsoft Founders Hub, and AWS Activate \u2014 collectively "
    "representing up to USD 600,000 in cloud computing credits. The investment opportunity is a "
    "pre-revenue, pre-launch entry into what the company believes will become the dominant consumer "
    "technology platform in Sub-Saharan Africa."
)

h2("Key Highlights")
tbl(
    ["Metric", "Detail"],
    [
        ("Business",              "Connex (Pty) Ltd — pending CIPC registration, March 2026"),
        ("Founder",               "Tlake Tshabalala — Founder & CEO, Heidelberg, Gauteng"),
        ("Phase 1 Launch",        "Chat + SOS, Feed + Alerts, Edu — targeting June 2026 alpha"),
        ("Target Market",         "South Africa (37M smartphone users); expanding to Sub-Saharan Africa"),
        ("Revenue Model",         "Phase-gated: Pay (Phase 2), Ads + Clips (Phase 3), Logistics (Phase 4)"),
        ("Year 3 Revenue Target", "R46,000,000 (FY 2028) across all active phases"),
        ("Seed Raise",            "R500,000 – R2,000,000 (current round)"),
        ("Use of Funds",          "User acquisition, legal & compliance, infrastructure, working capital"),
        ("Development Approach",  "AI-assisted — Claude, Cursor — dramatically reduces burn rate"),
    ],
    col_widths=[2.0, 4.2]
)

pb()

# ══════════════════════════════════════════════════════════════════════════════
# 2. BUSINESS OVERVIEW
# ══════════════════════════════════════════════════════════════════════════════

h1("Business Overview", "2")

h2("2.1  Company Description")
para(
    "Connex (Pty) Ltd is a South African technology company building Africa's first true super app. "
    "The company is in the process of formal registration with the Companies and Intellectual Property "
    "Commission (CIPC) and is headquartered in Heidelberg, Gauteng, South Africa. Connex targets the "
    "mass-market smartphone user across South Africa as its primary initial market, with a product "
    "architecture and roadmap designed explicitly for expansion into Zimbabwe, Nigeria, Kenya, and Ghana "
    "in subsequent funding rounds and development phases."
)
para(
    "As of March 2026, Connex is in the pre-revenue, pre-launch phase of its development cycle. The "
    "Phase 1 MVP \u2014 encompassing the Chat, Feed, and Edu modules \u2014 is under active development "
    "and is scheduled for alpha launch in June 2026. The development process is led by the founder "
    "using a pioneering AI-assisted model that combines Anthropic's Claude Code, Cursor, and other "
    "advanced AI development tools to build production-grade mobile and backend software at a fraction "
    "of the cost and timeline that traditional engineering teams would require. This approach is not a "
    "temporary workaround \u2014 it is a deliberate strategic choice that gives Connex a structural "
    "cost and speed advantage over competitors who rely on conventional engineering teams."
)
para(
    "The company operates on a clear four-phase product roadmap spanning from the June 2026 MVP launch "
    "through to full logistics and multi-country operations from 2027 onwards. Each phase is self-financing "
    "from the preceding phase's revenue, meaning the company does not require continuous dilutive "
    "fundraising to execute its roadmap after the initial seed round. The business model is designed "
    "for compounding returns: each new product layer is built on top of an established and engaged user "
    "base, dramatically lowering the cost of each new product's adoption."
)

h2("2.2  Founding Story")
para(
    "Connex was conceived from direct, lived observation. Tlake Tshabalala, the founder, grew up and "
    "lives in Heidelberg, Gauteng \u2014 a community that experiences the full range of challenges the "
    "Connex platform is designed to address. Loadshedding disrupts daily life without warning. Safety "
    "alerts travel through fragmented WhatsApp groups with no structured system for community-wide "
    "broadcasting. Matric students in under-resourced schools scramble to find past papers online, "
    "downloading PDFs from government websites with no organised, searchable, in-app experience. "
    "Payments happen in cash because digital wallets are either inaccessible, too expensive, or locked "
    "behind bank accounts that large portions of the population do not hold."
)
para(
    "The insight was straightforward but powerful: every one of these problems is a software problem, "
    "and every solution already existed in isolation somewhere in the world. What did not exist was a "
    "single platform that combined all of them, designed specifically for the South African context, "
    "built to work on the devices people actually own and the data budgets they actually have. That "
    "platform is Connex. The founding decision was not to copy what already existed elsewhere, but to "
    "build something that would only make sense in Africa \u2014 because it was built by someone who "
    "understands Africa from the inside."
)

h2("2.2  Mission Statement")
highlight_box(
    '"To build the digital infrastructure of African daily life \u2014 one platform that connects people, '
    'keeps communities safe, empowers students, and moves money."',
    bg="F2F4F7", color=NAVY, bold=True
)

h2("2.3  Vision Statement")
highlight_box(
    '"To become the most-used app on the African continent \u2014 the platform that people reach for first, '
    'every single day, for every part of their life."',
    bg="F2F4F7", color=NAVY, bold=True
)

h2("2.4  Core Values")
bullet(
    "Every product decision at Connex is evaluated against one question: does this serve the township, "
    "the student, and the everyday South African? Not the investor. Not the analyst. The user. This "
    "means designing for low-end Android devices first, building for prepaid data budgets, and ensuring "
    "that no feature requires a bank account or formal employment to access.",
    bold_prefix="Community First."
)
bullet(
    "The SOS Emergency Button and the community Alerts tab are not marketing features. They are "
    "safety-critical systems that real people in real emergencies will depend on. Connex treats them "
    "with the seriousness they deserve: mutual consent required for SOS contacts, moderated alerts, "
    "clear community guidelines, and a zero-tolerance policy for false emergency reporting.",
    bold_prefix="Safety & Trust."
)
bullet(
    "Edu is free. Alerts are free. The core messaging platform is free. Connex does not put life-critical "
    "information behind a paywall. A student preparing for matric exams should not need to pay to access "
    "past papers. A resident who needs to know their loadshedding schedule should not need a subscription. "
    "Revenue comes from services that genuinely add premium value, not from gating essential features.",
    bold_prefix="Radical Accessibility."
)
bullet(
    "Connex is not WhatsApp with an alert tab bolted on. It is not a TikTok clone with a pay button "
    "added. Every architectural decision \u2014 the dual-layer alert system, the SOS mutual consent "
    "model, the DBE paper library, the township-first pricing for logistics \u2014 comes from "
    "understanding African daily life and building software that fits it, rather than adapting software "
    "designed for a different continent and a different context.",
    bold_prefix="African by Design."
)
bullet(
    "Connex will be transparent with users about how their data is used, transparent with communities "
    "about how the Alerts system works, and transparent with investors about the true state of the "
    "business at every stage. No vanity metrics. No overstated projections. No hidden terms.",
    bold_prefix="Transparency."
)

h2("2.5  Legal & Compliance Status")
tbl(
    ["Item", "Status", "Action Required"],
    [
        ("Company Registration",   "Pending",    "Register Connex (Pty) Ltd via CIPC — cipc.co.za, R175 online"),
        ("Business Bank Account",  "Pending",    "Open Capitec Business or FNB Business after CIPC confirmation"),
        ("POPIA Compliance",       "In planning","Privacy policy and data handling framework to be finalised"),
        ("SARB Compliance",        "Phase 2",    "Required before Connex Pay processes real money — fintech lawyer needed"),
        ("Google Play Console",    "Pending",    "Register developer account ($25 once) before alpha launch"),
        ("App Store (Apple iOS)",  "Phase 1B",   "Apple Developer Program — $99/year; MVP can launch Android-only first"),
    ],
    col_widths=[1.8, 1.2, 3.2]
)

pb()

# ══════════════════════════════════════════════════════════════════════════════
# 3. PROBLEM STATEMENT
# ══════════════════════════════════════════════════════════════════════════════

h1("Problem Statement", "3")

h2("3.1  The Fragmentation Problem")
para(
    "The average South African smartphone user installs and actively uses between eight and twelve "
    "separate applications to manage their daily digital life. They use WhatsApp for messaging, TikTok "
    "for video entertainment, Instagram for photo sharing, a separate banking application for payments, "
    "a dedicated website or app for loadshedding schedules, another platform for matric past papers, "
    "and various community groups scattered across platforms they do not control and which do not "
    "communicate with each other. The result is a digital experience that is simultaneously over-served "
    "by isolated tools and under-served by any coherent system."
)
para(
    "This fragmentation is not merely inconvenient \u2014 it carries a measurable financial cost. South "
    "Africa has among the highest mobile data prices relative to income on the African continent. "
    "According to the Alliance for Affordable Internet, South Africans in the lowest income bracket "
    "spend between 7% and 15% of their monthly income on mobile data. Every background data process "
    "running from an unused app, every duplicate media download across platforms, and every push "
    "notification pipeline from eight different services compounds that cost. For the majority of South "
    "Africans who rely on prepaid data \u2014 buying bundles of R10, R29, or R49 at a time \u2014 app "
    "fragmentation is not a minor irritation. It is a daily financial burden with a quantifiable Rand "
    "value."
)
para(
    "Beyond the data cost, fragmentation creates switching fatigue. Users must maintain separate "
    "profiles, separate passwords, and separate friend networks across each platform. When a community "
    "safety event occurs, there is no single place to report it that reaches all the right people. "
    "When loadshedding stages change, users must check multiple sources to find the latest schedule for "
    "their specific area. When a student needs a past paper for tomorrow's exam, they must navigate a "
    "government website that was not designed for mobile use. These are not edge cases. They are the "
    "daily reality for tens of millions of South Africans."
)

h2("3.2  The Safety Gap")
para(
    "South Africa has one of the highest rates of violent crime in the world. Community safety is not "
    "an abstract concern \u2014 it is a daily calculation that millions of South Africans make every "
    "time they leave home, every time a family member is late to return, and every time something "
    "suspicious happens in their street. The existing solutions are wholly inadequate. Calling the "
    "South African Police Service in an emergency requires availability of call centre operators. "
    "Calling a family member requires that both parties have airtime. WhatsApp groups are useful but "
    "unstructured, unmoderated, and slow when the stakes are highest."
)
para(
    "No current platform provides a structured, one-action emergency notification system that instantly "
    "reaches a user's trusted contacts \u2014 friends, family, or neighbours \u2014 without requiring "
    "them to unlock their phone, open an app, navigate to a contact, and make a call. The Connex SOS "
    "Emergency Button fills this gap directly. It is always one press-and-hold away in the Chat tab, "
    "and once activated, it fires an instant push notification to all accepted emergency contacts "
    "simultaneously \u2014 with no call centre, no airtime requirement, and no delay."
)

h2("3.2  The Specific Pain Points Connex Addresses")
tbl(
    ["Pain Point", "Current User Behaviour", "Connex Solution"],
    [
        ("Loadshedding uncertainty",      "Checks 2-3 different apps/sites for schedule",           "Automatic alerts in Chat + Alerts tab"),
        ("Community safety alerts",       "No reliable platform for real-time local alerts",         "Self-tagged community posts in Alerts tab"),
        ("Emergency contact notification","Manual phone calls in a crisis",                          "SOS button wired to trusted contacts via FCM"),
        ("Matric exam preparation",       "Downloads papers from DBE website, no app experience",   "Free in-app PDF viewer with all papers organised"),
        ("Messaging + community together","Separate apps for chat vs community news",                "Chat and Feed in one app, same login"),
        ("Data cost of multiple apps",    "Background data drained by 8-12 apps simultaneously",    "One app, one login, one data connection"),
    ],
    col_widths=[1.8, 2.2, 2.2]
)

h2("3.3  The Education Gap")
para(
    "South Africa produces approximately 1.2 million matric exam candidates annually. The Department of "
    "Basic Education publishes past papers for all subjects across Grades 10, 11, and 12 on its official "
    "website. In theory, every student in South Africa has free access to every past paper ever written. "
    "In practice, accessing those papers requires a smartphone with a data bundle sufficient to browse "
    "a government website not optimised for mobile, the knowledge of where to navigate on that website, "
    "and the ability to download and manage PDF files across a file system with no in-app organisation."
)
para(
    "The result is that under-resourced students \u2014 precisely the students who most need free "
    "study resources \u2014 are the least likely to successfully access them. Schools in well-resourced "
    "areas print and distribute past papers. Schools in under-resourced townships do not have the budget "
    "to do so. This is an access inequality disguised as a content availability problem. Connex Edu "
    "solves it completely: a free, organised, in-app library of every DBE past paper, searchable by "
    "grade and subject, with an in-app PDF viewer so students never need to leave the app, download "
    "to a file system, or navigate a government website."
)

h2("3.4  The Market Timing Opportunity")
para(
    "Africa is in the window that analysts and market historians consistently identify as the critical "
    "period when super app market leadership is established \u2014 and once established, nearly "
    "impossible to displace. In China, WeChat won this window between 2012 and 2015, growing from "
    "messaging app to the operating system of Chinese daily life in three years. In Southeast Asia, "
    "Grab and Gojek won it between 2014 and 2018. In each case, the winning platform was the one that "
    "moved fastest during the window, acquired the largest user base before competitors could respond, "
    "and built the deepest feature integration to create genuine switching costs."
)
para(
    "That same window is now open in Africa \u2014 and unlike China in 2012 or Southeast Asia in 2014, "
    "no single dominant player has yet emerged. The global super app market is valued at USD 58.7 "
    "billion in 2023 and projected to reach USD 722 billion by 2032, growing at 28% compound annual "
    "growth rate. No African-built, African-first super app currently exists at scale. The closest "
    "contenders \u2014 VodaPay, Ayoba, and various fintech platforms \u2014 are either too narrow in "
    "scope, too carrier-dependent, or too disconnected from the community and safety needs of everyday "
    "South Africans to serve as the foundation for a true super app. The window will not remain open "
    "indefinitely. Connex is built to move fast, acquire users at scale, and establish the community "
    "network effects that make displacement prohibitively difficult."
)

pb()

# ══════════════════════════════════════════════════════════════════════════════
# 4. THE SOLUTION — CONNEX SUPER APP
# ══════════════════════════════════════════════════════════════════════════════

h1("The Solution — Connex Super App", "4")

para(
    "Connex is built in four phases, each adding a new product layer while deepening engagement across "
    "existing modules. The architecture of each phase is deliberate: Phase 1 builds the user base and "
    "the community, Phase 2 monetises that community through financial services, Phase 3 adds "
    "entertainment and advertising, and Phase 4 completes the super app vision with physical-world "
    "logistics. Each phase is designed to be self-reinforcing \u2014 users who joined for Edu stay for "
    "Chat, users who stay for Chat are already in the app when Pay launches, and users with Pay accounts "
    "are the natural early adopters of Logistics. This flywheel architecture is intentional and central "
    "to the Connex growth model."
)

h2("4.1  Phase 1 \u2014 Chat, Feed, and Edu  (Launch: June 2026)")

h3("Connex Chat \u2014 Real-Time Messaging with Safety Built In")
para(
    "Connex Chat is a full-featured real-time messaging system built on Supabase Realtime \u2014 a "
    "WebSocket-based infrastructure that delivers messages instantly without polling. The user experience "
    "mirrors the WhatsApp interface that South African users already know and trust: a conversation list "
    "screen, individual chat room screens with message bubbles, a floating chat input with media "
    "attachment support, and a status updates screen for 24-hour disappearing content."
)
para(
    "The feature set includes 1:1 direct messages, group conversations with named groups, group profile "
    "images, admin role management within groups, 24-hour disappearing status updates, image sharing, "
    "and a message status system showing sent, delivered, and read receipts through a double-tick "
    "display. These are table-stakes features that ensure Connex Chat can serve as a full replacement "
    "for WhatsApp in the daily messaging habits of South African users."
)
para(
    "What distinguishes Connex Chat from every competitor is what is built natively into the interface "
    "without any additional app or subscription required. First, loadshedding alerts are wired directly "
    "into the chat list: when the backend cron job detects that a user's registered area is entering a "
    "scheduled power outage \u2014 using data fetched from the EskomSePush API every four hours and "
    "cached in Upstash Redis \u2014 a system notification card appears at the top of the chat list. "
    "No separate app. No checking a website. The user sees it where they already are."
)
para(
    "Second, and more significantly, the SOS Emergency Button is embedded in the Chat tab. It is a "
    "press-and-hold button that requires a deliberate three-second hold to activate, with haptic "
    "feedback and a countdown animation so accidental activation is prevented. When triggered, it "
    "instantly dispatches a Firebase Cloud Messaging push notification to every user who has been "
    "accepted as an emergency contact. Critically, the system requires mutual consent: both the "
    "initiating user and the contact must explicitly accept the emergency contact relationship before "
    "either party can trigger notifications to the other. This design prevents misuse, builds trust "
    "in the system, and ensures that every SOS notification that arrives is from someone the recipient "
    "has agreed to be responsible for. In Phase 1, the SOS sends notifications only. In Phase 2, GPS "
    "location sharing is added. In Phase 4, integration with SAPS and licensed security services is "
    "planned."
)

h3("Connex Feed \u2014 Social Timeline with Community Intelligence")
para(
    "Connex Feed is a social timeline where users post text and image content, follow other users, "
    "and react to posts using a reaction system. The fundamental architecture is familiar \u2014 a "
    "chronological or near-chronological feed of content from followed users \u2014 but the "
    "differentiating feature is the Alerts tab built into the Feed navigation."
)
para(
    "The Alerts tab is a dedicated section where posts tagged by their authors with one of six "
    "community alert categories surface as structured, area-filtered alerts. The six categories are: "
    "Utility (power, water, and infrastructure outages beyond loadshedding), Safety (crime, suspicious "
    "activity, and emergency events), Traffic (accidents, road closures, and congestion), Water "
    "(water outages, pipe bursts, and supply disruptions), Weather (storms, flooding, and severe "
    "conditions), and Community (general community notices, lost pets, neighbourhood announcements). "
    "When a user posts to the Feed and selects one of these categories, their post appears both in "
    "the main Feed timeline and in the Alerts tab, filtered by the poster's registered area."
)
para(
    "The Alerts system operates on two complementary layers. Layer 1 is official data: loadshedding "
    "schedules fetched from the EskomSePush API by a backend cron job running every four hours, cached "
    "in Redis, and displayed in the Alerts tab as structured official data cards. This gives the Alerts "
    "tab accurate, reliable content from day one \u2014 even before any community members have posted "
    "anything. Layer 2 is community intelligence: self-tagged posts by real users reporting real "
    "conditions in real time, filtered to the reader's area. This is information no official API can "
    "provide \u2014 that there is a robbery in progress on a specific street, that a water pipe has "
    "burst at a specific intersection, that a road is flooded after unexpected rain. The combination "
    "of official data and community intelligence makes the Alerts tab uniquely valuable and uniquely "
    "resistant to competition."
)

h3("Connex Edu \u2014 Free Matric Papers for Every South African Student")
para(
    "Connex Edu is a free, permanently accessible library of all Department of Basic Education matric "
    "past papers for Grades 10, 11, and 12, covering the full range of subjects offered in the South "
    "African National Senior Certificate curriculum. Papers are uploaded to Supabase Storage and served "
    "to users through signed URLs \u2014 time-limited, secure access links \u2014 with an in-app PDF "
    "viewer powered by react-native-pdf, so students open, read, and study directly in the app without "
    "needing to download files to their device storage or navigate to an external website."
)
para(
    "The user experience is deliberately simple: open the Edu tab, select your grade, select your "
    "subject, and see a list of all available past papers organised by year. Tap any paper to open it "
    "in the in-app viewer. There is no login required beyond the standard Connex account. There is no "
    "paywall. There is no subscription. There is no advertising. Edu is a public good delivered through "
    "private infrastructure, and it is the single most powerful user acquisition driver in the Connex "
    "platform \u2014 because 1.2 million matric candidates write exams in South Africa every year, and "
    "every one of them is a potential user who needs exactly what Edu provides."
)

h2("4.2  Phase 2 \u2014 Connex Pay  (Target: Q4 2026)")
para(
    "Connex Pay is a full in-app digital wallet and payment platform, launching in Q4 2026 and "
    "representing the first revenue-generating phase of the Connex product roadmap. The core feature "
    "set includes peer-to-peer ZAR transfers by phone number (send money to anyone in your contacts "
    "with a Connex account), QR code merchant payments (generate or scan a QR code to pay or receive "
    "at any point of sale), airtime and data top-up for all major South African networks (Vodacom, MTN, "
    "Cell C, Telkom), and bill payments for key recurring expenses including electricity tokens and DSTV "
    "subscriptions."
)
para(
    "The revenue model for Connex Pay is a 1 to 2 percent transaction fee on peer-to-peer transfers, "
    "a 3 to 5 percent commission margin on airtime and data top-up resale, and a monthly subscription "
    "fee of R299 to R999 for Connex Business accounts used by merchants and small business owners. "
    "SARB regulatory compliance is a prerequisite for processing real money transactions, and the "
    "formal compliance pathway \u2014 which may involve partnering with a licensed financial services "
    "entity as an interim model \u2014 will be initiated during the Phase 1 build period. The fintech "
    "compliance manager hire, scheduled for Q3 2026, will lead this process."
)

h2("4.3  Phase 3 \u2014 Connex Clips  (Target: Q4 2026 / Q1 2027)")
para(
    "Connex Clips is a short-form vertical video module that positions Connex directly in competition "
    "with TikTok and Instagram Reels in the African market. The feature set includes in-app video "
    "recording and editing, gallery upload, a personalised For You algorithm feed, creator profiles "
    "with a verification system, and a monetisation infrastructure that enables creators to earn "
    "directly from the platform. Connex retains 30 percent of creator earnings from tips and "
    "subscriptions, consistent with global platform norms. Phase 3 introduces the advertising revenue "
    "stream: mid-roll video ads and sponsored clip placements, sold on a CPM basis to South African "
    "and regional brands seeking access to Connex's engaged, demographically valuable user base."
)

h2("4.4  Phase 4 \u2014 Connex Logistics  (Target: 2027)")
para(
    "Connex Logistics is the physical-world layer of the super app, bringing ride-hailing, food "
    "delivery, parcel services, and grocery delivery into the Connex platform. The pricing model is "
    "explicitly township-first \u2014 structured to be competitive with the informal taxi and delivery "
    "networks that already exist in township communities, rather than the premium pricing of existing "
    "formal logistics platforms. Revenue comes from a 15 to 25 percent commission on each completed "
    "trip or order, with higher commission rates for premium service tiers."
)
para(
    "Phase 4 also includes Connex for Business: a merchant dashboard that allows spaza shops, "
    "restaurants, and township SMEs to list products and manage orders within the Connex platform, "
    "paired with a dedicated driver and courier partner application for the supply side of the "
    "logistics network. The SOS system also expands in Phase 4 to include licensed security service "
    "integration and, subject to engagement with SAPS, emergency services dispatch capability."
)

h2("4.5  Phase Summary")
tbl(
    ["Phase", "Product", "Launch Target", "Key Revenue Model", "ARR at Scale"],
    [
        ("1", "Chat + SOS + Feed + Alerts + Edu", "June 2026",   "No direct revenue — user acquisition", "R0"),
        ("2", "Connex Pay",                        "Q4 2026",     "Transaction fees (1-2%), airtime commission", "R35M+"),
        ("3", "Connex Clips",                      "Q4 2026+",    "Video ads, creator revenue share",    "R15M+"),
        ("4", "Connex Logistics",                  "2027",        "15-25% commission per trip/order",    "R68M+"),
        ("5+","Enterprise & Expansion",            "2028+",       "Data licensing, government contracts, multi-country", "R180M+"),
    ],
    col_widths=[0.6, 2.2, 1.2, 2.2, 1.0]
)

pb()

# ══════════════════════════════════════════════════════════════════════════════
# 5. MARKET ANALYSIS
# ══════════════════════════════════════════════════════════════════════════════

h1("Market Analysis", "5")

h2("5.1  African Digital Market")
tbl(
    ["Metric", "Current (2023/2026)", "Target (2030/2032)", "Source"],
    [
        ("African Population",           "1.35B / 1.41B",     "1.7B by 2030",          "UN Population Division"),
        ("Smartphone Users (Africa)",    "550M / 678M",       "900M by 2030",          "GSMA Intelligence"),
        ("Internet Users (Africa)",      "500M / 600M+",      "900M by 2030",          "ITU"),
        ("Mobile Money Accounts",        "500M+ / 600M+",     "1 billion by 2030",     "GSMA Mobile Money"),
        ("Africa Mobile Money (USD)",    "$5.2B / $9.18B",    "$67.18B by 2034",       "OpenPR Research"),
        ("Global Super App Market",      "$58.7B",            "$722B by 2032 (28% CAGR)","Allied Market Research"),
    ],
    col_widths=[2.0, 1.8, 1.8, 1.6]
)

h2("5.2  South African Market")
tbl(
    ["Metric", "2026 Estimate", "2028 Forecast", "Source"],
    [
        ("SA Population",         "62 million",   "64 million",   "Stats SA"),
        ("SA Smartphone Users",   "37 million",   "42 million",   "GSMA"),
        ("SA Internet Users",     "43 million",   "48 million",   "Stats SA / ITU"),
        ("SA Social Media Users", "39 million",   "44 million",   "DataReportal"),
        ("Matric Candidates/yr",  "1.2 million",  "1.3 million",  "DBE Annual Reports"),
        ("SA App Revenue",        "$200M+",       "$400M+",       "Adjust / Sensor Tower"),
    ],
    col_widths=[2.2, 1.6, 1.6, 1.8]
)

h2("5.3  South African Market in Detail")
para(
    "South Africa is the most mature digital economy in Sub-Saharan Africa and the natural beachhead "
    "market for Connex. With 37 million smartphone users, 43 million internet users, and 39 million "
    "social media users in a population of 62 million, South Africa has one of the highest smartphone "
    "penetration rates on the continent. The country also has the most developed fintech infrastructure "
    "on the continent, with established mobile banking penetration, a sophisticated payments regulatory "
    "environment (the SARB), and a population that is already familiar with digital financial services "
    "through platforms like Capitec, FNB, and Standard Bank's digital channels."
)
para(
    "Critically, South Africa has a structural characteristic that makes it uniquely suited for a "
    "super app: persistent national infrastructure failures, most notably loadshedding, that create "
    "daily demand for real-time utility alert systems. No other major African market has this specific "
    "characteristic at the same scale. This means Connex's most powerful early acquisition hook \u2014 "
    "loadshedding alerts \u2014 is specific to the South African market and cannot be easily replicated "
    "by a competitor entering from a market where loadshedding does not exist."
)
para(
    "The matric examination system provides a second South Africa-specific advantage: 1.2 million "
    "candidates writing the NSC exams annually, all needing the same set of DBE past papers, all "
    "accessible through a single government curriculum framework. This creates a nationally uniform "
    "content acquisition strategy that does not require localisation for different cities or regions "
    "\u2014 the same papers, the same subjects, the same curriculum applies from Cape Town to "
    "Polokwane."
)

h2("5.4  Total Addressable, Serviceable, and Obtainable Market")
tbl(
    ["Market Level", "Definition", "Size Estimate"],
    [
        ("TAM — Total Addressable Market",  "All African smartphone users who could use a super app", "678 million users / USD 722B market by 2032"),
        ("SAM — Serviceable Addressable Market", "South African smartphone users, English/Zulu/Sotho-speaking", "37 million users"),
        ("SOM — Serviceable Obtainable Market (Year 1)", "SA users reachable via Connex's GTM strategy in Phase 1", "10,000 MAUs (Q3 2026) → 50,000 MAUs (Q4 2026)"),
        ("SOM — Medium Term (Year 2-3)",    "SA users with strong product-market fit established", "500,000 MAUs (2027) → 2,000,000 MAUs (2028)"),
    ],
    col_widths=[2.2, 2.4, 2.6]
)

h2("5.4  Market Trends Favouring Connex")
bullet(
    "South Africa has experienced more than 200 days of loadshedding per year in recent cycles, with "
    "stages ranging from 2 to 6 representing power cuts of 2 to 8 hours daily. The demand for reliable, "
    "real-time loadshedding schedule alerts is not seasonal or cyclical \u2014 it is structural and "
    "permanent for the foreseeable future. EskomSePush, the most popular loadshedding app, has "
    "consistently ranked among the top 10 downloaded apps in South Africa during load shedding cycles, "
    "demonstrating that South Africans will download an app specifically for utility alerts. Connex "
    "delivers the same data natively inside a platform they use for everything else.",
    bold_prefix="Loadshedding remains a national crisis."
)
bullet(
    "South Africa has a median population age of 27 years. This means the majority of the target "
    "market has grown up with smartphones, is comfortable adopting new digital tools, and has high "
    "peer-to-peer influence networks through schools, townships, and social media. Youth adoption "
    "drives exponential network effects in social platforms, as each young user brings their peer "
    "group with them.",
    bold_prefix="Youth-dominated, mobile-first population."
)
bullet(
    "The super app market leadership window in Africa is currently open and analysts project it will "
    "close within three to five years as a dominant player consolidates. Connex is entering the market "
    "at the earliest viable moment \u2014 when smartphone penetration is sufficient for mass adoption "
    "but the market is not yet consolidated. This is precisely the timing advantage that WeChat and "
    "Grab exploited in their respective markets.",
    bold_prefix="No dominant super app in Africa."
)
bullet(
    "Across South African townships and communities, WhatsApp groups have become the de facto community "
    "alert system for crime reports, water outages, road closures, and local news. This behaviour is "
    "well established and deeply embedded. Connex Alerts does not ask communities to change their "
    "behaviour \u2014 it gives them a structured, searchable, area-filtered version of exactly what "
    "they are already doing, inside an app they use for everything else.",
    bold_prefix="Community self-reporting fills official gaps."
)
bullet(
    "GSMA data shows Africa's mobile money market processed USD 9.18 billion in transactions in 2026, "
    "growing toward a projected USD 67.18 billion by 2034. Yet the majority of this volume flows "
    "through carrier-linked wallets (M-Pesa, MTN MoMo) that are tied to specific telecoms providers. "
    "No independent, platform-agnostic consumer wallet exists at scale in South Africa. Connex Pay "
    "enters a market with proven, substantial demand and no dominant independent competitor.",
    bold_prefix="Mobile money market growing rapidly."
)

pb()

# ══════════════════════════════════════════════════════════════════════════════
# 6. COMPETITIVE ANALYSIS
# ══════════════════════════════════════════════════════════════════════════════

h1("Competitive Analysis", "6")

h2("6.1  Competitor Landscape")
tbl(
    ["Competitor", "Users", "Key Modules", "Weaknesses vs Connex"],
    [
        ("WhatsApp / Meta",    "500M+ Africa",   "Messaging, calls, status, payments (limited SA)",  "No community alerts, no Edu, no local utility — global product not built for SA"),
        ("VodaPay",            "2M (SA)",        "Payments, shopping, some services",                "No social, no Chat, no SOS, no Edu — narrow fintech focus"),
        ("Ayoba (MTN)",        "30M (Africa)",   "Messaging, content, games",                        "No payments, no Edu, no Alerts, inferior chat experience"),
        ("TikTok",             "200M+ (Africa)", "Short video, live streaming",                      "No payments, no safety, no alerts — entertainment only"),
        ("Capitec / FNB App",  "8-10M (SA)",     "Banking, payments, account management",            "No social, no content, no community — financial tool only"),
        ("Tingg (Cellulant)",  "220M connected", "Payments, B2B",                                    "Not consumer-facing, no social, no chat, no edu"),
    ],
    col_widths=[1.4, 1.1, 2.0, 2.7]
)

h2("6.2  Connex Competitive Advantages")
bullet(
    "Connex is the only platform that combines real-time messaging, SOS emergency notifications, "
    "community safety alerts, a social Feed, free matric education resources, a digital payments "
    "wallet, short-form video, and physical logistics in a single South African product. Every "
    "competitor addresses one or two of these needs in isolation. Connex addresses all of them in an "
    "integrated system where each feature increases the value of every other feature. This integration "
    "creates switching costs that isolated competitors cannot match \u2014 once a user's emergency "
    "contacts are set up in Connex and their chat network is established, the cost of leaving "
    "increases with every additional feature they use.",
    bold_prefix="Integration depth."
)
bullet(
    "The SOS mutual-consent emergency contact system is genuinely unique in the market. No competitor "
    "has built a real-time, one-action community safety notification system into a social platform. "
    "WhatsApp could theoretically build this, but they have not \u2014 and every month they do not, "
    "Connex deepens its safety network with more mutual-consent relationships that would be lost if "
    "users switched platforms. Safety features are among the highest-retention product categories in "
    "consumer applications \u2014 people do not leave a platform where their emergency contacts live.",
    bold_prefix="Safety infrastructure."
)
bullet(
    "The dual-layer alerts system \u2014 official EskomSePush API data combined with community "
    "self-tagged posts \u2014 creates a data asset that cannot be replicated by a platform that does "
    "not have a community. A competitor can license the EskomSePush API. A competitor cannot license "
    "the community intelligence that emerges from thousands of users tagging real-time local events "
    "in their specific neighbourhoods. This data layer becomes more valuable with every user that "
    "joins, creating a data moat alongside the network moat.",
    bold_prefix="Dual-layer alerts."
)
bullet(
    "Free DBE past papers for 1.2 million matric candidates annually is an acquisition strategy with "
    "zero marginal cost per user. The papers are a fixed cost \u2014 upload them once, serve them "
    "forever. Each student who downloads Connex for Edu becomes a potential Chat user, a potential "
    "Feed user, and a future Pay user. No competitor offers this. It cannot be quickly copied without "
    "significant investment in content curation, legal clearance with the DBE, and an in-app PDF "
    "infrastructure that takes months to build.",
    bold_prefix="Education anchor."
)
bullet(
    "The AI-assisted development model gives Connex a structural cost advantage that translates "
    "directly into competitive speed. While a competitor with a traditional engineering team spends "
    "R100,000 per month or more on salaries, Connex spends under R10,000 on AI tools and "
    "infrastructure. This means Connex can ship features faster, respond to market feedback more "
    "quickly, and allocate a larger proportion of raised capital to marketing and user acquisition "
    "rather than engineering overhead. As AI development tools continue to improve, this advantage "
    "compounds rather than diminishes.",
    bold_prefix="AI-native build model."
)
bullet(
    "Every design decision in Connex reflects the realities of the South African market rather than "
    "a global average. Township-first logistics pricing. Loadshedding-aware alerts. Prepaid-data "
    "conscious data efficiency. DBE curriculum alignment in Edu. Community self-reliance built into "
    "the Alerts architecture. These features do not make sense in London or Singapore. They make "
    "perfect sense in Heidelberg, Soweto, and Khayelitsha \u2014 and that specificity is a moat, "
    "not a limitation.",
    bold_prefix="Africa-first design."
)

h2("6.3  SWOT Analysis")
swot_table = doc.add_table(rows=2, cols=2)
swot_table.style = "Table Grid"
swot_table.alignment = WD_TABLE_ALIGNMENT.LEFT

swot_data = [
    ("STRENGTHS", "0D1B2A",
     "• First-mover in SA super app space\n• AI-assisted = low build costs\n• Dual-layer alerts (unique)\n• SOS = safety-critical retention\n• Edu = 1.2M matric students/year\n• Modules reinforce each other"),
    ("WEAKNESSES", "B45309",
     "• Pre-revenue, pre-product stage\n• Single founder — no CTO/co-founder\n• No brand recognition yet\n• Regulatory complexity for Connex Pay\n• Content moderation costs at scale"),
    ("OPPORTUNITIES", "006B3C",
     "• 678M smartphone users, no super app\n• 28% CAGR super app market\n• Loadshedding = daily demand for alerts\n• High SA youth population (median 27)\n• Government/NGO alert partnerships\n• Fragmentation fatigue = switching intent"),
    ("THREATS", "991B1B",
     "• WhatsApp expanding features\n• VodaPay has Vodacom backing\n• SARB fintech regulation delays\n• Content moderation at scale\n• Talent retention post-funding"),
]

positions = [(0,0), (0,1), (1,0), (1,1)]
for idx, (label, color, content) in enumerate(swot_data):
    ri, ci = positions[idx]
    cell = swot_table.rows[ri].cells[ci]
    set_cell_bg(cell, color)
    set_cell_border(cell, "FFFFFF")
    cell.width = Inches(3.1)
    p1 = cell.paragraphs[0]
    r1 = p1.add_run(label)
    r1.bold = True; r1.font.name = "Garamond"; r1.font.size = Pt(11)
    r1.font.color.rgb = WHITE
    p2 = cell.add_paragraph(content)
    p2.paragraph_format.space_before = Pt(4)
    for run in p2.runs:
        run.font.name = "Garamond"; run.font.size = Pt(10)
        run.font.color.rgb = WHITE

spacer()
pb()

# ══════════════════════════════════════════════════════════════════════════════
# 7. BUSINESS MODEL & REVENUE STREAMS
# ══════════════════════════════════════════════════════════════════════════════

h1("Business Model & Revenue Streams", "7")

h2("7.1  Business Model Overview")
para(
    "Connex operates a freemium, phase-gated business model. The core platform \u2014 Chat, Feed, "
    "SOS, Alerts, and Edu \u2014 is permanently free to all users. This is not a temporary promotional "
    "strategy: it is a fundamental design decision. Free access maximises adoption velocity, eliminates "
    "the payment friction that would slow network effect growth, and ensures that Connex reaches the "
    "communities that need it most, regardless of income level."
)
para(
    "Revenue is introduced deliberately and sequentially, layered on top of an established and engaged "
    "user base at each phase. This approach mirrors the strategy of every successful super app globally: "
    "WeChat launched as a free messaging app and added payments (WeChat Pay) only after achieving "
    "hundreds of millions of users. Grab launched as a ride-hailing app and added food delivery and "
    "financial services only after establishing market dominance. Gojek built its entire empire on top "
    "of a motorcycle-taxi user base before expanding to payments, food, and logistics. The lesson from "
    "every successful super app is identical: build the user base first, monetise second. Connex is "
    "following this playbook with full awareness of why it works."
)
para(
    "The phase-gated model also has a financial planning advantage: each new revenue phase is funded "
    "by the preceding phase's revenue, meaning the company does not need a continuous stream of "
    "dilutive equity raises to execute its full roadmap. The seed round funds Phase 1 and the beginning "
    "of Phase 2. Phase 2 revenue funds Phase 3 development. Phase 3 and 4 revenues fund the "
    "continental expansion. This is a capital-efficient growth model, not a growth-at-all-costs burn."
)

h2("7.2  Revenue Stream Detail")
tbl(
    ["Revenue Stream", "Phase", "Model", "Rate", "Active From"],
    [
        ("Pay: P2P Transfer Fees",    "2", "% of transaction value",            "1–2% per transfer",         "Q4 2026"),
        ("Pay: Airtime Commission",   "2", "Margin on top-up resale",           "3–5% per top-up",           "Q4 2026"),
        ("Pay: Business Accounts",    "2", "Monthly subscription (merchants)",  "R299–R999/month",           "Q4 2026"),
        ("Feed/App Advertising",      "2", "CPM/CPC brand advertising",         "Per impression / click",    "Q4 2026"),
        ("Clips: Video Ads",          "3", "Mid-roll + sponsored clips",        "CPM-based",                 "Q4 2026+"),
        ("Clips: Creator Revenue",    "3", "30% platform cut on tips + subs",   "30% of creator earnings",   "Q4 2026+"),
        ("Logistics: Commission",     "4", "% of trip or order value",          "15–25% per transaction",    "2027"),
        ("Connex Premium",           "2+", "Cross-platform subscription",       "R49–R149/month",            "Q4 2026"),
        ("Data & API Licensing",     "3+", "Anonymised community alert data",   "Enterprise contracts",      "2027"),
    ],
    col_widths=[1.8, 0.6, 1.7, 1.5, 1.0]
)

h2("7.3  Revenue Projections (Phase-Based)")
tbl(
    ["Period", "Phase Active", "Total Revenue (R)", "Key Driver"],
    [
        ("Q3 2026 (MVP Launch)", "Phase 1",             "R0",           "User acquisition — no monetisation"),
        ("Q4 2026",              "Phase 1 + Pay starts","R250,000",     "First Pay transactions + early advertising"),
        ("FY 2027",              "Phase 1 + 2 + Clips", "R5,800,000",  "Pay at scale + video ads + business accounts"),
        ("FY 2028",              "All phases active",   "R46,000,000", "Pay + Clips + Logistics + Premium + Data"),
    ],
    col_widths=[1.6, 1.8, 1.6, 2.2]
)

pb()

# ══════════════════════════════════════════════════════════════════════════════
# 8. MARKETING & GO-TO-MARKET STRATEGY
# ══════════════════════════════════════════════════════════════════════════════

h1("Marketing & Go-to-Market Strategy", "8")

h2("8.1  Target Audience")
tbl(
    ["Segment", "Profile", "Primary Hook"],
    [
        ("Matric Students",      "Grades 10–12, age 16–19, SA schools, smartphone users",           "Free Edu — past papers in-app"),
        ("Township Communities", "Urban/peri-urban, prepaid data, community-driven, age 18–35",      "Loadshedding alerts + community Alerts tab"),
        ("Social Media Users",   "Active on WhatsApp/Instagram/TikTok, age 18–30",                  "Feed + Clips (later) + one-app convenience"),
        ("Safety-Conscious Adults","Parents, homeowners, small business owners, age 25–45",          "SOS button + community safety alerts"),
        ("Small Business Owners","Township SMEs, spaza shops, freelancers, age 25–50",               "Connex Pay (Phase 2) + Connex for Business"),
    ],
    col_widths=[1.6, 2.8, 2.0]
)

h2("8.2  Go-to-Market Strategy \u2014 Phase 1")

h3("1. Edu as the Silent Acquisition Engine")
para(
    "With 1.2 million matric candidates writing exams in South Africa every year, free access to all "
    "Department of Basic Education past papers is a compelling download reason that requires no "
    "marketing budget to activate. The mechanics are simple and powerful: a single tweet, WhatsApp "
    "forward, or TikTok post from a student, teacher, or parent that reads 'free matric papers in "
    "this app' reaches thousands of potential users in hours. Teachers share the app link with their "
    "classes. Students share it with their study groups. Parents share it with other parents. Each "
    "share is a free, trusted referral from someone the recipient already knows."
)
para(
    "The Edu acquisition engine has no ongoing cost beyond the infrastructure to serve the PDFs. "
    "Once papers are uploaded to Supabase Storage, they serve indefinitely at negligible marginal cost "
    "per download. The acquisition channel scales with the size of the matric class, which grows "
    "every year. Connex will actively seed this channel by partnering with popular matric study "
    "influencers on TikTok and Instagram \u2014 accounts with hundreds of thousands of followers who "
    "post study tips and past paper resources \u2014 providing them with early access and a referral "
    "arrangement."
)

h3("2. Loadshedding Content Marketing")
para(
    "Beginning at least two months before the Phase 1 app launch, the Connex social media accounts "
    "on X (Twitter), TikTok, and Instagram will post daily loadshedding schedule updates for all major "
    "South African areas. These posts are generated automatically from the EskomSePush API data and "
    "formatted for each platform's native format. This strategy has a precedent: EskomSePush itself "
    "built a following of over 500,000 users on social media and 4 million app installs almost "
    "entirely through utility-first content marketing."
)
para(
    "For Connex, this strategy serves two simultaneous purposes: it builds brand recognition and a "
    "social media following before the app is publicly available, and it demonstrates the utility of "
    "the product to potential users before they have downloaded it. Users who follow the Connex "
    "account for daily loadshedding updates are already experiencing the value proposition of the "
    "Alerts tab. When the app launches, the conversion call is simple: 'Get this in-app, personalised "
    "to your area, with community alerts and free matric papers included.'"
)

h3("3. Township Champion Programme")
para(
    "The Connex Township Champion Programme will recruit 50 community influencers from Gauteng "
    "townships in the three months before launch. These are not necessarily large social media "
    "accounts \u2014 they are trusted voices in their specific communities: community leaders, "
    "church leaders, school parents, local business owners, and WhatsApp group admins with 500 to "
    "5,000 followers or group members. They receive early access to the app, a personalised referral "
    "link that tracks installs attributed to them, and a small incentive (airtime credit or cash "
    "equivalent) for each verified new user they bring in."
)
para(
    "Word-of-mouth in tightly networked township communities is categorically more effective than "
    "paid digital advertising at the early stage of a consumer app launch. A recommendation from a "
    "trusted community member carries far more weight than a Google App Install ad to someone who "
    "has never heard of Connex. The Township Champion Programme costs a fraction of a paid "
    "advertising campaign while producing better-quality, higher-retention users \u2014 because "
    "they arrive with a social connection to the app and a trusted referrer they can ask for help."
)

h3("4. School Partnership Programme")
para(
    "Connex will establish formal partnerships with 50 schools in Gauteng before the Phase 1 launch, "
    "beginning outreach in April 2026. The partnership offer is straightforward: Connex Edu is free "
    "for every learner at the school, the school gets a branded 'partner school' designation in the "
    "app, and teachers can use Connex to share educational alerts and announcements with the school "
    "community through the Feed. In return, the school distributes the app link to learners and "
    "parents through their existing communication channels \u2014 WhatsApp groups, newsletters, "
    "and classroom announcements."
)
para(
    "A single school with 800 learners represents 800 potential app installs. Those 800 learners "
    "each have parents, guardians, and siblings \u2014 multiplying the potential reach by a factor "
    "of three to five. Fifty schools represent a potential direct reach of 40,000 learners and an "
    "extended reach of 120,000 to 200,000 community members, before any paid marketing has been "
    "deployed. This is the most capital-efficient large-scale acquisition strategy available to a "
    "pre-seed consumer technology company."
)

h2("8.3  Pre-Launch Content Strategy")
para(
    "The Connex marketing strategy begins before the app launches. Starting in April 2026, two months "
    "before the targeted June alpha launch, the Connex social media accounts will publish daily content "
    "across X (Twitter), TikTok, and Instagram. The content strategy is deliberately utility-first: "
    "daily loadshedding schedules, water outage reports aggregated from community sources, traffic "
    "alerts for major South African routes, and matric study tips and paper previews from the Connex "
    "Edu library. This content is genuinely valuable to South African smartphone users independent of "
    "whether they have downloaded Connex, which means it builds a following of exactly the right "
    "audience before the app is available."
)
para(
    "The call to action embedded in every piece of content is consistent: 'Get this in your app, "
    "personalised to your area, with free matric papers and community chat included.' Each post links "
    "to a pre-registration waitlist page that collects email addresses and phone numbers of interested "
    "users before launch. This waitlist becomes the founding user cohort on launch day \u2014 a group "
    "of people who have already indicated strong intent to install the app, dramatically improving "
    "the opening week download numbers that are critical for Google Play Store ranking algorithms."
)

h2("8.4  Digital Marketing Channels")
tbl(
    ["Channel", "Strategy", "Cost", "Target Metric"],
    [
        ("X (Twitter)",    "Daily loadshedding posts, alerts, product updates",    "R0 (organic)", "10,000 followers by launch"),
        ("TikTok",         "Loadshedding alerts, app demos, SA lifestyle content", "R0 (organic)", "5,000 followers by launch"),
        ("Instagram",      "Visual brand content, community stories, alerts",      "R0 (organic)", "3,000 followers by launch"),
        ("WhatsApp Groups","Community sharing via township champion programme",    "R0 (organic)", "50 champion nodes"),
        ("Google UAC",     "App install campaigns post-seed raise",               "R100K+/month", "10,000 installs/month"),
        ("School Outreach","Direct partnerships — email + in-person visits",      "Travel costs",  "50 schools Q2 2026"),
    ],
    col_widths=[1.3, 2.2, 1.2, 1.9]
)

h2("8.5  Key Performance Indicators \u2014 Marketing")
tbl(
    ["KPI", "Q3 2026 Target", "Q4 2026 Target", "FY 2027 Target"],
    [
        ("App Downloads (cumulative)",       "5,000",     "50,000",    "300,000"),
        ("Monthly Active Users (MAUs)",      "10,000",    "50,000",    "500,000"),
        ("Social Media Followers (all)",     "20,000",    "50,000",    "200,000"),
        ("School Partnerships Active",       "50",        "100",       "500"),
        ("Township Champions Active",        "50",        "200",       "1,000"),
        ("Pre-Registration Waitlist",        "2,000",     "N/A",       "N/A"),
        ("Organic Install Rate",             "70%",       "60%",       "50%"),
        ("7-Day Retention Rate",             "45%",       "50%",       "60%"),
    ],
    col_widths=[2.4, 1.5, 1.5, 1.8]
)

pb()

# ══════════════════════════════════════════════════════════════════════════════
# 9. TECHNOLOGY & OPERATIONS
# ══════════════════════════════════════════════════════════════════════════════

h1("Technology & Operations", "9")

h2("9.1  Technology Stack Overview")
para(
    "Connex is built on a modern, cloud-native, mobile-first technology stack. Every component has been "
    "selected for reliability, free or low-cost entry tiers, and scalability as the user base grows."
)

tbl(
    ["Layer", "Technology", "Purpose"],
    [
        ("Mobile App",       "Expo + React Native + TypeScript",         "Cross-platform iOS and Android app"),
        ("Styling",          "NativeWind (Tailwind CSS for RN)",          "Consistent, fast UI development"),
        ("State Management", "Zustand",                                   "Lightweight global state — auth, chat, feed"),
        ("Navigation",       "React Navigation v7",                      "Screen routing and tab navigation"),
        ("Backend",          "Node.js + Express + TypeScript",           "Thin privileged API for SOS, push, alerts, and admin-only flows"),
        ("Database",         "Supabase (PostgreSQL)",                    "Primary data store — 11 core tables"),
        ("Authentication",   "Supabase Auth + phone/password",           "Direct mobile sessions with backend verification for protected routes"),
        ("Real-time Chat",   "Supabase Realtime (WebSocket)",            "Live message delivery for active chats — no Socket.io"),
        ("File Storage",     "Supabase Storage",                         "Avatars, post media, PDFs, chat media"),
        ("Cache / Sessions", "Upstash Redis (optional)",                 "Rate limiting and alert cache when enabled"),
        ("Push Notifications","Firebase FCM + Expo Notifications",       "SOS alerts, chat notifications, feed"),
        ("Loadshedding Data","EskomSePush API (cached when enabled)",    "Official schedule + stage data"),
        ("Backend Hosting",  "Any Node host",                            "Optional hosted backend once local/free-tier development is no longer enough"),
        ("Mobile Builds",    "Expo EAS",                                 "APK/AAB builds, OTA updates"),
    ],
    col_widths=[1.5, 2.2, 2.5]
)

h2("9.2  AI-Assisted Development Model")
para(
    "Connex employs a deliberate and innovative development approach: the founder uses advanced AI "
    "coding tools \u2014 specifically Anthropic's Claude Code and the Cursor AI-native IDE \u2014 as "
    "the primary development engine for the entire Phase 1 MVP. This is not an experiment or a "
    "temporary measure. It is a validated, reproducible development methodology that is already being "
    "used by founders globally to build production-grade applications without hiring engineering teams."
)
para(
    "The practical impact on the business is profound. A traditional approach to building the Connex "
    "Phase 1 MVP \u2014 22 screens, a REST API with 38+ endpoints, real-time WebSocket chat, push "
    "notification infrastructure, and a cloud storage system \u2014 would require a team of two to "
    "three senior engineers at a combined monthly cost of R100,000 to R180,000 in salaries alone, "
    "exclusive of equipment, office space, and employer contributions. The timeline for such a team "
    "would be six to nine months to ship a production-ready MVP. With the AI-assisted development "
    "model, the same scope is achievable in three to four months at a monthly infrastructure and "
    "tooling cost of under R10,000."
)
para(
    "This difference is not marginal \u2014 it changes the fundamental economics of the business. "
    "Instead of spending R600,000 to R1,440,000 on engineering salaries to reach MVP launch, Connex "
    "spends R30,000 to R40,000 on tools and infrastructure. The capital saved is deployed directly "
    "into marketing and user acquisition, where it produces a measurable return in the form of "
    "Monthly Active Users. The AI development model is therefore not merely a cost-saving measure "
    "\u2014 it is the mechanism by which Connex can allocate the majority of its seed capital to "
    "growth rather than build, giving it a user acquisition advantage over traditionally-funded "
    "competitors with the same amount of seed funding."
)
para(
    "As Connex scales and generates revenue, the AI-assisted model will be augmented with contract "
    "developers for specific high-complexity components, a Technical Lead or CTO to oversee "
    "architecture decisions, and QA specialists to maintain code quality. The AI tooling does not "
    "replace human judgment at the senior level \u2014 it replaces the large body of routine "
    "implementation work that would otherwise require a team of mid-level engineers."
)

h2("9.3  Infrastructure Architecture & Scalability")
para(
    "The Connex infrastructure is designed to scale from zero to one million monthly active users "
    "without requiring a fundamental architectural change. Supabase's PostgreSQL database handles the "
    "primary data layer with Row Level Security enforced at the database level, ensuring data "
    "isolation even if application-layer security is compromised. Supabase Realtime handles WebSocket "
    "connections for live chat delivery, scaling horizontally with the Supabase infrastructure. "
    "The Express backend stays thin and only handles privileged workflows such as SOS fan-out, push "
    "notification delivery, and official alert integrations. Redis remains optional and is used only "
    "for caching and rate limiting when it is available."
)
para(
    "The free tier entry points of each infrastructure provider are specifically chosen to match the "
    "Phase 1 user volume projections: Supabase free tier handles up to 500MB of database storage "
    "and 2GB of file storage, sufficient for the first 50,000 users. Firebase FCM remains free for "
    "standard push volumes, and Redis can stay disabled entirely in the zero-budget phase. Paid "
    "hosting and paid third-party integrations are postponed until product traction requires them."
)

h2("9.5  Security & POPIA Compliance")
para(
    "Security is a non-negotiable foundation of the Connex architecture, not an optional layer added "
    "after launch. Given that Connex handles sensitive personal data \u2014 private messages, emergency "
    "contact relationships, location data (from Phase 2), and financial transaction data (from Phase 2) "
    "\u2014 the security architecture must be robust from day one. The South African Protection of "
    "Personal Information Act (POPIA) applies to Connex from the moment it processes personal data, "
    "regardless of whether the company is formally registered. The following security controls are "
    "built into the architecture at the design level, not retrofitted after the fact."
)
bullet("Supabase Auth is the session source of truth. The backend verifies Supabase access tokens before serving private data.", bold_prefix="Authentication.")
bullet("Legacy bcrypt password hashes are retained only long enough to migrate older custom-auth accounts safely into Supabase Auth. No plain-text credentials are ever stored.", bold_prefix="Password security.")
bullet("Supabase Row Level Security (RLS) is enabled on all database tables, ensuring users can only access their own data even at the database layer.", bold_prefix="Data isolation.")
bullet("The Supabase service role key (admin-level database access) never leaves the backend server. It is never embedded in the mobile app.", bold_prefix="Secret management.")
bullet("All request bodies are validated with Zod schema validation before any processing occurs, preventing injection attacks and malformed data.", bold_prefix="Input validation.")
bullet("POPIA compliance framework will be implemented prior to public launch, including a privacy policy, data retention policy, and user data deletion capability.", bold_prefix="POPIA.")
bullet("Rate limiting on all authentication endpoints via express-rate-limit prevents brute-force attacks.", bold_prefix="Rate limiting.")

pb()

# ══════════════════════════════════════════════════════════════════════════════
# 10. MANAGEMENT & TEAM
# ══════════════════════════════════════════════════════════════════════════════

h1("Management & Team", "10")

h2("10.1  Founder Profile")
tbl(
    ["Detail", "Information"],
    [
        ("Name",             "Tlake Tshabalala"),
        ("Title",            "Founder & Chief Executive Officer"),
        ("Location",         "Heidelberg, Gauteng, South Africa"),
        ("Contact",          "+27 67 695 5303  |  tlaketshabalala22@gmail.com"),
        ("Role",             "Product vision, business development, investor relations, operations, AI-led development oversight"),
        ("Background",       "Founded Connex from direct observation of the fragmentation problem in the South African digital market. Deeply embedded in the communities Connex is designed to serve."),
    ],
    col_widths=[1.5, 4.7]
)

h2("10.2  The Founder's Strategic Advantage")
para(
    "Tlake Tshabalala brings to Connex the single most important asset an early-stage founder can "
    "have: genuine, lived understanding of the problem they are solving. Connex is not the product "
    "of a founder who identified a market opportunity in a spreadsheet. It is the product of someone "
    "who has navigated loadshedding uncertainty without a reliable alert system, who has lived in a "
    "community where safety information travels through informal WhatsApp groups with no structure, "
    "who understands what it means to manage a data budget on a prepaid SIM, and who has seen matric "
    "students struggle to access past papers that are technically free but practically inaccessible."
)
para(
    "This depth of market understanding cannot be acquired through research. It is the competitive "
    "advantage that allows Connex to make product decisions that feel obvious in hindsight but that "
    "no outside observer would have prioritised. The SOS mutual-consent system. The dual-layer alerts "
    "architecture. The decision to launch Edu as a free, permanent, no-paywall resource. The "
    "township-first pricing model planned for Logistics. Each of these decisions comes from a founder "
    "who is building for their community, not for an abstracted market segment."
)
para(
    "In addition to domain expertise, Tlake brings to Connex the ability to work effectively with "
    "the AI development tools that are the company's primary engineering resource. This is not a "
    "trivial skill \u2014 the ability to direct, review, and iterate on AI-generated code to produce "
    "production-quality software requires deep product understanding, structured communication, and "
    "the judgment to identify when AI-generated code is technically correct but architecturally wrong. "
    "The Phase 0 infrastructure setup and the full CLAUDE.md technical specification document \u2014 "
    "a comprehensive AI coder instruction file covering the entire tech stack, folder structure, "
    "naming conventions, security requirements, and product architecture \u2014 reflect this "
    "capability in action."
)

h2("10.3  Planned Team Structure")
para(
    "As seed funding is raised, Connex will build its team in a deliberate sequence aligned with "
    "product phase milestones and revenue triggers. The hiring plan is conservative and milestone-"
    "gated: no hire is made before the business milestone that justifies it. This ensures capital "
    "efficiency and prevents the premature scaling that has caused the failure of many early-stage "
    "consumer technology companies."
)
tbl(
    ["Role", "When", "Function"],
    [
        ("Technical Lead / CTO",      "Post-seed (Q3 2026)", "Oversee AI-assisted development, code quality, infrastructure"),
        ("Marketing Manager",          "Post-seed (Q3 2026)", "Execute township champion programme, school outreach, social media"),
        ("Community Manager",          "Q4 2026",             "Moderate alerts, manage community standards, support users"),
        ("Fintech Compliance Manager", "Phase 2 (Q3 2026)",   "SARB compliance pathway, POPIA, legal framework for Connex Pay"),
        ("Business Development",       "Phase 2 (Q4 2026)",   "Merchant partnerships, school deals, corporate alert data contracts"),
        ("Driver/Courier Operations",  "Phase 4 (2027)",      "Logistics partner recruitment, driver support"),
    ],
    col_widths=[1.8, 1.5, 2.9]
)

h2("10.4  Advisors & Support Structure (Planned)")
bullet("Technical advisor — experienced mobile/backend engineer to review architecture decisions as the product scales.")
bullet("Legal advisor — South African attorney specialising in POPIA, fintech regulation, and technology contracts.")
bullet("Financial advisor — CA(SA) for financial modelling, investor due diligence preparation, and funding round structuring.")
bullet("Industry mentor — via Google for Startups Accelerator Africa or equivalent accelerator programme.")

h2("10.5  Company Culture & Operating Principles")
para(
    "Connex is a lean company by design, not by default. In the pre-revenue phase, the operating "
    "principle is simple: every Rand of capital and every hour of founder time is pointed at the "
    "one thing that matters most \u2014 getting the product in front of users and generating the "
    "evidence of product-market fit that unlocks the next funding round. There is no office. There "
    "is no corporate hierarchy. There are no vanity initiatives. There is product, marketing, and "
    "compliance \u2014 in that order of priority."
)
para(
    "As the company grows and hires, the culture will be explicitly township-representative. The "
    "communities that Connex is built to serve will be represented in the team that builds it. "
    "This is not a diversity box-ticking exercise \u2014 it is a product quality decision. The "
    "best person to identify whether the Alerts tab is genuinely useful in a Soweto community is "
    "someone who lives in a Soweto community. The best person to design the loadshedding alert UX "
    "for a user on a low-end Android device with a R29 data bundle is someone who has navigated "
    "that exact situation. Cultural and community proximity to the user is a competitive advantage "
    "that Connex will protect and nurture as it scales."
)

pb()

# ══════════════════════════════════════════════════════════════════════════════
# 11. FINANCIAL PROJECTIONS
# ══════════════════════════════════════════════════════════════════════════════

h1("Financial Projections", "11")

h2("11.1  Financial Model Philosophy")
para(
    "The Connex financial model is built on conservative assumptions with a deliberate preference for "
    "underestimating revenue and overestimating costs in the early phases. This approach reflects "
    "the realities of a pre-revenue, pre-launch consumer technology company: user growth is "
    "inherently uncertain, adoption rates are difficult to predict without live market data, and "
    "regulatory timelines for financial products (particularly Connex Pay and its SARB compliance "
    "pathway) can introduce delays that are impossible to forecast precisely. The projections below "
    "represent the base-case scenario. A more optimistic scenario exists if Edu adoption via school "
    "partnerships accelerates faster than modelled, or if the loadshedding content marketing "
    "strategy drives significantly higher organic installs than projected."
)

h2("11.2  Key Assumptions")
bullet(
    "Phase 1 generates no direct revenue. The entire Q3 2026 operating period is dedicated to "
    "building the user base, validating product-market fit, and demonstrating engagement metrics "
    "that support the Phase 2 revenue case to potential advertising and payment partners.",
    bold_prefix="Phase 1 is free."
)
bullet(
    "Phase 2 (Connex Pay) begins generating revenue in Q4 2026. This assumption is contingent on "
    "the SARB compliance pathway progressing on schedule. The projections build in a buffer by "
    "modelling conservative Pay transaction volumes in the first quarter of operation.",
    bold_prefix="Phase 2 revenue from Q4 2026."
)
bullet(
    "User growth follows a conservative S-curve: slow initial adoption in Q3 2026 as the brand "
    "builds, accelerating in Q4 2026 as word-of-mouth from the Township Champion Programme and "
    "school partnerships compounds, and exponential growth from FY 2027 as Pay and Clips create "
    "strong new reasons to download and refer.",
    bold_prefix="Conservative S-curve growth."
)
bullet(
    "AI-assisted development keeps engineering costs below R10,000 per month through the end of "
    "Phase 1. This assumption is based on current tool pricing: Claude Code at approximately "
    "R1,800 per month, Cursor Pro at approximately R400 per month, and infrastructure on free "
    "tiers totalling under R5,000 per month.",
    bold_prefix="AI development cost under R10K/month."
)
bullet(
    "Customer Acquisition Cost begins at R40 per new user in Q3 2026 \u2014 reflecting the "
    "primarily organic channels available pre-raise \u2014 and decreases to R15 per user by FY 2028 "
    "as brand recognition reduces the paid advertising budget required per install. These figures "
    "are benchmarked against comparable African consumer app launches reported in industry data.",
    bold_prefix="CAC R40 declining to R15."
)
bullet(
    "Daily Active User to Monthly Active User ratio is maintained at 40 percent across all "
    "projection periods. This ratio is consistent with the benchmarks reported for established super "
    "apps including WeChat (43%) and Grab (38%), and reflects the daily-utility nature of the "
    "Connex product (loadshedding alerts, messaging, and community safety are daily use cases).",
    bold_prefix="40% DAU/MAU ratio."
)
bullet(
    "Monthly churn rate starts at 6 percent in Q3 2026 \u2014 higher than mature app benchmarks "
    "because the product is new and network effects are not yet established \u2014 and declines to "
    "2 percent by FY 2028 as the SOS network, Pay transaction history, and community connections "
    "create meaningful switching costs. A 2 percent monthly churn rate corresponds to an annual "
    "retention rate of approximately 78 percent, consistent with mature super app benchmarks.",
    bold_prefix="Churn declining to 2% monthly."
)

h2("11.2  User Growth Projections")
tbl(
    ["Metric", "Q3 2026", "Q4 2026", "FY 2027", "FY 2028"],
    [
        ("Monthly Active Users (MAUs)", "10,000",   "50,000",    "500,000",    "2,000,000"),
        ("Daily Active Users (DAUs)",   "4,000",    "20,000",    "200,000",    "800,000"),
        ("Paying Users",                "0",        "1,000",     "20,000",     "100,000"),
        ("DAU/MAU Ratio",               "40%",      "40%",       "40%",        "40%"),
        ("Monthly Churn Rate",          "6%",       "4%",        "2.5%",       "2%"),
        ("CAC (per new user)",          "R40",      "R30",       "R20",        "R15"),
    ],
    col_widths=[2.2, 1.3, 1.3, 1.3, 1.3]
)

h2("11.3  Revenue Projections by Stream (ZAR)")
tbl(
    ["Revenue Stream", "Q3 2026", "Q4 2026", "FY 2027", "FY 2028"],
    [
        ("Phase 1 — Core (free)",           "R0",       "R0",       "R0",           "R0"),
        ("Phase 2 — Pay: Transaction Fees", "R0",       "R150,000", "R3,000,000",   "R15,000,000"),
        ("Phase 2 — Pay: Business Accounts","R0",       "R30,000",  "R600,000",     "R4,000,000"),
        ("Phase 2 — Pay: Airtime Commission","R0",      "R20,000",  "R400,000",     "R3,000,000"),
        ("Phase 2 — Advertising (Feed)",    "R0",       "R50,000",  "R1,200,000",   "R8,000,000"),
        ("Phase 3 — Clips: Video Ads",      "R0",       "R0",       "R200,000",     "R5,000,000"),
        ("Phase 3 — Clips: Creator Share",  "R0",       "R0",       "R100,000",     "R2,000,000"),
        ("Phase 4 — Logistics Commission",  "R0",       "R0",       "R0",           "R5,000,000"),
        ("Connex Premium Subscription",     "R0",       "R0",       "R100,000",     "R1,000,000"),
        ("API / Data Licensing",            "R0",       "R0",       "R200,000",     "R3,000,000"),
        ("TOTAL REVENUE",                   "R0",       "R250,000", "R5,800,000",   "R46,000,000"),
    ],
    col_widths=[2.4, 1.1, 1.1, 1.3, 1.3]
)

h2("11.4  Cost Structure (ZAR)")
tbl(
    ["Cost Category", "Q3 2026", "Q4 2026", "FY 2027", "FY 2028"],
    [
        ("AI Dev Tools (Claude, Cursor, etc.)",  "R3,000",   "R5,000",   "R60,000",     "R120,000"),
        ("Freelance / Contract Development",     "R0",       "R30,000",  "R300,000",    "R1,200,000"),
        ("Cloud Infrastructure (Railway/Supabase)","R2,000", "R8,000",   "R120,000",    "R480,000"),
        ("Marketing & User Acquisition",         "R10,000",  "R50,000",  "R600,000",    "R2,400,000"),
        ("Legal & Compliance (POPIA, SARB)",     "R20,000",  "R15,000",  "R150,000",    "R300,000"),
        ("Operations (SIM, devices, travel)",    "R5,000",   "R5,000",   "R60,000",     "R120,000"),
        ("Content Moderation",                   "R0",       "R5,000",   "R80,000",     "R300,000"),
        ("TOTAL COSTS",                          "R40,000",  "R118,000", "R1,370,000",  "R4,920,000"),
    ],
    col_widths=[2.8, 1.0, 1.0, 1.2, 1.2]
)

h2("11.5  Net Position Summary")
tbl(
    ["Period", "Revenue", "Costs", "Net Position", "Status"],
    [
        ("Q3 2026", "R0",          "R40,000",     "-R40,000",       "Building — no revenue phase"),
        ("Q4 2026", "R250,000",    "R118,000",    "+R132,000",      "First positive quarter"),
        ("FY 2027", "R5,800,000",  "R1,370,000",  "+R4,430,000",    "Profitable — reinvest in growth"),
        ("FY 2028", "R46,000,000", "R4,920,000",  "+R41,080,000",   "High-growth, all phases active"),
    ],
    col_widths=[1.3, 1.4, 1.4, 1.4, 2.3]
)

h2("11.6  Break-Even Analysis")
para(
    "Connex reaches its first cash-flow positive quarter in Q4 2026, coinciding with the commercial "
    "launch of Connex Pay and the activation of the first advertising placements in the Feed. The "
    "path to this milestone is deliberately short: the Phase 1 build period (Q2 to Q3 2026) runs "
    "at a monthly burn rate of approximately R40,000, meaning the total pre-revenue capital required "
    "is approximately R120,000 \u2014 covering three months of infrastructure, AI tools, marketing "
    "materials, and legal groundwork before the first Rand of revenue arrives."
)
para(
    "This R120,000 pre-revenue requirement is a fraction of the seed raise target, meaning the "
    "majority of the raised capital is available for deployment into user acquisition and Phase 2 "
    "development rather than covering operational losses. The break-even quarter is Q4 2026, with "
    "projected revenue of R250,000 against projected costs of R118,000 \u2014 a net positive of "
    "R132,000. From that point forward, the company is self-sustaining and growing."
)

h2("11.7  Scenario Analysis")
tbl(
    ["Scenario", "Key Variable", "Q4 2026 MAUs", "FY 2027 Revenue", "FY 2028 Revenue"],
    [
        ("Bear Case", "School partnerships delayed, Pay SARB approval takes 18 months", "20,000", "R1,200,000", "R15,000,000"),
        ("Base Case", "Projections as modelled in this plan", "50,000", "R5,800,000", "R46,000,000"),
        ("Bull Case", "Edu goes viral nationally, Pay approved Q3 2026, Google grant received", "150,000", "R14,000,000", "R100,000,000"),
    ],
    col_widths=[1.2, 2.8, 1.2, 1.5, 1.5]
)

pb()

# ══════════════════════════════════════════════════════════════════════════════
# 12. FUNDING REQUIREMENTS
# ══════════════════════════════════════════════════════════════════════════════

h1("Funding Requirements", "12")

h2("12.1  Current Raise \u2014 Seed Round")
highlight_box(
    "Connex is raising R500,000 \u2013 R2,000,000 in seed funding (pre-money valuation to be negotiated). "
    "The raise is equity-based. No convertible note is currently in place.",
    bg="0D1B2A", bold=False, size=11
)
spacer()
para(
    "The seed round is structured as a straightforward equity raise with pre-money valuation to be "
    "determined through negotiation with investors based on demonstrated traction at the time of "
    "closing. The minimum viable raise of R500,000 is sufficient to complete the Phase 1 MVP, "
    "initiate the SARB compliance pathway, cover company registration and POPIA legal framework, "
    "and fund the first three months of the Township Champion and School Partnership programmes. "
    "The target raise of R2,000,000 enables a full 12-month runway with the complete use of funds "
    "as modelled in the table below, including the first marketing manager and community manager "
    "hires."
)
para(
    "The raise is being conducted in parallel with applications to non-dilutive grant and accelerator "
    "programmes including the Google for Startups Accelerator Africa (USD 350,000 in cloud credits), "
    "Microsoft Founders Hub (USD 150,000 in Azure credits), and AWS Activate (USD 100,000 in credits). "
    "If one or more of these programmes is awarded, the cloud infrastructure credits directly reduce "
    "the cash burn rate, extending the runway of the seed raise and increasing the capital available "
    "for marketing and user acquisition."
)
para(
    "For investors participating in the seed round, the return case is straightforward: at the "
    "projected FY 2028 revenue of R46,000,000 with a conservative consumer technology EBITDA multiple "
    "of 8 to 12 times for an African super app, the enterprise value in FY 2028 is R368,000,000 to "
    "R552,000,000. A seed investment at a pre-money valuation of R10,000,000 represents a 2 percent "
    "stake in a company projected to be worth R368,000,000 to R552,000,000 in less than three years "
    "\u2014 a 35 to 52 times return on capital in the base case, before the Series A, Series B, and "
    "continental expansion phases that compound the value further."
)

h2("12.2  Use of Funds")
tbl(
    ["Category", "Amount (R)", "Allocation %", "Purpose"],
    [
        ("Marketing & User Acquisition", "R700,000",  "35%", "Township champion programme, school outreach, digital ads — drive first 50K MAUs"),
        ("Development (AI tools + freelance)", "R400,000", "20%", "AI tool subscriptions, contract developers for specific sprints, QA testing"),
        ("Legal & Compliance",          "R300,000",  "15%", "Company registration, POPIA framework, SARB fintech pathway for Phase 2"),
        ("Cloud Infrastructure",        "R200,000",  "10%", "Railway backend, Supabase storage scale, EskomSePush paid tier when needed"),
        ("Working Capital & Operations","R400,000",  "20%", "Operational expenses, team salaries (founder draw), contingency"),
        ("TOTAL",                       "R2,000,000","100%","Full seed deployment over 12 months"),
    ],
    col_widths=[2.2, 1.2, 1.1, 2.7]
)

h2("12.3  Funding Roadmap")
tbl(
    ["Round", "Target", "Timing", "Trigger", "Use"],
    [
        ("Bootstrap (current)", "R0 – R50,000",   "Now – Q2 2026", "Founder-funded",            "Build Phase 1 MVP using AI tools on free infrastructure tiers"),
        ("Seed",                "R500K – R2M",    "Q2–Q3 2026",    "Alpha launch + demo APK",   "User acquisition, legal, first team hires"),
        ("Series A",            "R5M – R20M",     "Q3 2027",       "500K MAUs + Pay revenue",   "Phase 3+4 build, marketing scale, team expansion"),
        ("Series B",            "R20M+",          "2028+",         "2M MAUs + R20M+ ARR",       "Multi-country expansion, logistics infrastructure"),
    ],
    col_widths=[1.5, 1.3, 1.1, 1.7, 2.6]
)

h2("12.4  Implementation Timeline to Revenue")
para(
    "The following timeline maps the key execution milestones from the current date through to the "
    "first cash-flow positive quarter. Every milestone has a specific trigger and a measurable "
    "outcome, allowing investors and the founding team to track progress with clarity."
)
tbl(
    ["Period", "Milestone", "Deliverable", "Success Metric"],
    [
        ("March 2026", "Company & Infrastructure Setup", "CIPC registration filed, GitHub repo, Supabase project, Railway backend live, Firebase FCM configured", "All services running, .env configured"),
        ("April 2026", "Core Chat + Backend Build", "Auth endpoints, user profiles, conversation engine, real-time message delivery, SOS trigger endpoint", "Messages sending in test environment"),
        ("May 2026", "Feed + Alerts + Edu Build", "Post creation, Alerts tab, EskomSePush integration, Edu paper upload and PDF viewer", "All 22 screens navigable on Android device"),
        ("June 2026", "Alpha Launch", "Play Store submission, Township Champion Programme kick-off, school outreach begins, social media content starts", "1,000 downloads in first month"),
        ("July\u2013Sep 2026", "Growth Phase", "Marketing spend begins, school partnerships signed, 50 township champions active", "10,000 MAUs by end of Q3 2026"),
        ("October 2026", "Pay Launch", "SARB pathway initiated, first Pay transaction processed (partner entity model)", "First revenue: R250,000 Q4 2026"),
    ],
    col_widths=[1.2, 1.7, 2.5, 1.8]
)

h2("12.5  Grant & Accelerator Pipeline (Non-Dilutive)")
tbl(
    ["Programme", "Value", "Equity", "Status"],
    [
        ("Google for Startups Accelerator Africa", "USD 350K cloud credits + mentorship", "None", "Applying — deadline March 18 2026"),
        ("Microsoft Founders Hub",                 "USD 150K Azure credits",              "None", "Applying — rolling deadline"),
        ("AWS Activate",                           "USD 100K credits",                    "None", "Applying — rolling deadline"),
        ("Injini EdTech Accelerator",              "Grant + mentorship",                  "None", "Apply next cohort"),
        ("SEDA (SA Government)",                   "Grants + business support",           "None", "Apply — rolling"),
    ],
    col_widths=[2.4, 2.0, 0.8, 2.0]
)
para(
    "The non-dilutive pipeline is a critical component of the Connex funding strategy because it "
    "directly reduces the amount of equity the founder must sell to reach the same runway and "
    "infrastructure capacity. USD 350,000 in Google Cloud credits, for example, eliminates cloud "
    "infrastructure as a meaningful cost category for at least two years at projected Phase 1 and 2 "
    "usage levels. The Google for Startups Accelerator Africa programme additionally provides equity-"
    "free mentorship, investor introductions, and technical support that would otherwise require "
    "significant equity to access. Even if only one of the five programmes in the pipeline is "
    "awarded, the impact on runway and investor return is material."
)

pb()

# ══════════════════════════════════════════════════════════════════════════════
# 13. RISK ANALYSIS & MITIGATION
# ══════════════════════════════════════════════════════════════════════════════

h1("Risk Analysis & Mitigation", "13")

para(
    "Every early-stage technology company carries risk. The discipline of risk management is not in "
    "pretending that risks do not exist, but in identifying them honestly, assessing their likelihood "
    "and potential impact, and building specific, actionable mitigation strategies before they "
    "materialise. Connex has identified nine primary risk categories that are most likely to affect "
    "the business during the seed and early growth phases. Each is documented below with a frank "
    "assessment and a concrete mitigation plan."
)

tbl(
    ["Risk", "Likelihood", "Impact", "Mitigation Strategy"],
    [
        ("Slow user adoption at launch",
         "Medium",
         "High",
         "Edu as silent acquisition engine. Township champion programme. Loadshedding content marketing. Free product with no barrier to download."),
        ("Regulatory delay for Connex Pay (SARB)",
         "Medium",
         "Medium",
         "Phase 1 generates no revenue — 12 months to initiate SARB compliance pathway. Engage fintech lawyer early. Consider interim model (partner with licensed entity)."),
        ("WhatsApp or VodaPay copying key features",
         "Medium",
         "Medium",
         "First-mover advantage in Africa-specific features (SOS, loadshedding, DBE Edu). Speed of execution via AI model is our moat. Community lock-in through safety features."),
        ("AI development tools fail to produce production quality",
         "Low",
         "High",
         "Augment AI tools with human code review. Hire contract developer for critical components. QA testing phase before every release."),
        ("Content moderation failures (Alerts tab)",
         "Medium",
         "High",
         "AI-first moderation (automated flagging) before human review. Clear community guidelines. Reporting system. Phased rollout in controlled communities first."),
        ("Single-founder concentration risk",
         "High",
         "High",
         "Active search for technical co-founder or CTO. Comprehensive documentation (CLAUDE.md, technical plan) enables onboarding. Accelerator mentors provide advisory backup."),
        ("Supabase free tier limits exceeded",
         "Low",
         "Medium",
         "Migration path to Supabase Pro ($25/month) is straightforward. Costs scale with revenue. AWS Activate credits provide overflow capacity."),
        ("EskomSePush API rate limits (50 calls/day free)",
         "Low",
         "Low",
         "Aggressive Redis caching (4-hour TTL) keeps API calls well within free limit. Paid tier ($999+/month) only needed at significant scale — by then revenue covers it."),
        ("POPIA compliance failure",
         "Low",
         "High",
         "Privacy policy and data handling framework built before public launch. Data minimisation by design. No selling of user data. User deletion capability in app."),
    ],
    col_widths=[1.7, 1.0, 0.8, 3.7]
)

pb()

# ══════════════════════════════════════════════════════════════════════════════
# APPENDIX A — FULL TECHNOLOGY STACK
# ══════════════════════════════════════════════════════════════════════════════

h1("Appendix A — Full Technology Stack")

h2("Mobile Application")
tbl(
    ["Package", "Version", "Purpose"],
    [
        ("Expo (managed workflow)",          "~52.x",   "Core mobile framework"),
        ("React Native",                     "0.76.x",  "Mobile UI framework — bundled with Expo"),
        ("TypeScript",                       "^5.x",    "Static typing — all code is TypeScript"),
        ("React Navigation v6",             "^6.x",    "Screen routing — Stack + BottomTabs"),
        ("NativeWind",                       "^4.x",    "Tailwind CSS styling in React Native"),
        ("Zustand",                          "^5.x",    "Global state management"),
        ("@supabase/supabase-js",            "^2.x",    "Supabase client — auth, DB, Realtime"),
        ("Expo Notifications",               "~0.29.x", "Push notification handling"),
        ("Expo Image Picker",                "~16.x",   "Camera + gallery image selection"),
        ("Expo Haptics",                     "~14.x",   "Haptic feedback — SOS press-and-hold"),
        ("react-native-pdf",                 "^6.x",    "In-app PDF viewer — Edu module"),
        ("react-native-maps",               "^1.x",    "Map view — Alerts map screen"),
        ("dayjs",                            "^1.x",    "Date and time formatting"),
        ("Zod",                              "^3.x",    "Schema validation"),
    ],
    col_widths=[2.4, 0.9, 3.0]
)

spacer()
h2("Backend Server")
tbl(
    ["Package", "Version", "Purpose"],
    [
        ("Node.js",               "20.x LTS", "Runtime"),
        ("Express",               "^4.x",     "HTTP server framework"),
        ("TypeScript",            "^5.x",     "Static typing — all code is TypeScript"),
        ("@supabase/supabase-js", "^2.x",     "Supabase admin client — service_role key"),
        ("bcryptjs",              "^3.x",     "Legacy-password migration support"),
        ("Zod",                   "^3.x",     "Request body validation"),
        ("ioredis",               "^5.x",     "Upstash Redis client"),
        ("node-cron",             "^3.x",     "Scheduled jobs — loadshedding data refresh"),
        ("axios",                 "^1.x",     "HTTP client for EskomSePush API"),
        ("cors",                  "^2.x",     "CORS middleware"),
        ("helmet",                "^8.x",     "Security headers"),
        ("express-rate-limit",    "^7.x",     "Rate limiting — auth endpoints"),
        ("firebase-admin",        "^12.x",    "Send FCM push notifications"),
        ("dotenv",                "^16.x",    "Load .env variables"),
    ],
    col_widths=[2.4, 0.9, 3.0]
)

spacer()
h2("Infrastructure")
tbl(
    ["Service", "Purpose", "Cost Entry"],
    [
        ("Supabase",      "PostgreSQL DB, Auth, Realtime (chat), Storage",     "Free — 500MB DB, 1GB storage"),
        ("Railway",       "Backend hosting — auto-deploy from GitHub",         "Free — $5/month credit"),
        ("Upstash Redis", "Optional cache, rate limiting, loadshedding cache", "Free — 10K commands/day"),
        ("Firebase FCM",  "Push notifications — SOS, chat, feed alerts",      "Free forever"),
        ("Expo EAS",      "Mobile app builds and distribution",                "Free — 30 builds/month"),
    ],
    col_widths=[1.5, 3.0, 1.8]
)

pb()

# ══════════════════════════════════════════════════════════════════════════════
# APPENDIX B — PRODUCT ROADMAP SUMMARY
# ══════════════════════════════════════════════════════════════════════════════

h1("Appendix B — Product Roadmap Summary")

tbl(
    ["Phase", "Period", "Key Deliverables", "Business Goal"],
    [
        ("Phase 0: Setup",
         "March 2026\n(Weeks 1–2)",
         "GitHub repo, Expo project, Express backend, Supabase DB, Upstash Redis, Firebase FCM, Railway deployment, .env configuration",
         "All infrastructure in place — ready to build"),
        ("Phase 1: MVP\nChat + Feed + Edu",
         "March–June 2026\n(Weeks 3–14)",
         "22 screens, 38 API endpoints, real-time chat, SOS system, Alerts tab (6 categories), loadshedding integration, DBE paper library, investor demo APK",
         "Alpha launch June 2026 — 1,000 downloads, investor demo ready"),
        ("Phase 2: Pay",
         "July–November 2026",
         "Digital wallet, P2P transfers, QR payments, airtime top-up, bill payments, merchant business accounts",
         "First revenue — R250K Q4 2026, R3M+ FY 2027"),
        ("Phase 3: Clips",
         "December 2026\n– May 2027",
         "Short-form video feed, in-app recording, For You algorithm, creator profiles, monetisation, content moderation pipeline",
         "Video advertising revenue — R200K FY 2027, R5M FY 2028"),
        ("Phase 4: Logistics",
         "June 2027\nonward",
         "Ride-hailing, food delivery, parcel delivery, grocery, Connex for Business dashboard, driver partner app, SAPS SOS integration",
         "Commission revenue — R5M FY 2028, R68M at scale"),
        ("Phase 5+: Enterprise",
         "2028+",
         "Multi-country expansion (Zimbabwe, Nigeria, Kenya, Ghana), data licensing, government partnerships, Connex for Schools",
         "R180M+ ARR, dominant African super app"),
    ],
    col_widths=[1.3, 1.3, 2.7, 1.9]
)

pb()

# ══════════════════════════════════════════════════════════════════════════════
# CONCLUSION
# ══════════════════════════════════════════════════════════════════════════════

h1("Conclusion — The Connex Opportunity")

para(
    "The super app opportunity in Africa is not speculative. It is the natural next stage of the "
    "continent's digital evolution, and the evidence is already visible: 678 million smartphone "
    "users with no unified platform, a mobile money market growing at 28% CAGR with no dominant "
    "independent wallet, 1.2 million matric students per year with no organised in-app access to "
    "their study resources, and communities self-organising through fragmented WhatsApp groups "
    "because no structured community alert platform exists. These are not problems that require "
    "a new technology to be invented. They are gaps in the application of technology that already "
    "exists, and they are waiting for a founder who understands the market well enough to design "
    "the right product for it."
)
para(
    "Connex is that product. It is designed from the inside out by a South African founder for "
    "South African users, addressing the specific problems that make daily digital life in South "
    "Africa fragmented, expensive, and unsafe. It is being built using a development model that "
    "is uniquely efficient for this stage of the company, keeping the burn rate low, the speed "
    "of execution high, and the majority of raised capital pointed at the thing that matters most "
    "at this stage: putting the app in the hands of as many users as possible, as quickly as "
    "possible, before the market consolidates around a competitor."
)
para(
    "The financial case is compelling. The product case is stronger. And the timing case is the "
    "most powerful of all: the super app window in Africa is open now. The founder is executing "
    "now. The infrastructure is being built now. An investor who participates in this seed round "
    "is entering at the earliest possible moment in a platform that this business plan projects "
    "will be worth R368,000,000 to R552,000,000 by FY 2028, with the continental expansion phase "
    "not yet included in that valuation."
)
para(
    "Connex is not a concept. It is not a pitch deck with no product behind it. As of March 2026, "
    "the technical architecture is fully documented, the database schema is written, the AI "
    "development environment is operational, the marketing strategy is defined, the school and "
    "township outreach plan is ready to execute, and the regulatory compliance pathway is mapped. "
    "The only remaining input is the capital to accelerate the timeline. Connex is ready to build. "
    "The question is only how fast."
)
para(
    "The window is open. The product is being built. The communities are waiting. Connex is the "
    "platform that South Africa has needed for a decade, arriving at exactly the moment when the "
    "technology is mature enough to build it, the market is large enough to sustain it, and the "
    "timing is right to win it. This is the opportunity. This is the plan. This is Connex."
)
para(
    "Investors who participate in the Connex seed round are not funding a prototype or an idea. They "
    "are funding the execution of a fully specified product by a founder with the tools, the knowledge, "
    "the community understanding, and the drive to see it through. The documentation exists. The "
    "architecture is designed. The development environment is operational. Every system that needs to "
    "be in place before the first line of product code is written is already in place. Capital is the "
    "only remaining variable. With it, Connex launches. Without it, Connex launches more slowly. "
    "Either way, Connex launches \u2014 but the investors who move early own the largest share of what "
    "this business becomes."
)

highlight_box(
    "For investment enquiries, partnership discussions, or accelerator programme applications, "
    "contact: Tlake Tshabalala, Founder & CEO | +27 67 695 5303 | tlaketshabalala22@gmail.com | "
    "Heidelberg, Gauteng, South Africa.",
    bg="0D1B2A", color=WHITE, bold=False, size=11
)

spacer(2)
p = doc.add_paragraph()
p.alignment = WD_ALIGN_PARAGRAPH.CENTER
run = p.add_run("— End of Business Plan —")
run.italic = True; run.font.name = "Garamond"; run.font.size = Pt(11)
run.font.color.rgb = DGREY

spacer(1)
p = doc.add_paragraph()
p.alignment = WD_ALIGN_PARAGRAPH.CENTER
run = p.add_run("Connex (Pty) Ltd  |  Tlake Tshabalala  |  +27 67 695 5303  |  tlaketshabalala22@gmail.com  |  March 2026")
run.font.name = "Garamond"; run.font.size = Pt(9)
run.font.color.rgb = DGREY

# ── SAVE ──────────────────────────────────────────────────────────────────────
doc.save(OUTPUT)
print(f"Saved: {OUTPUT}")
