/**
 * Voice and video call functions.
 * Uses Agora RTC for media — Convex handles signalling (who's calling whom).
 * Token generation uses App Certificate stored in Convex env (server-side only).
 */
import { v } from "convex/values";
import { mutation, query, action, internalAction, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { requireSession } from "./_helpers";
import type { Id } from "./_generated/dataModel";

// ─── Internal: validate session from an action context ───────────────────────
export const _requireSessionQuery = internalQuery({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, { sessionId }) => {
    const session = await ctx.db.get(sessionId);
    if (!session || session.expiresAt < Date.now()) throw new Error("Session expired.");
    const user = await ctx.db.get(session.userId);
    if (!user || !user.isActive) throw new Error("User not found.");
    return { userId: session.userId as string };
  },
});

// ─── Get a call token (called from mobile before joining a channel) ───────────
export const getCallToken = action({
  args: {
    sessionId:   v.id("sessions"),
    channelName: v.string(),
    uid:         v.number(),
  },
  handler: async (ctx, args): Promise<string> => {
    await ctx.runQuery(internal.calls._requireSessionQuery, { sessionId: args.sessionId });
    const token = await ctx.runAction(internal.agoraToken.generate, {
      channelName: args.channelName,
      uid: args.uid,
    });
    return token;
  },
});

// ─── Internal: get a user's push token ───────────────────────────────────────
export const _getUser = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => ctx.db.get(userId),
});

// ─── Internal: send incoming-call push notification ───────────────────────────
export const _sendCallPush = internalAction({
  args: {
    calleeId:    v.id("users"),
    callerName:  v.string(),
    callType:    v.union(v.literal("voice"), v.literal("video")),
    callId:      v.id("calls"),
    channelName: v.string(),
  },
  handler: async (ctx, args) => {
    const callee = await ctx.runQuery(internal.calls._getUser, { userId: args.calleeId });
    if (!callee?.fcmToken) return;

    await fetch("https://exp.host/--/api/v2/push/send", {
      method:  "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        to:       callee.fcmToken,
        title:    `${args.callerName} is calling...`,
        body:     args.callType === "video" ? "Incoming video call" : "Incoming voice call",
        sound:    "default",
        priority: "high",
        data: {
          type:         "incoming_call",
          call_id:      args.callId,
          channel_name: args.channelName,
          call_type:    args.callType,
          caller_name:  args.callerName,
        },
      }),
    });
  },
});

// ─── Initiate a call ─────────────────────────────────────────────────────────
export const initiateCall = mutation({
  args: {
    sessionId:      v.id("sessions"),
    conversationId: v.id("conversations"),
    calleeId:       v.id("users"),
    callType:       v.union(v.literal("voice"), v.literal("video")),
  },
  handler: async (ctx, args) => {
    const { userId, user } = await requireSession(ctx, args.sessionId);

    // Block duplicate ringing calls to the same person
    const existing = await ctx.db
      .query("calls")
      .withIndex("by_callee_status", (q) =>
        q.eq("calleeId", args.calleeId).eq("status", "ringing"),
      )
      .first();
    if (existing) throw new Error("User is already being called");

    const channelName = `call_${args.conversationId}_${Date.now()}`;

    const callId = await ctx.db.insert("calls", {
      callerId:       userId,
      calleeId:       args.calleeId,
      conversationId: args.conversationId,
      channelName,
      type:           args.callType,
      status:         "ringing",
      startedAt:      Date.now(),
    });

    // Push notification to callee
    await ctx.scheduler.runAfter(0, internal.calls._sendCallPush, {
      calleeId:    args.calleeId,
      callerName:  user.name,
      callType:    args.callType,
      callId,
      channelName,
    });

    return { callId, channelName };
  },
});

// ─── Accept a call (callee) ───────────────────────────────────────────────────
export const acceptCall = mutation({
  args: {
    sessionId: v.id("sessions"),
    callId:    v.id("calls"),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireSession(ctx, args.sessionId);
    const call = await ctx.db.get(args.callId);
    if (!call || call.calleeId !== userId) throw new Error("Not authorized");
    if (call.status !== "ringing") throw new Error("Call is no longer available");

    await ctx.db.patch(args.callId, { status: "active" });
    return { channelName: call.channelName, callType: call.type };
  },
});

// ─── End or decline a call (either party) ────────────────────────────────────
export const endCall = mutation({
  args: {
    sessionId: v.id("sessions"),
    callId:    v.id("calls"),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireSession(ctx, args.sessionId);
    const call = await ctx.db.get(args.callId);
    if (!call) return;
    if (call.callerId !== userId && call.calleeId !== userId) throw new Error("Not authorized");

    // If the callee declines while still ringing → mark as missed
    const isMissed = call.status === "ringing" && call.calleeId === userId;
    await ctx.db.patch(args.callId, {
      status:  isMissed ? "missed" : "ended",
      endedAt: Date.now(),
    });
  },
});

// ─── Watch a specific call's status (used by CallScreen) ─────────────────────
export const getCallStatus = query({
  args: {
    sessionId: v.id("sessions"),
    callId:    v.id("calls"),
  },
  handler: async (ctx, args) => {
    await requireSession(ctx, args.sessionId);
    const call = await ctx.db.get(args.callId);
    if (!call) return null;
    return { status: call.status, channelName: call.channelName, type: call.type };
  },
});

// ─── List call history for a user ────────────────────────────────────────────
export const listCallHistory = query({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, { sessionId }) => {
    const { userId } = await requireSession(ctx, sessionId);

    const asCaller = await ctx.db
      .query("calls")
      .withIndex("by_caller", (q) => q.eq("callerId", userId))
      .order("desc")
      .take(50);

    const asCallee = await ctx.db
      .query("calls")
      .withIndex("by_callee_status", (q) => q.eq("calleeId", userId))
      .order("desc")
      .take(50);

    const all = [...asCaller, ...asCallee].sort((a, b) => b.startedAt - a.startedAt).slice(0, 50);

    return Promise.all(
      all.map(async (call) => {
        const other = await ctx.db.get(
          call.callerId === userId ? call.calleeId : call.callerId,
        );
        return {
          callId:        call._id          as string,
          type:          call.type,
          status:        call.status,
          startedAt:     call.startedAt,
          endedAt:       call.endedAt ?? null,
          isOutgoing:    call.callerId === userId,
          conversationId: call.conversationId as string,
          otherUserId:   (call.callerId === userId ? call.calleeId : call.callerId) as string,
          otherUserName: other?.name         ?? "Unknown",
          otherUserAvatarUrl: other?.avatarUrl ?? null,
        };
      }),
    );
  },
});

// ─── Watch for an incoming ringing call (used for global banner) ─────────────
export const getIncomingCall = query({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    const { userId } = await requireSession(ctx, args.sessionId);

    const call = await ctx.db
      .query("calls")
      .withIndex("by_callee_status", (q) =>
        q.eq("calleeId", userId).eq("status", "ringing"),
      )
      .first();
    if (!call) return null;

    const caller = await ctx.db.get(call.callerId);
    return {
      callId:          call._id,
      channelName:     call.channelName,
      callType:        call.type,
      conversationId:  call.conversationId,
      callerId:        call.callerId,
      callerName:      caller?.name    ?? "Unknown",
      callerAvatarUrl: caller?.avatarUrl ?? null,
    };
  },
});
