import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { enforceRateLimit, requireSession } from "./_helpers";

// ─── List tutors with filters ─────────────────────────────────────────────────
export const listTutors = query({
  args: {
    sessionId:   v.id("sessions"),
    grade:       v.optional(v.number()),
    subjectCode: v.optional(v.string()),
    mode:        v.optional(v.union(v.literal("online"), v.literal("in_person"))),
    province:    v.optional(v.string()),
    freeOnly:    v.optional(v.boolean()),
    language:    v.optional(v.string()),
    search:      v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireSession(ctx, args.sessionId);

    let tutors = await ctx.db.query("eduTutors").collect();

    if (args.grade)       tutors = tutors.filter((t) => t.grades.includes(args.grade!));
    if (args.subjectCode) tutors = tutors.filter((t) => t.subjects.includes(args.subjectCode!));
    if (args.mode)        tutors = tutors.filter((t) => t.mode === args.mode || t.mode === "both");
    if (args.province)    tutors = tutors.filter((t) => t.province === args.province);
    if (args.freeOnly)    tutors = tutors.filter((t) => t.hourlyRateZar === undefined);
    if (args.language)    tutors = tutors.filter((t) => t.languages.includes(args.language!));
    if (args.search && args.search.trim().length > 0) {
      const needle = args.search.toLowerCase().trim();
      tutors = tutors.filter((t) =>
        [t.name, t.bio, t.province, ...t.subjects, ...t.languages]
          .join(" ")
          .toLowerCase()
          .includes(needle),
      );
    }

    tutors.sort((a, b) => b.rating - a.rating || b.reviewCount - a.reviewCount);

    const myRequests = await ctx.db
      .query("eduTutorRequests")
      .withIndex("by_user_tutor", (q) => q.eq("userId", userId))
      .collect();
    const requestedTutorIds = new Set(myRequests.map((r) => r.tutorId as string));

    return tutors.map((t) => ({
      id:              t._id as string,
      name:            t.name,
      bio:             t.bio,
      subjects:        t.subjects,
      grades:          t.grades,
      province:        t.province,
      mode:            t.mode,
      hourly_rate_zar: t.hourlyRateZar ?? null,
      rating:          t.rating,
      review_count:    t.reviewCount,
      languages:       t.languages,
      availability:    t.availability,
      verified:        t.verified,
      avatar_color:    t.avatarColor ?? null,
      requested:       requestedTutorIds.has(t._id as string),
    }));
  },
});

// ─── Become-a-tutor application ───────────────────────────────────────────────
export const applyToTutor = mutation({
  args: {
    sessionId:      v.id("sessions"),
    subjects:       v.array(v.string()),
    grades:         v.array(v.number()),
    province:       v.string(),
    mode:           v.union(v.literal("online"), v.literal("in_person"), v.literal("both")),
    qualifications: v.string(),
    motivation:     v.optional(v.string()),
    hourlyRateZar:  v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireSession(ctx, args.sessionId);

    if (args.subjects.length === 0) throw new Error("Pick at least one subject.");
    if (args.grades.length === 0)   throw new Error("Pick at least one grade.");
    if (args.qualifications.trim().length < 10) {
      throw new Error("Tell us a bit more about your qualifications.");
    }

    const existing = await ctx.db
      .query("eduTutorApplications")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    if (existing.some((a) => a.status === "pending")) {
      throw new Error("You already have an application under review.");
    }
    if (existing.some((a) => a.status === "approved")) {
      throw new Error("You're already an approved tutor.");
    }

    const id = await ctx.db.insert("eduTutorApplications", {
      userId,
      subjects:       args.subjects,
      grades:         args.grades,
      province:       args.province,
      mode:           args.mode,
      qualifications: args.qualifications.trim().slice(0, 1000),
      motivation:     args.motivation?.trim() ? args.motivation.trim().slice(0, 1000) : undefined,
      hourlyRateZar:  args.hourlyRateZar,
      status:         "pending",
    });
    return { id: id as string };
  },
});

export const myTutorApplication = query({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, { sessionId }) => {
    const { userId } = await requireSession(ctx, sessionId);
    const applications = await ctx.db
      .query("eduTutorApplications")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    if (applications.length === 0) return null;
    // Most recent application wins
    applications.sort((a, b) => b._creationTime - a._creationTime);
    return { status: applications[0].status };
  },
});

// ─── Request contact with a tutor ─────────────────────────────────────────────
export const requestTutor = mutation({
  args: {
    sessionId: v.id("sessions"),
    tutorId:   v.id("eduTutors"),
    message:   v.optional(v.string()),
  },
  handler: async (ctx, { sessionId, tutorId, message }) => {
    const { userId } = await requireSession(ctx, sessionId);
    await enforceRateLimit(ctx, `edu:tutor-request:${userId}`, 10, 24 * 60 * 60 * 1000);

    const tutor = await ctx.db.get(tutorId);
    if (!tutor) throw new Error("Tutor not found.");

    const existing = await ctx.db
      .query("eduTutorRequests")
      .withIndex("by_user_tutor", (q) => q.eq("userId", userId).eq("tutorId", tutorId))
      .unique();
    if (existing) return { id: existing._id as string, already_requested: true };

    const id = await ctx.db.insert("eduTutorRequests", {
      tutorId,
      userId,
      message: message?.trim() ? message.trim().slice(0, 500) : undefined,
      status:  "pending",
    });
    return { id: id as string, already_requested: false };
  },
});
