import { addDays } from '../lib/dates'
import type { VocabProgressRow } from '../storage/db'

/** Spec §Word Vault: interval grows 1 → 4 → 10 → 25 → 60 days, scaled by ease. */
export const LADDER = [1, 4, 10, 25, 60] as const
const EASE_START = 2.5
const EASE_MIN = 1.3
const EASE_MAX = 3.0
const EASE_UP = 0.1
const EASE_DOWN = 0.2

export function newProgress(wordId: string, today: string): VocabProgressRow {
  return { wordId, step: -1, ease: EASE_START, due: today, lapses: 0, lastResult: null, seenAt: today }
}

/** Interval in days for the current step, scaled by ease (2.5 = unscaled). */
export function intervalDays(p: VocabProgressRow): number {
  const base = LADDER[Math.max(0, Math.min(LADDER.length - 1, p.step))]
  return Math.max(1, Math.round(base * p.ease / EASE_START))
}

/** Mastered = climbed the full ladder (step 4). Deliberate step-based reading (not interval≥60): five consecutive successes demonstrates mastery even at low ease — decided 2026-07-07. */
export function isMastered(p: VocabProgressRow): boolean {
  return p.step >= LADDER.length - 1
}

/** Grade a card. Pure — call once per grading. */
export function gradeWord(p: VocabProgressRow, knew: boolean, today: string): VocabProgressRow {
  if (knew) {
    const next: VocabProgressRow = {
      ...p,
      step: Math.min(LADDER.length - 1, p.step + 1),
      ease: Math.min(EASE_MAX, p.ease + EASE_UP),
      lastResult: 'knew',
    }
    return { ...next, due: addDays(today, intervalDays(next)) }
  }
  const next: VocabProgressRow = {
    ...p,
    step: 0,
    ease: Math.max(EASE_MIN, p.ease - EASE_DOWN),
    lapses: p.lapses + 1,
    lastResult: 'missed',
  }
  return { ...next, due: addDays(today, 1) }
}
