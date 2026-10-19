import { mkdir, writeFile } from 'node:fs/promises'
import { parseArgs } from 'node:util'
import { config } from '../../config.js'
import { createOpenRouterProvider } from '../openrouter.js'
import {
  type EvaluationResult,
  evaluate,
  evaluateOutageDetection,
  loadDataset,
  localPredictor,
  majorityPredictor,
  modelPredictor,
} from './evaluate.js'

const { values } = parseArgs({
  options: {
    models: { type: 'string' },
    limit: { type: 'string' },
    delay: { type: 'string', default: '3000' },
    'skip-models': { type: 'boolean', default: false },
  },
})

const dataset = await loadDataset()
const examples = values.limit ? dataset.slice(0, Number(values.limit)) : dataset
const models = values.models
  ? values.models.split(',').map((model) => model.trim())
  : config.OPENROUTER_MODELS

const results: EvaluationResult[] = []
results.push(await evaluate('Majority baseline', examples, majorityPredictor(examples)))
results.push(await evaluate('Local keyword fallback', examples, localPredictor))

if (values['skip-models']) {
  console.info('Skipping model runs')
} else if (!config.OPENROUTER_API_KEY || !models.length) {
  console.info('No OPENROUTER_API_KEY or models configured, only the baselines were evaluated')
} else {
  for (const model of models) {
    console.info(
      `Evaluating ${model} on ${examples.length} tickets, this can take a few minutes...`,
    )
    const provider = createOpenRouterProvider({
      apiKey: config.OPENROUTER_API_KEY,
      baseUrl: config.OPENROUTER_BASE_URL,
      models: [model],
      timeoutMs: config.AI_TIMEOUT_MS,
    })
    results.push(
      await evaluate(model, examples, modelPredictor(provider, model, Number(values.delay))),
    )
  }
}

const outage = evaluateOutageDetection(config.OUTAGE_MIN_TICKETS)

const percent = (value: number) => `${(value * 100).toFixed(1)}%`.padStart(8)
console.info('')
console.info(
  `${'Approach'.padEnd(44)}${'Category'.padStart(9)}${'Macro F1'.padStart(9)}${'Priority'.padStart(9)}${'Under'.padStart(8)}${'Valid'.padStart(8)}${'p95 ms'.padStart(8)}`,
)
for (const result of results) {
  console.info(
    `${result.name.slice(0, 43).padEnd(44)} ${percent(result.category.accuracy)} ${percent(result.category.macroF1)} ${percent(result.priority.accuracy)}${percent(result.priority.underTriageRate)}${percent(result.validRate)}${String(result.latencyMs.p95).padStart(8)}`,
  )
}
console.info('')
console.info('Category accuracy by language:')
for (const result of results) {
  const languages = Object.entries(result.category.byLanguage)
    .map(([language, value]) => `${language.toLowerCase()} ${percent(value).trim()}`)
    .join(', ')
  console.info(`  ${result.name}: ${languages}`)
}
console.info('')
console.info(
  `Outage detection on ${outage.scenarios} simulated bursts: precision ${percent(outage.precision).trim()}, recall ${percent(outage.recall).trim()}`,
)

const report = {
  generatedAt: new Date().toISOString(),
  datasetSize: examples.length,
  results,
  outage,
}
const reportsDir = new URL('../reports/', import.meta.url)
await mkdir(reportsDir, { recursive: true })
await writeFile(new URL('latest.json', reportsDir), `${JSON.stringify(report, null, 2)}\n`)
console.info('Report saved to src/ai/reports/latest.json')
