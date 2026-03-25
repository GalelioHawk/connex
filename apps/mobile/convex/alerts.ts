/**
 * Alerts — loadshedding data refreshed every 4 hours by a scheduled action.
 * Community alerts come from feed posts with alertCategory set.
 */
import { query, action, internalAction, internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { requireSession } from "./_helpers";

// ─── Get loadshedding status ──────────────────────────────────────────────────
export const getLoadshedding = query({
  args: {
    sessionId: v.id("sessions"),
    areaId:    v.optional(v.string()),
  },
  handler: async (ctx, { sessionId, areaId }) => {
    await requireSession(ctx, sessionId);

    const cached = await ctx.db
      .query("loadsheddingCache")
      .withIndex("by_area", (q: any) => q.eq("areaId", areaId ?? null))
      .order("desc")
      .first();

    return cached ?? null;
  },
});

// ─── Refresh loadshedding (scheduled every 4 hours) ──────────────────────────
export const refreshLoadshedding = internalAction({
  args: {},
  handler: async (ctx) => {
    const apiKey = process.env.ESKOMSEPUSH_API_KEY;
    if (!apiKey) {
      console.warn("[alerts] ESKOMSEPUSH_API_KEY not set.");
      return;
    }

    try {
      // Fetch current status
      const statusRes = await fetch("https://developer.sepush.co.za/business/2.0/status", {
        headers: { Token: apiKey },
      });
      const statusData = await statusRes.json() as { status?: { capetown?: { stage: number }; eskom?: { stage: number } } };

      const stage = statusData?.status?.eskom?.stage ?? 0;

      await ctx.runMutation(internal.alerts.upsertLoadshedding, {
        stage,
        schedule:  statusData,
        areaId:    undefined,
        updatedAt: Date.now(),
      });

      console.log(`[alerts] Loadshedding refreshed. Stage: ${stage}`);
    } catch (err) {
      console.error("[alerts] Failed to refresh loadshedding:", err);
    }
  },
});

// ─── Internal: upsert loadshedding cache ─────────────────────────────────────
export const upsertLoadshedding = internalMutation({
  args: {
    stage:     v.number(),
    schedule:  v.any(),
    areaId:    v.optional(v.string()),
    updatedAt: v.number(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("loadsheddingCache")
      .withIndex("by_area", (q: any) => q.eq("areaId", args.areaId ?? null))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        stage:     args.stage,
        schedule:  args.schedule,
        updatedAt: args.updatedAt,
      });
    } else {
      await ctx.db.insert("loadsheddingCache", args);
    }
  },
});
