import { prisma } from '../src/db.js'

const categories = [
  { name: 'Connectivity', description: 'No internet, slow speed or frequent disconnects' },
  { name: 'Billing', description: 'Bills, payments, refunds and package charges' },
  { name: 'Hardware', description: 'Router, ONU, cables and other equipment' },
  { name: 'Account & Login', description: 'Customer portal access, password and account details' },
  { name: 'New Connection', description: 'New line requests, house shifting and package changes' },
  { name: 'General Inquiry', description: 'Questions that do not fit any other category' },
]

for (const category of categories) {
  await prisma.category.upsert({
    where: { name: category.name },
    update: { description: category.description },
    create: category,
  })
}

console.info(`Seeded ${categories.length} categories`)
await prisma.$disconnect()
