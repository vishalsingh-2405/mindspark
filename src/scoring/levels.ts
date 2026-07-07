export function levelFor(score: number): string {
  if (score < 20) return 'Novice'
  if (score < 40) return 'Sharp'
  if (score < 60) return 'Quick'
  if (score < 80) return 'Elite'
  return 'Prodigy'
}
