import { z } from 'zod'
import { Priority } from '../generated/prisma/client.js'

export const deflectionSchema = z.object({
  matchedTicketId: z.number().int().positive(),
})

export const reviewAnalysisSchema = z.object({
  categoryId: z.number().int().positive('Choose a category'),
  priority: z.enum(Priority, 'Choose a priority'),
})

export const rateDraftSchema = z.object({
  rating: z.union([z.literal(1), z.literal(-1)], 'Rating must be 1 or -1'),
})

export const usageQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(90).default(30),
})
