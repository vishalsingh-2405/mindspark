import { randInt } from '../../lib/rng'

export interface Question {
  text: string
  answer: number
  choices: number[]
}

/** Difficulty 1–10 → question. Uses '−', '×', '÷' glyphs for display. */
export function generateQuestion(level: number, rng: () => number): Question {
  let text: string
  let answer: number

  if (level <= 2) {
    let a = randInt(rng, 2, 9)
    let b = randInt(rng, 2, 9)
    if (rng() < 0.5) { text = `${a} + ${b}`; answer = a + b }
    else { if (b > a) [a, b] = [b, a]; text = `${a} − ${b}`; answer = a - b }
  } else if (level <= 4) {
    let a = randInt(rng, 11, 99)
    let b = randInt(rng, 11, 99)
    if (rng() < 0.5) { text = `${a} + ${b}`; answer = a + b }
    else { if (b > a) [a, b] = [b, a]; text = `${a} − ${b}`; answer = a - b }
  } else if (level <= 6) {
    const a = randInt(rng, 3, 12)
    const b = randInt(rng, 3, 12)
    text = `${a} × ${b}`; answer = a * b
  } else if (level <= 8) {
    if (rng() < 0.5) {
      const a = randInt(rng, 12, 49)
      const b = randInt(rng, 3, 9)
      text = `${a} × ${b}`; answer = a * b
    } else {
      const b = randInt(rng, 3, 9)
      answer = randInt(rng, 4, 12)
      text = `${b * answer} ÷ ${b}`
    }
  } else {
    const a = randInt(rng, 11, 30)
    const b = randInt(rng, 11, 30)
    const c = randInt(rng, 2, 9)
    text = `${a} + ${b} × ${c}`; answer = a + b * c
  }

  return { text, answer, choices: makeChoices(answer, rng) }
}

function makeChoices(answer: number, rng: () => number): number[] {
  const set = new Set([answer])
  while (set.size < 4) {
    const delta = randInt(rng, 1, Math.max(3, Math.round(Math.abs(answer) * 0.2)))
    set.add(rng() < 0.5 ? answer + delta : Math.max(0, answer - delta))
  }
  const arr = [...set]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

/** Session score 0–100: 60% difficulty, 25% accuracy, 15% speed (≤1s full, ≥4s none). */
export function toScore(r: { difficultyReached: number; accuracy: number; avgMs: number }): number {
  const difficulty = Math.min(10, r.difficultyReached) / 10
  const speed = Math.max(0, Math.min(1, (4000 - r.avgMs) / 3000))
  const raw = difficulty * 60 + r.accuracy * 25 + speed * 15
  return Math.round(Math.max(0, Math.min(100, raw)))
}
