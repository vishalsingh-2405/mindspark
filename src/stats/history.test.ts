import type { SessionRow } from '../storage/db'
import { activityDays, brainScoreHistory, skillTrend } from './history'

function session(partial: Partial<SessionRow> & Pick<SessionRow, 'skill' | 'score' | 'playedAt'>): SessionRow {
  return { gameId: 'quick-math', difficultyReached: 1, accuracy: 1, avgMs: 1000, ...partial }
}

it('replays sessions through the EWMA: one point per day, last value wins', () => {
  const sessions = [
    session({ skill: 'math', score: 80, playedAt: '2026-07-01T10:00:00.000Z' }),
    session({ skill: 'math', score: 40, playedAt: '2026-07-01T11:00:00.000Z' }),
  ]
  const points = brainScoreHistory(sessions)
  expect(points).toHaveLength(1)
  // first session sets 80; second: round((0.25*40 + 0.75*80)*10)/10 = 70 → brain = round(70) = 70
  expect(points[0].brainScore).toBe(70)
})

it('multi-skill brain score averages the replayed skills', () => {
  const sessions = [
    session({ skill: 'math', score: 80, playedAt: '2026-07-01T10:00:00.000Z' }),
    session({ skill: 'vocab', score: 60, playedAt: '2026-07-02T10:00:00.000Z' }),
  ]
  const points = brainScoreHistory(sessions)
  expect(points).toHaveLength(2)
  expect(points[0].brainScore).toBe(80)
  expect(points[1].brainScore).toBe(70) // mean(80, 60)
})

it('orders by playedAt even when input is shuffled', () => {
  const sessions = [
    session({ skill: 'math', score: 40, playedAt: '2026-07-02T10:00:00.000Z' }),
    session({ skill: 'math', score: 80, playedAt: '2026-07-01T10:00:00.000Z' }),
  ]
  const points = brainScoreHistory(sessions)
  expect(points.map(p => p.brainScore)).toEqual([80, 70])
})

it('skillTrend returns the last n scores for one skill in time order', () => {
  const sessions = [
    session({ skill: 'math', score: 10, playedAt: '2026-07-01T10:00:00.000Z' }),
    session({ skill: 'vocab', score: 99, playedAt: '2026-07-01T11:00:00.000Z' }),
    session({ skill: 'math', score: 20, playedAt: '2026-07-02T10:00:00.000Z' }),
    session({ skill: 'math', score: 30, playedAt: '2026-07-03T10:00:00.000Z' }),
  ]
  expect(skillTrend(sessions, 'math', 2)).toEqual([20, 30])
})

it('activityDays flags the played days in the trailing window (oldest first)', () => {
  const sessions = [
    session({ skill: 'math', score: 50, playedAt: '2026-07-08T09:00:00.000Z' }),
    session({ skill: 'math', score: 50, playedAt: '2026-07-06T09:00:00.000Z' }),
  ]
  const days = activityDays(sessions, '2026-07-08', 3) // covers 07-06, 07-07, 07-08
  expect(days).toEqual([true, false, true])
})
