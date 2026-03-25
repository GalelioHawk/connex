import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // ─── Users ────────────────────────────────────────────────────────────────
  users: defineTable({
    phone:        v.string(),
    name:         v.string(),
    passwordHash: v.string(),
    avatarUrl:    v.optional(v.string()),
    fcmToken:     v.optional(v.string()),
    bio:          v.optional(v.string()),
    areaId:       v.optional(v.string()),
    province:     v.optional(v.string()),
    isActive:     v.boolean(),
    isOnline:         v.optional(v.boolean()),
    lastSeen:         v.optional(v.number()),
    bubbleColor:      v.optional(v.string()),
    // Privacy
    showLastSeen:     v.optional(v.union(v.literal('everyone'), v.literal('contacts'), v.literal('nobody'))),
    showOnlineStatus: v.optional(v.union(v.literal('everyone'), v.literal('contacts'), v.literal('nobody'))),
    showProfilePhoto: v.optional(v.union(v.literal('everyone'), v.literal('contacts'), v.literal('nobody'))),
    readReceipts:         v.optional(v.boolean()),
    showPhone:            v.optional(v.boolean()),
    notificationPreview:  v.optional(v.boolean()),
  })
    .index("by_phone", ["phone"])
    .searchIndex("search_name",  { searchField: "name",  filterFields: ["isActive"] })
    .searchIndex("search_phone", { searchField: "phone", filterFields: ["isActive"] }),

  // ─── Sessions ─────────────────────────────────────────────────────────────
  sessions: defineTable({
    userId:    v.id("users"),
    expiresAt: v.number(), // Unix ms
  }).index("by_user", ["userId"]),

  // ─── Conversations ────────────────────────────────────────────────────────
  conversations: defineTable({
    type:      v.union(v.literal("direct"), v.literal("group")),
    name:      v.optional(v.string()),
    imageUrl:  v.optional(v.string()),
    createdBy: v.id("users"),
  }),

  // ─── Conversation members ─────────────────────────────────────────────────
  conversationMembers: defineTable({
    conversationId: v.id("conversations"),
    userId:         v.id("users"),
    role:           v.union(v.literal("admin"), v.literal("member")),
    lastReadAt:     v.optional(v.number()), // Unix ms
  })
    .index("by_conversation",      ["conversationId"])
    .index("by_user",              ["userId"])
    .index("by_conversation_user", ["conversationId", "userId"]),

  // ─── Messages ─────────────────────────────────────────────────────────────
  messages: defineTable({
    conversationId: v.id("conversations"),
    senderId:       v.id("users"),
    content:        v.optional(v.string()), // null = deleted for everyone
    type:           v.union(v.literal("text"), v.literal("image"), v.literal("video"), v.literal("system")),
    mediaUrl:       v.optional(v.string()),
    status:         v.union(v.literal("sent"), v.literal("delivered"), v.literal("read")),
    deletedAt:      v.optional(v.number()), // Unix ms
  })
    .index("by_conversation", ["conversationId"]),

  // ─── Feed posts ───────────────────────────────────────────────────────────
  feedPosts: defineTable({
    authorId:      v.id("users"),
    content:       v.string(),
    imageUrl:      v.optional(v.string()),
    alertCategory: v.optional(v.union(
      v.literal("utility"), v.literal("safety"), v.literal("traffic"),
      v.literal("water"),   v.literal("weather"), v.literal("community"),
    )),
    areaId:        v.optional(v.string()),
    likesCount:    v.number(),
    commentsCount: v.number(),
  })
    .index("by_author",   ["authorId"])
    .index("by_area",     ["areaId"])
    .index("by_category", ["alertCategory"]),

  // ─── Post likes ───────────────────────────────────────────────────────────
  postLikes: defineTable({
    postId: v.id("feedPosts"),
    userId: v.id("users"),
  })
    .index("by_post",      ["postId"])
    .index("by_post_user", ["postId", "userId"]),

  // ─── SOS contacts ─────────────────────────────────────────────────────────
  sosContacts: defineTable({
    userId:        v.id("users"),
    contactUserId: v.id("users"),
    status:        v.union(v.literal("pending"), v.literal("accepted"), v.literal("rejected")),
  })
    .index("by_user",         ["userId"])
    .index("by_contact",      ["contactUserId"])
    .index("by_user_contact", ["userId", "contactUserId"]),

  // ─── Loadshedding cache ───────────────────────────────────────────────────
  loadsheddingCache: defineTable({
    stage:     v.number(),
    schedule:  v.any(),
    areaId:    v.optional(v.string()),
    updatedAt: v.number(),
  }).index("by_area", ["areaId"]),

  // ─── Edu subjects ─────────────────────────────────────────────────────────
  eduSubjects: defineTable({
    name:  v.string(),
    grade: v.number(),
  }).index("by_grade", ["grade"]),

  // ─── Edu papers ───────────────────────────────────────────────────────────
  eduPapers: defineTable({
    subjectId: v.id("eduSubjects"),
    year:      v.number(),
    term:      v.optional(v.number()),
    storageId: v.optional(v.id("_storage")),
    pdfUrl:    v.optional(v.string()),
  }).index("by_subject", ["subjectId"]),

  // ─── Status posts (24h expiry, like WhatsApp) ─────────────────────────────
  statusPosts: defineTable({
    userId:    v.id("users"),
    type:      v.union(v.literal("image"), v.literal("video"), v.literal("text")),
    storageId: v.optional(v.id("_storage")),
    mediaUrl:  v.optional(v.string()),
    caption:   v.optional(v.string()),
    bgColor:   v.optional(v.string()),
    createdAt: v.number(),
    expiresAt: v.number(),
  })
    .index("by_user",         ["userId"])
    .index("by_user_expires", ["userId", "expiresAt"]),

  // ─── Status views ──────────────────────────────────────────────────────────
  statusViews: defineTable({
    statusId: v.id("statusPosts"),
    viewerId: v.id("users"),
    viewedAt: v.number(),
  })
    .index("by_status",        ["statusId"])
    .index("by_status_viewer", ["statusId", "viewerId"]),

  // ─── Calls ────────────────────────────────────────────────────────────────
  calls: defineTable({
    callerId:       v.id("users"),
    calleeId:       v.id("users"),
    conversationId: v.id("conversations"),
    channelName:    v.string(),
    type:           v.union(v.literal("voice"), v.literal("video")),
    status:         v.union(v.literal("ringing"), v.literal("active"), v.literal("ended"), v.literal("missed")),
    startedAt:      v.number(),
    endedAt:        v.optional(v.number()),
  })
    .index("by_callee_status", ["calleeId", "status"])
    .index("by_caller",        ["callerId"]),
});
