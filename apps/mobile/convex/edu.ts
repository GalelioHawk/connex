import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { requireSession, requireAdmin } from "./_helpers";

const PAPER_TYPE_ORDER: Record<string, number> = {
  question_paper: 0,
  memorandum: 1,
  addendum: 2,
  formula_sheet: 3,
};

function matches(haystack: string, needle: string): boolean {
  return haystack.toLowerCase().includes(needle.toLowerCase().trim());
}

function paperSearchText(paper: Doc<"eduPapers">, subjectName: string): string {
  return [
    subjectName,
    String(paper.year),
    paper.session ?? "",
    paper.paperNumber ? `paper ${paper.paperNumber} p${paper.paperNumber}` : "",
    paper.paperType?.replace("_", " ") ?? "",
    (paper.tags ?? []).join(" "),
  ].join(" ");
}

async function paperUrl(
  ctx: { storage: { getUrl: (id: Id<"_storage">) => Promise<string | null> } },
  paper: Doc<"eduPapers">,
): Promise<string | null> {
  if (paper.storageId) {
    return (await ctx.storage.getUrl(paper.storageId)) ?? paper.pdfUrl ?? null;
  }
  return paper.pdfUrl ?? null;
}

async function serializePaper(
  ctx: { storage: { getUrl: (id: Id<"_storage">) => Promise<string | null> } },
  paper: Doc<"eduPapers">,
  subjectName: string,
) {
  const url = await paperUrl(ctx, paper);
  return {
    id:            paper._id as string,
    subject_id:    paper.subjectId as string,
    subject_name:  subjectName,
    grade:         paper.grade ?? null,
    year:          paper.year,
    session:       paper.session ?? null,
    term:          paper.term ?? null,
    paper_number:  paper.paperNumber ?? null,
    language:      paper.language ?? null,
    paper_type:    paper.paperType ?? "question_paper",
    source_name:   paper.sourceName ?? null,
    source_status: paper.sourceStatus ?? (url ? "verified" : "needs_url"),
    tags:          paper.tags ?? [],
    pdf_url:       url,
  };
}

export type SerializedPaper = Awaited<ReturnType<typeof serializePaper>>;

function sortPapers(a: Doc<"eduPapers">, b: Doc<"eduPapers">): number {
  if (a.year !== b.year) return b.year - a.year;
  const sa = a.session ?? "";
  const sb = b.session ?? "";
  if (sa !== sb) return sb.localeCompare(sa);
  const na = a.paperNumber ?? 0;
  const nb = b.paperNumber ?? 0;
  if (na !== nb) return na - nb;
  return (
    (PAPER_TYPE_ORDER[a.paperType ?? "question_paper"] ?? 0) -
    (PAPER_TYPE_ORDER[b.paperType ?? "question_paper"] ?? 0)
  );
}

// ─── List subjects by grade ───────────────────────────────────────────────────
export const listSubjects = query({
  args: {
    sessionId: v.id("sessions"),
    grade:     v.number(),
  },
  handler: async (ctx, { sessionId, grade }) => {
    await requireSession(ctx, sessionId);

    const subjects = await ctx.db
      .query("eduSubjects")
      .withIndex("by_grade", (q) => q.eq("grade", grade))
      .collect();

    subjects.sort((a, b) => a.name.localeCompare(b.name));

    return subjects.map((s) => ({
      id:    s._id as string,
      code:  s.code ?? s.name.toLowerCase().replace(/\s+/g, "-"),
      name:  s.name,
      grade: s.grade,
    }));
  },
});

// ─── List papers (per subject, or grade-wide search) ─────────────────────────
export const listPapers = query({
  args: {
    sessionId: v.id("sessions"),
    grade:     v.number(),
    subjectId: v.optional(v.id("eduSubjects")),
    paperType: v.optional(v.string()),
    search:    v.optional(v.string()),
  },
  handler: async (ctx, { sessionId, grade, subjectId, paperType, search }) => {
    await requireSession(ctx, sessionId);

    const subjects = await ctx.db
      .query("eduSubjects")
      .withIndex("by_grade", (q) => q.eq("grade", grade))
      .collect();
    const subjectNames = new Map(subjects.map((s) => [s._id as string, s.name]));

    let papers: Doc<"eduPapers">[];
    if (subjectId) {
      papers = await ctx.db
        .query("eduPapers")
        .withIndex("by_subject", (q) => q.eq("subjectId", subjectId))
        .collect();
    } else {
      papers = await ctx.db
        .query("eduPapers")
        .withIndex("by_grade", (q) => q.eq("grade", grade))
        .collect();
    }

    if (paperType) {
      papers = papers.filter((p) => (p.paperType ?? "question_paper") === paperType);
    }
    if (search && search.trim().length > 0) {
      papers = papers.filter((p) =>
        matches(paperSearchText(p, subjectNames.get(p.subjectId as string) ?? ""), search),
      );
    }

    papers.sort(sortPapers);
    papers = papers.slice(0, 200);

    return Promise.all(
      papers.map((p) =>
        serializePaper(ctx, p, subjectNames.get(p.subjectId as string) ?? "Unknown subject"),
      ),
    );
  },
});

// ─── Dashboard stats for a grade ──────────────────────────────────────────────
export const getStats = query({
  args: {
    sessionId: v.id("sessions"),
    grade:     v.number(),
  },
  handler: async (ctx, { sessionId, grade }) => {
    await requireSession(ctx, sessionId);

    const papers = await ctx.db
      .query("eduPapers")
      .withIndex("by_grade", (q) => q.eq("grade", grade))
      .collect();

    const notes = await ctx.db
      .query("eduNotes")
      .withIndex("by_grade_subject", (q) => q.eq("grade", grade))
      .collect();

    const tutors = await ctx.db.query("eduTutors").collect();

    const helpPosts = await ctx.db
      .query("eduHelpPosts")
      .withIndex("by_grade", (q) => q.eq("grade", grade))
      .collect();

    return {
      question_papers: papers.filter((p) => (p.paperType ?? "question_paper") === "question_paper").length,
      memos:           papers.filter((p) => p.paperType === "memorandum").length,
      notes:           notes.length,
      tutors:          tutors.filter((t) => t.grades.includes(grade)).length,
      open_questions:  helpPosts.filter((p) => p.status !== "solved").length,
    };
  },
});

// ─── Bookmarks ────────────────────────────────────────────────────────────────
export const toggleBookmark = mutation({
  args: {
    sessionId: v.id("sessions"),
    itemType:  v.union(v.literal("paper"), v.literal("note")),
    itemId:    v.string(),
  },
  handler: async (ctx, { sessionId, itemType, itemId }) => {
    const { userId } = await requireSession(ctx, sessionId);

    const existing = await ctx.db
      .query("eduBookmarks")
      .withIndex("by_user_item", (q) =>
        q.eq("userId", userId).eq("itemType", itemType).eq("itemId", itemId),
      )
      .unique();

    if (existing) {
      await ctx.db.delete(existing._id);
      return { bookmarked: false };
    }
    await ctx.db.insert("eduBookmarks", { userId, itemType, itemId });
    return { bookmarked: true };
  },
});

export const listBookmarks = query({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, { sessionId }) => {
    const { userId } = await requireSession(ctx, sessionId);

    const bookmarks = await ctx.db
      .query("eduBookmarks")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    return bookmarks.map((b) => ({
      id:        b._id as string,
      item_type: b.itemType,
      item_id:   b.itemId,
    }));
  },
});

// ─── Recently viewed ──────────────────────────────────────────────────────────
const MAX_RECENT_VIEWS = 15;

export const recordRecentView = mutation({
  args: {
    sessionId: v.id("sessions"),
    itemType:  v.union(v.literal("paper"), v.literal("note")),
    itemId:    v.string(),
    title:     v.string(),
    subtitle:  v.string(),
  },
  handler: async (ctx, { sessionId, itemType, itemId, title, subtitle }) => {
    const { userId } = await requireSession(ctx, sessionId);

    const existing = await ctx.db
      .query("eduRecentViews")
      .withIndex("by_user_item", (q) =>
        q.eq("userId", userId).eq("itemType", itemType).eq("itemId", itemId),
      )
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, { title, subtitle, viewedAt: Date.now() });
      return;
    }

    await ctx.db.insert("eduRecentViews", {
      userId, itemType, itemId, title, subtitle, viewedAt: Date.now(),
    });

    // Keep only the newest MAX_RECENT_VIEWS entries per user
    const all = await ctx.db
      .query("eduRecentViews")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    if (all.length > MAX_RECENT_VIEWS) {
      all.sort((a, b) => b.viewedAt - a.viewedAt);
      for (const stale of all.slice(MAX_RECENT_VIEWS)) {
        await ctx.db.delete(stale._id);
      }
    }
  },
});

export const listRecentViews = query({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, { sessionId }) => {
    const { userId } = await requireSession(ctx, sessionId);

    const views = await ctx.db
      .query("eduRecentViews")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    views.sort((a, b) => b.viewedAt - a.viewedAt);

    const results = await Promise.all(
      views.slice(0, 10).map(async (view) => {
        let pdfUrl: string | null = null;
        let note: Doc<"eduNotes"> | null = null;
        if (view.itemType === "paper") {
          const paper = await ctx.db.get(view.itemId as Id<"eduPapers">);
          if (!paper) return null; // item was removed — drop from strip
          pdfUrl = await paperUrl(ctx, paper);
        } else {
          note = await ctx.db.get(view.itemId as Id<"eduNotes">);
          if (!note) return null;
        }
        return {
          id:        view._id as string,
          item_type: view.itemType,
          item_id:   view.itemId,
          title:     view.title,
          subtitle:  view.subtitle,
          viewed_at: view.viewedAt,
          pdf_url:   pdfUrl,
          note: note
            ? {
                id:           note._id as string,
                grade:        note.grade,
                subject_code: note.subjectCode,
                subject_name: note.subjectName,
                topic:        note.topic,
                title:        note.title,
                note_type:    note.noteType,
                difficulty:   note.difficulty,
                content:      note.content,
                tags:         note.tags ?? [],
              }
            : null,
        };
      }),
    );
    return results.filter((entry) => entry !== null);
  },
});

// ─── Admin catalogue management ───────────────────────────────────────────────
export const addSubject = mutation({
  args: {
    sessionId: v.id("sessions"),
    name:      v.string(),
    code:      v.string(),
    grade:     v.number(),
  },
  handler: async (ctx, { sessionId, name, code, grade }) => {
    await requireAdmin(ctx, sessionId);
    if (grade < 10 || grade > 12) throw new Error("Grade must be 10, 11, or 12.");

    const existing = await ctx.db
      .query("eduSubjects")
      .withIndex("by_code_grade", (q) => q.eq("code", code).eq("grade", grade))
      .unique();
    if (existing) throw new Error("Subject already exists for this grade.");

    const id = await ctx.db.insert("eduSubjects", { name, code, grade });
    return { id: id as string };
  },
});

export const addPaper = mutation({
  args: {
    sessionId:    v.id("sessions"),
    subjectId:    v.id("eduSubjects"),
    year:         v.number(),
    session:      v.optional(v.string()),
    paperNumber:  v.optional(v.number()),
    language:     v.optional(v.string()),
    paperType:    v.optional(v.union(
      v.literal("question_paper"),
      v.literal("memorandum"),
      v.literal("addendum"),
      v.literal("formula_sheet"),
    )),
    sourceName:   v.optional(v.string()),
    pdfUrl:       v.optional(v.string()),
    tags:         v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.sessionId);

    const subject = await ctx.db.get(args.subjectId);
    if (!subject) throw new Error("Subject not found.");

    const id = await ctx.db.insert("eduPapers", {
      subjectId:    args.subjectId,
      grade:        subject.grade,
      year:         args.year,
      session:      args.session,
      paperNumber:  args.paperNumber,
      language:     args.language,
      paperType:    args.paperType ?? "question_paper",
      sourceName:   args.sourceName,
      sourceStatus: args.pdfUrl ? "verified" : "needs_url",
      pdfUrl:       args.pdfUrl,
      tags:         args.tags,
      updatedAt:    Date.now(),
    });
    return { id: id as string };
  },
});
