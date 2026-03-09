import { z } from 'zod';

export const registerSchema = z.object({
  phone: z
    .string()
    .regex(/^\+27[6-8][0-9]{8}$/, 'Phone must be a valid South African number (e.g. +27821234567)'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(72, 'Password too long'),
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name too long')
    .trim(),
});

export const loginSchema = z.object({
  phone: z.string().min(1, 'Phone is required'),
  password: z.string().min(1, 'Password is required'),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput   = z.infer<typeof loginSchema>;
