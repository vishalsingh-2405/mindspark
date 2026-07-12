export interface GngConfig {
  windowMs: number
  redRatio: number
}

/** Difficulty 1–10 → pacing: shorter response window and more red traps as level rises. */
export function gngConfig(level: number): GngConfig {
  return { windowMs: 900 - level * 45, redRatio: 0.25 + level * 0.02 }
}

export interface Stimulus {
  isGo: boolean
}

/** Draw the next stimulus: P(isGo) = 1 − redRatio at this level. */
export function nextStimulus(level: number, rng: () => number): Stimulus {
  return { isGo: rng() >= gngConfig(level).redRatio }
}

/** Green+tap and red+no-tap are correct; green ignored and red tapped are misses. */
export function judge(isGo: boolean, tapped: boolean): boolean {
  return isGo === tapped
}

/**
 * Session score 0–100: 50% difficulty, 30% accuracy, 20% speed (avg go-tap ≤350ms full, ≥900ms none).
 * avgMs = 0 is the zero-go-taps sentinel — no speed credit for runs with no correct taps.
 */
export function toScore(r: { difficultyReached: number; accuracy: number; avgMs: number }): number {
  const difficulty = Math.min(10, r.difficultyReached) / 10
  const speed = r.avgMs > 0 ? Math.max(0, Math.min(1, (900 - r.avgMs) / 550)) : 0
  const raw = difficulty * 50 + r.accuracy * 30 + speed * 20
  return Math.round(Math.max(0, Math.min(100, raw)))
}
