import { z } from 'zod'
import { AREAS } from '../lib/areas.js'

const email = z.email('Enter a valid email address').trim().toLowerCase()

export const registerSchema = z.object({
  name: z.string().trim().min(2, 'Name is too short').max(80, 'Name is too long'),
  email,
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(72, 'Password is too long')
    .regex(/[a-zA-Z]/, 'Password must contain a letter')
    .regex(/[0-9]/, 'Password must contain a number'),
  area: z.enum(AREAS, 'Choose your area'),
})

export const loginSchema = z.object({
  email,
  password: z.string().min(1, 'Enter your password'),
})

export type RegisterInput = z.infer<typeof registerSchema>
export type LoginInput = z.infer<typeof loginSchema>
