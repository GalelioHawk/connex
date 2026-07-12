import { query, mutation, action, internalQuery, internalMutation } from "./_generated/server";
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

// ─── Search users eligible to be added as SOS contacts (must have accepted direct chat) ───
export const searchSOSEligibleUsers = query({
  args: {
    sessionId: v.id("sessions"),
    q:         v.string(),
  },
  handler: async (ctx, { sessionId, q }) => {
    const { userId } = await requireSession(ctx, sessionId);
    if (q.trim().length < 2) return [];

    const memberships = await ctx.db
      .query("conversationMembers")
      .withIndex("by_user", (q: any) => q.eq("userId", userId))
      .collect();

    const eligibleUsers: any[] = [];
    const searchTerm = q.trim().toLowerCase();

    for (const m of memberships) {
      const convo = await ctx.db.get(m.conversationId);
      if (convo && convo.type === "direct" && convo.status === "accepted") {
        const otherMember = await ctx.db
          .query("conversationMembers")
          .withIndex("by_conversation", (q: any) => q.eq("conversationId", m.conversationId))
          .filter((q: any) => q.neq(q.field("userId"), userId))
          .first();

        if (otherMember) {
          const u = await ctx.db.get(otherMember.userId);
          if (u && u.isActive) {
            const nameMatch = u.name.toLowerCase().includes(searchTerm);
            const phoneMatch = u.phone.toLowerCase().includes(searchTerm);
            if (nameMatch || phoneMatch) {
              eligibleUsers.push({
                id:         u._id,
                name:       u.name,
                phone:      (u.showPhone === false) ? null : u.phone,
                avatar_url: u.avatarUrl ?? null,
              });
            }
          }
        }
      }
    }

    return eligibleUsers;
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

    // Ensure there is an active, accepted direct conversation between the two users
    const memberships = await ctx.db
      .query("conversationMembers")
      .withIndex("by_user", (q: any) => q.eq("userId", userId))
      .collect();

    let acceptedConvoExists = false;
    for (const m of memberships) {
      const convo = await ctx.db.get(m.conversationId);
      if (convo && convo.type === "direct" && convo.status === "accepted") {
        const isTargetMember = await ctx.db
          .query("conversationMembers")
          .withIndex("by_conversation_user", (q: any) =>
            q.eq("conversationId", m.conversationId).eq("userId", contactUserId),
          )
          .first();
        if (isTargetMember) {
          acceptedConvoExists = true;
          break;
        }
      }
    }

    if (!acceptedConvoExists) {
      throw new Error("You must have an accepted active chat with this contact before adding them as an SOS contact.");
    }

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
  handler: async (ctx, { sessionId }): Promise<{ ok: boolean; notified: number }> => {
    const user = await ctx.runQuery(internal.sos_internal.getSessionUser, { sessionId }) as any;
    if (!user) throw new Error("Not authenticated.");
    await ctx.runMutation(internal.sos_internal.checkAlertRateLimit, { userId: user._id });

    // 1. Broadcast real-time emergency system DMs to all mutual contacts!
    await ctx.runMutation(internal.sos_internal.broadcastSOSAlert, { userId: user._id });

    // 2. Fetch accepted contacts to count notified count
    const acceptedContacts = await ctx.runQuery(internal.sos_internal.getAcceptedContacts, {
      userId: user._id,
    }) as any;

    // Each emergency system message schedules the standard Expo push action.
    return { ok: true, notified: acceptedContacts.length };
  },
});
