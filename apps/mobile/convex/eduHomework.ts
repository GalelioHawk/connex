/**
 * Homework assignment, submission, and marking for paid tutoring.
 */
import { v } from "convex/values";
import { mutation, query, internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
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

async function attachmentUrl(
  ctx: { storage: { getUrl: (id: Id<"_storage">) => Promise<string | null> } },
  storageId: Id<"_storage"> | undefined,
  fallbackUrl: string | undefined,
): Promise<string | null> {
  if (storageId) return (await ctx.storage.getUrl(storageId)) ?? fallbackUrl ?? null;
  return fallbackUrl ?? null;
}

// ─── Upload URL (question sheets and submissions share this) ────────────────
export const generateHomeworkUploadUrl = mutation({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, { sessionId }) => {
    await requireSession(ctx, sessionId);
    return await ctx.storage.generateUploadUrl();
  },
});

// ─── Assign homework (tutor) ─────────────────────────────────────────────────
export const assignHomework = mutation({
  args: {
    sessionId:           v.id("sessions"),
    studentId:           v.id("tutorStudents"),
    subjectCode:         v.optional(v.string()),
    title:               v.string(),
    instructions:        v.string(),
    attachmentStorageId: v.optional(v.id("_storage")),
    attachmentUrl:       v.optional(v.string()),
    dueAt:               v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireSession(ctx, args.sessionId);
    const tutor = await requireOwnedTutor(ctx, userId);

    const student = await ctx.db.get(args.studentId);
    if (!student || student.tutorId !== tutor._id) throw new Error("Student not found.");
    if (!args.title.trim() || !args.instructions.trim()) {
      throw new Error("Title and instructions are required.");
    }

    const id = await ctx.db.insert("homeworkAssignments", {
      tutorId:             tutor._id,
      studentId:           args.studentId,
      subjectCode:         args.subjectCode,
      title:               args.title.trim(),
      instructions:        args.instructions.trim(),
      attachmentStorageId: args.attachmentStorageId,
      attachmentUrl:       args.attachmentUrl,
      dueAt:               args.dueAt,
      status:              "assigned",
    });

    if (student.studentUserId) {
      await ctx.scheduler.runAfter(0, internal.eduHomework._sendHomeworkPush, {
        userId:       student.studentUserId,
        title:        "New homework",
        body:         `${tutor.displayName} assigned: ${args.title.trim()}`,
        pushType:     "homework_assigned",
        assignmentId: id,
      });
    }

    return { id: id as string };
  },
});

async function serializeAssignment(
  ctx: { storage: { getUrl: (id: Id<"_storage">) => Promise<string | null> } },
  a: Doc<"homeworkAssignments">,
  tutorName: string,
  studentName: string,
) {
  return {
    id:               a._id as string,
    tutor_name:       tutorName,
    student_name:     studentName,
    subject_code:     a.subjectCode ?? null,
    title:            a.title,
    instructions:     a.instructions,
    attachment_url:   await attachmentUrl(ctx, a.attachmentStorageId, a.attachmentUrl),
    due_at:           a.dueAt ?? null,
    status:           a.status,
  };
}

export const listHomeworkForStudent = query({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, { sessionId }) => {
    const { userId } = await requireSession(ctx, sessionId);

    const myStudentRows = await ctx.db
      .query("tutorStudents")
      .withIndex("by_student_user", (q) => q.eq("studentUserId", userId))
      .collect();

    const perStudent = await Promise.all(
      myStudentRows.map((s) =>
        ctx.db.query("homeworkAssignments").withIndex("by_student", (q) => q.eq("studentId", s._id)).collect(),
      ),
    );
    const assignments = perStudent.flat();
    assignments.sort((a, b) => (b.dueAt ?? b._creationTime) - (a.dueAt ?? a._creationTime));

    return Promise.all(
      assignments.map(async (a) => {
        const tutor = await ctx.db.get(a.tutorId);
        const student = await ctx.db.get(a.studentId);
        return serializeAssignment(ctx, a, tutor?.displayName ?? "Tutor", student?.displayName ?? "Me");
      }),
    );
  },
});

export const listHomeworkForTutor = query({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, { sessionId }) => {
    const { userId } = await requireSession(ctx, sessionId);
    const tutor = await ctx.db
      .query("tutorProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    if (!tutor) return [];

    const assignments = await ctx.db
      .query("homeworkAssignments")
      .withIndex("by_tutor", (q) => q.eq("tutorId", tutor._id))
      .collect();
    assignments.sort((a, b) => (b.dueAt ?? b._creationTime) - (a.dueAt ?? a._creationTime));

    return Promise.all(
      assignments.map(async (a) => {
        const student = await ctx.db.get(a.studentId);
        return serializeAssignment(ctx, a, tutor.displayName, student?.displayName ?? "Student");
      }),
    );
  },
});

export const getHomeworkDetail = query({
  args: { sessionId: v.id("sessions"), assignmentId: v.id("homeworkAssignments") },
  handler: async (ctx, { sessionId, assignmentId }) => {
    const { userId } = await requireSession(ctx, sessionId);
    const a = await ctx.db.get(assignmentId);
    if (!a) return null;

    const tutor = await ctx.db.get(a.tutorId);
    const student = await ctx.db.get(a.studentId);
    const isTutor = tutor?.userId === userId;
    const isStudent = student?.studentUserId === userId;
    if (!isTutor && !isStudent) throw new Error("Not authorized.");

    const submission = await ctx.db
      .query("homeworkSubmissions")
      .withIndex("by_assignment", (q) => q.eq("assignmentId", assignmentId))
      .unique();

    return {
      ...(await serializeAssignment(ctx, a, tutor?.displayName ?? "Tutor", student?.displayName ?? "Student")),
      is_tutor: isTutor,
      submission: submission
        ? {
            id:            submission._id as string,
            file_url:      await attachmentUrl(ctx, submission.storageId, submission.fileUrl),
            text_answer:   submission.textAnswer ?? null,
            submitted_at:  submission.submittedAt,
            mark_score:    submission.markScore ?? null,
            mark_max:      submission.markMax ?? null,
            mark_feedback: submission.markFeedback ?? null,
            marked_at:     submission.markedAt ?? null,
          }
        : null,
    };
  },
});

// ─── Submit homework (student) ───────────────────────────────────────────────
export const submitHomework = mutation({
  args: {
    sessionId:    v.id("sessions"),
    assignmentId: v.id("homeworkAssignments"),
    storageId:    v.optional(v.id("_storage")),
    fileUrl:      v.optional(v.string()),
    textAnswer:   v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireSession(ctx, args.sessionId);
    await enforceRateLimit(ctx, `edu:submit:${userId}`, 30, 60 * 60 * 1000);

    const assignment = await ctx.db.get(args.assignmentId);
    if (!assignment) throw new Error("Assignment not found.");
    const student = await ctx.db.get(assignment.studentId);
    if (!student || student.studentUserId !== userId) throw new Error("Not authorized.");
    if (!args.storageId && !args.fileUrl && !args.textAnswer?.trim()) {
      throw new Error("Add a file or written answer before submitting.");
    }

    const existing = await ctx.db
      .query("homeworkSubmissions")
      .withIndex("by_assignment", (q) => q.eq("assignmentId", args.assignmentId))
      .unique();

    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, {
        storageId:   args.storageId,
        fileUrl:     args.fileUrl,
        textAnswer:  args.textAnswer,
        submittedAt: now,
        markScore: undefined, markMax: undefined, markFeedback: undefined, markedAt: undefined,
      });
    } else {
      await ctx.db.insert("homeworkSubmissions", {
        assignmentId:  args.assignmentId,
        studentUserId: userId,
        storageId:     args.storageId,
        fileUrl:       args.fileUrl,
        textAnswer:    args.textAnswer,
        submittedAt:   now,
      });
    }
    await ctx.db.patch(args.assignmentId, { status: "submitted" });

    const tutor = await ctx.db.get(assignment.tutorId);
    if (tutor) {
      await ctx.scheduler.runAfter(0, internal.eduHomework._sendHomeworkPush, {
        userId:       tutor.userId,
        title:        "Homework submitted",
        body:         `${student.displayName} submitted: ${assignment.title}`,
        pushType:     "homework_submitted",
        assignmentId: args.assignmentId,
      });
    }
  },
});

// ─── Mark homework (tutor) ────────────────────────────────────────────────────
export const markHomework = mutation({
  args: {
    sessionId:    v.id("sessions"),
    assignmentId: v.id("homeworkAssignments"),
    markScore:    v.number(),
    markMax:      v.number(),
    markFeedback: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireSession(ctx, args.sessionId);
    const assignment = await ctx.db.get(args.assignmentId);
    if (!assignment) throw new Error("Assignment not found.");
    const tutor = await ctx.db.get(assignment.tutorId);
    if (!tutor || tutor.userId !== userId) throw new Error("Not authorized.");

    const submission = await ctx.db
      .query("homeworkSubmissions")
      .withIndex("by_assignment", (q) => q.eq("assignmentId", args.assignmentId))
      .unique();
    if (!submission) throw new Error("No submission to mark yet.");

    await ctx.db.patch(submission._id, {
      markScore:    args.markScore,
      markMax:      args.markMax,
      markFeedback: args.markFeedback,
      markedAt:     Date.now(),
    });
    await ctx.db.patch(args.assignmentId, { status: "marked" });

    const student = await ctx.db.get(assignment.studentId);
    if (student?.studentUserId) {
      await ctx.scheduler.runAfter(0, internal.eduHomework._sendHomeworkPush, {
        userId:       student.studentUserId,
        title:        "Homework marked",
        body:         `${assignment.title}: ${args.markScore}/${args.markMax}`,
        pushType:     "homework_marked",
        assignmentId: args.assignmentId,
      });
    }
  },
});

// ─── Internal: single-recipient push (mirrors calls.ts::_sendCallPush) ──────
export const _sendHomeworkPush = internalAction({
  args: {
    userId:       v.id("users"),
    title:        v.string(),
    body:         v.string(),
    pushType:     v.string(),
    assignmentId: v.optional(v.id("homeworkAssignments")),
  },
  handler: async (ctx, args) => {
    const user = await ctx.runQuery(internal.calls._getUser, { userId: args.userId });
    const pushToken = user?.expoPushToken || user?.fcmToken;
    if (!pushToken) return;

    await fetch("https://exp.host/--/api/v2/push/send", {
      method:  "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        to:       pushToken,
        title:    args.title,
        body:     args.body,
        sound:    "default",
        priority: "high",
        data: {
          type:          args.pushType,
          assignment_id: args.assignmentId ?? null,
        },
      }),
    });
  },
});
