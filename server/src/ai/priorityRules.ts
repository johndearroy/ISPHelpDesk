import type { Priority } from '../generated/prisma/client.js'
import { maxPriority } from '../lib/ticketRules.js'
import { normalize } from './local/text.js'

const URGENT_PHRASES = [
  'whole office',
  'entire office',
  'whole building',
  'whole area',
  'all users',
  'all our users',
  'everyone in',
  'business is stopped',
  'business stopped',
  'money deducted',
  'taka kete',
  'taka katse',
  'deducted but',
  'fire',
  'spark',
  'smoke',
  'short circuit',
  'puro area',
  'sobar net',
  'পুরো এলাকা',
  'টাকা কেটে',
]

const HIGH_PHRASES = [
  'no internet',
  'internet down',
  'net nai',
  'net nei',
  'internet nai',
  'not working',
  'kaj korche na',
  'kaj kore na',
  'charged twice',
  'double charge',
  'double kete',
  'since yesterday',
  'two days',
  '2 days',
  '2 din',
  'three days',
  '3 days',
  '3 din',
  'third time',
  '3rd time',
  'নেট নেই',
  'ইন্টারনেট নেই',
]

export function findPhrases(text: string, phrases: string[]) {
  const normalized = ` ${normalize(text)} `
  return phrases.filter((phrase) => normalized.includes(` ${normalize(phrase)} `))
}

// rules can only raise the priority: missing an urgent ticket costs far more than over-prioritizing
export function applySafetyRules(text: string, priority: Priority) {
  const urgent = findPhrases(text, URGENT_PHRASES)
  const high = findPhrases(text, HIGH_PHRASES)
  const rulePriority: Priority = urgent.length ? 'URGENT' : high.length ? 'HIGH' : 'LOW'
  const finalPriority = maxPriority(priority, rulePriority)

  return {
    priority: finalPriority,
    raised: finalPriority !== priority,
    matched: urgent.length ? urgent : high,
  }
}
