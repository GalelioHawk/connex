import { query } from "./_generated/server";
import { v } from "convex/values";
import { requireSession } from "./_helpers";

// ─── List notes for a grade, with optional filters ───────────────────────────
export const listNotes = query({
  args: {
    sessionId:   v.id("sessions"),
    grade:       v.number(),
    subjectCode: v.optional(v.string()),
    noteType:    v.optional(v.string()),
    topic:       v.optional(v.string()),
    search:      v.optional(v.string()),
  },
  handler: async (ctx, { sessionId, grade, subjectCode, noteType, topic, search }) => {
    await requireSession(ctx, sessionId);

    let notes = subjectCode
      ? await ctx.db
          .query("eduNotes")
          .withIndex("by_grade_subject", (q) =>
            q.eq("grade", grade).eq("subjectCode", subjectCode),
          )
          .collect()
      : await ctx.db
          .query("eduNotes")
          .withIndex("by_grade_subject", (q) => q.eq("grade", grade))
          .collect();

    if (noteType) notes = notes.filter((n) => n.noteType === noteType);
    if (topic)    notes = notes.filter((n) => n.topic === topic);
    if (search && search.trim().length > 0) {
      const needle = search.toLowerCase().trim();
      notes = notes.filter((n) =>
        [n.title, n.topic, n.subjectName, n.content, ...(n.tags ?? [])]
          .join(" ")
          .toLowerCase()
          .includes(needle),
      );
    }

    notes.sort((a, b) =>
      a.subjectName === b.subjectName
        ? a.title.localeCompare(b.title)
        : a.subjectName.localeCompare(b.subjectName),
    );

    return notes.map((n) => ({
      id:           n._id as string,
      grade:        n.grade,
      subject_code: n.subjectCode,
      subject_name: n.subjectName,
      topic:        n.topic,
      title:        n.title,
      note_type:    n.noteType,
      difficulty:   n.difficulty,
      content:      n.content,
      tags:         n.tags ?? [],
    }));
  },
});

// ─── Distinct topics for a grade/subject (for topic chips) ───────────────────
export const listTopics = query({
  args: {
    sessionId:   v.id("sessions"),
    grade:       v.number(),
    subjectCode: v.optional(v.string()),
  },
  handler: async (ctx, { sessionId, grade, subjectCode }) => {
    await requireSession(ctx, sessionId);

    const notes = subjectCode
      ? await ctx.db
          .query("eduNotes")
          .withIndex("by_grade_subject", (q) =>
            q.eq("grade", grade).eq("subjectCode", subjectCode),
          )
          .collect()
      : await ctx.db
          .query("eduNotes")
          .withIndex("by_grade_subject", (q) => q.eq("grade", grade))
          .collect();

    return Array.from(new Set(notes.map((n) => n.topic))).sort();
  },
});
