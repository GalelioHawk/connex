/**
 * Tutor profiles, student roster, and lesson bookings for paid tutoring.
 * Live lessons reuse the existing Agora call infrastructure (see calls.ts).
 */
import { v } from "convex/values";
import { mutation, query, internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { requireSession, requireAdmin, enforceRateLimit } from "./_helpers";
import type { Doc, Id } from "./_generated/dataModel";

// ─── Create the caller's tutor profile ───────────────────────────────────────
export const createTutorProfile = mutation({
  args: {
    sessionId:     v.id("sessions"),
    hourlyRateZar: v.optional(v.number()),
  },
  handler: async (ctx, { sessionId, hourlyRateZar }) => {
    const { userId, user } = await requireAdmin(ctx, sessionId);

    const existing = await ctx.db
      .query("tutorProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    if (existing) return { id: existing._id as string };

    const id = await ctx.db.insert("tutorProfiles", {
      userId,
      displayName:   user.name,
      hourlyRateZar,
      currency:      "ZAR",
      isActive:      true,
      createdFrom:   "admin",
    });
    return { id: id as string };
  },
});

// ─── Get the caller's own tutor profile (null if not a tutor) ───────────────
export const myTutorProfile = query({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, { sessionId }) => {
    const { userId } = await requireSession(ctx, sessionId);
    const profile = await ctx.db
      .query("tutorProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    if (!profile) return null;
    return {
      id:              profile._id as string,
      display_name:    profile.displayName,
      hourly_rate_zar: profile.hourlyRateZar ?? null,
      is_active:       profile.isActive,
    };
  },
});

async function requireOwnedTutor(
  ctx: { db: any },
  userId: Id<"users">,
): Promise<Doc<"tutorProfiles">> {
  const profile = await ctx.db
    .query("tutorProfiles")
    .withIndex("by_user", (q: any) => q.eq("userId", userId))
    .unique();
  if (!profile) throw new Error("You don't have a tutor profile.");
  return profile;
}

// ─── Roster (tutorStudents) ───────────────────────────────────────────────────
export const addStudent = mutation({
  args: {
    sessionId:     v.id("sessions"),
    displayName:   v.string(),
    contactPhone:  v.optional(v.string()),
    monthlyFeeZar: v.optional(v.number()),
    studentUserId: v.optional(v.id("users")),
  },
  handler: async (ctx, { sessionId, displayName, contactPhone, monthlyFeeZar, studentUserId }) => {
    const { userId } = await requireSession(ctx, sessionId);
    const tutor = await requireOwnedTutor(ctx, userId);
    if (!displayName.trim()) throw new Error("Student name is required.");

    const id = await ctx.db.insert("tutorStudents", {
      tutorId:      tutor._id,
      studentUserId,
      displayName:  displayName.trim(),
      contactPhone,
      monthlyFeeZar,
      status:       "active",
    });
    return { id: id as string };
  },
});

export const updateStudent = mutation({
  args: {
    sessionId:     v.id("sessions"),
    studentId:     v.id("tutorStudents"),
    displayName:   v.optional(v.string()),
    contactPhone:  v.optional(v.string()),
    monthlyFeeZar: v.optional(v.number()),
    studentUserId: v.optional(v.id("users")),
    status:        v.optional(v.union(v.literal("active"), v.literal("paused"), v.literal("ended"))),
  },
  handler: async (ctx, { sessionId, studentId, ...patch }) => {
    const { userId } = await requireSession(ctx, sessionId);
    const tutor = await requireOwnedTutor(ctx, userId);
    const student = await ctx.db.get(studentId);
    if (!student || student.tutorId !== tutor._id) throw new Error("Student not found.");

    const update: Record<string, unknown> = {};
    if (patch.displayName !== undefined) update.displayName = patch.displayName.trim();
    if (patch.contactPhone !== undefined) update.contactPhone = patch.contactPhone;
    if (patch.monthlyFeeZar !== undefined) update.monthlyFeeZar = patch.monthlyFeeZar;
    if (patch.studentUserId !== undefined) update.studentUserId = patch.studentUserId;
    if (patch.status !== undefined) update.status = patch.status;

    await ctx.db.patch(studentId, update);
  },
});

export const listMyStudents = query({
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

    return students.map((s) => ({
      id:              s._id as string,
      display_name:    s.displayName,
      contact_phone:   s.contactPhone ?? null,
      monthly_fee_zar: s.monthlyFeeZar ?? null,
      status:          s.status,
      student_user_id: s.studentUserId ?? null,
    }));
  },
});

// ─── Bookings ─────────────────────────────────────────────────────────────────
export const createBooking = mutation({
  args: {
    sessionId:       v.id("sessions"),
    studentId:       v.id("tutorStudents"),
    subjectCode:     v.optional(v.string()),
    scheduledAt:     v.number(),
    durationMinutes: v.number(),
    mode:            v.union(v.literal("online"), v.literal("in_person")),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireSession(ctx, args.sessionId);
    const tutor = await requireOwnedTutor(ctx, userId);
    await enforceRateLimit(ctx, `edu:booking:${userId}`, 30, 60 * 60 * 1000);

    const student = await ctx.db.get(args.studentId);
    if (!student || student.tutorId !== tutor._id) throw new Error("Student not found.");
    if (args.durationMinutes <= 0) throw new Error("Duration must be positive.");

    const id = await ctx.db.insert("bookings", {
      tutorId:         tutor._id,
      studentId:       args.studentId,
      subjectCode:     args.subjectCode,
      scheduledAt:     args.scheduledAt,
      durationMinutes: args.durationMinutes,
      mode:            args.mode,
      status:          "scheduled",
    });

    if (student.studentUserId) {
      await ctx.scheduler.runAfter(0, internal.eduBookings._sendBookingPush, {
        userId:      student.studentUserId,
        title:       "Lesson scheduled",
        body:        `${tutor.displayName} booked a lesson with you.`,
        pushType:    "booking_scheduled",
        bookingId:   id,
      });
    }

    return { id: id as string };
  },
});

export const getBooking = query({
  args: { sessionId: v.id("sessions"), bookingId: v.id("bookings") },
  handler: async (ctx, { sessionId, bookingId }) => {
    const { userId } = await requireSession(ctx, sessionId);
    const booking = await ctx.db.get(bookingId);
    if (!booking) return null;

    const tutor = await ctx.db.get(booking.tutorId);
    const student = await ctx.db.get(booking.studentId);
    const isTutor = tutor?.userId === userId;
    const isStudent = student?.studentUserId === userId;
    if (!isTutor && !isStudent) throw new Error("Not authorized.");

    return {
      id:               booking._id as string,
      tutor_id:         booking.tutorId as string,
      tutor_name:       tutor?.displayName ?? "Tutor",
      student_id:       booking.studentId as string,
      student_name:     student?.displayName ?? "Student",
      subject_code:     booking.subjectCode ?? null,
      scheduled_at:     booking.scheduledAt,
      duration_minutes: booking.durationMinutes,
      mode:             booking.mode,
      status:           booking.status,
      notes:            booking.notes ?? null,
      call_id:          booking.callId ?? null,
      meeting_link:     booking.meetingLink ?? null,
      is_tutor:         isTutor,
    };
  },
});

// ─── Set/update an external meeting link (used by the website, no Agora there) ─
export const setMeetingLink = mutation({
  args: {
    sessionId:   v.id("sessions"),
    bookingId:   v.id("bookings"),
    meetingLink: v.string(),
  },
  handler: async (ctx, { sessionId, bookingId, meetingLink }) => {
    const { userId } = await requireSession(ctx, sessionId);
    const booking = await ctx.db.get(bookingId);
    if (!booking) throw new Error("Booking not found.");
    const tutor = await ctx.db.get(booking.tutorId);
    if (!tutor || tutor.userId !== userId) throw new Error("Not authorized.");

    await ctx.db.patch(bookingId, { meetingLink: meetingLink.trim() || undefined });
  },
});

export const listMyBookings = query({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, { sessionId }) => {
    const { userId } = await requireSession(ctx, sessionId);

    const tutor = await ctx.db
      .query("tutorProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();

    let bookings: Doc<"bookings">[] = [];
    if (tutor) {
      bookings = await ctx.db
        .query("bookings")
        .withIndex("by_tutor_time", (q) => q.eq("tutorId", tutor._id))
        .collect();
    } else {
      const myStudentRows = await ctx.db
        .query("tutorStudents")
        .withIndex("by_student_user", (q) => q.eq("studentUserId", userId))
        .collect();
      const perStudent = await Promise.all(
        myStudentRows.map((s) =>
          ctx.db.query("bookings").withIndex("by_student", (q) => q.eq("studentId", s._id)).collect(),
        ),
      );
      bookings = perStudent.flat();
    }

    bookings.sort((a, b) => a.scheduledAt - b.scheduledAt);

    return Promise.all(
      bookings.map(async (b) => {
        const student = await ctx.db.get(b.studentId);
        const bTutor = tutor ?? (await ctx.db.get(b.tutorId));
        return {
          id:               b._id as string,
          tutor_name:       bTutor?.displayName ?? "Tutor",
          student_name:     student?.displayName ?? "Student",
          subject_code:     b.subjectCode ?? null,
          scheduled_at:     b.scheduledAt,
          duration_minutes: b.durationMinutes,
          mode:             b.mode,
          status:           b.status,
        };
      }),
    );
  },
});

export const updateBookingStatus = mutation({
  args: {
    sessionId:    v.id("sessions"),
    bookingId:    v.id("bookings"),
    status:       v.union(v.literal("completed"), v.literal("cancelled"), v.literal("no_show")),
    cancelReason: v.optional(v.string()),
  },
  handler: async (ctx, { sessionId, bookingId, status, cancelReason }) => {
    const { userId } = await requireSession(ctx, sessionId);
    const booking = await ctx.db.get(bookingId);
    if (!booking) throw new Error("Booking not found.");

    const tutor = await ctx.db.get(booking.tutorId);
    const student = await ctx.db.get(booking.studentId);
    const isTutor = tutor?.userId === userId;
    const isStudent = student?.studentUserId === userId;
    if (!isTutor && !isStudent) throw new Error("Not authorized.");
    if (status !== "cancelled" && !isTutor) throw new Error("Only the tutor can record this outcome.");

    await ctx.db.patch(bookingId, {
      status,
      cancelledBy:  status === "cancelled" ? (isTutor ? "tutor" : "student") : undefined,
      cancelReason: status === "cancelled" ? cancelReason : undefined,
    });
  },
});

// ─── Live lesson: resolve/create a conversation, then start an Agora call ────
export const startBookingCall = mutation({
  args: {
    sessionId: v.id("sessions"),
    bookingId: v.id("bookings"),
    callType:  v.union(v.literal("voice"), v.literal("video")),
  },
  handler: async (ctx, { sessionId, bookingId, callType }) => {
    const { userId, user } = await requireSession(ctx, sessionId);
    const booking = await ctx.db.get(bookingId);
    if (!booking) throw new Error("Booking not found.");

    const tutor = await ctx.db.get(booking.tutorId);
    const student = await ctx.db.get(booking.studentId);
    if (!tutor || !student) throw new Error("Booking is missing tutor/student data.");
    if (!student.studentUserId) {
      throw new Error("This student hasn't linked a Connex account yet — link one before starting a live lesson.");
    }

    const isTutor = tutor.userId === userId;
    const isStudent = student.studentUserId === userId;
    if (!isTutor && !isStudent) throw new Error("Not authorized.");

    const otherUserId = isTutor ? student.studentUserId : tutor.userId;

    let conversationId = booking.conversationId;
    if (!conversationId) {
      conversationId = await resolveOrCreateDirectConversation(ctx, tutor.userId, student.studentUserId);
      await ctx.db.patch(bookingId, { conversationId });
    }

    const { callId, channelName } = await createCallRecord(ctx, {
      callerId:       userId,
      calleeId:       otherUserId,
      callerName:     user.name,
      conversationId,
      callType,
    });

    await ctx.db.patch(bookingId, { callId });

    return { callId, channelName, conversationId: conversationId as string };
  },
});

async function resolveOrCreateDirectConversation(
  ctx: any,
  tutorUserId: Id<"users">,
  studentUserId: Id<"users">,
): Promise<Id<"conversations">> {
  const tutorMemberships = await ctx.db
    .query("conversationMembers")
    .withIndex("by_user", (q: any) => q.eq("userId", tutorUserId))
    .collect();

  for (const m of tutorMemberships) {
    const otherM = await ctx.db
      .query("conversationMembers")
      .withIndex("by_conversation_user", (q: any) =>
        q.eq("conversationId", m.conversationId).eq("userId", studentUserId),
      )
      .first();
    if (otherM) {
      const conv = await ctx.db.get(m.conversationId);
      if (conv?.type === "direct") return conv._id;
    }
  }

  const conversationId = await ctx.db.insert("conversations", {
    type:      "direct",
    createdBy: tutorUserId,
    status:    "accepted",
  });
  await Promise.all(
    [tutorUserId, studentUserId].map((uid) =>
      ctx.db.insert("conversationMembers", {
        conversationId,
        userId: uid,
        role:   uid === tutorUserId ? "admin" : "member",
      }),
    ),
  );
  return conversationId;
}

/** Shared by calls.initiateCall and startBookingCall — keeps Agora signalling logic in one place. */
export async function createCallRecord(
  ctx: any,
  args: {
    callerId:       Id<"users">;
    calleeId:       Id<"users">;
    callerName:     string;
    conversationId: Id<"conversations">;
    callType:       "voice" | "video";
  },
): Promise<{ callId: Id<"calls">; channelName: string }> {
  const existing = await ctx.db
    .query("calls")
    .withIndex("by_callee_status", (q: any) =>
      q.eq("calleeId", args.calleeId).eq("status", "ringing"),
    )
    .first();
  if (existing) throw new Error("User is already being called");

  const channelName = `call_${args.conversationId}_${Date.now()}`;

  const callId = await ctx.db.insert("calls", {
    callerId:       args.callerId,
    calleeId:       args.calleeId,
    conversationId: args.conversationId,
    channelName,
    type:           args.callType,
    status:         "ringing",
    startedAt:      Date.now(),
  });

  await ctx.scheduler.runAfter(0, internal.calls._sendCallPush, {
    calleeId:    args.calleeId,
    callerName:  args.callerName,
    callType:    args.callType,
    callId,
    channelName,
  });

  return { callId, channelName };
}

// ─── Internal: booking notification push (single recipient) ─────────────────
export const _sendBookingPush = internalAction({
  args: {
    userId:    v.id("users"),
    title:     v.string(),
    body:      v.string(),
    pushType:  v.string(),
    bookingId: v.optional(v.id("bookings")),
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
          type:       args.pushType,
          booking_id: args.bookingId ?? null,
        },
      }),
    });
  },
});
