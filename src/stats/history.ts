import type { Skill } from '../games/types'
import { addDays, toDayString } from '../lib/dates'
import { computeBrainScore } from '../scoring/brainScore'
import { updateSkillScore } from '../scoring/skillScore'
import type { SessionRow } from '../storage/db'

export interface BrainPoint {
  day: string
  brainScore: number
}

/** Replay all sessions chronologically through the SAME EWMA the app uses live; one point per day (day's last value). */
export function brainScoreHistory(sessions: SessionRow[]): BrainPoint[] {
  const ordered = [...sessions].sort((a, b) => a.playedAt.localeCompare(b.playedAt))
  const skills: Partial<Record<Skill, number>> = {}
  const byDay = new Map<string, number>()
  for (const s of ordered) {
    skills[s.skill] = updateSkillScore(skills[s.skill] ?? null, s.score)
    const brain = computeBrainScore(skills)
    if (brain !== null) byDay.set(toDayString(new Date(s.playedAt)), brain)
  }
  return [...byDay.entries()].map(([day, brainScore]) => ({ day, brainScore }))
}

/** Last n session scores for one skill, oldest → newest. */
export function skillTrend(sessions: SessionRow[], skill: Skill, n = 10): number[] {
  return sessions
    .filter(s => s.skill === skill)
    .sort((a, b) => a.playedAt.localeCompare(b.playedAt))
    .slice(-n)
    .map(s => s.score)
}

/** Played/not flags for the trailing n days ending at `today`, oldest first. */
export function activityDays(sessions: SessionRow[], today: string, n = 14): boolean[] {
  const played = new Set(sessions.map(s => toDayString(new Date(s.playedAt))))
  return Array.from({ length: n }, (_, i) => played.has(addDays(today, i - (n - 1))))
}
