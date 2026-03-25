import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireSession } from "./_helpers";

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
      .withIndex("by_grade", (q: any) => q.eq("grade", grade))
      .collect();

    return subjects.map((s: any) => ({
      id:    s._id   as string,
      name:  s.name,
      grade: s.grade,
    }));
  },
});

// ─── List papers for a subject ────────────────────────────────────────────────
export const listPapers = query({
  args: {
    sessionId: v.id("sessions"),
    subjectId: v.id("eduSubjects"),
  },
  handler: async (ctx, { sessionId, subjectId }) => {
    await requireSession(ctx, sessionId);

    const papers = await ctx.db
      .query("eduPapers")
      .withIndex("by_subject", (q: any) => q.eq("subjectId", subjectId))
      .order("desc")
      .collect();

    return Promise.all(
      papers.map(async (p: any) => {
        // Get URL from Convex storage if storageId exists, else use pdfUrl
        let url = p.pdfUrl ?? null;
        if (p.storageId) {
          url = await ctx.storage.getUrl(p.storageId) ?? null;
        }
        return {
          id:         p._id       as string,
          subject_id: p.subjectId as string,
          year:       p.year,
          term:       p.term      ?? null,
          pdf_url:    url,
        };
      }),
    );
  },
});

// ─── Add subject (admin only — for seeding) ───────────────────────────────────
export const addSubject = mutation({
  args: {
    sessionId: v.id("sessions"),
    name:      v.string(),
    grade:     v.number(),
  },
  handler: async (ctx, { sessionId, name, grade }) => {
    await requireSession(ctx, sessionId);
    if (grade < 10 || grade > 12) throw new Error("Grade must be 10, 11, or 12.");
    const id = await ctx.db.insert("eduSubjects", { name, grade });
    return { id: id as string };
  },
});

// ─── Add paper (admin only — for seeding) ────────────────────────────────────
export const addPaper = mutation({
  args: {
    sessionId: v.id("sessions"),
    subjectId: v.id("eduSubjects"),
    year:      v.number(),
    term:      v.optional(v.number()),
    pdfUrl:    v.optional(v.string()),
  },
  handler: async (ctx, { sessionId, subjectId, year, term, pdfUrl }) => {
    await requireSession(ctx, sessionId);
    const id = await ctx.db.insert("eduPapers", { subjectId, year, term, pdfUrl });
    return { id: id as string };
  },
});
