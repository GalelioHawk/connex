import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireSession } from "./_helpers";

// ─── List all active statuses for the Status tab ──────────────────────────────
export const list = query({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, { sessionId }) => {
    const { userId } = await requireSession(ctx, sessionId);
    const now = Date.now();

    // Own active statuses (newest first)
    const ownRaw = await ctx.db
      .query("statusPosts")
      .withIndex("by_user_expires", (q) => q.eq("userId", userId))
      .filter((q) => q.gt(q.field("expiresAt"), now))
      .order("desc")
      .collect();

    const own = ownRaw.map((s) => ({
      id:        s._id,
      type:      s.type,
      mediaUrl:  s.mediaUrl ?? null,
      caption:   s.caption  ?? null,
      bgColor:   s.bgColor  ?? null,
      createdAt: s.createdAt,
    }));

    // Collect unique contact IDs from shared conversations
    const memberships = await ctx.db
      .query("conversationMembers")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const contactIds = new Set<string>();
    for (const m of memberships) {
      const others = await ctx.db
        .query("conversationMembers")
        .withIndex("by_conversation", (q) => q.eq("conversationId", m.conversationId))
        .collect();
      for (const o of others) {
        if (o.userId !== userId) contactIds.add(o.userId);
      }
    }

    // For each contact, get their active statuses + unseen flag
    const contacts = [];
    for (const contactId of contactIds) {
      const contactUser = await ctx.db.get(contactId as any) as any;
      if (!contactUser) continue;

      const statuses = await ctx.db
        .query("statusPosts")
        .withIndex("by_user_expires", (q) => q.eq("userId", contactId as any))
        .filter((q) => q.gt(q.field("expiresAt"), now))
        .order("asc")
        .collect();

      if (!statuses.length) continue;

      let hasUnseen = false;
      for (const s of statuses) {
        const view = await ctx.db
          .query("statusViews")
          .withIndex("by_status_viewer", (q) =>
            q.eq("statusId", s._id).eq("viewerId", userId),
          )
          .first();
        if (!view) { hasUnseen = true; break; }
      }

      contacts.push({
        userId:    contactId,
        name:      contactUser.name,
        avatarUrl: contactUser.showProfilePhoto === "nobody" ? null : (contactUser.avatarUrl ?? null),
        hasUnseen,
        latestAt:  statuses[statuses.length - 1].createdAt,
        count:     statuses.length,
      });
    }

    contacts.sort((a, b) => {
      if (a.hasUnseen !== b.hasUnseen) return a.hasUnseen ? -1 : 1;
      return b.latestAt - a.latestAt;
    });

    return { own, contacts };
  },
});

// ─── Get statuses for a specific user (viewer) ────────────────────────────────
export const getUserStatuses = query({
  args: { sessionId: v.id("sessions"), userId: v.string() },
  handler: async (ctx, { sessionId, userId: targetId }) => {
    const { userId } = await requireSession(ctx, sessionId);
    const now = Date.now();

    const statuses = await ctx.db
      .query("statusPosts")
      .withIndex("by_user_expires", (q) => q.eq("userId", targetId as any))
      .filter((q) => q.gt(q.field("expiresAt"), now))
      .order("asc")
      .collect();

    return await Promise.all(
      statuses.map(async (s) => {
        const view = await ctx.db
          .query("statusViews")
          .withIndex("by_status_viewer", (q) =>
            q.eq("statusId", s._id).eq("viewerId", userId),
          )
          .first();
        const views = await ctx.db
          .query("statusViews")
          .withIndex("by_status", (q) => q.eq("statusId", s._id))
          .collect();
        // Never count the owner as a viewer
        const nonSelfViews = views.filter((v) => v.viewerId !== s.userId);
        return {
          id:        s._id,
          type:      s.type,
          mediaUrl:  s.mediaUrl ?? null,
          caption:   s.caption  ?? null,
          bgColor:   s.bgColor  ?? null,
          createdAt: s.createdAt,
          viewed:    !!view,
          viewCount: nonSelfViews.length,
        };
      }),
    );
  },
});

// ─── Generate a Convex storage upload URL ─────────────────────────────────────
export const generateUploadUrl = mutation({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, { sessionId }) => {
    await requireSession(ctx, sessionId);
    return ctx.storage.generateUploadUrl();
  },
});

// ─── Post a new status ────────────────────────────────────────────────────────
export const post = mutation({
  args: {
    sessionId: v.id("sessions"),
    type:      v.union(v.literal("image"), v.literal("video"), v.literal("text")),
    storageId: v.optional(v.id("_storage")),
    caption:   v.optional(v.string()),
    bgColor:   v.optional(v.string()),
  },
  handler: async (ctx, { sessionId, type, storageId, caption, bgColor }) => {
    const { userId } = await requireSession(ctx, sessionId);
    const now = Date.now();

    let mediaUrl: string | undefined;
    if (storageId) {
      mediaUrl = (await ctx.storage.getUrl(storageId)) ?? undefined;
    }

    await ctx.db.insert("statusPosts", {
      userId,
      type,
      storageId,
      mediaUrl,
      caption,
      bgColor,
      createdAt: now,
      expiresAt: now + 24 * 60 * 60 * 1000,
    });
  },
});

// ─── Mark a status as viewed ──────────────────────────────────────────────────
export const markViewed = mutation({
  args: {
    sessionId: v.id("sessions"),
    statusId:  v.id("statusPosts"),
  },
  handler: async (ctx, { sessionId, statusId }) => {
    const { userId } = await requireSession(ctx, sessionId);
    const status = await ctx.db.get(statusId);
    // Never count the owner viewing their own status
    if (!status || status.userId === userId) return;
    const existing = await ctx.db
      .query("statusViews")
      .withIndex("by_status_viewer", (q) =>
        q.eq("statusId", statusId).eq("viewerId", userId),
      )
      .first();
    if (!existing) {
      await ctx.db.insert("statusViews", {
        statusId,
        viewerId: userId,
        viewedAt: Date.now(),
      });
    }
  },
});

// ─── Delete own status ────────────────────────────────────────────────────────
export const deleteStatus = mutation({
  args: { sessionId: v.id("sessions"), statusId: v.id("statusPosts") },
  handler: async (ctx, { sessionId, statusId }) => {
    const { userId } = await requireSession(ctx, sessionId);
    const status = await ctx.db.get(statusId);
    if (!status || status.userId !== userId) throw new Error("Not found");
    if (status.storageId) await ctx.storage.delete(status.storageId);
    await ctx.db.delete(statusId);
    const views = await ctx.db
      .query("statusViews")
      .withIndex("by_status", (q) => q.eq("statusId", statusId))
      .collect();
    for (const view of views) await ctx.db.delete(view._id);
  },
});
