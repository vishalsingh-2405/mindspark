import { createRng } from '../../lib/rng'
import { FALSE_START_PENALTY_MS, msToScore, summarize, trialDelay } from './logic'

it('trialDelay is an integer in [1200, 3800] across many seeds', () => {
  for (let seed = 1; seed <= 20; seed++) {
    const rng = createRng(seed)
    for (let i = 0; i < 100; i++) {
      const d = trialDelay(rng)
      expect(Number.isInteger(d)).toBe(true)
      expect(d).toBeGreaterThanOrEqual(1200)
      expect(d).toBeLessThanOrEqual(3800)
    }
  }
})

it('msToScore pins the design-spec curve', () => {
  expect(msToScore(180)).toBe(95)
  expect(msToScore(400)).toBe(40)
  expect(msToScore(160)).toBe(100)
  expect(msToScore(560)).toBe(0)
})

it('msToScore clamps to 0–100 beyond the curve ends', () => {
  expect(msToScore(1)).toBe(100)
  expect(msToScore(100)).toBe(100)
  expect(msToScore(2000)).toBe(0)
})

it('msToScore treats avgMs ≤ 0 as the no-taps sentinel', () => {
  expect(msToScore(0)).toBe(0)
  expect(msToScore(-5)).toBe(0)
})

it('summarize averages clean trials with full accuracy', () => {
  const r = summarize([
    { ms: 200, falseStart: false },
    { ms: 300, falseStart: false },
  ])
  expect(r.avgMs).toBe(250)
  expect(r.accuracy).toBe(1)
  expect(r.score).toBe(78) // 95 − 70·0.25 = 77.5 → 78
})

it('false starts contribute the 600 ms penalty and count as inaccurate', () => {
  // recorded ms is 0 to prove summarize substitutes the penalty
  const r = summarize([
    { ms: 200, falseStart: false },
    { ms: 0, falseStart: true },
  ])
  expect(r.avgMs).toBe((200 + FALSE_START_PENALTY_MS) / 2) // 400
  expect(r.accuracy).toBe(0.5)
  expect(r.score).toBe(40)
})

it('summarize of zero trials is all zeros', () => {
  expect(summarize([])).toEqual({ avgMs: 0, accuracy: 0, score: 0 })
})
