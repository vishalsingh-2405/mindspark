import { addDays, daysBetween } from '../lib/dates'

export interface StreakState {
  streak: number
  bestStreak: number
  lastPlayedDate: string | null // 'YYYY-MM-DD'
  freezesAvailable: number
  lastFreezeMilestone: number
  frozenDates: string[]
}

export const FREEZE_EVERY = 50
export const MAX_FREEZES = 2

/** Advance the streak for a completed activity on `today`. Pure; call once per completion. */
export function advanceStreak(s: StreakState, today: string): StreakState {
  if (s.lastPlayedDate === today) return s

  let next: StreakState
  if (s.lastPlayedDate === null) {
    next = { ...s, streak: 1, lastPlayedDate: today }
  } else {
    const missed = daysBetween(s.lastPlayedDate, today) - 1
    if (missed <= 0) {
      next = { ...s, streak: s.streak + 1, lastPlayedDate: today }
    } else if (missed <= s.freezesAvailable) {
      const frozen = Array.from({ length: missed }, (_, i) => addDays(s.lastPlayedDate!, i + 1))
      next = {
        ...s,
        streak: s.streak + 1,
        freezesAvailable: s.freezesAvailable - missed,
        frozenDates: [...s.frozenDates, ...frozen],
        lastPlayedDate: today,
      }
    } else {
      next = { ...s, streak: 1, lastFreezeMilestone: 0, lastPlayedDate: today }
    }
  }

  const milestone = Math.floor(next.streak / FREEZE_EVERY) * FREEZE_EVERY
  if (milestone > 0 && milestone > next.lastFreezeMilestone) {
    next = {
      ...next,
      freezesAvailable: Math.min(MAX_FREEZES, next.freezesAvailable + 1),
      lastFreezeMilestone: milestone,
    }
  }

  return { ...next, bestStreak: Math.max(next.bestStreak, next.streak) }
}
