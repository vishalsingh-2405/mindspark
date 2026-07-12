import { randInt } from '../../lib/rng'

export interface SpanConfig {
  length: number
  showMs: number
}

/** Per-digit entry-speed window: avg entry time ≤ 600 ms/digit → full speed credit, ≥ 1500 → none. */
export const FULL_MS_PER_DIGIT = 600
export const ZERO_MS_PER_DIGIT = 1500

/** Difficulty 1–10 → span length and per-digit display time (the component adds a 150 ms gap between digits). */
export function spanConfig(level: number): SpanConfig {
  return { length: Math.min(2 + level, 11), showMs: 650 - level * 25 }
}

/** Digit string of `length` characters (0–9) with no digit appearing 3× in a row. */
export function makeDigits(length: number, rng: () => number): string {
  let digits = ''
  while (digits.length < length) {
    const d = String(randInt(rng, 0, 9))
    if (digits.length >= 2 && digits.endsWith(d + d)) continue
    digits += d
  }
  return digits
}

/** A recall counts only when the typed string matches the target exactly. */
export function checkEntry(target: string, entry: string): boolean {
  return target === entry
}

/**
 * Session score 0–100: 65% difficulty, 25% accuracy, 10% speed.
 * The speed window scales with span length, so callers pass the thresholds explicitly
 * (entry duration ≤ fullMs → full credit, ≥ zeroMs → none) and toScore stays pure.
 * avgMs = 0 is the zero-correct sentinel — no speed credit for idle runs.
 */
export function toScore(r: {
  difficultyReached: number
  accuracy: number
  avgMs: number
  fullMs: number
  zeroMs: number
}): number {
  const difficulty = Math.min(10, r.difficultyReached) / 10
  const speed = r.avgMs > 0 ? Math.max(0, Math.min(1, (r.zeroMs - r.avgMs) / (r.zeroMs - r.fullMs))) : 0
  const raw = difficulty * 65 + r.accuracy * 25 + speed * 10
  return Math.round(Math.max(0, Math.min(100, raw)))
}
