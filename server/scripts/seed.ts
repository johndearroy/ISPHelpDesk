import { prisma } from '../src/db.js'
import { DEFAULT_CATEGORIES } from '../src/lib/categories.js'

for (const category of DEFAULT_CATEGORIES) {
  await prisma.category.upsert({
    where: { name: category.name },
    update: { description: category.description },
    create: category,
  })
}

console.info(`Seeded ${DEFAULT_CATEGORIES.length} categories`)
await prisma.$disconnect()
