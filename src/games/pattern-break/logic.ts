import { randInt } from '../../lib/rng'

export interface Sequence {
  terms: number[]
  answer: number
  choices: number[]
}

/** Difficulty 1–10 → 4 shown terms plus the hidden 5th term as the answer. */
export function generateSequence(level: number, rng: () => number): Sequence {
  let terms: number[]
  let answer: number

  if (level <= 2) {
    // arithmetic: small start, small positive step
    const start = randInt(rng, 1, 20)
    const step = randInt(rng, 2, 9)
    terms = [start, start + step, start + 2 * step, start + 3 * step]
    answer = start + 4 * step
  } else if (level <= 4) {
    // arithmetic: descending, or bigger starts and steps
    let start: number
    let step: number
    if (rng() < 0.5) {
      step = -randInt(rng, 2, 9)
      start = randInt(rng, 20, 60) // worst case 20 − 4·9 = −16 keeps every term ≥ −20
    } else {
      start = randInt(rng, 20, 80)
      step = randInt(rng, 11, 25)
    }
    terms = [start, start + step, start + 2 * step, start + 3 * step]
    answer = start + 4 * step
  } else if (level <= 6) {
    if (rng() < 0.5) {
      // geometric ×2 or ×3 from a small start
      const ratio = rng() < 0.5 ? 2 : 3
      const start = randInt(rng, 1, ratio === 2 ? 6 : 4)
      terms = [start, start * ratio, start * ratio ** 2, start * ratio ** 3]
      answer = start * ratio ** 4
    } else {
      // consecutive perfect squares
      const n = randInt(rng, 1, 7)
      terms = [n ** 2, (n + 1) ** 2, (n + 2) ** 2, (n + 3) ** 2]
      answer = (n + 4) ** 2
    }
  } else if (level <= 8) {
    if (rng() < 0.5) {
      // alternating two-step: +a, +b, +a, +b with a ≠ b
      const a = randInt(rng, 2, 9)
      let b = randInt(rng, 2, 8)
      if (b >= a) b += 1 // b ∈ [2, 9] \ {a}
      const start = randInt(rng, 1, 15)
      terms = [start, start + a, start + a + b, start + 2 * a + b]
      answer = start + 2 * a + 2 * b
    } else {
      // Fibonacci-style: each term is the sum of the previous two, seeded small
      const t0 = randInt(rng, 1, 5)
      const t1 = randInt(rng, 1, 7)
      terms = [t0, t1, t0 + t1, t0 + 2 * t1]
      answer = 2 * t0 + 3 * t1
    }
  } else {
    if (rng() < 0.5) {
      // interleaved pair of arithmetic sequences; the 5th term continues the first
      const a0 = randInt(rng, 1, 20)
      const da = randInt(rng, 2, 9)
      const b0 = randInt(rng, 1, 20)
      const db = randInt(rng, 2, 9)
      terms = [a0, b0, a0 + da, b0 + db]
      answer = a0 + 2 * da
    } else {
      // second-order differences: consecutive diffs grow by a constant
      const start = randInt(rng, 1, 15)
      const d = randInt(rng, 2, 6)
      const c = randInt(rng, 1, 4)
      terms = [start, start + d, start + 2 * d + c, start + 3 * d + 3 * c]
      answer = start + 4 * d + 6 * c
    }
  }

  return { terms, answer, choices: makeChoices(terms, answer, rng) }
}

function makeChoices(terms: number[], answer: number, rng: () => number): number[] {
  const last = terms[3]
  const lastStep = answer - last
  const prevStep = terms[3] - terms[2]
  const set = new Set([answer])
  const plausible = [
    answer + lastStep, // off-by-one-step: applied the final step twice
    last + prevStep, // wrong-rule continuation: repeated the previous step
    answer + randInt(rng, 1, 3), // near-miss high
    answer - randInt(rng, 1, 3), // near-miss low
  ]
  for (const c of plausible) {
    if (set.size < 4 && c !== answer) set.add(c)
  }
  while (set.size < 4) {
    const delta = randInt(rng, 1, Math.max(3, Math.round(Math.abs(lastStep) / 2)))
    set.add(rng() < 0.5 ? answer + delta : answer - delta)
  }
  const arr = [...set]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

/**
 * Session score 0–100: 60% difficulty, 25% accuracy, 15% speed (≤3s full, ≥10s none).
 * avgMs = 0 is the zero-answers sentinel — no speed credit for idle runs.
 */
export function toScore(r: { difficultyReached: number; accuracy: number; avgMs: number }): number {
  const difficulty = Math.min(10, r.difficultyReached) / 10
  const speed = r.avgMs > 0 ? Math.max(0, Math.min(1, (10000 - r.avgMs) / 7000)) : 0
  const raw = difficulty * 60 + r.accuracy * 25 + speed * 15
  return Math.round(Math.max(0, Math.min(100, raw)))
}
