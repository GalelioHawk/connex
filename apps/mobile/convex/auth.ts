/**
 * Auth actions — run in Node.js environment so bcrypt works.
 * register → hash password → create user + session → return sessionId + user
 * login    → verify password → create session → return sessionId + user
 * logout   → delete session
 */
import { action, internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { enforceRateLimit, SESSION_TTL_MS } from "./_helpers";
import { Doc, Id } from "./_generated/dataModel";

// ─── Internal: create user ────────────────────────────────────────────────────
export const createUser = internalMutation({
  args: {
    phone:        v.string(),
    name:         v.string(),
    passwordHash: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_phone", (q: any) => q.eq("phone", args.phone))
      .first();
    if (existing) throw new Error("Phone number already registered.");
    return await ctx.db.insert("users", {
      phone:        args.phone,
      name:         args.name,
      passwordHash: args.passwordHash,
      isActive:     true,
    });
  },
});

// ─── Internal: find user by phone ─────────────────────────────────────────────
export const getUserByPhone = internalQuery({
  args: { phone: v.string() },
  handler: async (ctx, { phone }) => {
    return ctx.db
      .query("users")
      .withIndex("by_phone", (q: any) => q.eq("phone", phone))
      .first();
  },
});

// ─── Internal: create session ─────────────────────────────────────────────────
export const createSession = internalMutation({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    return await ctx.db.insert("sessions", {
      userId,
      expiresAt: Date.now() + SESSION_TTL_MS,
    });
  },
});

// ─── Internal: delete session ─────────────────────────────────────────────────
export const deleteSession = internalMutation({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, { sessionId }) => {
    await ctx.db.delete(sessionId);
  },
});

// ─── Internal: get user by id ─────────────────────────────────────────────────
export const getUserById = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => ctx.db.get(userId),
});

// ─── Internal: validate session and return user (for use inside actions) ──────
export const getSessionUser = internalQuery({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, { sessionId }): Promise<{ userId: Id<"users">; user: Doc<"users"> } | null> => {
    const session = await ctx.db.get(sessionId);
    if (!session || session.expiresAt < Date.now()) return null;
    const user = await ctx.db.get(session.userId);
    if (!user || !user.isActive) return null;
    return { userId: session.userId, user };
  },
});

export const checkAuthRateLimit = internalMutation({
  args: {
    phone: v.string(),
    kind:  v.union(v.literal("login"), v.literal("register")),
  },
  handler: async (ctx, { phone, kind }) => {
    await enforceRateLimit(
      ctx,
      `auth:${kind}:${phone.trim().toLowerCase()}`,
      kind === "login" ? 10 : 5,
      kind === "login" ? 15 * 60 * 1000 : 60 * 60 * 1000,
    );
  },
});

// ─── Public: register ─────────────────────────────────────────────────────────
export const register = action({
  args: {
    phone:    v.string(),
    password: v.string(),
    name:     v.string(),
  },
  handler: async (ctx, { phone, password, name }) => {
    // Validate input
    const trimmedPhone = phone.trim();
    const trimmedName  = name.trim();
    await ctx.runMutation(internal.auth.checkAuthRateLimit, { phone: trimmedPhone, kind: "register" });
    if (trimmedPhone.length < 9)  throw new Error("Invalid phone number.");
    if (trimmedName.length < 2)   throw new Error("Name must be at least 2 characters.");
    if (password.length < 6)      throw new Error("Password must be at least 6 characters.");

    // Hash password in Node.js environment
    const bcrypt = await import("bcryptjs");
    const passwordHash = await bcrypt.hash(password, 12);

    // Create user
    const userId: Id<"users"> = await ctx.runMutation(internal.auth.createUser, {
      phone: trimmedPhone,
      name:  trimmedName,
      passwordHash,
    });

    // Create session
    const sessionId: Id<"sessions"> = await ctx.runMutation(internal.auth.createSession, { userId });

    // Return session + user shape (we already have all fields from registration)
    return {
      sessionId,
      user: {
        id:                 userId,
        phone:              trimmedPhone,
        name:               trimmedName,
        avatar_url:         null,
        bio:                null,
        area_id:            null,
        province:           null,
        bubble_color:       null,
        show_last_seen:     'everyone' as const,
        show_online_status: 'everyone' as const,
        show_profile_photo: 'everyone' as const,
        read_receipts:      true,
        show_phone:         true,
      },
    };
  },
});

// ─── Public: login ────────────────────────────────────────────────────────────
export const login = action({
  args: {
    phone:    v.string(),
    password: v.string(),
  },
  handler: async (ctx, { phone, password }): Promise<{
    sessionId: Id<"sessions">;
    user: { id: Id<"users">; phone: string; name: string; avatar_url: string | null; bio: string | null; area_id: string | null; province: string | null; bubble_color: string | null; show_last_seen: string; show_online_status: string; show_profile_photo: string; read_receipts: boolean; show_phone: boolean };
  }> => {
    await ctx.runMutation(internal.auth.checkAuthRateLimit, { phone, kind: "login" });
    const user: Doc<"users"> | null = await ctx.runQuery(internal.auth.getUserByPhone, { phone: phone.trim() });
    if (!user) throw new Error("Invalid phone number or password.");
    if (!user.isActive) throw new Error("Account is deactivated.");

    const bcrypt = await import("bcryptjs");
    const match  = await bcrypt.compare(password, user.passwordHash);
    if (!match) throw new Error("Invalid phone number or password.");

    const sessionId: Id<"sessions"> = await ctx.runMutation(internal.auth.createSession, { userId: user._id });

    return {
      sessionId,
      user: {
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
      },
    };
  },
});

// ─── Public: logout ───────────────────────────────────────────────────────────
export const logout = action({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, { sessionId }) => {
    await ctx.runMutation(internal.auth.deleteSession, { sessionId });
    return { ok: true };
  },
});

// ─── Internal: update password hash ──────────────────────────────────────────
export const updatePasswordHash = internalMutation({
  args: { userId: v.id("users"), passwordHash: v.string() },
  handler: async (ctx, { userId, passwordHash }) => {
    await ctx.db.patch(userId, { passwordHash });
  },
});

// ─── Public: change password ──────────────────────────────────────────────────
export const changePassword = action({
  args: {
    sessionId:       v.id("sessions"),
    currentPassword: v.string(),
    newPassword:     v.string(),
  },
  handler: async (ctx, { sessionId, currentPassword, newPassword }) => {
    const session = await ctx.runQuery(internal.auth.getSessionUser, { sessionId });
    if (!session) throw new Error("Session expired. Please sign in again.");
    const { user } = session;
    const bcrypt = await import("bcryptjs");
    const match  = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!match) throw new Error("Current password is incorrect.");
    if (newPassword.length < 6) throw new Error("New password must be at least 6 characters.");
    const newHash = await bcrypt.hash(newPassword, 12);
    await ctx.runMutation(internal.auth.updatePasswordHash, { userId: user._id, passwordHash: newHash });
    return { ok: true };
  },
});
