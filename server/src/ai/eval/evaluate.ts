import { readFile } from 'node:fs/promises'
import type { Priority } from '../../generated/prisma/client.js'
import { DEFAULT_CATEGORIES } from '../../lib/categories.js'
import { extractJson } from '../json.js'
import { keywordTriage } from '../local/keywordTriage.js'
import { maskPii } from '../mask.js'
import { type AiProvider, ProviderError } from '../openrouter.js'
import { detectOutages, type OutageCandidate } from '../outage.js'
import { applySafetyRules } from '../priorityRules.js'
import { buildTriageMessages, triageSchema } from '../prompts/triage.js'
import {
  accuracy,
  confusionMatrix,
  macroF1,
  perClass,
  percentile,
  round,
  underTriageRate,
} from './metrics.js'

export type Example = {
  title: string
  description: string
  category: string
  priority: Priority
  language: string
}

type Prediction = { category: string; priority: string; language: string }

export type Predictor = (example: Example) => Promise<Prediction | null>

export const CATEGORY_NAMES = DEFAULT_CATEGORIES.map((category) => category.name)
const LANGUAGES = ['ENGLISH', 'BANGLISH', 'BANGLA']

export async function loadDataset() {
  const file = new URL('./dataset.json', import.meta.url)
  return JSON.parse(await readFile(file, 'utf8')) as Example[]
}

export function majorityPredictor(examples: Example[]): Predictor {
  const mostCommon = (values: string[]) =>
    [...new Set(values)].sort(
      (a, b) => values.filter((v) => v === b).length - values.filter((v) => v === a).length,
    )[0]
  const guess = {
    category: mostCommon(examples.map((example) => example.category)),
    priority: mostCommon(examples.map((example) => example.priority)),
    language: 'ENGLISH',
  }
  return async () => guess
}

export const localPredictor: Predictor = async (example) => {
  const result = keywordTriage(example, CATEGORY_NAMES)
  const safety = applySafetyRules(`${example.title} ${example.description}`, result.priority)
  return { category: result.category, priority: safety.priority, language: result.language }
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

// same prompt, schema and safety rules as production, but one model at a time and no fallback
export function modelPredictor(provider: AiProvider, model: string, delayMs: number): Predictor {
  const schema = triageSchema(CATEGORY_NAMES)

  return async (example) => {
    const messages = buildTriageMessages(DEFAULT_CATEGORIES, {
      title: maskPii(example.title),
      description: maskPii(example.description),
    })

    for (let attempt = 1; attempt <= 3; attempt++) {
      await wait(delayMs)
      try {
        const completion = await provider.complete(model, {
          messages,
          temperature: 0,
          maxTokens: 300,
        })
        const answer = schema.parse(extractJson(completion.text))
        const safety = applySafetyRules(`${example.title} ${example.description}`, answer.priority)
        return { category: answer.category, priority: safety.priority, language: answer.language }
      } catch (error) {
        if (error instanceof ProviderError && error.code === 'rate_limited' && attempt < 3) {
          await wait(error.retryAfterMs ?? 20_000)
          continue
        }
        return null
      }
    }
    return null
  }
}

export async function evaluate(name: string, examples: Example[], predict: Predictor) {
  const predictions: (Prediction | null)[] = []
  const latencies: number[] = []

  for (const example of examples) {
    const startedAt = Date.now()
    predictions.push(await predict(example))
    latencies.push(Date.now() - startedAt)
  }

  // a failed or invalid answer counts as wrong, the app would fall back in that case
  const answered = (key: keyof Prediction) =>
    predictions.map((prediction) => prediction?.[key] ?? '-')
  const expectedCategories = examples.map((example) => example.category)
  const predictedCategories = answered('category')

  const byLanguage = Object.fromEntries(
    LANGUAGES.map((language) => {
      const indexes = examples.flatMap((example, i) => (example.language === language ? [i] : []))
      return [
        language,
        round(
          accuracy(
            indexes.map((i) => expectedCategories[i]),
            indexes.map((i) => predictedCategories[i]),
          ),
        ),
      ]
    }),
  )

  return {
    name,
    total: examples.length,
    failed: predictions.filter((prediction) => prediction === null).length,
    validRate: round(predictions.filter(Boolean).length / examples.length),
    category: {
      accuracy: round(accuracy(expectedCategories, predictedCategories)),
      macroF1: round(macroF1(expectedCategories, predictedCategories, CATEGORY_NAMES)),
      perClass: perClass(expectedCategories, predictedCategories, CATEGORY_NAMES).map((row) => ({
        ...row,
        precision: round(row.precision),
        recall: round(row.recall),
        f1: round(row.f1),
      })),
      confusion: {
        labels: CATEGORY_NAMES,
        matrix: confusionMatrix(expectedCategories, predictedCategories, CATEGORY_NAMES),
      },
      byLanguage,
    },
    priority: {
      accuracy: round(
        accuracy(
          examples.map((example) => example.priority),
          answered('priority'),
        ),
      ),
      underTriageRate: round(
        underTriageRate(
          examples.map((example) => example.priority),
          answered('priority'),
        ),
      ),
    },
    language: {
      accuracy: round(
        accuracy(
          examples.map((example) => example.language),
          answered('language'),
        ),
      ),
    },
    latencyMs: {
      average: Math.round(latencies.reduce((sum, value) => sum + value, 0) / latencies.length),
      p95: percentile(latencies, 95),
    },
  }
}

export type EvaluationResult = Awaited<ReturnType<typeof evaluate>>

const OUTAGE_TEXTS = [
  'No internet since a few minutes, connection completely down',
  'Internet stopped suddenly, nothing loads',
  'Net nai hotat kore, connection off',
  'Lost internet connection just now, router lights normal',
  'Internet down in our building, no connection',
  'Connection gone, cannot open any website',
]

const UNRELATED_TEXTS = [
  'Speed is slow at night when streaming',
  'Ping is high when playing games',
  'Wifi range does not reach my bedroom',
  'Video calls freeze sometimes in the evening',
  'Upload speed is lower than my package',
  'Some websites open slowly',
]

// simulated bursts with a known answer, checks precision and recall of the outage detector
export function evaluateOutageDetection(minCustomers = 5, scenarios = 40) {
  let seed = 7
  const random = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296
    return seed / 4294967296
  }
  const pick = <T>(items: T[]) => items[Math.floor(random() * items.length)]

  let truePositive = 0
  let falsePositive = 0
  let falseNegative = 0
  let trueNegative = 0

  for (let i = 0; i < scenarios; i++) {
    const kind = i % 4
    const tickets: OutageCandidate[] = []
    const add = (customer: number, text: string) =>
      tickets.push({
        id: tickets.length + 1,
        area: 'Mirpur',
        createdById: customer,
        createdAt: new Date(),
        text,
      })

    if (kind === 0 || kind === 1) {
      const customers = minCustomers + Math.floor(random() * 4)
      for (let c = 1; c <= customers; c++) add(c, pick(OUTAGE_TEXTS))
    } else if (kind === 2) {
      // many tickets but only from two customers
      for (let t = 0; t < minCustomers + 2; t++) add((t % 2) + 1, pick(OUTAGE_TEXTS))
    } else {
      // enough customers, but each with a different everyday problem
      const texts = [...UNRELATED_TEXTS].sort(() => random() - 0.5)
      for (let c = 1; c <= minCustomers + 1; c++) add(c, texts[(c - 1) % texts.length])
    }

    const isOutage = kind === 0 || kind === 1
    const detected = detectOutages(tickets, { minCustomers }).length > 0
    if (isOutage && detected) truePositive += 1
    if (!isOutage && detected) falsePositive += 1
    if (isOutage && !detected) falseNegative += 1
    if (!isOutage && !detected) trueNegative += 1
  }

  return {
    scenarios,
    truePositive,
    falsePositive,
    falseNegative,
    trueNegative,
    precision: round(truePositive / Math.max(1, truePositive + falsePositive)),
    recall: round(truePositive / Math.max(1, truePositive + falseNegative)),
  }
}
