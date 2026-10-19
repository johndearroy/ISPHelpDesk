import { z } from 'zod'
import { IncidentStatus } from '../generated/prisma/client.js'
import { AREAS } from '../lib/areas.js'

const ticketIds = z
  .array(z.number().int().positive())
  .min(1, 'Select at least one ticket')
  .max(200, 'Too many tickets')

export const createIncidentSchema = z.object({
  area: z.enum(AREAS, 'Choose an area'),
  ticketIds,
  title: z.string().trim().min(5, 'Title is too short').max(120, 'Title is too long').optional(),
})

export const linkTicketsSchema = z.object({ ticketIds })

export const resolveIncidentSchema = z.object({
  resolutionNote: z
    .string()
    .trim()
    .min(5, 'Describe how the outage was fixed')
    .max(2000, 'Resolution note is too long'),
})

export const incidentQuerySchema = z.object({
  status: z.enum(IncidentStatus).optional(),
})

export type CreateIncidentInput = z.infer<typeof createIncidentSchema>
