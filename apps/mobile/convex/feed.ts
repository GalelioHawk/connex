import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { enforceRateLimit, requireSession, toIso } from "./_helpers";

const ALERT_CATEGORIES = ["utility", "safety", "traffic", "water", "weather", "community"] as const;

// ─── List feed posts (reactive) ───────────────────────────────────────────────
export const listPosts = query({
  args: {
    sessionId:     v.id("sessions"),
    areaId:        v.optional(v.string()),
    alertCategory: v.optional(v.string()),
    limit:         v.optional(v.number()),
  },
  handler: async (ctx, { sessionId, areaId, alertCategory, limit = 50 }) => {
    const { userId } = await requireSession(ctx, sessionId);

    let postsQuery = ctx.db.query("feedPosts").order("desc");

    if (areaId) {
      postsQuery = ctx.db
        .query("feedPosts")
        .withIndex("by_area", (q: any) => q.eq("areaId", areaId))
        .order("desc");
    } else if (alertCategory) {
      postsQuery = ctx.db
        .query("feedPosts")
        .withIndex("by_category", (q: any) => q.eq("alertCategory", alertCategory))
        .order("desc");
    }

    const posts = await postsQuery.take(limit);
    const filteredPosts = alertCategory
      ? posts.filter((post) => post.alertCategory === alertCategory)
      : posts;

    return Promise.all(
      filteredPosts.map(async (post: any) => {
        const author = await ctx.db.get(post.authorId) as any;
        const liked  = await ctx.db
          .query("postLikes")
          .withIndex("by_post_user", (q: any) =>
            q.eq("postId", post._id).eq("userId", userId),
          )
          .first();

        return {
          id:             post._id           as string,
          author_id:      post.authorId      as string,
          content:        post.content,
          image_url:      post.imageUrl      ?? null,
          alert_tag:      post.alertCategory ?? null,
          area_id:        post.areaId        ?? null,
          likes_count:    post.likesCount,
          comments_count: post.commentsCount,
          created_at:     toIso(post._creationTime),
          is_liked:       !!liked,
          author: author
            ? { id: author._id, name: author.name, avatar_url: author.avatarUrl ?? null }
            : null,
        };
      }),
    );
  },
});

// ─── Create post ──────────────────────────────────────────────────────────────
export const createPost = mutation({
  args: {
    sessionId:     v.id("sessions"),
    content:       v.string(),
    imageUrl:      v.optional(v.string()),
    alertCategory: v.optional(v.string()),
  },
  handler: async (ctx, { sessionId, content, imageUrl, alertCategory }) => {
    const { userId, user } = await requireSession(ctx, sessionId);
    await enforceRateLimit(ctx, `feed:create:${userId}`, 10, 60 * 1000);

    if (!content.trim()) throw new Error("Post content cannot be empty.");

    const validCategory = alertCategory && ALERT_CATEGORIES.includes(alertCategory as any)
      ? (alertCategory as typeof ALERT_CATEGORIES[number])
      : undefined;

    const postId = await ctx.db.insert("feedPosts", {
      authorId:      userId,
      content:       content.trim(),
      imageUrl,
      alertCategory: validCategory,
      areaId:        user.areaId,
      likesCount:    0,
      commentsCount: 0,
    });

    return { postId: postId as string };
  },
});

// ─── Toggle like ──────────────────────────────────────────────────────────────
export const toggleLike = mutation({
  args: {
    sessionId: v.id("sessions"),
    postId:    v.id("feedPosts"),
  },
  handler: async (ctx, { sessionId, postId }) => {
    const { userId } = await requireSession(ctx, sessionId);

    const existing = await ctx.db
      .query("postLikes")
      .withIndex("by_post_user", (q: any) => q.eq("postId", postId).eq("userId", userId))
      .first();

    const post = await ctx.db.get(postId);
    if (!post) throw new Error("Post not found.");

    if (existing) {
      await ctx.db.delete(existing._id);
      await ctx.db.patch(postId, { likesCount: Math.max(0, post.likesCount - 1) });
      return { liked: false };
    } else {
      await ctx.db.insert("postLikes", { postId, userId });
      await ctx.db.patch(postId, { likesCount: post.likesCount + 1 });
      return { liked: true };
    }
  },
});
