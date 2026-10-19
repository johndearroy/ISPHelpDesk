// word level edit distance divided by the longer text, 0 = sent as is, 1 = fully rewritten
export function editRatio(original: string, edited: string) {
  const a = original.split(/\s+/).filter(Boolean)
  const b = edited.split(/\s+/).filter(Boolean)
  if (!a.length && !b.length) return 0

  let previous = Array.from({ length: b.length + 1 }, (_, index) => index)
  for (let i = 1; i <= a.length; i++) {
    const current = [i]
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      current[j] = Math.min(previous[j] + 1, current[j - 1] + 1, previous[j - 1] + cost)
    }
    previous = current
  }

  return Math.round((previous[b.length] / Math.max(a.length, b.length)) * 100) / 100
}
