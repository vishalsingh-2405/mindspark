import { randInt } from '../../lib/rng'

export interface EchoConfig {
  seqLen: number
  playMs: number
}

/** Difficulty 1–10 → sequence length and per-tile playback duration. */
export function echoConfig(level: number): EchoConfig {
  return { seqLen: 2 + Math.ceil(level / 2), playMs: 650 - level * 30 }
}

/** Sequence of tiles 0–3; no tile ever appears 3× consecutively. */
export function makeSequence(seqLen: number, rng: () => number): number[] {
  const seq: number[] = []
  while (seq.length < seqLen) {
    const tile = randInt(rng, 0, 3)
    const n = seq.length
    if (n >= 2 && seq[n - 1] === tile && seq[n - 2] === tile) continue
    seq.push(tile)
  }
  return seq
}

/**
 * Session score 0–100: 65% difficulty, 25% accuracy, 10% speed (avg per-tap interval ≤600ms full, ≥1500ms none).
 * avgMs = 0 is the zero-perfect-rounds sentinel — no speed credit for idle runs.
 */
export function toScore(r: { difficultyReached: number; accuracy: number; avgMs: number }): number {
  const difficulty = Math.min(10, r.difficultyReached) / 10
  const speed = r.avgMs > 0 ? Math.max(0, Math.min(1, (1500 - r.avgMs) / 900)) : 0
  const raw = difficulty * 65 + r.accuracy * 25 + speed * 10
  return Math.round(Math.max(0, Math.min(100, raw)))
}
