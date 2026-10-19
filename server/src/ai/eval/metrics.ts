export function accuracy(expected: string[], predicted: string[]) {
  if (!expected.length) return 0
  const correct = expected.filter((value, i) => value === predicted[i]).length
  return correct / expected.length
}

export function perClass(expected: string[], predicted: string[], labels: string[]) {
  return labels.map((label) => {
    const truePositive = expected.filter(
      (value, i) => value === label && predicted[i] === label,
    ).length
    const predictedCount = predicted.filter((value) => value === label).length
    const actualCount = expected.filter((value) => value === label).length
    const precision = predictedCount ? truePositive / predictedCount : 0
    const recall = actualCount ? truePositive / actualCount : 0
    const f1 = precision + recall ? (2 * precision * recall) / (precision + recall) : 0
    return { label, precision, recall, f1, support: actualCount }
  })
}

export function macroF1(expected: string[], predicted: string[], labels: string[]) {
  const scores = perClass(expected, predicted, labels)
  return scores.reduce((sum, score) => sum + score.f1, 0) / scores.length
}

// rows are the real label, columns what was predicted
export function confusionMatrix(expected: string[], predicted: string[], labels: string[]) {
  return labels.map((actual) =>
    labels.map(
      (guess) => expected.filter((value, i) => value === actual && predicted[i] === guess).length,
    ),
  )
}

const SERIOUS = ['URGENT', 'HIGH']

// share of urgent or high tickets that would have been queued as medium or low
export function underTriageRate(expected: string[], predicted: string[]) {
  const serious = expected
    .map((value, i) => [value, predicted[i]])
    .filter(([value]) => SERIOUS.includes(value))
  if (!serious.length) return 0
  return serious.filter(([, guess]) => !SERIOUS.includes(guess)).length / serious.length
}

export function percentile(values: number[], p: number) {
  if (!values.length) return null
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1)]
}

export function round(value: number, digits = 3) {
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}
