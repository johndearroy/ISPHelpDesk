import bcrypt from 'bcrypt'
import { parseArgs } from 'node:util'
import { config } from '../src/config.js'
import { prisma } from '../src/db.js'
import { AREAS } from '../src/lib/areas.js'
import { getSuggestions } from '../src/services/incidentService.js'
import { createTicket } from '../src/services/ticketService.js'
import { analyzeTicket } from '../src/services/triageService.js'
import { DEMO_PASSWORD, outageReports } from './demoData.js'

const { values } = parseArgs({
  options: {
    area: { type: 'string', default: 'Mirpur' },
    count: { type: 'string' },
  },
})

const area = AREAS.find((name) => name.toLowerCase() === values.area.toLowerCase())
if (!area) {
  console.error(`Unknown area "${values.area}". Use one of: ${AREAS.join(', ')}`)
  process.exit(1)
}
const count = Number(values.count ?? config.OUTAGE_MIN_TICKETS)

// the detector needs different customers, so add demo residents when the area has too few
const customers = await prisma.user.findMany({
  where: { isDemo: true, role: 'CUSTOMER', area },
  orderBy: { id: 'asc' },
})
const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10)
while (customers.length < count) {
  const number = customers.length + 1
  customers.push(
    await prisma.user.create({
      data: {
        name: `${area} Resident ${number}`,
        email: `${area.toLowerCase()}.resident${number}@demo.local`,
        passwordHash,
        role: 'CUSTOMER',
        area,
        isDemo: true,
      },
    }),
  )
}

console.info(`Creating ${count} connection complaints in ${area}...`)
for (let i = 0; i < count; i++) {
  const customer = customers[i]
  const [title, description] = outageReports[i % outageReports.length]
  const ticket = await createTicket(customer, { title, description })
  await prisma.ticket.update({ where: { id: ticket.id }, data: { isDemo: true } })
  await prisma.ticketEvent.updateMany({ where: { ticketId: ticket.id }, data: { isDemo: true } })
  await prisma.ticketAnalysis.update({ where: { ticketId: ticket.id }, data: { isDemo: true } })
  await analyzeTicket(ticket.id)
  console.info(`  #${ticket.id} from ${customer.name}`)
}

const suggestion = (await getSuggestions()).find((item) => item.area === area)
if (suggestion) {
  console.info(
    `Outage suggestion ready: ${suggestion.customerCount} customers in ${area}. Open the Incidents page as admin.`,
  )
} else {
  console.info('No suggestion yet. Check that the tickets were categorized as Connectivity.')
}
await prisma.$disconnect()
