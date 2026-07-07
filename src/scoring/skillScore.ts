const ALPHA = 0.25 // new session weight; history keeps 75%

export function updateSkillScore(prev: number | null, session: number): number {
  const s = Math.min(100, Math.max(0, session))
  if (prev === null) return s
  return Math.round((ALPHA * s + (1 - ALPHA) * prev) * 10) / 10
}
