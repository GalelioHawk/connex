/**
 * Shared server-side helpers for Convex functions.
 * Import these in every function file.
 */
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";

type SessionContext = Pick<QueryCtx, "db"> | Pick<MutationCtx, "db">;

// 30 days in milliseconds
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Validate a session and return the authenticated user.
 * Throws ConvexError if session is missing or expired.
 */
export async function requireSession(
  ctx: SessionContext,
  sessionId: Id<"sessions">,
): Promise<{ userId: Id<"users">; user: Doc<"users"> }> {
  const session = await ctx.db.get(sessionId);
  if (!session || session.expiresAt < Date.now()) {
    throw new Error("Session expired. Please sign in again.");
  }
  const user = await ctx.db.get(session.userId);
  if (!user || !user.isActive) {
    throw new Error("User not found.");
  }
  return { userId: session.userId, user };
}

/** Convert Convex _creationTime (ms number) to ISO string */
export function toIso(ms: number): string {
  return new Date(ms).toISOString();
}

/**
 * Validate a session AND require the user to have the admin role.
 * Used for catalogue-management mutations (addSubject, addPaper, etc.).
 */
export async function requireAdmin(
  ctx: SessionContext,
  sessionId: Id<"sessions">,
): Promise<{ userId: Id<"users">; user: Doc<"users"> }> {
  const auth = await requireSession(ctx, sessionId);
  if (auth.user.role !== "admin") {
    throw new Error("Admin access required.");
  }
  return auth;
}

/**
 * Seeding is allowed for admins always, and for any signed-in user
 * outside production (APP_ENV is a Convex dashboard env var).
 */
export async function requireSeedAccess(
  ctx: SessionContext,
  sessionId: Id<"sessions">,
): Promise<{ userId: Id<"users">; user: Doc<"users"> }> {
  const auth = await requireSession(ctx, sessionId);
  const isProduction = process.env.APP_ENV === "production";
  if (isProduction && auth.user.role !== "admin") {
    throw new Error("Seeding is admin-only in production.");
  }
  return auth;
}

export async function enforceRateLimit(
  ctx: MutationCtx,
  key: string,
  limit: number,
  windowMs: number,
): Promise<void> {
  const now = Date.now();
  const record = await ctx.db
    .query("rateLimits")
    .withIndex("by_key", (query) => query.eq("key", key))
    .unique();
  if (!record || now - record.windowStart >= windowMs) {
    if (record) await ctx.db.patch(record._id, { count: 1, windowStart: now });
    else await ctx.db.insert("rateLimits", { key, count: 1, windowStart: now });
    return;
  }
  if (record.count >= limit) throw new Error("Too many requests. Please try again later.");
  await ctx.db.patch(record._id, { count: record.count + 1 });
}
