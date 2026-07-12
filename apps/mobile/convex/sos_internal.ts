import { internalQuery, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { Doc, Id } from "./_generated/dataModel";
import { enforceRateLimit } from "./_helpers";

// ─── Internal: get session user ──────────────────────────────────────────────
export const getSessionUser = internalQuery({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, { sessionId }): Promise<Doc<"users"> | null> => {
    const session = await ctx.db.get(sessionId);
    if (!session || session.expiresAt < Date.now()) return null;
    const user = await ctx.db.get(session.userId);
    return user?.isActive ? user : null;
  },
});

// ─── Internal: get accepted contacts ─────────────────────────────────────────
export const getAcceptedContacts = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const contacts = await ctx.db
      .query("sosContacts")
      .withIndex("by_user", (q: any) => q.eq("userId", userId))
      .filter((q: any) => q.eq(q.field("status"), "accepted"))
      .collect();

    return Promise.all(
      contacts.map((c: any) => ctx.db.get(c.contactUserId)),
    ).then((users) => users.filter(Boolean));
  },
});

export const checkAlertRateLimit = internalMutation({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    await enforceRateLimit(ctx, `sos:alert:${userId}`, 3, 5 * 60 * 1000);
  },
});

// ─── Broadcast emergency DMs in real-time to all mutual SOS contacts ─────────
export const broadcastSOSAlert = internalMutation({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const user = await ctx.db.get(userId);
    if (!user) return;

    // 1. Get all accepted SOS contacts
    const contacts = await ctx.db
      .query("sosContacts")
      .withIndex("by_user", (q: any) => q.eq("userId", userId))
      .filter((q: any) => q.eq(q.field("status"), "accepted"))
      .collect();

    if (!contacts.length) return;

    const contactUserIds = contacts.map((c: any) => c.contactUserId);

    for (const targetUserId of contactUserIds) {
      // 2. Find or create a direct conversation with targetUserId
      const userMemberships = await ctx.db
        .query("conversationMembers")
        .withIndex("by_user", (q: any) => q.eq("userId", userId))
        .collect();

      let targetConvoId = null;

      for (const m of userMemberships) {
        const convo = await ctx.db.get(m.conversationId);
        if (convo && convo.type === "direct") {
          const isTargetMember = await ctx.db
            .query("conversationMembers")
            .withIndex("by_conversation_user", (q: any) =>
              q.eq("conversationId", m.conversationId).eq("userId", targetUserId),
            )
            .first();

          if (isTargetMember) {
            targetConvoId = m.conversationId;
            break;
          }
        }
      }

      if (!targetConvoId) {
        const convoId = await ctx.db.insert("conversations", {
          type: "direct",
          createdBy: userId,
          status: "accepted",
        });
        await ctx.db.insert("conversationMembers", {
          conversationId: convoId,
          userId: userId,
          role: "member",
        });
        await ctx.db.insert("conversationMembers", {
          conversationId: convoId,
          userId: targetUserId,
          role: "member",
        });
        targetConvoId = convoId;
      }

      // 3. Send emergency system message
      const content = `🚨 EMERGENCY SOS! I have triggered an emergency alert! Please contact me immediately.`;
      
      const messageId = await ctx.db.insert("messages", {
        conversationId: targetConvoId,
        senderId: userId,
        content,
        type: "system",
        status: "sent",
      });

      // 4. Trigger push notification scheduler
      await ctx.scheduler.runAfter(0, internal.push.sendNewMessagePush, {
        conversationId: targetConvoId as string,
        senderId:       userId as string,
        senderName:     user.name,
        messageId:      messageId as string,
        content,
        messageType:    "text",
      });
    }
  },
});
