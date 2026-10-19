import type { Priority, Sentiment } from '../../generated/prisma/client.js'
import { findPhrases } from '../priorityRules.js'
import { detectLanguage, firstSentence, normalize, wordList } from './text.js'

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  Connectivity: wordList(`
    internet net connection connected disconnect disconnected disconnecting slow speed mbps
    wifi ping lag latency offline down buffering browsing loading packet signal unstable
    youtube facebook drop drops dropping নেট ইন্টারনেট সংযোগ স্লো লাইন
  `),
  Billing: wordList(`
    bill billing payment paid pay charge charged refund invoice bkash nagad rocket taka tk
    money due recharge receipt kete katse overcharged discount টাকা বিল পেমেন্ট বিকাশ রিফান্ড
  `),
  Hardware: wordList(`
    router onu cable wire adapter power light lights los fiber fibre device tplink modem
    antenna port burnt broken damaged reset রাউটার তার লাইট পাওয়ার
  `),
  'Account & Login': wordList(`
    login log password account portal otp username user id locked signin email app
    অ্যাকাউন্ট পাসওয়ার্ড লগইন
  `),
  'New Connection': wordList(`
    new install installation shift shifting upgrade package plan setup notun basa bashay
    নতুন শিফট প্যাকেজ
  `),
  'General Inquiry': wordList(`
    question info information hours office price list jante janate know ask asking
    জানতে প্রশ্ন
  `),
}

// phrases count double so "new connection" beats the single word "connection"
const CATEGORY_PHRASES: Record<string, string[]> = {
  'New Connection': [
    'new connection',
    'new line',
    'notun line',
    'notun connection',
    'house shift',
    'line shift',
    'change package',
  ],
  'Account & Login': ['log in', 'sign in', 'forgot password'],
  Billing: ['double charge', 'charged twice', 'taka kete'],
}

const LOW_PRIORITY_WORDS = wordList(`
  question info information jante janate know price list hours suggestion feedback thanks
`)

const FRUSTRATION_PHRASES = [
  'worst',
  'terrible',
  'fed up',
  'third time',
  '3rd time',
  'again and again',
  'bar bar',
  'barbar',
  'ar koto',
  'useless',
  'disgusting',
  'very bad service',
  'still not',
  'ekhono',
]

const NEGATIVE_WORDS = wordList(`
  bad problem issue not cannot cant unable failed fail error slow poor kharap somossa
`)

const POSITIVE_WORDS = wordList(`thanks thank great good dhonnobad appreciate`)

export type LocalTriage = {
  category: string
  priority: Priority
  sentiment: Sentiment
  language: ReturnType<typeof detectLanguage>
  summary: string
  reason: string
}

function detectSentiment(text: string, words: string[]): Sentiment {
  const shouting = (text.match(/\b[A-Z]{4,}\b/g) ?? []).length >= 2 || /!{3,}/.test(text)
  if (shouting || findPhrases(text, FRUSTRATION_PHRASES).length) return 'FRUSTRATED'
  if (words.some((word) => NEGATIVE_WORDS.includes(word))) return 'NEGATIVE'
  if (words.some((word) => POSITIVE_WORDS.includes(word))) return 'POSITIVE'
  return 'NEUTRAL'
}

export function keywordTriage(
  input: { title: string; description: string },
  categories: string[],
): LocalTriage {
  const text = `${input.title}. ${input.description}`
  const words = normalize(text).split(' ')

  let best = { category: '', score: 0, matches: [] as string[] }
  for (const category of categories) {
    const keywords = CATEGORY_KEYWORDS[category] ?? []
    const matches = [...new Set(words.filter((word) => keywords.includes(word)))]
    const phrases = findPhrases(text, CATEGORY_PHRASES[category] ?? [])
    const score = matches.length + phrases.length * 2
    if (score > best.score) {
      best = { category, score, matches: [...phrases, ...matches] }
    }
  }

  const fallbackCategory = categories.includes('General Inquiry')
    ? 'General Inquiry'
    : categories[0]
  const category = best.category || fallbackCategory
  const priority: Priority = words.some((word) => LOW_PRIORITY_WORDS.includes(word))
    ? 'LOW'
    : 'MEDIUM'

  return {
    category,
    priority,
    sentiment: detectSentiment(text, words),
    language: detectLanguage(text),
    summary: firstSentence(input.title),
    reason: best.matches.length
      ? `Keyword match: ${best.matches.slice(0, 5).join(', ')}`
      : 'No strong keywords found',
  }
}
