import { Router, Request, Response, NextFunction } from 'express';
import { supabase } from '../services/supabase';
import { requireAuth } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import {
  createConversationSchema,
  sendMessageSchema,
  markReadSchema,
} from '../validators/chat';

const router = Router();

// All chat routes require auth
router.use(requireAuth);

// ─── GET /chat/users/search?q= ────────────────────────────────────────────────
// Search users by name or phone to start a chat
router.get('/users/search', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const q      = String(req.query.q ?? '').trim();
    const userId = req.user!.userId;

    if (q.length < 2) {
      res.json({ users: [] });
      return;
    }

    const { data, error } = await supabase
      .from('users')
      .select('id, name, phone, avatar_url')
      .neq('id', userId)
      .or(`name.ilike.%${q}%,phone.ilike.%${q}%`)
      .eq('is_active', true)
      .limit(20);

    if (error) throw new AppError(500, 'Search failed');
    res.json({ users: data ?? [] });
  } catch (err) {
    next(err);
  }
});

// ─── GET /chat/conversations ──────────────────────────────────────────────────
// List all conversations for the current user with last message preview
router.get('/conversations', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;

    // Get all conversation IDs the user is a member of
    const { data: memberships, error: memErr } = await supabase
      .from('conversation_members')
      .select('conversation_id, last_read_at')
      .eq('user_id', userId);

    if (memErr) throw new AppError(500, 'Failed to load conversations');
    if (!memberships || memberships.length === 0) {
      res.json({ conversations: [] });
      return;
    }

    const convIds = memberships.map((m) => m.conversation_id);

    // Get conversation details
    const { data: convs, error: convErr } = await supabase
      .from('conversations')
      .select('*')
      .in('id', convIds);

    if (convErr) throw new AppError(500, 'Failed to load conversations');

    // Get last message for each conversation
    const convsWithMeta = await Promise.all(
      (convs ?? []).map(async (conv) => {
        // Last message
        const { data: msgs } = await supabase
          .from('messages')
          .select('id, content, type, created_at, sender_id, status')
          .eq('conversation_id', conv.id)
          .order('created_at', { ascending: false })
          .limit(1);

        const lastMessage = msgs?.[0] ?? null;

        // For direct chats, get the other member's info
        let otherUser = null;
        if (conv.type === 'direct') {
          const { data: members } = await supabase
            .from('conversation_members')
            .select('user_id')
            .eq('conversation_id', conv.id)
            .neq('user_id', userId)
            .limit(1);

          if (members?.[0]) {
            const { data: user } = await supabase
              .from('users')
              .select('id, name, avatar_url')
              .eq('id', members[0].user_id)
              .single();
            otherUser = user;
          }
        }

        // Unread count
        const membership = memberships.find((m) => m.conversation_id === conv.id);
        let unreadCount = 0;
        if (membership?.last_read_at) {
          const { count } = await supabase
            .from('messages')
            .select('id', { count: 'exact', head: true })
            .eq('conversation_id', conv.id)
            .neq('sender_id', userId)
            .gt('created_at', membership.last_read_at);
          unreadCount = count ?? 0;
        }

        return {
          ...conv,
          last_message:  lastMessage,
          other_user:    otherUser,
          unread_count:  unreadCount,
        };
      }),
    );

    // Sort by latest message
    convsWithMeta.sort((a, b) => {
      const aTime = a.last_message?.created_at ?? a.created_at;
      const bTime = b.last_message?.created_at ?? b.created_at;
      return bTime > aTime ? 1 : -1;
    });

    res.json({ conversations: convsWithMeta });
  } catch (err) {
    next(err);
  }
});

// ─── POST /chat/conversations ─────────────────────────────────────────────────
// Create a new direct or group conversation
router.post('/conversations', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = createConversationSchema.safeParse(req.body);
    if (!parsed.success) throw new AppError(400, parsed.error.issues[0].message);

    const userId = req.user!.userId;
    const { type, name, member_ids } = parsed.data;

    if (type === 'group' && !name) {
      throw new AppError(400, 'Group name is required');
    }

    // For direct chats, check if conversation already exists
    if (type === 'direct') {
      if (member_ids.length !== 1) throw new AppError(400, 'Direct chat requires exactly one member');
      const otherId = member_ids[0];

      const { data: existing } = await supabase
        .from('conversation_members')
        .select('conversation_id')
        .eq('user_id', userId);

      if (existing && existing.length > 0) {
        const myConvIds = existing.map((m) => m.conversation_id);
        const { data: shared } = await supabase
          .from('conversation_members')
          .select('conversation_id')
          .eq('user_id', otherId)
          .in('conversation_id', myConvIds);

        if (shared && shared.length > 0) {
          // Find which shared conv is a direct chat
          const { data: directConv } = await supabase
            .from('conversations')
            .select('*')
            .in('id', shared.map((s) => s.conversation_id))
            .eq('type', 'direct')
            .limit(1)
            .single();

          if (directConv) {
            res.json({ conversation: directConv, existed: true });
            return;
          }
        }
      }
    }

    // Create the conversation
    const { data: conv, error: convErr } = await supabase
      .from('conversations')
      .insert({ type, name: name ?? null, created_by: userId })
      .select()
      .single();

    if (convErr || !conv) throw new AppError(500, 'Failed to create conversation');

    // Add all members (creator included)
    const allMembers = [userId, ...member_ids].filter(
      (id, i, arr) => arr.indexOf(id) === i,
    );
    const memberRows = allMembers.map((uid) => ({
      conversation_id: conv.id,
      user_id: uid,
      role: uid === userId ? 'admin' : 'member',
    }));

    const { error: memErr } = await supabase
      .from('conversation_members')
      .insert(memberRows);

    if (memErr) throw new AppError(500, 'Failed to add members');

    res.status(201).json({ conversation: conv, existed: false });
  } catch (err) {
    next(err);
  }
});

// ─── GET /chat/conversations/:id/messages ────────────────────────────────────
router.get(
  '/conversations/:id/messages',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const convId = String(req.params.id);
      const limit  = Math.min(Number(req.query.limit ?? 50), 100);
      const before = req.query.before as string | undefined;

      // Verify user is a member
      const { data: membership } = await supabase
        .from('conversation_members')
        .select('id')
        .eq('conversation_id', convId)
        .eq('user_id', userId)
        .single();

      if (!membership) throw new AppError(403, 'Not a member of this conversation');

      const after = req.query.after as string | undefined;

      let query = supabase
        .from('messages')
        .select(`
          id, conversation_id, sender_id, content, type,
          media_url, status, created_at,
          sender:users!sender_id(id, name, avatar_url)
        `)
        .eq('conversation_id', convId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (before) query = query.lt('created_at', before);
      if (after)  query = query.gt('created_at', after);

      const { data: messages, error } = await query;
      if (error) throw new AppError(500, 'Failed to load messages');

      res.json({ messages: (messages ?? []).reverse() });
    } catch (err) {
      next(err);
    }
  },
);

// ─── POST /chat/conversations/:id/messages ───────────────────────────────────
router.post(
  '/conversations/:id/messages',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = sendMessageSchema.safeParse(req.body);
      if (!parsed.success) throw new AppError(400, parsed.error.issues[0].message);

      const userId = req.user!.userId;
      const convId = String(req.params.id);

      // Verify membership
      const { data: membership } = await supabase
        .from('conversation_members')
        .select('id')
        .eq('conversation_id', convId)
        .eq('user_id', userId)
        .single();

      if (!membership) throw new AppError(403, 'Not a member of this conversation');

      const { data: message, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: convId,
          sender_id:       userId,
          content:         parsed.data.content,
          type:            parsed.data.type,
          status:          'sent',
        })
        .select(`
          id, conversation_id, sender_id, content, type,
          media_url, status, created_at,
          sender:users!sender_id(id, name, avatar_url)
        `)
        .single();

      if (error || !message) throw new AppError(500, 'Failed to send message');

      res.status(201).json({ message });

      // ── Fire-and-forget FCM push to all other members ──────────────────────
      pushNewMessageNotification(convId, userId, message).catch(() => {});

    } catch (err) {
      next(err);
    }
  },
);

// ─── Push notification helper ─────────────────────────────────────────────────
async function pushNewMessageNotification(
  convId:  string,
  senderId: string,
  message: { id: string; content: string | null; created_at: string; type: string },
): Promise<void> {
  // Get conversation info (name for groups)
  const { data: conv } = await supabase
    .from('conversations')
    .select('type, name')
    .eq('id', convId)
    .single();

  // Get sender name
  const { data: sender } = await supabase
    .from('users')
    .select('name')
    .eq('id', senderId)
    .single();

  // Get all other members' FCM tokens
  const { data: members } = await supabase
    .from('conversation_members')
    .select('user_id')
    .eq('conversation_id', convId)
    .neq('user_id', senderId);

  const memberIds = (members ?? []).map((m) => m.user_id);
  if (memberIds.length === 0) return;

  const { data: memberUsers } = await supabase
    .from('users')
    .select('fcm_token')
    .in('id', memberIds)
    .not('fcm_token', 'is', null);

  const tokens = (memberUsers ?? [])
    .map((u: any) => u.fcm_token)
    .filter(Boolean) as string[];

  if (tokens.length === 0) return;

  const senderName       = sender?.name ?? 'Someone';
  const convTitle        = conv?.type === 'group' ? (conv.name ?? 'Group') : senderName;
  const contentPreview   = message.content
    ? (message.content.length > 100 ? `${message.content.slice(0, 97)}…` : message.content)
    : '📎 Attachment';

  const { sendPush } = await import('../services/fcm');
  await sendPush(tokens, {
    title: convTitle,
    body:  conv?.type === 'group' ? `${senderName}: ${contentPreview}` : contentPreview,
    data: {
      type:               'new_message',
      conversation_id:    convId,
      conversation_title: convTitle,
      message_id:         message.id,
      sender_id:          senderId,
      sender_name:        senderName,
      content:            message.content ?? '',
      created_at:         message.created_at,
      message_type:       message.type,
    },
  });
}

// ─── PATCH /chat/conversations/:id/read ──────────────────────────────────────
// Mark conversation as read (update last_read_at)
router.patch(
  '/conversations/:id/read',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const convId = req.params.id;

      const now = new Date().toISOString();

      await supabase
        .from('conversation_members')
        .update({ last_read_at: now })
        .eq('conversation_id', convId)
        .eq('user_id', userId);

      // Mark all unread messages in this conversation as read.
      // This triggers Realtime UPDATE events so the sender sees green ticks.
      await supabase
        .from('messages')
        .update({ status: 'read' })
        .eq('conversation_id', convId)
        .neq('sender_id', userId)
        .in('status', ['sent', 'delivered']);

      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  },
);

// ─── PATCH /chat/messages/:id/status ─────────────────────────────────────────
// Update message status to delivered or read
router.patch(
  '/messages/:id/status',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { status } = req.body as { status?: string };
      if (!status || !['delivered', 'read'].includes(status)) {
        throw new AppError(400, 'Status must be delivered or read');
      }

      const { error } = await supabase
        .from('messages')
        .update({ status })
        .eq('id', req.params.id);

      if (error) throw new AppError(500, 'Failed to update status');
      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
