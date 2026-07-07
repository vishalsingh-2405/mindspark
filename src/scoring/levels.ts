export type Level = 'Novice' | 'Sharp' | 'Quick' | 'Elite' | 'Prodigy'

export function levelFor(score: number): Level {
  if (score < 20) return 'Novice'
  if (score < 40) return 'Sharp'
  if (score < 60) return 'Quick'
  if (score < 80) return 'Elite'
  return 'Prodigy'
}
