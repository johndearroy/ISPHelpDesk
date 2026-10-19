import { describe, expect, it } from 'vitest'
import { extractJson } from '../src/ai/json.js'
import { keywordTriage } from '../src/ai/local/keywordTriage.js'
import { detectLanguage } from '../src/ai/local/text.js'
import { maskPii } from '../src/ai/mask.js'
import { applySafetyRules } from '../src/ai/priorityRules.js'

const categories = [
  'Connectivity',
  'Billing',
  'Hardware',
  'Account & Login',
  'New Connection',
  'General Inquiry',
]

describe('pii masking', () => {
  it('masks emails and phone numbers', () => {
    const text = 'Call me at 01712345678 or +880 1812-345678, email karim.h@gmail.com'
    expect(maskPii(text)).toBe('Call me at [phone] or [phone], email [email]')
  })

  it('keeps normal numbers such as amounts and speeds', () => {
    expect(maskPii('Paid 1200 taka for the 20 mbps package')).toBe(
      'Paid 1200 taka for the 20 mbps package',
    )
  })
})

describe('priority safety rules', () => {
  it('raises priority for critical phrases', () => {
    expect(applySafetyRules('The whole office has no internet', 'MEDIUM')).toMatchObject({
      priority: 'URGENT',
      raised: true,
    })
    expect(applySafetyRules('net nai 2 din dhore', 'LOW')).toMatchObject({
      priority: 'HIGH',
      raised: true,
    })
  })

  it('never lowers priority', () => {
    expect(applySafetyRules('Just a question about packages', 'URGENT')).toMatchObject({
      priority: 'URGENT',
      raised: false,
    })
  })

  it('matches whole phrases only', () => {
    expect(applySafetyRules('Firewall settings question', 'LOW').raised).toBe(false)
  })
})

describe('local keyword triage', () => {
  it('classifies english tickets', () => {
    const result = keywordTriage(
      { title: 'Charged twice this month', description: 'My bkash payment was taken two times.' },
      categories,
    )
    expect(result).toMatchObject({ category: 'Billing', language: 'ENGLISH' })
  })

  it('classifies banglish tickets', () => {
    const result = keywordTriage(
      { title: 'Net nai', description: 'Amar net kaj korche na, router e lal light jolche' },
      categories,
    )
    expect(result.language).toBe('BANGLISH')
    expect(['Connectivity', 'Hardware']).toContain(result.category)
  })

  it('classifies bangla script tickets', () => {
    const result = keywordTriage(
      { title: 'বিল সমস্যা', description: 'আমার বিকাশ থেকে দুইবার টাকা কেটেছে' },
      categories,
    )
    expect(result).toMatchObject({ category: 'Billing', language: 'BANGLA' })
  })

  it('prefers new connection over connectivity for new line requests', () => {
    const result = keywordTriage(
      { title: 'Need a new connection', description: 'I want a new connection at my shop' },
      categories,
    )
    expect(result.category).toBe('New Connection')
  })

  it('falls back to general inquiry and detects frustration', () => {
    const result = keywordTriage(
      { title: 'Hello', description: 'This is the WORST SERVICE ever!!!' },
      categories,
    )
    expect(result).toMatchObject({ category: 'General Inquiry', sentiment: 'FRUSTRATED' })
  })
})

describe('language detection', () => {
  it('detects english, banglish and bangla', () => {
    expect(detectLanguage('My internet is slow')).toBe('ENGLISH')
    expect(detectLanguage('amar net onek slow hocche')).toBe('BANGLISH')
    expect(detectLanguage('আমার নেট স্লো')).toBe('BANGLA')
  })
})

describe('json extraction', () => {
  it('reads json wrapped in text or code fences', () => {
    expect(extractJson('Here you go:\n```json\n{"a":1}\n```')).toEqual({ a: 1 })
    expect(() => extractJson('no json here')).toThrow()
  })
})
