import { firstSentence } from './text.js'

export function templateReply(input: {
  customerName: string
  agentName: string
  similarNote?: string | null
}) {
  const firstName = input.customerName.split(' ')[0]
  const lines = [`Hi ${firstName},`, '', 'Thank you for reaching out and sorry for the trouble.']
  if (input.similarNote) {
    lines.push(`In a similar case the problem was solved like this: ${input.similarNote}`)
  }
  lines.push(
    'We are looking into your ticket and will update you here as soon as we have more information.',
    '',
    'Regards,',
    input.agentName,
  )
  return lines.join('\n')
}

export function extractiveSummary(input: {
  description: string
  status: string
  comments: { body: string; authorName: string; isStaff: boolean }[]
}) {
  const staffComments = input.comments.filter((comment) => comment.isStaff)
  const last = input.comments.at(-1)

  return {
    issue: firstSentence(input.description, 200),
    tried: staffComments.length
      ? staffComments
          .slice(-2)
          .map((comment) => firstSentence(comment.body, 100))
          .join(' ')
      : 'Nothing recorded yet.',
    currentState: `Ticket is ${input.status.replace('_', ' ').toLowerCase()}${
      last ? `, last reply from ${last.authorName}` : ''
    }.`,
    nextStep:
      last && !last.isStaff ? 'Reply to the customer.' : 'Wait for the customer to respond.',
  }
}
