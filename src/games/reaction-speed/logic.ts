import { randInt } from '../../lib/rng'

/** A false start counts as this many ms in the average and as an inaccurate trial. */
export const FALSE_START_PENALTY_MS = 600

export interface Trial {
  ms: number
  falseStart: boolean
}

/** Random arming delay before the stage turns green: integer ms in [1200, 3800]. */
export function trialDelay(rng: () => number): number {
  return randInt(rng, 1200, 3800)
}

/**
 * Design-spec curve: 180 ms → 95, 400 ms → 40 (linear, clamped 0–100).
 * avgMs ≤ 0 is the no-taps sentinel — no score for idle runs.
 */
export function msToScore(avgMs: number): number {
  if (avgMs <= 0) return 0
  return Math.round(Math.max(0, Math.min(100, 95 - (avgMs - 180) * 0.25)))
}

/**
 * Fold trials into a session result. False starts contribute the 600 ms
 * penalty as their ms (regardless of what was recorded) and count as
 * inaccurate; avgMs is the mean over ALL trials, penalties included.
 */
export function summarize(trials: Trial[]): { avgMs: number; accuracy: number; score: number } {
  if (trials.length === 0) return { avgMs: 0, accuracy: 0, score: 0 }
  const totalMs = trials.reduce((sum, t) => sum + (t.falseStart ? FALSE_START_PENALTY_MS : t.ms), 0)
  const clean = trials.filter(t => !t.falseStart).length
  const avgMs = totalMs / trials.length
  return { avgMs, accuracy: clean / trials.length, score: msToScore(avgMs) }
}
