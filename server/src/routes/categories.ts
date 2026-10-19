import { Router } from 'express'
import * as categories from '../controllers/categoryController.js'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { validateBody } from '../middleware/validate.js'
import { categorySchema, updateCategorySchema } from '../schemas/category.js'

export const categoriesRouter = Router()

categoriesRouter.use(requireAuth)

categoriesRouter.get('/', categories.list)
categoriesRouter.post('/', requireRole('ADMIN'), validateBody(categorySchema), categories.create)
categoriesRouter.patch(
  '/:id',
  requireRole('ADMIN'),
  validateBody(updateCategorySchema),
  categories.update,
)
categoriesRouter.delete('/:id', requireRole('ADMIN'), categories.remove)
