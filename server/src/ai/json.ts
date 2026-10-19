// models often wrap json in markdown fences or add a sentence before it
export function extractJson(text: string): unknown {
  const cleaned = text.replace(/```(?:json)?/gi, '').trim()
  const start = cleaned.indexOf('{')
  const end = cleaned.lastIndexOf('}')
  if (start === -1 || end <= start) {
    throw new Error('No JSON object in model output')
  }
  return JSON.parse(cleaned.slice(start, end + 1))
}
