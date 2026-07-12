import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { enforceRateLimit, requireSession } from "./_helpers";

async function authorInfo(
  ctx: { db: { get: (id: Id<"users">) => Promise<Doc<"users"> | null> } },
  authorId: Id<"users">,
) {
  const user = await ctx.db.get(authorId);
  return {
    author_id:     authorId as string,
    author_name:   user?.name ?? "Learner",
    author_avatar: user?.avatarUrl ?? null,
  };
}

function serializePost(post: Doc<"eduHelpPosts">) {
  return {
    id:            post._id as string,
    grade:         post.grade,
    subject_code:  post.subjectCode,
    subject_name:  post.subjectName,
    topic:         post.topic ?? null,
    title:         post.title,
    body:          post.body,
    status:        post.status,
    replies_count: post.repliesCount,
    upvotes:       post.upvotes,
    created_at:    post._creationTime,
  };
}

// ─── List help posts with filters ─────────────────────────────────────────────
export const listPosts = query({
  args: {
    sessionId:   v.id("sessions"),
    grade:       v.optional(v.number()),
    subjectCode: v.optional(v.string()),
    filter:      v.optional(v.union(
      v.literal("all"),
      v.literal("open"),
      v.literal("unanswered"),
      v.literal("solved"),
      v.literal("mine"),
    )),
    search:      v.optional(v.string()),
  },
  handler: async (ctx, { sessionId, grade, subjectCode, filter, search }) => {
    const { userId } = await requireSession(ctx, sessionId);

    let posts: Doc<"eduHelpPosts">[];
    if (filter === "mine") {
      posts = await ctx.db
        .query("eduHelpPosts")
        .withIndex("by_author", (q) => q.eq("authorId", userId))
        .collect();
    } else if (grade !== undefined) {
      posts = await ctx.db
        .query("eduHelpPosts")
        .withIndex("by_grade", (q) => q.eq("grade", grade))
        .collect();
    } else {
      posts = await ctx.db.query("eduHelpPosts").collect();
    }

    if (subjectCode) posts = posts.filter((p) => p.subjectCode === subjectCode);
    if (filter === "open")       posts = posts.filter((p) => p.status !== "solved");
    if (filter === "unanswered") posts = posts.filter((p) => p.repliesCount === 0);
    if (filter === "solved")     posts = posts.filter((p) => p.status === "solved");
    if (search && search.trim().length > 0) {
      const needle = search.toLowerCase().trim();
      posts = posts.filter((p) =>
        [p.title, p.body, p.topic ?? "", p.subjectName].join(" ").toLowerCase().includes(needle),
      );
    }

    posts.sort((a, b) => b._creationTime - a._creationTime);
    posts = posts.slice(0, 100);

    return Promise.all(
      posts.map(async (post) => ({
        ...serializePost(post),
        ...(await authorInfo(ctx, post.authorId)),
        is_mine: (post.authorId as string) === (userId as string),
      })),
    );
  },
});

// ─── Single post with replies ─────────────────────────────────────────────────
export const getPost = query({
  args: {
    sessionId: v.id("sessions"),
    postId:    v.id("eduHelpPosts"),
  },
  handler: async (ctx, { sessionId, postId }) => {
    const { userId } = await requireSession(ctx, sessionId);

    const post = await ctx.db.get(postId);
    if (!post) return null;

    const replies = await ctx.db
      .query("eduHelpReplies")
      .withIndex("by_post", (q) => q.eq("postId", postId))
      .collect();
    // Accepted answer first, then most upvoted, then oldest
    replies.sort((a, b) => {
      if (a.isAccepted !== b.isAccepted) return a.isAccepted ? -1 : 1;
      if (a.upvotes !== b.upvotes) return b.upvotes - a.upvotes;
      return a._creationTime - b._creationTime;
    });

    const myVotes = await ctx.db
      .query("eduHelpVotes")
      .withIndex("by_user_target", (q) => q.eq("userId", userId))
      .collect();
    const votedIds = new Set(myVotes.map((vote) => vote.targetId));

    return {
      ...serializePost(post),
      ...(await authorInfo(ctx, post.authorId)),
      is_mine:  (post.authorId as string) === (userId as string),
      my_vote:  votedIds.has(postId as string),
      replies: await Promise.all(
        replies.map(async (reply) => ({
          id:          reply._id as string,
          body:        reply.body,
          upvotes:     reply.upvotes,
          is_accepted: reply.isAccepted,
          created_at:  reply._creationTime,
          my_vote:     votedIds.has(reply._id as string),
          is_mine:     (reply.authorId as string) === (userId as string),
          ...(await authorInfo(ctx, reply.authorId)),
        })),
      ),
    };
  },
});

// ─── Create a help post ───────────────────────────────────────────────────────
export const createPost = mutation({
  args: {
    sessionId:   v.id("sessions"),
    grade:       v.number(),
    subjectCode: v.string(),
    subjectName: v.string(),
    topic:       v.optional(v.string()),
    title:       v.string(),
    body:        v.string(),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireSession(ctx, args.sessionId);
    await enforceRateLimit(ctx, `edu:question:${userId}`, 5, 60 * 60 * 1000);

    const title = args.title.trim();
    const body = args.body.trim();
    if (title.length < 8)  throw new Error("Question title is too short (min 8 characters).");
    if (title.length > 140) throw new Error("Question title is too long (max 140 characters).");
    if (body.length < 10)  throw new Error("Please describe your question in more detail.");
    if (body.length > 4000) throw new Error("Question body is too long (max 4000 characters).");
    if (args.grade < 10 || args.grade > 12) throw new Error("Grade must be 10, 11, or 12.");

    const id = await ctx.db.insert("eduHelpPosts", {
      authorId:     userId,
      grade:        args.grade,
      subjectCode:  args.subjectCode,
      subjectName:  args.subjectName,
      topic:        args.topic?.trim() ? args.topic.trim().slice(0, 60) : undefined,
      title,
      body,
      status:       "open",
      repliesCount: 0,
      upvotes:      0,
      updatedAt:    Date.now(),
    });
    return { id: id as string };
  },
});

// ─── Reply to a post ──────────────────────────────────────────────────────────
export const addReply = mutation({
  args: {
    sessionId: v.id("sessions"),
    postId:    v.id("eduHelpPosts"),
    body:      v.string(),
  },
  handler: async (ctx, { sessionId, postId, body }) => {
    const { userId } = await requireSession(ctx, sessionId);
    await enforceRateLimit(ctx, `edu:reply:${userId}`, 20, 60 * 60 * 1000);

    const post = await ctx.db.get(postId);
    if (!post) throw new Error("Post not found.");

    const trimmed = body.trim();
    if (trimmed.length < 2)    throw new Error("Reply is too short.");
    if (trimmed.length > 4000) throw new Error("Reply is too long (max 4000 characters).");

    const id = await ctx.db.insert("eduHelpReplies", {
      postId,
      authorId:   userId,
      body:       trimmed,
      upvotes:    0,
      isAccepted: false,
    });

    await ctx.db.patch(postId, {
      repliesCount: post.repliesCount + 1,
      status:       post.status === "open" ? "answered" : post.status,
      updatedAt:    Date.now(),
    });
    return { id: id as string };
  },
});

// ─── Accept a reply (post author only) ────────────────────────────────────────
export const acceptReply = mutation({
  args: {
    sessionId: v.id("sessions"),
    postId:    v.id("eduHelpPosts"),
    replyId:   v.id("eduHelpReplies"),
  },
  handler: async (ctx, { sessionId, postId, replyId }) => {
    const { userId } = await requireSession(ctx, sessionId);

    const post = await ctx.db.get(postId);
    if (!post) throw new Error("Post not found.");
    if ((post.authorId as string) !== (userId as string)) {
      throw new Error("Only the question author can accept an answer.");
    }

    const reply = await ctx.db.get(replyId);
    if (!reply || (reply.postId as string) !== (postId as string)) {
      throw new Error("Reply not found on this post.");
    }

    // Un-accept any previously accepted reply
    if (post.acceptedReplyId && (post.acceptedReplyId as string) !== (replyId as string)) {
      const previous = await ctx.db.get(post.acceptedReplyId);
      if (previous) await ctx.db.patch(previous._id, { isAccepted: false });
    }

    await ctx.db.patch(replyId, { isAccepted: true });
    await ctx.db.patch(postId, {
      status:          "solved",
      acceptedReplyId: replyId,
      updatedAt:       Date.now(),
    });
  },
});

// ─── Toggle upvote on a post or reply ─────────────────────────────────────────
export const toggleUpvote = mutation({
  args: {
    sessionId:  v.id("sessions"),
    targetType: v.union(v.literal("post"), v.literal("reply")),
    targetId:   v.string(),
  },
  handler: async (ctx, { sessionId, targetType, targetId }) => {
    const { userId } = await requireSession(ctx, sessionId);

    const existing = await ctx.db
      .query("eduHelpVotes")
      .withIndex("by_user_target", (q) =>
        q.eq("userId", userId).eq("targetType", targetType).eq("targetId", targetId),
      )
      .unique();

    const delta = existing ? -1 : 1;

    if (targetType === "post") {
      const post = await ctx.db.get(targetId as Id<"eduHelpPosts">);
      if (!post) throw new Error("Post not found.");
      await ctx.db.patch(post._id, { upvotes: Math.max(0, post.upvotes + delta) });
    } else {
      const reply = await ctx.db.get(targetId as Id<"eduHelpReplies">);
      if (!reply) throw new Error("Reply not found.");
      await ctx.db.patch(reply._id, { upvotes: Math.max(0, reply.upvotes + delta) });
    }

    if (existing) {
      await ctx.db.delete(existing._id);
      return { voted: false };
    }
    await ctx.db.insert("eduHelpVotes", { userId, targetType, targetId });
    return { voted: true };
  },
});
