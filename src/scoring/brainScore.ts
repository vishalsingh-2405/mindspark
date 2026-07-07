import type { Skill } from '../games/types'

export function computeBrainScore(skills: Partial<Record<Skill, number>>): number | null {
  const vals = Object.values(skills).filter((v): v is number => v != null)
  if (vals.length === 0) return null
  return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length)
}
