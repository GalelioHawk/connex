import { z } from 'zod';

export const createConversationSchema = z.object({
  type:       z.enum(['direct', 'group']),
  name:       z.string().min(1).max(100).trim().optional(),
  member_ids: z.array(z.string().uuid()).min(1, 'At least one member is required'),
});

export const sendMessageSchema = z.object({
  content: z.string().min(1, 'Message cannot be empty').max(4000),
  type:    z.enum(['text', 'image', 'video', 'audio']).default('text'),
});

export const markReadSchema = z.object({
  last_read_at: z.string().datetime().optional(),
});

export type CreateConversationInput = z.infer<typeof createConversationSchema>;
export type SendMessageInput        = z.infer<typeof sendMessageSchema>;
