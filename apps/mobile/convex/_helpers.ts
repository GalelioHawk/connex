/**
 * Shared server-side helpers for Convex functions.
 * Import these in every function file.
 */
import { Id } from "./_generated/dataModel";

// 30 days in milliseconds
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Validate a session and return the authenticated user.
 * Throws ConvexError if session is missing or expired.
 */
export async function requireSession(
  ctx: { db: any },
  sessionId: Id<"sessions">,
): Promise<{ userId: Id<"users">; user: any }> {
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
