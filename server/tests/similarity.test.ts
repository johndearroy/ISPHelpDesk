import { describe, expect, it } from 'vitest'
import { rankSimilar } from '../src/ai/local/similarity.js'
import { editRatio } from '../src/lib/editRatio.js'

describe('tf-idf similarity', () => {
  const documents = [
    { id: 1, text: 'Router shows red light and no internet' },
    { id: 2, text: 'Bill charged twice through bkash' },
    { id: 3, text: 'Want to upgrade my package to 40 mbps' },
  ]

  it('ranks the most similar document first', () => {
    const matches = rankSimilar('no internet, red light on the router', documents)
    expect(matches[0].id).toBe(1)
    expect(matches[0].score).toBeGreaterThan(0.5)
  })

  it('drops documents below the minimum score', () => {
    expect(rankSimilar('completely unrelated words', documents)).toEqual([])
    expect(rankSimilar('anything', [])).toEqual([])
  })
})

describe('edit ratio', () => {
  it('is 0 for an unchanged draft and 1 for a full rewrite', () => {
    expect(editRatio('hello there friend', 'hello there friend')).toBe(0)
    expect(editRatio('a b c', 'x y z')).toBe(1)
    expect(editRatio('we will fix it today', 'we will fix it tomorrow')).toBe(0.2)
  })
})
