import { tokenize } from './text.js'

type Vector = Map<string, number>

export function tfidfVectors(texts: string[]): Vector[] {
  const tokenLists = texts.map(tokenize)
  const documentFrequency = new Map<string, number>()
  for (const tokens of tokenLists) {
    for (const token of new Set(tokens)) {
      documentFrequency.set(token, (documentFrequency.get(token) ?? 0) + 1)
    }
  }

  return tokenLists.map((tokens) => {
    const counts = new Map<string, number>()
    for (const token of tokens) counts.set(token, (counts.get(token) ?? 0) + 1)

    const vector: Vector = new Map()
    for (const [token, count] of counts) {
      const idf = Math.log((texts.length + 1) / ((documentFrequency.get(token) ?? 0) + 1)) + 1
      vector.set(token, (count / tokens.length) * idf)
    }
    return vector
  })
}

export function cosine(a: Vector, b: Vector) {
  let dot = 0
  for (const [token, weight] of a) dot += weight * (b.get(token) ?? 0)
  const length = (v: Vector) => Math.sqrt([...v.values()].reduce((sum, w) => sum + w * w, 0))
  const denominator = length(a) * length(b)
  return denominator ? dot / denominator : 0
}

export function rankSimilar(
  query: string,
  documents: { id: number; text: string }[],
  { limit = 3, minScore = 0.1 } = {},
) {
  if (!documents.length) return []

  // the query is part of the corpus so its words get an idf value too
  const [queryVector, ...vectors] = tfidfVectors([query, ...documents.map((doc) => doc.text)])
  return documents
    .map((doc, index) => ({ id: doc.id, score: cosine(queryVector, vectors[index]) }))
    .filter((match) => match.score >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
}
