import { query, mutation, action, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { requireSession } from "./_helpers";

// ─── Get current user profile ─────────────────────────────────────────────────
export const getMe = query({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, { sessionId }) => {
    const { user } = await requireSession(ctx, sessionId);
    return {
      id:                 user._id,
      phone:              user.phone,
      name:               user.name,
      avatar_url:         user.avatarUrl         ?? null,
      bio:                user.bio               ?? null,
      area_id:            user.areaId            ?? null,
      province:           user.province          ?? null,
      bubble_color:       user.bubbleColor        ?? null,
      show_last_seen:     user.showLastSeen       ?? 'everyone',
      show_online_status: user.showOnlineStatus   ?? 'everyone',
      show_profile_photo: user.showProfilePhoto   ?? 'everyone',
      read_receipts:      user.readReceipts       ?? true,
      show_phone:         user.showPhone          ?? true,
    };
  },
});

// ─── Update profile ───────────────────────────────────────────────────────────
export const updateProfile = mutation({
  args: {
    sessionId: v.id("sessions"),
    name:      v.optional(v.string()),
    bio:       v.optional(v.string()),
    areaId:    v.optional(v.string()),
    province:  v.optional(v.string()),
    avatarUrl:           v.optional(v.string()),
    fcmToken:            v.optional(v.string()),
    notificationPreview: v.optional(v.boolean()),
  },
  handler: async (ctx, { sessionId, ...fields }) => {
    const { userId } = await requireSession(ctx, sessionId);
    const patch: Record<string, unknown> = {};
    if (fields.name      !== undefined) patch.name      = fields.name;
    if (fields.bio       !== undefined) patch.bio       = fields.bio;
    if (fields.areaId    !== undefined) patch.areaId    = fields.areaId;
    if (fields.province  !== undefined) patch.province  = fields.province;
    if (fields.avatarUrl           !== undefined) patch.avatarUrl           = fields.avatarUrl;
    if (fields.fcmToken            !== undefined) patch.fcmToken            = fields.fcmToken;
    if (fields.notificationPreview !== undefined) patch.notificationPreview = fields.notificationPreview;
    await ctx.db.patch(userId, patch);
    return { ok: true };
  },
});

// ─── Search users ─────────────────────────────────────────────────────────────
export const search = query({
  args: {
    sessionId: v.id("sessions"),
    q:         v.string(),
  },
  handler: async (ctx, { sessionId, q }) => {
    const { userId } = await requireSession(ctx, sessionId);
    if (q.trim().length < 2) return [];

    const byName = await ctx.db
      .query("users")
      .withSearchIndex("search_name", (s: any) => s.search("name", q).eq("isActive", true))
      .take(20);

    const byPhone = await ctx.db
      .query("users")
      .withSearchIndex("search_phone", (s: any) => s.search("phone", q).eq("isActive", true))
      .take(10);

    // Merge and deduplicate, excluding self
    const seen = new Set<string>();
    const all  = [...byName, ...byPhone].filter((u) => {
      if (u._id === userId) return false;
      if (seen.has(u._id))  return false;
      seen.add(u._id);
      return true;
    });

    return all.map((u) => ({
      id:         u._id,
      name:       u.name,
      phone:      (u.showPhone === false) ? null : u.phone,
      avatar_url: u.avatarUrl ?? null,
    }));
  },
});

// ─── Upload avatar (action — Node.js for image processing) ───────────────────
export const uploadAvatar = action({
  args: {
    sessionId:    v.id("sessions"),
    imageBase64:  v.string(),
    mimeType:     v.optional(v.string()),
  },
  handler: async (ctx, { sessionId, imageBase64, mimeType }) => {
    const session = await ctx.runQuery(internal.auth.getSessionUser, { sessionId });
    if (!session) throw new Error("Session expired. Please sign in again.");
    const { userId } = session;

    const mime    = mimeType ?? "image/jpeg";
    const binary  = atob(imageBase64);
    const bytes   = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const blob    = new Blob([bytes], { type: mime });

    // Upload to Convex file storage
    const uploadUrl = await ctx.storage.generateUploadUrl();
    const res = await fetch(uploadUrl, {
      method: "POST",
      headers: { "Content-Type": mime },
      body:    blob,
    });
    if (!res.ok) throw new Error("Upload failed.");
    const { storageId } = await res.json() as { storageId: string };

    // Get the public URL and save to user
    const avatarUrl = await ctx.storage.getUrl(storageId);
    if (!avatarUrl) throw new Error("Could not get storage URL.");

    await ctx.runMutation(internal.users.setAvatarUrl, { userId, avatarUrl });
    return { avatar_url: avatarUrl };
  },
});

// ─── Set online / offline presence ───────────────────────────────────────────
export const setPresence = mutation({
  args: {
    sessionId: v.id("sessions"),
    isOnline:  v.boolean(),
  },
  handler: async (ctx, { sessionId, isOnline }) => {
    const { userId } = await requireSession(ctx, sessionId);
    const patch: Record<string, unknown> = { isOnline };
    if (!isOnline) patch.lastSeen = Date.now();
    await ctx.db.patch(userId, patch);
    return { ok: true };
  },
});

// ─── Set bubble colour ────────────────────────────────────────────────────────
export const setBubbleColor = mutation({
  args: {
    sessionId:   v.id("sessions"),
    bubbleColor: v.string(),
  },
  handler: async (ctx, { sessionId, bubbleColor }) => {
    const { userId } = await requireSession(ctx, sessionId);
    await ctx.db.patch(userId, { bubbleColor });
    return { ok: true };
  },
});

// ─── Update privacy settings ──────────────────────────────────────────────────
const privacyLevel = () => v.union(v.literal('everyone'), v.literal('contacts'), v.literal('nobody'));
export const updatePrivacy = mutation({
  args: {
    sessionId:        v.id("sessions"),
    showLastSeen:     v.optional(privacyLevel()),
    showOnlineStatus: v.optional(privacyLevel()),
    showProfilePhoto: v.optional(privacyLevel()),
    readReceipts:     v.optional(v.boolean()),
    showPhone:        v.optional(v.boolean()),
  },
  handler: async (ctx, { sessionId, ...fields }) => {
    const { userId } = await requireSession(ctx, sessionId);
    const patch: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(fields)) {
      if (v !== undefined) patch[k] = v;
    }
    await ctx.db.patch(userId, patch);
    return { ok: true };
  },
});

// ─── Get public profile (for ContactInfo screen) ──────────────────────────────
export const getPublicProfile = query({
  args: {
    sessionId: v.id("sessions"),
    userId:    v.id("users"),
  },
  handler: async (ctx, { sessionId, userId }) => {
    await requireSession(ctx, sessionId); // caller must be authenticated
    const u = await ctx.db.get(userId);
    if (!u || !u.isActive) return null;
    return {
      id:         u._id,
      name:       u.name,
      bio:        u.bio       ?? null,
      avatar_url: (u.showProfilePhoto === 'nobody') ? null : (u.avatarUrl ?? null),
      province:   u.province  ?? null,
      phone:      (u.showPhone === false) ? null : u.phone,
    };
  },
});

// ─── Internal: set avatar URL ─────────────────────────────────────────────────
export const setAvatarUrl = internalMutation({
  args: { userId: v.id("users"), avatarUrl: v.string() },
  handler: async (ctx, { userId, avatarUrl }) => {
    await ctx.db.patch(userId, { avatarUrl });
  },
});
