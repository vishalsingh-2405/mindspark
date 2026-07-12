import { createRng } from '../../lib/rng'
import { generateSequence, toScore, type Sequence } from './logic'

/** Differences of the full 5-term sequence (4 shown terms + answer). */
function seqDiffs(s: Sequence): number[] {
  const all = [...s.terms, s.answer]
  return all.slice(1).map((t, i) => t - all[i])
}

function isArithmetic(s: Sequence): boolean {
  const d = seqDiffs(s)
  return d[0] !== 0 && d.every(x => x === d[0])
}

function isGeometric(s: Sequence): boolean {
  const all = [...s.terms, s.answer]
  if (all[0] <= 0 || all[1] % all[0] !== 0) return false
  const r = all[1] / all[0]
  return (r === 2 || r === 3) && all.every((t, i) => i === 0 || t === all[i - 1] * r)
}

function isSquares(s: Sequence): boolean {
  const n = Math.round(Math.sqrt(s.terms[0]))
  return [...s.terms, s.answer].every((t, i) => t === (n + i) ** 2)
}

function isAlternating(s: Sequence): boolean {
  const [d1, d2, d3, d4] = seqDiffs(s)
  return d1 === d3 && d2 === d4 && d1 !== d2
}

function isFibonacci(s: Sequence): boolean {
  const all = [...s.terms, s.answer]
  return all.slice(2).every((t, i) => t === all[i] + all[i + 1])
}

function isInterleaved(s: Sequence): boolean {
  const da = s.terms[2] - s.terms[0]
  return da >= 2 && da <= 9 && s.answer === s.terms[2] + da
}

function isSecondOrder(s: Sequence): boolean {
  const [d1, d2, d3, d4] = seqDiffs(s)
  const c = d2 - d1
  return c >= 1 && d3 - d2 === c && d4 - d3 === c
}

function matchesLevelRule(level: number, s: Sequence): boolean {
  if (level <= 4) return isArithmetic(s)
  if (level <= 6) return isGeometric(s) || isSquares(s)
  if (level <= 8) return isAlternating(s) || isFibonacci(s)
  return isInterleaved(s) || isSecondOrder(s)
}

it('every level × many seeds: 4 terms, 4 distinct choices with the answer, rule-consistent answer', () => {
  for (let seed = 1; seed <= 5; seed++) {
    const rng = createRng(seed)
    for (let level = 1; level <= 10; level++) {
      for (let i = 0; i < 40; i++) {
        const s = generateSequence(level, rng)
        expect(s.terms).toHaveLength(4)
        expect(s.choices).toHaveLength(4)
        expect(new Set(s.choices).size).toBe(4)
        expect(s.choices).toContain(s.answer)
        expect(matchesLevelRule(level, s)).toBe(true)
      }
    }
  }
})

it('level 1–2 is ascending arithmetic with step +2…+9 from a start in 1–20', () => {
  const rng = createRng(7)
  for (const level of [1, 2]) {
    for (let i = 0; i < 100; i++) {
      const s = generateSequence(level, rng)
      expect(isArithmetic(s)).toBe(true)
      const step = s.terms[1] - s.terms[0]
      expect(step).toBeGreaterThanOrEqual(2)
      expect(step).toBeLessThanOrEqual(9)
      expect(s.terms[0]).toBeGreaterThanOrEqual(1)
      expect(s.terms[0]).toBeLessThanOrEqual(20)
    }
  }
})

it('level 3–4 is arithmetic with a negative step (−2…−9) or a big step (≥11), terms ≥ −20', () => {
  const rng = createRng(11)
  let sawNegative = 0
  let sawBig = 0
  for (const level of [3, 4]) {
    for (let i = 0; i < 100; i++) {
      const s = generateSequence(level, rng)
      expect(isArithmetic(s)).toBe(true)
      const step = s.terms[1] - s.terms[0]
      if (step < 0) {
        sawNegative += 1
        expect(step).toBeGreaterThanOrEqual(-9)
        expect(step).toBeLessThanOrEqual(-2)
      } else {
        sawBig += 1
        expect(step).toBeGreaterThanOrEqual(11)
      }
      for (const t of [...s.terms, s.answer]) expect(t).toBeGreaterThanOrEqual(-20)
    }
  }
  expect(sawNegative).toBeGreaterThan(0)
  expect(sawBig).toBeGreaterThan(0)
})

it('level 5–6 is geometric ×2/×3 or consecutive perfect squares, and produces both kinds', () => {
  const rng = createRng(13)
  let sawGeometric = 0
  let sawSquares = 0
  for (const level of [5, 6]) {
    for (let i = 0; i < 100; i++) {
      const s = generateSequence(level, rng)
      if (isGeometric(s)) sawGeometric += 1
      else if (isSquares(s)) sawSquares += 1
      else throw new Error(`level ${level} sequence fits no rule: ${s.terms.join(',')} → ${s.answer}`)
    }
  }
  expect(sawGeometric).toBeGreaterThan(0)
  expect(sawSquares).toBeGreaterThan(0)
})

it('level 7–8 is alternating two-step or Fibonacci-style, and produces both kinds', () => {
  const rng = createRng(17)
  let sawAlternating = 0
  let sawFibonacci = 0
  for (const level of [7, 8]) {
    for (let i = 0; i < 100; i++) {
      const s = generateSequence(level, rng)
      if (isAlternating(s)) sawAlternating += 1
      else if (isFibonacci(s)) sawFibonacci += 1
      else throw new Error(`level ${level} sequence fits no rule: ${s.terms.join(',')} → ${s.answer}`)
    }
  }
  expect(sawAlternating).toBeGreaterThan(0)
  expect(sawFibonacci).toBeGreaterThan(0)
})

it('level 9–10 is interleaved arithmetic pairs or second-order differences, and produces both kinds', () => {
  const rng = createRng(19)
  let sawInterleaved = 0
  let sawSecondOrder = 0
  for (const level of [9, 10]) {
    for (let i = 0; i < 100; i++) {
      const s = generateSequence(level, rng)
      // classify by the stricter rule first: second-order diffs are never interleaved-shaped by construction
      if (isSecondOrder(s)) sawSecondOrder += 1
      else if (isInterleaved(s)) sawInterleaved += 1
      else throw new Error(`level ${level} sequence fits no rule: ${s.terms.join(',')} → ${s.answer}`)
    }
  }
  expect(sawInterleaved).toBeGreaterThan(0)
  expect(sawSecondOrder).toBeGreaterThan(0)
})

it('toScore pins the difficulty/accuracy/speed curve', () => {
  expect(toScore({ difficultyReached: 10, accuracy: 1, avgMs: 3000 })).toBe(100)
  expect(toScore({ difficultyReached: 3, accuracy: 1, avgMs: 4400 })).toBe(55) // speed 0.8
  expect(toScore({ difficultyReached: 5, accuracy: 0.8, avgMs: 6500 })).toBe(58) // speed 0.5
  expect(toScore({ difficultyReached: 1, accuracy: 0.5, avgMs: 10000 })).toBe(19) // speed floor
  expect(toScore({ difficultyReached: 1, accuracy: 0, avgMs: 12000 })).toBe(6)
  expect(toScore({ difficultyReached: 12, accuracy: 1, avgMs: 1000 })).toBe(100) // difficulty clamped at 10
})

it('gives no speed credit for zero-answer runs (idle exploit guard)', () => {
  expect(toScore({ difficultyReached: 10, accuracy: 0, avgMs: 0 })).toBe(60) // difficulty only
  expect(toScore({ difficultyReached: 1, accuracy: 0, avgMs: 0 })).toBe(6)
})
