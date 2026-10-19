import { z } from 'zod'

export const categorySchema = z.object({
  name: z.string().trim().min(2, 'Name is too short').max(50, 'Name is too long'),
  description: z.string().trim().max(200, 'Description is too long').optional(),
})

export const updateCategorySchema = categorySchema.partial()

export type CategoryInput = z.infer<typeof categorySchema>
