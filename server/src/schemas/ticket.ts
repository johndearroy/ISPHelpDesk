import { z } from 'zod'
import { Priority, TicketStatus } from '../generated/prisma/client.js'
import { AREAS } from '../lib/areas.js'

const title = z
  .string()
  .trim()
  .min(5, 'Title must be at least 5 characters')
  .max(150, 'Title is too long')
const description = z
  .string()
  .trim()
  .min(10, 'Please describe the problem in a bit more detail')
  .max(5000, 'Description is too long')

export const createTicketSchema = z.object({ title, description })

export const updateTicketSchema = z
  .object({
    title: title.optional(),
    description: description.optional(),
    priority: z.enum(Priority).optional(),
    categoryId: z.number().int().positive().nullable().optional(),
  })
  .refine((data) => Object.values(data).some((value) => value !== undefined), {
    message: 'Nothing to update',
  })

export const changeStatusSchema = z.object({
  status: z.enum(TicketStatus),
  note: z.string().trim().max(1000).optional(),
  resolutionNote: z
    .string()
    .trim()
    .min(5, 'Resolution note is too short')
    .max(2000, 'Resolution note is too long')
    .optional(),
})

export const assignTicketSchema = z.object({
  assigneeId: z.number().int().positive().nullable(),
})

export const commentSchema = z.object({
  body: z.string().trim().min(1, 'Write a comment first').max(5000, 'Comment is too long'),
  replyDraftId: z.number().int().positive().optional(),
})

export const ticketQuerySchema = z.object({
  status: z.enum(TicketStatus).optional(),
  priority: z.enum(Priority).optional(),
  categoryId: z.coerce.number().int().positive().optional(),
  area: z.enum(AREAS).optional(),
  search: z.string().trim().max(100).optional(),
  overdue: z
    .enum(['true', 'false'])
    .transform((value) => value === 'true')
    .optional(),
  assigned: z.enum(['me', 'unassigned']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(10),
})

export type CreateTicketInput = z.infer<typeof createTicketSchema>
export type UpdateTicketInput = z.infer<typeof updateTicketSchema>
export type ChangeStatusInput = z.infer<typeof changeStatusSchema>
export type TicketQuery = z.infer<typeof ticketQuerySchema>
export type CommentInput = z.infer<typeof commentSchema>
