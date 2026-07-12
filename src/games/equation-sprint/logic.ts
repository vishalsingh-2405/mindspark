import { randInt } from '../../lib/rng'

export interface Equation {
  text: string
  isTrue: boolean
}

/** Difficulty 1–10 → true/false equation. Uses '−', '×', '÷' glyphs for display. */
export function generateEquation(level: number, rng: () => number): Equation {
  let expr: string
  let answer: number

  if (level <= 2) {
    let a = randInt(rng, 2, 9)
    let b = randInt(rng, 2, 9)
    if (rng() < 0.5) { expr = `${a} + ${b}`; answer = a + b }
    else { if (b > a) [a, b] = [b, a]; expr = `${a} − ${b}`; answer = a - b }
  } else if (level <= 4) {
    let a = randInt(rng, 11, 99)
    let b = randInt(rng, 11, 99)
    if (rng() < 0.5) { expr = `${a} + ${b}`; answer = a + b }
    else { if (b > a) [a, b] = [b, a]; expr = `${a} − ${b}`; answer = a - b }
  } else if (level <= 6) {
    const a = randInt(rng, 3, 12)
    const b = randInt(rng, 3, 12)
    expr = `${a} × ${b}`; answer = a * b
  } else if (level <= 8) {
    if (rng() < 0.5) {
      const a = randInt(rng, 12, 49)
      const b = randInt(rng, 3, 9)
      expr = `${a} × ${b}`; answer = a * b
    } else {
      const b = randInt(rng, 3, 9)
      answer = randInt(rng, 4, 12)
      expr = `${b * answer} ÷ ${b}`
    }
  } else {
    const a = randInt(rng, 11, 30)
    const b = randInt(rng, 11, 30)
    const c = randInt(rng, 2, 9)
    expr = `${a} + ${b} × ${c}`; answer = a + b * c
  }

  const isTrue = rng() < 0.5
  const shown = isTrue ? answer : nearMiss(answer, rng)
  return { text: `${expr} = ${shown}`, isTrue }
}

/** Near-miss decoy: off by ±1…±3, never the true answer, never negative when the answer is ≥ 0. */
function nearMiss(answer: number, rng: () => number): number {
  const delta = randInt(rng, 1, 3)
  const candidate = rng() < 0.5 ? answer + delta : answer - delta
  return candidate < 0 && answer >= 0 ? answer + delta : candidate
}

/**
 * Session score 0–100: 55% difficulty, 25% accuracy, 20% speed (≤0.7s full, ≥2.5s none).
 * avgMs = 0 is the zero-answers sentinel — no speed credit for idle runs.
 */
export function toScore(r: { difficultyReached: number; accuracy: number; avgMs: number }): number {
  const difficulty = Math.min(10, r.difficultyReached) / 10
  const speed = r.avgMs > 0 ? Math.max(0, Math.min(1, (2500 - r.avgMs) / 1800)) : 0
  const raw = difficulty * 55 + r.accuracy * 25 + speed * 20
  return Math.round(Math.max(0, Math.min(100, raw)))
}
