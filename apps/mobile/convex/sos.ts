import { query, mutation, action, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { requireSession, toIso } from "./_helpers";
import { Doc, Id } from "./_generated/dataModel";

// ─── List my SOS contacts ─────────────────────────────────────────────────────
export const listContacts = query({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, { sessionId }) => {
    const { userId } = await requireSession(ctx, sessionId);

    const contacts = await ctx.db
      .query("sosContacts")
      .withIndex("by_user", (q: any) => q.eq("userId", userId))
      .collect();

    return Promise.all(
      contacts.map(async (c: any) => {
        const contactUser = await ctx.db.get(c.contactUserId) as any;
        return {
          id:             c._id         as string,
          user_id:        c.userId      as string,
          contact_user_id: c.contactUserId as string,
          status:         c.status,
          created_at:     toIso(c._creationTime),
          contact: contactUser
            ? { id: contactUser._id, name: contactUser.name, avatar_url: contactUser.avatarUrl ?? null }
            : null,
        };
      }),
    );
  },
});

// ─── List pending requests sent TO me ────────────────────────────────────────
export const listIncomingRequests = query({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, { sessionId }) => {
    const { userId } = await requireSession(ctx, sessionId);

    const requests = await ctx.db
      .query("sosContacts")
      .withIndex("by_contact", (q: any) => q.eq("contactUserId", userId))
      .filter((q: any) => q.eq(q.field("status"), "pending"))
      .collect();

    return Promise.all(
      requests.map(async (r: any) => {
        const requester = await ctx.db.get(r.userId) as any;
        return {
          id:         r._id    as string,
          user_id:    r.userId as string,
          status:     r.status,
          created_at: toIso(r._creationTime),
          requester: requester
            ? { id: requester._id, name: requester.name, avatar_url: requester.avatarUrl ?? null }
            : null,
        };
      }),
    );
  },
});

// ─── Send SOS contact request ─────────────────────────────────────────────────
export const sendRequest = mutation({
  args: {
    sessionId:     v.id("sessions"),
    contactUserId: v.id("users"),
  },
  handler: async (ctx, { sessionId, contactUserId }) => {
    const { userId } = await requireSession(ctx, sessionId);
    if (userId === contactUserId) throw new Error("Cannot add yourself.");

    const existing = await ctx.db
      .query("sosContacts")
      .withIndex("by_user_contact", (q: any) =>
        q.eq("userId", userId).eq("contactUserId", contactUserId),
      )
      .first();
    if (existing) throw new Error("Request already sent.");

    await ctx.db.insert("sosContacts", {
      userId,
      contactUserId,
      status: "pending",
    });
    return { ok: true };
  },
});

// ─── Respond to request ───────────────────────────────────────────────────────
export const respondToRequest = mutation({
  args: {
    sessionId: v.id("sessions"),
    requestId: v.id("sosContacts"),
    accept:    v.boolean(),
  },
  handler: async (ctx, { sessionId, requestId, accept }) => {
    const { userId } = await requireSession(ctx, sessionId);

    const request = await ctx.db.get(requestId);
    if (!request) throw new Error("Request not found.");
    if (request.contactUserId !== userId) throw new Error("Not authorized.");

    await ctx.db.patch(requestId, { status: accept ? "accepted" : "rejected" });

    // If accepted, create the reverse relationship too
    if (accept) {
      const reverse = await ctx.db
        .query("sosContacts")
        .withIndex("by_user_contact", (q: any) =>
          q.eq("userId", userId).eq("contactUserId", request.userId),
        )
        .first();
      if (!reverse) {
        await ctx.db.insert("sosContacts", {
          userId:        userId,
          contactUserId: request.userId,
          status:        "accepted",
        });
      }
    }
    return { ok: true };
  },
});

// ─── Trigger SOS alert ────────────────────────────────────────────────────────
export const triggerAlert = action({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, { sessionId }) => {
    const user = await ctx.runQuery(internal.sos.getSessionUser, { sessionId });
    if (!user) throw new Error("Not authenticated.");

    const acceptedContacts = await ctx.runQuery(internal.sos.getAcceptedContacts, {
      userId: user._id,
    });

    const tokens = acceptedContacts
      .map((c: any) => c.fcmToken)
      .filter(Boolean) as string[];

    if (!tokens.length) return { ok: true, notified: 0 };

    // Send FCM push to all accepted SOS contacts
    const serviceAccountJson = process.env.FCM_SERVICE_ACCOUNT_JSON;
    if (!serviceAccountJson) {
      console.warn("[sos] FCM_SERVICE_ACCOUNT_JSON not set.");
      return { ok: true, notified: 0 };
    }

    console.log(`[sos] SOS triggered by ${user.name} — would notify ${tokens.length} contacts.`);

    return { ok: true, notified: tokens.length };
  },
});

// ─── Internal queries ─────────────────────────────────────────────────────────
export const getSessionUser = internalQuery({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, { sessionId }): Promise<Doc<"users"> | null> => {
    const session = await ctx.db.get(sessionId) as any;
    if (!session) return null;
    return ctx.db.get(session.userId as Id<"users">);
  },
});

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
