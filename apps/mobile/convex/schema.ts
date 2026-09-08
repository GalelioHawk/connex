import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // ─── Users ────────────────────────────────────────────────────────────────
  users: defineTable({
    phone:        v.string(),
    name:         v.string(),
    passwordHash: v.string(),
    avatarUrl:    v.optional(v.string()),
    expoPushToken: v.optional(v.string()),
    fcmToken:      v.optional(v.string()), // legacy field; read only during migration
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
    role:                 v.optional(v.union(v.literal("admin"), v.literal("user"))),
  })
    .index("by_phone", ["phone"])
    .searchIndex("search_name",  { searchField: "name",  filterFields: ["isActive"] })
    .searchIndex("search_phone", { searchField: "phone", filterFields: ["isActive"] }),

  // ─── Sessions ─────────────────────────────────────────────────────────────
  sessions: defineTable({
    userId:    v.id("users"),
    expiresAt: v.number(), // Unix ms
  }).index("by_user", ["userId"]),

  rateLimits: defineTable({
    key:         v.string(),
    count:       v.number(),
    windowStart: v.number(),
  }).index("by_key", ["key"]),

  // ─── Conversations ────────────────────────────────────────────────────────
  conversations: defineTable({
    type:      v.union(v.literal("direct"), v.literal("group")),
    name:      v.optional(v.string()),
    imageUrl:  v.optional(v.string()),
    createdBy: v.id("users"),
    status:    v.optional(v.union(v.literal("pending"), v.literal("accepted"), v.literal("declined"))),
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
    code:  v.optional(v.string()), // stable slug, e.g. "mathematics" — same across grades
  })
    .index("by_grade", ["grade"])
    .index("by_code_grade", ["code", "grade"]),

  // ─── Edu papers (question papers, memos, addenda, formula sheets) ─────────
  eduPapers: defineTable({
    subjectId:    v.id("eduSubjects"),
    grade:        v.optional(v.number()),  // denormalised for grade-wide queries
    year:         v.number(),
    term:         v.optional(v.number()),  // legacy field, superseded by session
    session:      v.optional(v.string()),  // "November" | "June" | "Feb/March"
    paperNumber:  v.optional(v.number()),  // 1, 2, 3 — undefined if not applicable/unknown
    language:     v.optional(v.string()),  // "English" | "Afrikaans" | ...
    paperType:    v.optional(v.union(
      v.literal("question_paper"),
      v.literal("memorandum"),
      v.literal("addendum"),
      v.literal("formula_sheet"),
    )),
    sourceName:   v.optional(v.string()),  // "DBE" | "WCED ePortal" | ...
    sourceStatus: v.optional(v.union(v.literal("verified"), v.literal("needs_url"))),
    tags:         v.optional(v.array(v.string())),
    storageId:    v.optional(v.id("_storage")),
    pdfUrl:       v.optional(v.string()),
    updatedAt:    v.optional(v.number()),
  })
    .index("by_subject", ["subjectId"])
    .index("by_grade",   ["grade"]),

  // ─── Edu study notes (original content only) ──────────────────────────────
  eduNotes: defineTable({
    grade:       v.number(),
    subjectCode: v.string(),
    subjectName: v.string(),
    topic:       v.string(),
    title:       v.string(),
    noteType:    v.union(
      v.literal("summary"),
      v.literal("formula_sheet"),
      v.literal("exam_tips"),
      v.literal("definitions"),
      v.literal("worked_examples"),
      v.literal("essay_guide"),
      v.literal("practical_guide"),
    ),
    difficulty:  v.union(v.literal("beginner"), v.literal("normal"), v.literal("advanced")),
    content:     v.string(),
    tags:        v.optional(v.array(v.string())),
    updatedAt:   v.number(),
  }).index("by_grade_subject", ["grade", "subjectCode"]),

  // ─── Edu tutors (discovery directory) ─────────────────────────────────────
  eduTutors: defineTable({
    seedKey:       v.string(),            // stable identifier for idempotent seeding
    name:          v.string(),
    bio:           v.string(),
    subjects:      v.array(v.string()),   // subject codes
    grades:        v.array(v.number()),
    province:      v.string(),
    mode:          v.union(v.literal("online"), v.literal("in_person"), v.literal("both")),
    hourlyRateZar: v.optional(v.number()), // undefined = free / community tutor
    rating:        v.number(),
    reviewCount:   v.number(),
    languages:     v.array(v.string()),
    availability:  v.string(),
    verified:      v.boolean(),
    avatarColor:   v.optional(v.string()),
  }).index("by_seedKey", ["seedKey"]),

  // ─── Edu tutor applications (become-a-tutor pipeline) ────────────────────
  eduTutorApplications: defineTable({
    userId:         v.id("users"),
    subjects:       v.array(v.string()),   // subject codes
    grades:         v.array(v.number()),
    province:       v.string(),
    mode:           v.union(v.literal("online"), v.literal("in_person"), v.literal("both")),
    qualifications: v.string(),
    motivation:     v.optional(v.string()),
    hourlyRateZar:  v.optional(v.number()), // undefined = volunteer / free
    status:         v.union(v.literal("pending"), v.literal("approved"), v.literal("declined")),
  }).index("by_user", ["userId"]),

  // ─── Edu tutor contact requests ───────────────────────────────────────────
  eduTutorRequests: defineTable({
    tutorId: v.id("eduTutors"),
    userId:  v.id("users"),
    message: v.optional(v.string()),
    status:  v.union(v.literal("pending"), v.literal("accepted"), v.literal("declined")),
  })
    .index("by_user_tutor", ["userId", "tutorId"])
    .index("by_tutor",      ["tutorId"]),

  // ─── Edu help board posts ─────────────────────────────────────────────────
  eduHelpPosts: defineTable({
    authorId:        v.id("users"),
    grade:           v.number(),
    subjectCode:     v.string(),
    subjectName:     v.string(),
    topic:           v.optional(v.string()),
    title:           v.string(),
    body:            v.string(),
    status:          v.union(v.literal("open"), v.literal("answered"), v.literal("solved")),
    repliesCount:    v.number(),
    upvotes:         v.number(),
    acceptedReplyId: v.optional(v.id("eduHelpReplies")),
    updatedAt:       v.number(),
  })
    .index("by_grade",   ["grade"])
    .index("by_subject", ["subjectCode"])
    .index("by_author",  ["authorId"]),

  // ─── Edu help board replies ───────────────────────────────────────────────
  eduHelpReplies: defineTable({
    postId:     v.id("eduHelpPosts"),
    authorId:   v.id("users"),
    body:       v.string(),
    upvotes:    v.number(),
    isAccepted: v.boolean(),
  }).index("by_post", ["postId"]),

  // ─── Edu help board votes (one vote per user per target) ─────────────────
  eduHelpVotes: defineTable({
    userId:     v.id("users"),
    targetType: v.union(v.literal("post"), v.literal("reply")),
    targetId:   v.string(),
  }).index("by_user_target", ["userId", "targetType", "targetId"]),

  // ─── Edu bookmarks (papers + notes) ───────────────────────────────────────
  eduBookmarks: defineTable({
    userId:   v.id("users"),
    itemType: v.union(v.literal("paper"), v.literal("note")),
    itemId:   v.string(),
  })
    .index("by_user",      ["userId"])
    .index("by_user_item", ["userId", "itemType", "itemId"]),

  // ─── Edu recently viewed ──────────────────────────────────────────────────
  eduRecentViews: defineTable({
    userId:   v.id("users"),
    itemType: v.union(v.literal("paper"), v.literal("note")),
    itemId:   v.string(),
    title:    v.string(),
    subtitle: v.string(),
    viewedAt: v.number(),
  })
    .index("by_user",      ["userId"])
    .index("by_user_item", ["userId", "itemType", "itemId"]),

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

  // ─── Tutor profiles (real, operating tutors — distinct from the public directory) ──
  tutorProfiles: defineTable({
    userId:        v.id("users"),
    directoryId:   v.optional(v.id("eduTutors")),
    displayName:   v.string(),
    hourlyRateZar: v.optional(v.number()),
    currency:      v.literal("ZAR"),
    isActive:      v.boolean(),
    createdFrom:   v.union(v.literal("application"), v.literal("admin"), v.literal("seed")),
  }).index("by_user", ["userId"]),

  // ─── Tutor's private student roster ────────────────────────────────────────
  tutorStudents: defineTable({
    tutorId:         v.id("tutorProfiles"),
    studentUserId:   v.optional(v.id("users")),
    displayName:     v.string(),
    contactPhone:    v.optional(v.string()),
    monthlyFeeZar:   v.optional(v.number()),
    status:          v.union(v.literal("active"), v.literal("paused"), v.literal("ended")),
    linkedRequestId: v.optional(v.id("eduTutorRequests")),
  })
    .index("by_tutor",        ["tutorId"])
    .index("by_student_user", ["studentUserId"]),

  // ─── Tutoring bookings (scheduled lessons) ─────────────────────────────────
  bookings: defineTable({
    tutorId:         v.id("tutorProfiles"),
    studentId:       v.id("tutorStudents"),
    subjectCode:     v.optional(v.string()),
    scheduledAt:     v.number(),
    durationMinutes: v.number(),
    mode:            v.union(v.literal("online"), v.literal("in_person")),
    status:          v.union(
                       v.literal("scheduled"), v.literal("completed"),
                       v.literal("cancelled"), v.literal("no_show"),
                     ),
    conversationId:  v.optional(v.id("conversations")),
    callId:          v.optional(v.id("calls")),
    meetingLink:     v.optional(v.string()),
    notes:           v.optional(v.string()),
    cancelledBy:     v.optional(v.union(v.literal("tutor"), v.literal("student"))),
    cancelReason:    v.optional(v.string()),
  })
    .index("by_tutor",        ["tutorId"])
    .index("by_tutor_time",   ["tutorId", "scheduledAt"])
    .index("by_student",      ["studentId"])
    .index("by_tutor_status", ["tutorId", "status"]),

  // ─── Homework assignments ───────────────────────────────────────────────────
  homeworkAssignments: defineTable({
    tutorId:             v.id("tutorProfiles"),
    studentId:           v.id("tutorStudents"),
    subjectCode:         v.optional(v.string()),
    title:               v.string(),
    instructions:        v.string(),
    attachmentStorageId: v.optional(v.id("_storage")),
    attachmentUrl:       v.optional(v.string()),
    dueAt:               v.optional(v.number()),
    status:              v.union(v.literal("assigned"), v.literal("submitted"), v.literal("marked")),
  })
    .index("by_tutor",          ["tutorId"])
    .index("by_student",        ["studentId"])
    .index("by_student_status", ["studentId", "status"]),

  // ─── Homework submissions ────────────────────────────────────────────────────
  homeworkSubmissions: defineTable({
    assignmentId:  v.id("homeworkAssignments"),
    studentUserId: v.id("users"),
    storageId:     v.optional(v.id("_storage")),
    fileUrl:       v.optional(v.string()),
    textAnswer:    v.optional(v.string()),
    submittedAt:   v.number(),
    markScore:     v.optional(v.number()),
    markMax:       v.optional(v.number()),
    markFeedback:  v.optional(v.string()),
    markedAt:      v.optional(v.number()),
  }).index("by_assignment", ["assignmentId"]),

  // ─── Tutoring ledger (manual payment tracking, no gateway) ─────────────────
  ledgerEntries: defineTable({
    tutorId:     v.id("tutorProfiles"),
    studentId:   v.id("tutorStudents"),
    type:        v.union(v.literal("charge"), v.literal("payment")),
    amountZar:   v.number(),
    description: v.string(),
    method:      v.optional(v.union(v.literal("cash"), v.literal("eft"), v.literal("other"))),
    recordedAt:  v.number(),
    bookingId:   v.optional(v.id("bookings")),
  })
    .index("by_tutor",   ["tutorId"])
    .index("by_student", ["studentId"]),
});
