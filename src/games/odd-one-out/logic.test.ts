import { createRng } from '../../lib/rng'
import { EMOJI_POOLS, generatePuzzle, gridFor, toScore } from './logic'

function digitSum(n: number): number {
  let s = 0
  for (let v = n; v > 0; v = Math.floor(v / 10)) s += v % 10
  return s
}

function isPrime(n: number): boolean {
  if (n < 2) return false
  for (let f = 2; f * f <= n; f++) if (n % f === 0) return false
  return true
}

function isSquare(n: number): boolean {
  const r = Math.round(Math.sqrt(n))
  return r * r === n
}

function sortedLetters(s: string): string {
  return [...s].sort().join('')
}

function poolOf(item: string): number {
  return EMOJI_POOLS.findIndex(p => p.includes(item))
}

function split(p: { items: string[]; oddIndex: number }): { base: string[]; odd: string } {
  return { base: p.items.filter((_, i) => i !== p.oddIndex), odd: p.items[p.oddIndex] }
}

it('gridFor maps the level bands to 4 / 6 / 9', () => {
  expect([1, 2, 3].map(gridFor)).toEqual([4, 4, 4])
  expect([4, 5, 6].map(gridFor)).toEqual([6, 6, 6])
  expect([7, 8, 9, 10].map(gridFor)).toEqual([9, 9, 9, 9])
})

it('emoji pools are ≥8 disjoint categories of ≥6 members each', () => {
  expect(EMOJI_POOLS.length).toBeGreaterThanOrEqual(8)
  for (const pool of EMOJI_POOLS) expect(pool.length).toBeGreaterThanOrEqual(6)
  const all = EMOJI_POOLS.flat()
  expect(new Set(all).size).toBe(all.length)
})

it('every level produces gridFor-sized puzzles with unique items and an in-range oddIndex', () => {
  const rng = createRng(3)
  for (let level = 1; level <= 10; level++) {
    for (let i = 0; i < 100; i++) {
      const p = generatePuzzle(level, rng)
      expect(p.items).toHaveLength(gridFor(level))
      expect(new Set(p.items).size).toBe(p.items.length)
      expect(p.oddIndex).toBeGreaterThanOrEqual(0)
      expect(p.oddIndex).toBeLessThan(p.items.length)
    }
  }
})

it('levels 1–3: three items share one emoji pool and the odd item comes from a different pool', () => {
  const rng = createRng(7)
  for (const level of [1, 2, 3]) {
    for (let i = 0; i < 150; i++) {
      const { base, odd } = split(generatePuzzle(level, rng))
      const basePools = base.map(poolOf)
      expect(new Set(basePools).size).toBe(1)
      expect(basePools[0]).toBeGreaterThanOrEqual(0)
      const oddPool = poolOf(odd)
      expect(oddPool).toBeGreaterThanOrEqual(0)
      expect(oddPool).not.toBe(basePools[0])
    }
  }
})

it('levels 4–6: five items obey a shared rule that the odd item breaks', () => {
  const rng = createRng(11)
  for (const level of [4, 5, 6]) {
    for (let i = 0; i < 200; i++) {
      const { base, odd } = split(generatePuzzle(level, rng))
      if (base.every(s => /^\d+$/.test(s)) && /^\d+$/.test(odd)) {
        const bs = base.map(Number)
        const o = Number(odd)
        const evenRule = bs.every(n => n % 2 === 0) && o % 2 !== 0
        const fivesRule = bs.every(n => n % 5 === 0) && o % 5 !== 0
        expect(evenRule || fivesRule).toBe(true)
      } else if (base.every(s => s.length === 1)) {
        expect([...base].sort().join('')).toBe('AEIOU')
        expect('AEIOU'.includes(odd)).toBe(false)
      } else {
        expect(new Set(base.map(w => w[0])).size).toBe(1)
        expect(odd[0]).not.toBe(base[0][0])
      }
    }
  }
})

it('levels 7–8: eight numbers share a math property the odd one lacks', () => {
  const rng = createRng(13)
  for (const level of [7, 8]) {
    for (let i = 0; i < 200; i++) {
      const { base, odd } = split(generatePuzzle(level, rng))
      const bs = base.map(Number)
      const o = Number(odd)
      const multipleRule = [6, 7, 8, 9].some(k => bs.every(n => n % k === 0) && o % k !== 0)
      const squareRule = bs.every(isSquare) && !isSquare(o)
      const digitRule = new Set(bs.map(digitSum)).size === 1 && digitSum(o) !== digitSum(bs[0])
      expect(multipleRule || squareRule || digitRule).toBe(true)
    }
  }
})

it('levels 9–10: trap puzzles — every base item satisfies the rule, the odd item never does', () => {
  const rng = createRng(17)
  for (const level of [9, 10]) {
    for (let i = 0; i < 200; i++) {
      const { base, odd } = split(generatePuzzle(level, rng))
      if (base.every(s => /^\d+$/.test(s))) {
        const bs = base.map(Number)
        const o = Number(odd)
        const primeRule = bs.every(isPrime) && !isPrime(o)
        const sorted = [...bs].sort((a, b) => a - b)
        const step = sorted[1] - sorted[0]
        const apRule = sorted.every((v, k) => v === sorted[0] + k * step) && (o - sorted[0]) % step !== 0
        expect(primeRule || apRule).toBe(true)
      } else {
        expect(new Set(base.map(sortedLetters)).size).toBe(1)
        expect(sortedLetters(odd)).not.toBe(sortedLetters(base[0]))
      }
    }
  }
})

it('toScore pins the difficulty/accuracy/speed curve', () => {
  expect(toScore({ difficultyReached: 10, accuracy: 1, avgMs: 2500 })).toBe(100)
  expect(toScore({ difficultyReached: 5, accuracy: 0.8, avgMs: 5250 })).toBe(58)
  expect(toScore({ difficultyReached: 1, accuracy: 0.5, avgMs: 8000 })).toBe(19)
  expect(toScore({ difficultyReached: 1, accuracy: 0, avgMs: 9000 })).toBe(6)
})

it('gives no speed credit for zero-answer runs (idle exploit guard)', () => {
  expect(toScore({ difficultyReached: 10, accuracy: 0, avgMs: 0 })).toBe(60) // difficulty only
  expect(toScore({ difficultyReached: 1, accuracy: 0, avgMs: 0 })).toBe(6)
})
