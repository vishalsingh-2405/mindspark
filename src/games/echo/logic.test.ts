import { createRng } from '../../lib/rng'
import { echoConfig, makeSequence, toScore } from './logic'

it('echoConfig pins seqLen and playMs for all 10 levels', () => {
  const configs = Array.from({ length: 10 }, (_, i) => echoConfig(i + 1))
  expect(configs).toEqual([
    { seqLen: 3, playMs: 620 },
    { seqLen: 3, playMs: 590 },
    { seqLen: 4, playMs: 560 },
    { seqLen: 4, playMs: 530 },
    { seqLen: 5, playMs: 500 },
    { seqLen: 5, playMs: 470 },
    { seqLen: 6, playMs: 440 },
    { seqLen: 6, playMs: 410 },
    { seqLen: 7, playMs: 380 },
    { seqLen: 7, playMs: 350 },
  ])
})

it('makeSequence returns the requested length of integer tiles 0–3', () => {
  for (let seed = 1; seed <= 100; seed++) {
    const rng = createRng(seed)
    for (let seqLen = 3; seqLen <= 7; seqLen++) {
      const seq = makeSequence(seqLen, rng)
      expect(seq).toHaveLength(seqLen)
      for (const tile of seq) {
        expect(Number.isInteger(tile)).toBe(true)
        expect(tile).toBeGreaterThanOrEqual(0)
        expect(tile).toBeLessThanOrEqual(3)
      }
    }
  }
})

it('makeSequence never repeats a tile 3× consecutively', () => {
  for (let seed = 1; seed <= 500; seed++) {
    const rng = createRng(seed)
    const seq = makeSequence(7, rng)
    for (let i = 2; i < seq.length; i++) {
      expect(seq[i] === seq[i - 1] && seq[i] === seq[i - 2]).toBe(false)
    }
  }
})

it('toScore pins the difficulty/accuracy/speed curve', () => {
  expect(toScore({ difficultyReached: 10, accuracy: 1, avgMs: 600 })).toBe(100) // ≤600ms → full speed credit
  expect(toScore({ difficultyReached: 10, accuracy: 1, avgMs: 300 })).toBe(100)
  expect(toScore({ difficultyReached: 5, accuracy: 0.8, avgMs: 1050 })).toBe(58)
  expect(toScore({ difficultyReached: 6, accuracy: 0.75, avgMs: 900 })).toBe(64)
  expect(toScore({ difficultyReached: 3, accuracy: 0.5, avgMs: 1500 })).toBe(32) // ≥1500ms → no speed credit
  expect(toScore({ difficultyReached: 1, accuracy: 0, avgMs: 3000 })).toBe(7)
})

it('clamps difficulty above 10 and floors the score at 0', () => {
  expect(toScore({ difficultyReached: 15, accuracy: 1, avgMs: 100 })).toBe(100)
  expect(toScore({ difficultyReached: 0, accuracy: 0, avgMs: 0 })).toBe(0)
})

it('gives no speed credit for zero-perfect runs (idle exploit guard)', () => {
  expect(toScore({ difficultyReached: 10, accuracy: 0, avgMs: 0 })).toBe(65) // difficulty only
  expect(toScore({ difficultyReached: 1, accuracy: 0, avgMs: 0 })).toBe(7)
})
