import type { Language } from '../../generated/prisma/client.js'

export function wordList(list: string) {
  return list.trim().split(/\s+/)
}

const STOPWORDS = new Set(
  wordList(`
    a an the is are was were be been am i my me we our you your it its this that these those
    to of in on at for from with and or but so if then there here have has had do does did
    can could will would should please pls plz hi hello dear sir team also just very about
    as by up out ami amar amader apni apnar apnara apnader ar ki ta te e o ei oi je ja jodi
    tahole kintu ekta vai bhai vaiya ভাই আমার আমি আপনার আপনি এই ও এবং কিন্তু থেকে করে হয়
  `),
)

// common banglish words that do not appear in english text
const BANGLISH_MARKERS = new Set(
  wordList(`
    nai nei ase ache kaj kore korche korse korsi korchi hocche hoche hoy hoyni hoina na amar
    apnara apnader vai bhai kintu theke dhore dorkar lagbe chai koto ekhon kalke aj ajke
    kichu keno kobe bar barbar kete katse nise dise dichi disi bolen janan jante pacchi
    pachi parchi parsi ashe jay jacche cholche chole bondho thik shudhu sob sobar onek khub
    abar ekdom
  `),
)

export function normalize(text: string) {
  return text
    .toLowerCase()
    .replace(/(.)\1{2,}/g, '$1$1')
    .replace(/[^\p{L}\p{M}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function tokenize(text: string) {
  return normalize(text)
    .split(' ')
    .filter((token) => token.length > 1 && !STOPWORDS.has(token))
}

export function detectLanguage(text: string): Language {
  if (/[ঀ-৿]/.test(text)) return 'BANGLA'
  const words = normalize(text).split(' ')
  const markers = words.filter((word) => BANGLISH_MARKERS.has(word)).length
  return markers >= 2 ? 'BANGLISH' : 'ENGLISH'
}

export function firstSentence(text: string, maxLength = 140) {
  const sentence = text.trim().split(/(?<=[.!?।])\s/)[0] ?? text
  return sentence.length > maxLength ? `${sentence.slice(0, maxLength - 3).trim()}...` : sentence
}
