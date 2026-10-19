import { createInterface } from 'node:readline/promises'
import { parseArgs } from 'node:util'
import { prisma } from '../src/db.js'
import { clearDemoData } from './demoCleanup.js'

const { values } = parseArgs({ options: { yes: { type: 'boolean', default: false } } })

if (!values.yes) {
  const prompt = createInterface({ input: process.stdin, output: process.stdout })
  const answer = await prompt.question('Delete all demo users, tickets and related data? (y/N) ')
  prompt.close()
  if (answer.trim().toLowerCase() !== 'y') {
    console.info('Nothing deleted')
    await prisma.$disconnect()
    process.exit(0)
  }
}

const removed = await clearDemoData()
console.info('Removed demo rows:')
for (const [table, count] of Object.entries(removed)) {
  console.info(`  ${table.padEnd(18)} ${count}`)
}
await prisma.$disconnect()
