const ALPHA = 0.25 // new session weight; history keeps 75%

export function updateSkillScore(prev: number | null, session: number): number {
  if (prev === null) return session
  return Math.round((ALPHA * session + (1 - ALPHA) * prev) * 10) / 10
}
