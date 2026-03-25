import { Router, Request, Response, NextFunction } from 'express';
import { supabase } from '../services/supabase';
import { requireAuth } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { addSosContactSchema, respondSosContactSchema } from '../validators/sos';

const router = Router();

router.use(requireAuth);

// ─── GET /sos/contacts ────────────────────────────────────────────────────────
// List all SOS contacts for the current user
router.get('/contacts', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;

    const { data, error } = await supabase
      .from('sos_contacts')
      .select(`
        id, status, created_at,
        contact:users!contact_id(id, name, phone, avatar_url)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw new AppError(500, 'Failed to load SOS contacts');

    // Also get pending requests FROM others TO this user
    const { data: incoming } = await supabase
      .from('sos_contacts')
      .select(`
        id, status, created_at,
        requester:users!user_id(id, name, phone, avatar_url)
      `)
      .eq('contact_id', userId)
      .eq('status', 'pending');

    res.json({
      contacts: data ?? [],
      incoming_requests: incoming ?? [],
    });
  } catch (err) {
    next(err);
  }
});

// ─── POST /sos/contacts ───────────────────────────────────────────────────────
// Send an SOS contact request to another user
router.post('/contacts', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = addSosContactSchema.safeParse(req.body);
    if (!parsed.success) throw new AppError(400, parsed.error.issues[0].message);

    const userId    = req.user!.userId;
    const contactId = parsed.data.contact_id;

    if (userId === contactId) throw new AppError(400, 'You cannot add yourself as an SOS contact');

    // Check target user exists
    const { data: targetUser } = await supabase
      .from('users')
      .select('id, name')
      .eq('id', contactId)
      .single();

    if (!targetUser) throw new AppError(404, 'User not found');

    // Check not already added
    const { data: existing } = await supabase
      .from('sos_contacts')
      .select('id, status')
      .eq('user_id', userId)
      .eq('contact_id', contactId)
      .maybeSingle();

    if (existing) {
      throw new AppError(409, `Already ${existing.status === 'accepted' ? 'an SOS contact' : 'a pending request'}`);
    }

    const { data: newContact, error } = await supabase
      .from('sos_contacts')
      .insert({ user_id: userId, contact_id: contactId, status: 'pending' })
      .select()
      .single();

    if (error || !newContact) throw new AppError(500, 'Failed to send request');

    res.status(201).json({ contact: newContact });
  } catch (err) {
    next(err);
  }
});

// ─── PATCH /sos/contacts/:id ──────────────────────────────────────────────────
// Accept or reject an incoming SOS contact request
router.patch('/contacts/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = respondSosContactSchema.safeParse(req.body);
    if (!parsed.success) throw new AppError(400, parsed.error.issues[0].message);

    const userId = req.user!.userId;

    // Only the recipient (contact_id) can accept/reject
    const { data: record } = await supabase
      .from('sos_contacts')
      .select('id, status')
      .eq('id', req.params.id)
      .eq('contact_id', userId)
      .single();

    if (!record) throw new AppError(404, 'Request not found');
    if (record.status !== 'pending') throw new AppError(400, 'Request already responded to');

    const { data: updated, error } = await supabase
      .from('sos_contacts')
      .update({ status: parsed.data.status })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw new AppError(500, 'Failed to update request');

    res.json({ contact: updated });
  } catch (err) {
    next(err);
  }
});

// ─── DELETE /sos/contacts/:id ─────────────────────────────────────────────────
// Remove an SOS contact
router.delete('/contacts/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;

    const { error } = await supabase
      .from('sos_contacts')
      .delete()
      .eq('id', req.params.id)
      .or(`user_id.eq.${userId},contact_id.eq.${userId}`);

    if (error) throw new AppError(500, 'Failed to remove contact');
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// ─── POST /sos/trigger ────────────────────────────────────────────────────────
// Fire SOS — notifies all accepted contacts via FCM
router.post('/trigger', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;

    // Get user info
    const { data: user } = await supabase
      .from('users')
      .select('id, name, phone')
      .eq('id', userId)
      .single();

    if (!user) throw new AppError(404, 'User not found');

    // Get all accepted SOS contacts
    const { data: contacts } = await supabase
      .from('sos_contacts')
      .select('contact_id')
      .eq('user_id', userId)
      .eq('status', 'accepted');

    const contactIds = (contacts ?? []).map((c) => c.contact_id);

    // Log the SOS event
    const { data: sosEvent } = await supabase
      .from('sos_events')
      .insert({ user_id: userId, status: 'active' })
      .select()
      .single();

    // Get FCM tokens for all accepted contacts
    if (contactIds.length > 0) {
      const { data: contactUsers } = await supabase
        .from('users')
        .select('id, fcm_token')
        .in('id', contactIds)
        .not('fcm_token', 'is', null);

      const tokens = (contactUsers ?? [])
        .map((u) => u.fcm_token)
        .filter(Boolean) as string[];

      if (tokens.length > 0) {
        try {
          const { sendPush } = await import('../services/fcm');
          await sendPush(tokens, {
            title: `🆘 SOS from ${user.name}`,
            body:  `${user.name} needs help! Tap to respond.`,
            data:  {
              type:      'sos',
              userId:    userId,
              userName:  user.name,
              userPhone: user.phone,
              eventId:   sosEvent?.id ?? '',
            },
          });
        } catch {
          // FCM failure is non-fatal — event is still logged
        }
      }
    }

    res.json({
      ok:             true,
      event_id:       sosEvent?.id ?? null,
      notified_count: contactIds.length,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
