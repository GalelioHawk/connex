/**
 * FCM push notification — internal action only.
 * Called from chat.sendMessage via ctx.scheduler.
 * Uses Firebase FCM HTTP v1 API.
 */
import { internalAction } from "./_generated/server";
import { v } from "convex/values";

export const sendNewMessagePush = internalAction({
  args: {
    conversationId: v.string(),
    senderId:       v.string(),
    senderName:     v.string(),
    messageId:      v.string(),
    content:        v.string(),
  },
  handler: async (ctx, { conversationId, senderId, senderName, messageId, content }) => {
    try {
      // Get conversation
      const conv = await ctx.runQuery(
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        (await import("./_generated/api")).internal.push.getConvInfo,
        { conversationId },
      );

      // Get FCM tokens of all other members (with per-user preview preference)
      const recipients: Array<{ token: string; showPreview: boolean }> = await ctx.runQuery(
        (await import("./_generated/api")).internal.push.getMemberTokens,
        { conversationId, excludeUserId: senderId },
      );

      if (!recipients.length) return;

      const title   = conv?.type === "group" ? (conv.name ?? "Group") : senderName;
      const preview = content.length > 100 ? `${content.slice(0, 97)}…` : content;
      const fullBody = conv?.type === "group" ? `${senderName}: ${preview}` : preview;

      const messages = recipients.map(({ token, showPreview }) => ({
        to:       token,
        title,
        body:     showPreview ? fullBody : "New message",
        sound:    "default",
        priority: "high",
        badge:    1,
        data: {
          type:               "new_message",
          conversation_id:    conversationId,
          conversation_title: title,
          message_id:         messageId,
          sender_id:          senderId,
          sender_name:        senderName,
          content,
        },
      }));

      await fetch("https://exp.host/--/api/v2/push/send", {
        method:  "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body:    JSON.stringify(messages),
      });
    } catch (err) {
      console.error("[push] Failed to send push:", err);
    }
  },
});

// ─── Internal queries needed by the action ────────────────────────────────────
import { internalQuery } from "./_generated/server";

export const getConvInfo = internalQuery({
  args: { conversationId: v.string() },
  handler: async (ctx, { conversationId }) => {
    const conv = await ctx.db.get(conversationId as any) as any;
    return conv ? { type: conv.type, name: conv.name ?? null } : null;
  },
});

export const getMemberTokens = internalQuery({
  args: { conversationId: v.string(), excludeUserId: v.string() },
  handler: async (ctx, { conversationId, excludeUserId }) => {
    const members = await ctx.db
      .query("conversationMembers")
      .withIndex("by_conversation", (q: any) => q.eq("conversationId", conversationId))
      .filter((q: any) => q.neq(q.field("userId"), excludeUserId))
      .collect();

    const recipients: Array<{ token: string; showPreview: boolean }> = [];
    for (const m of members) {
      const user = await ctx.db.get(m.userId);
      if (user?.fcmToken) {
        recipients.push({
          token:       user.fcmToken,
          showPreview: user.notificationPreview !== false,
        });
      }
    }
    return recipients;
  },
});

