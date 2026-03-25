import { z } from 'zod';

export const addSosContactSchema = z.object({
  contact_id: z.string().uuid('Invalid contact ID'),
});

export const respondSosContactSchema = z.object({
  status: z.enum(['accepted', 'rejected']),
});

export type AddSosContactInput     = z.infer<typeof addSosContactSchema>;
export type RespondSosContactInput = z.infer<typeof respondSosContactSchema>;
