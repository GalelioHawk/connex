/**
 * Manual payment ledger for paid tutoring — no payment gateway in v1.
 * A student's balance is always computed on read (sum of charges minus payments).
 */
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireSession, enforceRateLimit } from "./_helpers";
import type { Doc, Id } from "./_generated/dataModel";

async function requireOwnedTutor(ctx: { db: any }, userId: Id<"users">) {
  const profile = await ctx.db
    .query("tutorProfiles")
    .withIndex("by_user", (q: any) => q.eq("userId", userId))
    .unique();
  if (!profile) throw new Error("You don't have a tutor profile.");
  return profile;
}

async function requireStudentInRoster(
  ctx: { db: any },
  tutorId: Id<"tutorProfiles">,
  studentId: Id<"tutorStudents">,
) {
  const student = await ctx.db.get(studentId);
  if (!student || student.tutorId !== tutorId) throw new Error("Student not found.");
  return student;
}

function serializeEntry(e: Doc<"ledgerEntries">) {
  return {
    id:          e._id as string,
    type:        e.type,
    amount_zar:  e.amountZar,
    description: e.description,
    method:      e.method ?? null,
    recorded_at: e.recordedAt,
    booking_id:  e.bookingId ?? null,
  };
}

export const recordCharge = mutation({
  args: {
    sessionId:   v.id("sessions"),
    studentId:   v.id("tutorStudents"),
    amountZar:   v.number(),
    description: v.string(),
    bookingId:   v.optional(v.id("bookings")),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireSession(ctx, args.sessionId);
    const tutor = await requireOwnedTutor(ctx, userId);
    await requireStudentInRoster(ctx, tutor._id, args.studentId);
    if (args.amountZar <= 0) throw new Error("Amount must be positive.");

    const id = await ctx.db.insert("ledgerEntries", {
      tutorId:     tutor._id,
      studentId:   args.studentId,
      type:        "charge",
      amountZar:   args.amountZar,
      description: args.description.trim() || "Tuition charge",
      recordedAt:  Date.now(),
      bookingId:   args.bookingId,
    });
    return { id: id as string };
  },
});

export const recordPayment = mutation({
  args: {
    sessionId:   v.id("sessions"),
    studentId:   v.id("tutorStudents"),
    amountZar:   v.number(),
    description: v.optional(v.string()),
    method:      v.optional(v.union(v.literal("cash"), v.literal("eft"), v.literal("other"))),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireSession(ctx, args.sessionId);
    const tutor = await requireOwnedTutor(ctx, userId);
    await requireStudentInRoster(ctx, tutor._id, args.studentId);
    await enforceRateLimit(ctx, `edu:payment:${userId}`, 60, 60 * 60 * 1000);
    if (args.amountZar <= 0) throw new Error("Amount must be positive.");

    const id = await ctx.db.insert("ledgerEntries", {
      tutorId:     tutor._id,
      studentId:   args.studentId,
      type:        "payment",
      amountZar:   args.amountZar,
      description: args.description?.trim() || "Payment received",
      method:      args.method,
      recordedAt:  Date.now(),
    });
    return { id: id as string };
  },
});

export const getStudentLedger = query({
  args: { sessionId: v.id("sessions"), studentId: v.id("tutorStudents") },
  handler: async (ctx, { sessionId, studentId }) => {
    const { userId } = await requireSession(ctx, sessionId);
    const student = await ctx.db.get(studentId);
    if (!student) throw new Error("Student not found.");

    const tutor = await ctx.db.get(student.tutorId);
    const isTutor = tutor?.userId === userId;
    const isStudent = student.studentUserId === userId;
    if (!isTutor && !isStudent) throw new Error("Not authorized.");

    const entries = await ctx.db
      .query("ledgerEntries")
      .withIndex("by_student", (q) => q.eq("studentId", studentId))
      .collect();
    entries.sort((a, b) => b.recordedAt - a.recordedAt);

    const balance = entries.reduce(
      (sum, e) => sum + (e.type === "charge" ? e.amountZar : -e.amountZar),
      0,
    );

    return {
      student_name: student.displayName,
      balance_zar:  balance,
      entries:      entries.map(serializeEntry),
    };
  },
});

export const listMyLedgerSummary = query({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, { sessionId }) => {
    const { userId } = await requireSession(ctx, sessionId);
    const tutor = await ctx.db
      .query("tutorProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    if (!tutor) return [];

    const students = await ctx.db
      .query("tutorStudents")
      .withIndex("by_tutor", (q) => q.eq("tutorId", tutor._id))
      .collect();

    return Promise.all(
      students.map(async (s) => {
        const entries = await ctx.db
          .query("ledgerEntries")
          .withIndex("by_student", (q) => q.eq("studentId", s._id))
          .collect();
        const balance = entries.reduce(
          (sum, e) => sum + (e.type === "charge" ? e.amountZar : -e.amountZar),
          0,
        );
        return {
          student_id:   s._id as string,
          student_name: s.displayName,
          balance_zar:  balance,
        };
      }),
    );
  },
});
