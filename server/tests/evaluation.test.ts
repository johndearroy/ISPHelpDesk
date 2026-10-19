import { describe, expect, it } from 'vitest'
import {
  evaluate,
  evaluateOutageDetection,
  loadDataset,
  localPredictor,
  majorityPredictor,
} from '../src/ai/eval/evaluate.js'
import { accuracy, confusionMatrix, macroF1, underTriageRate } from '../src/ai/eval/metrics.js'

describe('metrics', () => {
  it('calculates accuracy, macro f1 and the confusion matrix', () => {
    const expected = ['a', 'a', 'b', 'b']
    const predicted = ['a', 'b', 'b', 'b']

    expect(accuracy(expected, predicted)).toBe(0.75)
    expect(macroF1(expected, predicted, ['a', 'b'])).toBeCloseTo((2 / 3 + 0.8) / 2)
    expect(confusionMatrix(expected, predicted, ['a', 'b'])).toEqual([
      [1, 1],
      [0, 2],
    ])
  })

  it('counts serious tickets that were under-prioritized', () => {
    expect(
      underTriageRate(['URGENT', 'HIGH', 'LOW', 'HIGH'], ['MEDIUM', 'URGENT', 'LOW', 'HIGH']),
    ).toBeCloseTo(1 / 3)
  })
})

describe('quality gate', () => {
  it('keeps the local fallback clearly better than guessing the most common category', async () => {
    const dataset = await loadDataset()
    const baseline = await evaluate('baseline', dataset, majorityPredictor(dataset))
    const local = await evaluate('local', dataset, localPredictor)

    expect(dataset.length).toBeGreaterThanOrEqual(140)
    expect(local.category.accuracy).toBeGreaterThan(baseline.category.accuracy + 0.3)
    expect(local.category.macroF1).toBeGreaterThan(baseline.category.macroF1 + 0.3)
  })

  it('finds simulated outages without false alarms', () => {
    const result = evaluateOutageDetection()
    expect(result.precision).toBeGreaterThanOrEqual(0.9)
    expect(result.recall).toBeGreaterThanOrEqual(0.8)
  })
})
