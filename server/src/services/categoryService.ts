import { prisma } from '../db.js'
import type { CategoryInput } from '../schemas/category.js'

export function listCategories() {
  return prisma.category.findMany({
    orderBy: { name: 'asc' },
    include: { _count: { select: { tickets: true } } },
  })
}

export function createCategory(input: CategoryInput) {
  return prisma.category.create({ data: input })
}

export function updateCategory(id: number, input: Partial<CategoryInput>) {
  return prisma.category.update({ where: { id }, data: input })
}

export async function deleteCategory(id: number) {
  await prisma.category.delete({ where: { id } })
}
