/**
 * Chat — queries are fully reactive. When data changes, all subscribed clients
 * update instantly without any polling or subscription management on mobile.
 */
import { query, mutation, internalMutation, internalAction } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { enforceRateLimit, requireSession, toIso } from "./_helpers";
import { Id } from "./_generated/dataModel";

// ─── Helper: enrich message with sender ───────────────────────────────────────
async function enrichMessage(ctx: { db: any }, msg: any) {
  const sender = await ctx.db.get(msg.senderId);
  return {
    id:              msg._id          as string,
    conversation_id: msg.conversationId as string,
    sender_id:       msg.senderId     as string,
    content:         msg.content      ?? null,
    type:            msg.type,
    media_url:       msg.mediaUrl     ?? null,
    status:          msg.status,
    created_at:      toIso(msg._creationTime),
    deleted_at:      msg.deletedAt ? toIso(msg.deletedAt) : null,
    sender: sender
      ? { id: sender._id, name: sender.name, avatar_url: sender.avatarUrl ?? null, bubble_color: sender.bubbleColor ?? null }
      : { id: msg.senderId, name: "Unknown", avatar_url: null, bubble_color: null },
  };
}

// ─── List conversations (reactive) ───────────────────────────────────────────
export const listConversations = query({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, { sessionId }) => {
    const { userId } = await requireSession(ctx, sessionId);

    const memberships = await ctx.db
      .query("conversationMembers")
      .withIndex("by_user", (q: any) => q.eq("userId", userId))
      .collect();

    const convos = await Promise.all(
      memberships.map(async (m: any) => {
        const conv = await ctx.db.get(m.conversationId) as any;
        if (!conv) return null;

        // Skip pending requests where current user is NOT the creator (they go to requests folder)
        if (conv.type === "direct" && conv.status === "pending" && conv.createdBy !== userId) {
          return null;
        }

        // Skip declined conversations
        if (conv.status === "declined") {
          return null;
        }

        // Last message
        const msgs = await ctx.db
          .query("messages")
          .withIndex("by_conversation", (q: any) => q.eq("conversationId", conv._id))
          .order("desc")
          .take(1);
        const lastMsg = msgs[0] ?? null;

        // Other user (direct chats)
        let otherUser = null;
        if (conv.type === "direct") {
          const otherMember = await ctx.db
            .query("conversationMembers")
            .withIndex("by_conversation", (q: any) => q.eq("conversationId", conv._id))
            .filter((q: any) => q.neq(q.field("userId"), userId))
            .first();
          if (otherMember) {
            const u = await ctx.db.get(otherMember.userId);
            if (u) otherUser = {
            id:         u._id,
            name:       u.name,
            avatar_url: (u.showProfilePhoto === 'nobody') ? null : (u.avatarUrl ?? null),
          };
          }
        }

        // Unread count
        let unreadCount = 0;
        if (m.lastReadAt) {
          const allMsgs = await ctx.db
            .query("messages")
            .withIndex("by_conversation", (q: any) => q.eq("conversationId", conv._id))
            .collect();
          unreadCount = allMsgs.filter(
            (msg: any) => msg.senderId !== userId && msg._creationTime > m.lastReadAt,
          ).length;
        } else {
          // Never read → count all messages from others
          const allMsgs = await ctx.db
            .query("messages")
            .withIndex("by_conversation", (q: any) => q.eq("conversationId", conv._id))
            .filter((q: any) => q.neq(q.field("senderId"), userId))
            .collect();
          unreadCount = allMsgs.length;
        }

        return {
          id:           conv._id                 as string,
          type:         conv.type,
          name:         conv.name                ?? null,
          image_url:    conv.imageUrl            ?? null,
          created_by:   conv.createdBy           as string,
          created_at:   toIso(conv._creationTime),
          other_user:   otherUser,
          unread_count: unreadCount,
          last_message: lastMsg ? {
            id:              lastMsg._id              as string,
            conversation_id: lastMsg.conversationId   as string,
            sender_id:       lastMsg.senderId         as string,
            content:         lastMsg.content          ?? null,
            type:            lastMsg.type,
            media_url:       lastMsg.mediaUrl         ?? null,
            status:          lastMsg.status,
            created_at:      toIso(lastMsg._creationTime),
          } : null,
        };
      }),
    );

    // Sort by last message time desc
    return convos
      .filter(Boolean)
      .sort((a: any, b: any) => {
        const aTime = a.last_message?.created_at ?? a.created_at;
        const bTime = b.last_message?.created_at ?? b.created_at;
        return bTime > aTime ? 1 : -1;
      });
  },
});

// ─── List messages (reactive) ─────────────────────────────────────────────────
export const listMessages = query({
  args: {
    sessionId:      v.id("sessions"),
    conversationId: v.id("conversations"),
  },
  handler: async (ctx, { sessionId, conversationId }) => {
    const { userId } = await requireSession(ctx, sessionId);

    // Verify membership
    const membership = await ctx.db
      .query("conversationMembers")
      .withIndex("by_conversation_user", (q: any) =>
        q.eq("conversationId", conversationId).eq("userId", userId),
      )
      .first();
    if (!membership) throw new Error("Not a member of this conversation.");

    const msgs = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q: any) => q.eq("conversationId", conversationId))
      .order("asc")
      .collect();

    return Promise.all(msgs.map((m: any) => enrichMessage(ctx, m)));
  },
});

// ─── Create conversation ──────────────────────────────────────────────────────
export const createConversation = mutation({
  args: {
    sessionId: v.id("sessions"),
    type:      v.union(v.literal("direct"), v.literal("group")),
    memberIds: v.array(v.id("users")),
    name:      v.optional(v.string()),
  },
  handler: async (ctx, { sessionId, type, memberIds, name }) => {
    const { userId } = await requireSession(ctx, sessionId);

    if (type === "group" && !name) throw new Error("Group name is required.");
    if (type === "direct" && memberIds.length !== 1) throw new Error("Direct chat needs one member.");

    // Check if direct conversation already exists
    if (type === "direct") {
      const otherId = memberIds[0];
      const myMemberships = await ctx.db
        .query("conversationMembers")
        .withIndex("by_user", (q: any) => q.eq("userId", userId))
        .collect();

      for (const m of myMemberships) {
        const otherM = await ctx.db
          .query("conversationMembers")
          .withIndex("by_conversation_user", (q: any) =>
            q.eq("conversationId", m.conversationId).eq("userId", otherId),
          )
          .first();
        if (otherM) {
          const conv = await ctx.db.get(m.conversationId);
          if (conv?.type === "direct") {
            return { conversationId: conv._id as string, existed: true };
          }
        }
      }
    }

    const conversationId = await ctx.db.insert("conversations", {
      type,
      name:      name ?? undefined,
      createdBy: userId,
      status:    type === "direct" ? "pending" : undefined,
    });

    const allMembers = Array.from(new Set([userId, ...memberIds]));
    await Promise.all(allMembers.map((uid) =>
      ctx.db.insert("conversationMembers", {
        conversationId,
        userId: uid,
        role:   uid === userId ? "admin" : "member",
      }),
    ));

    return { conversationId: conversationId as string, existed: false };
  },
});

// ─── Generate upload URL (for client-side file upload to Convex storage) ──────
export const generateUploadUrl = mutation({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, { sessionId }) => {
    await requireSession(ctx, sessionId);
    return await ctx.storage.generateUploadUrl();
  },
});

// ─── Get a permanent URL for a stored file ────────────────────────────────────
export const getMediaUrl = mutation({
  args: { sessionId: v.id("sessions"), storageId: v.string() },
  handler: async (ctx, { sessionId, storageId }) => {
    await requireSession(ctx, sessionId);
    return await ctx.storage.getUrl(storageId as Id<"_storage">);
  },
});

// ─── Send message ─────────────────────────────────────────────────────────────
export const sendMessage = mutation({
  args: {
    sessionId:      v.id("sessions"),
    conversationId: v.id("conversations"),
    content:        v.string(),
    type:           v.optional(v.union(v.literal("text"), v.literal("image"), v.literal("video"))),
    mediaUrl:       v.optional(v.string()),
  },
  handler: async (ctx, { sessionId, conversationId, content, type = "text", mediaUrl }) => {
    const { userId, user } = await requireSession(ctx, sessionId);
    await enforceRateLimit(ctx, `chat:send:${userId}`, 60, 60 * 1000);

    const membership = await ctx.db
      .query("conversationMembers")
      .withIndex("by_conversation_user", (q: any) =>
        q.eq("conversationId", conversationId).eq("userId", userId),
      )
      .first();
    if (!membership) throw new Error("Not a member of this conversation.");

    const messageId = await ctx.db.insert("messages", {
      conversationId,
      senderId: userId,
      content,
      type,
      ...(mediaUrl ? { mediaUrl } : {}),
      status: "sent",
    });

    // Trigger FCM push (fire-and-forget via scheduler)
    await ctx.scheduler.runAfter(0, internal.push.sendNewMessagePush, {
      conversationId: conversationId as string,
      senderId:       userId as string,
      senderName:     user.name,
      messageId:      messageId as string,
      content,
      messageType:    type,
    });

    const msg = await ctx.db.get(messageId);
    return enrichMessage(ctx, msg);
  },
});

// ─── Mark conversation as read ────────────────────────────────────────────────
export const markRead = mutation({
  args: {
    sessionId:      v.id("sessions"),
    conversationId: v.id("conversations"),
  },
  handler: async (ctx, { sessionId, conversationId }) => {
    const { userId } = await requireSession(ctx, sessionId);
    const now = Date.now();

    const membership = await ctx.db
      .query("conversationMembers")
      .withIndex("by_conversation_user", (q: any) =>
        q.eq("conversationId", conversationId).eq("userId", userId),
      )
      .first();
    if (!membership) return;

    await ctx.db.patch(membership._id, { lastReadAt: now });

    // Mark all messages from others as read
    const unread = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q: any) => q.eq("conversationId", conversationId))
      .filter((q: any) =>
        q.and(
          q.neq(q.field("senderId"), userId),
          q.or(
            q.eq(q.field("status"), "sent"),
            q.eq(q.field("status"), "delivered"),
          ),
        ),
      )
      .collect();

    await Promise.all(unread.map((m: any) => ctx.db.patch(m._id, { status: "read" })));
    return { ok: true };
  },
});

// ─── Mark delivered ───────────────────────────────────────────────────────────
export const markDelivered = mutation({
  args: {
    sessionId: v.id("sessions"),
    messageId: v.id("messages"),
  },
  handler: async (ctx, { sessionId, messageId }) => {
    await requireSession(ctx, sessionId);
    const msg = await ctx.db.get(messageId);
    if (msg && msg.status === "sent") {
      await ctx.db.patch(messageId, { status: "delivered" });
    }
    return { ok: true };
  },
});

// ─── Mark all sent messages as delivered (called when user comes online) ──────
export const markAllDelivered = mutation({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, { sessionId }) => {
    const { userId } = await requireSession(ctx, sessionId);

    const memberships = await ctx.db
      .query("conversationMembers")
      .withIndex("by_user", (q: any) => q.eq("userId", userId))
      .collect();

    await Promise.all(memberships.map(async (m: any) => {
      const sentMsgs = await ctx.db
        .query("messages")
        .withIndex("by_conversation", (q: any) => q.eq("conversationId", m.conversationId))
        .filter((q: any) => q.and(
          q.neq(q.field("senderId"), userId),
          q.eq(q.field("status"), "sent"),
        ))
        .collect();
      await Promise.all(sentMsgs.map((msg: any) =>
        ctx.db.patch(msg._id, { status: "delivered" }),
      ));
    }));

    return { ok: true };
  },
});

// ─── Get other user's presence for a direct conversation ─────────────────────
export const getOtherUserPresence = query({
  args: {
    sessionId:      v.id("sessions"),
    conversationId: v.id("conversations"),
  },
  handler: async (ctx, { sessionId, conversationId }) => {
    const { userId } = await requireSession(ctx, sessionId);

    const otherMember = await ctx.db
      .query("conversationMembers")
      .withIndex("by_conversation", (q: any) => q.eq("conversationId", conversationId))
      .filter((q: any) => q.neq(q.field("userId"), userId))
      .first();
    if (!otherMember) return null;

    const other = await ctx.db.get(otherMember.userId);
    if (!other) return null;

    const hideActivity = other.showOnlineStatus === 'nobody';
    const hideLastSeen = other.showLastSeen === 'nobody';

    return {
      isOnline: hideActivity ? false : (other.isOnline ?? false),
      lastSeen: (hideActivity || hideLastSeen) ? null : (other.lastSeen ?? null),
    };
  },
});


// ─── Delete message ───────────────────────────────────────────────────────────
export const deleteMessage = mutation({
  args: {
    sessionId:         v.id("sessions"),
    messageId:         v.id("messages"),
    deleteForEveryone: v.boolean(),
  },
  handler: async (ctx, { sessionId, messageId, deleteForEveryone }) => {
    const { userId } = await requireSession(ctx, sessionId);
    const msg = await ctx.db.get(messageId);
    if (!msg) throw new Error("Message not found.");
    if (msg.senderId !== userId) throw new Error("Cannot delete another user's message.");

    const patch: Record<string, unknown> = { deletedAt: Date.now() };
    if (deleteForEveryone) patch.content = undefined; // removes content field

    await ctx.db.patch(messageId, patch);
    return { ok: true };
  },
});

// ─── List message requests (reactive query) ───────────────────────────────────
export const listMessageRequests = query({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, { sessionId }) => {
    const { userId } = await requireSession(ctx, sessionId);

    const memberships = await ctx.db
      .query("conversationMembers")
      .withIndex("by_user", (q: any) => q.eq("userId", userId))
      .collect();

    const requests = await Promise.all(
      memberships.map(async (m: any) => {
        const conv = await ctx.db.get(m.conversationId) as any;
        if (!conv) return null;

        // We only want direct messages that are pending and NOT created by us (incoming requests)
        if (conv.type !== "direct" || conv.status !== "pending" || conv.createdBy === userId) {
          return null;
        }

        // Get the last message
        const msgs = await ctx.db
          .query("messages")
          .withIndex("by_conversation", (q: any) => q.eq("conversationId", conv._id))
          .order("desc")
          .take(1);
        const lastMsg = msgs[0] ?? null;

        // Get the other user details
        const otherMember = await ctx.db
          .query("conversationMembers")
          .withIndex("by_conversation", (q: any) => q.eq("conversationId", conv._id))
          .filter((q: any) => q.neq(q.field("userId"), userId))
          .first();

        let otherUser = null;
        if (otherMember) {
          const u = await ctx.db.get(otherMember.userId);
          if (u) {
            otherUser = {
              id:         u._id,
              name:       u.name,
              avatar_url: u.avatarUrl ?? null,
            };
          }
        }

        return {
          id:           conv._id                 as string,
          type:         conv.type,
          created_by:   conv.createdBy           as string,
          created_at:   toIso(conv._creationTime),
          other_user:   otherUser,
          last_message: lastMsg ? {
            id:         lastMsg._id              as string,
            content:    lastMsg.content          ?? null,
            type:       lastMsg.type,
            created_at: toIso(lastMsg._creationTime),
          } : null,
        };
      })
    );

    return requests.filter(Boolean);
  },
});

// ─── Accept conversation request ─────────────────────────────────────────────
export const acceptConversation = mutation({
  args: {
    sessionId:      v.id("sessions"),
    conversationId: v.id("conversations"),
  },
  handler: async (ctx, { sessionId, conversationId }) => {
    const { userId } = await requireSession(ctx, sessionId);

    // Verify membership
    const membership = await ctx.db
      .query("conversationMembers")
      .withIndex("by_conversation_user", (q: any) =>
        q.eq("conversationId", conversationId).eq("userId", userId)
      )
      .first();
    if (!membership) throw new Error("Not a member of this conversation.");

    const conv = await ctx.db.get(conversationId);
    if (!conv) throw new Error("Conversation not found.");

    await ctx.db.patch(conversationId, { status: "accepted" });
    return { ok: true };
  },
});

// ─── Decline conversation request (delete it) ────────────────────────────────
export const declineConversation = mutation({
  args: {
    sessionId:      v.id("sessions"),
    conversationId: v.id("conversations"),
  },
  handler: async (ctx, { sessionId, conversationId }) => {
    const { userId } = await requireSession(ctx, sessionId);

    // Verify membership
    const membership = await ctx.db
      .query("conversationMembers")
      .withIndex("by_conversation_user", (q: any) =>
        q.eq("conversationId", conversationId).eq("userId", userId)
      )
      .first();
    if (!membership) throw new Error("Not a member of this conversation.");

    // Delete all conversation members
    const members = await ctx.db
      .query("conversationMembers")
      .withIndex("by_conversation", (q: any) => q.eq("conversationId", conversationId))
      .collect();
    for (const m of members) {
      await ctx.db.delete(m._id);
    }

    // Delete all messages in the conversation
    const msgs = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q: any) => q.eq("conversationId", conversationId))
      .collect();
    for (const m of msgs) {
      await ctx.db.delete(m._id);
    }

    // Delete the conversation document
    await ctx.db.delete(conversationId);
    return { ok: true };
  },
});

// ─── Get conversation details (reactive query) ────────────────────────────────
export const getConversation = query({
  args: {
    sessionId:      v.id("sessions"),
    conversationId: v.id("conversations"),
  },
  handler: async (ctx, { sessionId, conversationId }) => {
    const { userId } = await requireSession(ctx, sessionId);
    const conv = await ctx.db.get(conversationId);
    if (!conv) return null;
    const membership = await ctx.db
      .query("conversationMembers")
      .withIndex("by_conversation_user", (q) =>
        q.eq("conversationId", conversationId).eq("userId", userId),
      )
      .unique();
    if (!membership) throw new Error("Not a member of this conversation.");

    const memberships = await ctx.db
      .query("conversationMembers")
      .withIndex("by_conversation", (q) => q.eq("conversationId", conversationId))
      .collect();
    const members = await Promise.all(memberships.map(async (member) => {
      const memberUser = await ctx.db.get(member.userId);
      return memberUser ? {
        id:         memberUser._id as string,
        name:       memberUser.name,
        avatar_url: memberUser.avatarUrl ?? null,
        role:       member.role,
        is_me:      member.userId === userId,
      } : null;
    }));
    return {
      id:         conv._id                 as string,
      type:       conv.type,
      name:       conv.name                ?? null,
      image_url:  conv.imageUrl            ?? null,
      created_by: conv.createdBy           as string,
      status:     conv.status              ?? null,
      my_role:    membership.role,
      members:    members.filter((member) => member !== null),
    };
  },
});

// ─── Group management ───────────────────────────────────────────────────────
export const updateGroup = mutation({
  args: {
    sessionId:      v.id("sessions"),
    conversationId: v.id("conversations"),
    name:           v.optional(v.string()),
    imageUrl:       v.optional(v.string()),
  },
  handler: async (ctx, { sessionId, conversationId, name, imageUrl }) => {
    const { userId } = await requireSession(ctx, sessionId);
    const conversation = await ctx.db.get(conversationId);
    if (!conversation || conversation.type !== "group") throw new Error("Group not found.");
    const membership = await ctx.db
      .query("conversationMembers")
      .withIndex("by_conversation_user", (q) =>
        q.eq("conversationId", conversationId).eq("userId", userId),
      )
      .unique();
    if (membership?.role !== "admin") throw new Error("Only group admins can edit the group.");

    const patch: { name?: string; imageUrl?: string } = {};
    if (name !== undefined) {
      const trimmed = name.trim();
      if (trimmed.length < 2 || trimmed.length > 100) {
        throw new Error("Group name must be between 2 and 100 characters.");
      }
      patch.name = trimmed;
    }
    if (imageUrl !== undefined) patch.imageUrl = imageUrl;
    if (Object.keys(patch).length) await ctx.db.patch(conversationId, patch);
    return { ok: true };
  },
});

export const addGroupMembers = mutation({
  args: {
    sessionId:      v.id("sessions"),
    conversationId: v.id("conversations"),
    userIds:        v.array(v.id("users")),
  },
  handler: async (ctx, { sessionId, conversationId, userIds }) => {
    const { userId } = await requireSession(ctx, sessionId);
    const conversation = await ctx.db.get(conversationId);
    if (!conversation || conversation.type !== "group") throw new Error("Group not found.");
    const admin = await ctx.db
      .query("conversationMembers")
      .withIndex("by_conversation_user", (q) =>
        q.eq("conversationId", conversationId).eq("userId", userId),
      )
      .unique();
    if (admin?.role !== "admin") throw new Error("Only group admins can add members.");

    let added = 0;
    for (const targetUserId of Array.from(new Set(userIds))) {
      const target = await ctx.db.get(targetUserId);
      if (!target?.isActive) continue;
      const existing = await ctx.db
        .query("conversationMembers")
        .withIndex("by_conversation_user", (q) =>
          q.eq("conversationId", conversationId).eq("userId", targetUserId),
        )
        .unique();
      if (!existing) {
        await ctx.db.insert("conversationMembers", {
          conversationId,
          userId: targetUserId,
          role: "member",
        });
        added += 1;
      }
    }
    return { added };
  },
});

export const removeGroupMember = mutation({
  args: {
    sessionId:      v.id("sessions"),
    conversationId: v.id("conversations"),
    userId:         v.id("users"),
  },
  handler: async (ctx, { sessionId, conversationId, userId: targetUserId }) => {
    const { userId } = await requireSession(ctx, sessionId);
    const admin = await ctx.db
      .query("conversationMembers")
      .withIndex("by_conversation_user", (q) =>
        q.eq("conversationId", conversationId).eq("userId", userId),
      )
      .unique();
    if (admin?.role !== "admin") throw new Error("Only group admins can remove members.");
    if (targetUserId === userId) throw new Error("Use leave group to remove yourself.");
    const target = await ctx.db
      .query("conversationMembers")
      .withIndex("by_conversation_user", (q) =>
        q.eq("conversationId", conversationId).eq("userId", targetUserId),
      )
      .unique();
    if (!target) throw new Error("Member not found.");
    await ctx.db.delete(target._id);
    return { ok: true };
  },
});

export const leaveGroup = mutation({
  args: {
    sessionId:      v.id("sessions"),
    conversationId: v.id("conversations"),
  },
  handler: async (ctx, { sessionId, conversationId }) => {
    const { userId } = await requireSession(ctx, sessionId);
    const conversation = await ctx.db.get(conversationId);
    if (!conversation || conversation.type !== "group") throw new Error("Group not found.");
    const membership = await ctx.db
      .query("conversationMembers")
      .withIndex("by_conversation_user", (q) =>
        q.eq("conversationId", conversationId).eq("userId", userId),
      )
      .unique();
    if (!membership) throw new Error("You are not a member of this group.");

    const members = await ctx.db
      .query("conversationMembers")
      .withIndex("by_conversation", (q) => q.eq("conversationId", conversationId))
      .collect();
    await ctx.db.delete(membership._id);

    const remaining = members.filter((member) => member._id !== membership._id);
    if (remaining.length === 0) {
      const messages = await ctx.db
        .query("messages")
        .withIndex("by_conversation", (q) => q.eq("conversationId", conversationId))
        .collect();
      for (const message of messages) await ctx.db.delete(message._id);
      await ctx.db.delete(conversationId);
      return { deleted: true };
    }

    if (membership.role === "admin" && !remaining.some((member) => member.role === "admin")) {
      const nextAdmin = remaining.sort((a, b) => a._creationTime - b._creationTime)[0];
      await ctx.db.patch(nextAdmin._id, { role: "admin" });
    }
    return { deleted: false };
  },
});
