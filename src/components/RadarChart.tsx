import type { Skill } from '../games/types'

const AXES: { key: Skill; label: string }[] = [
  { key: 'math', label: 'Math' },
  { key: 'logic', label: 'Logic' },
  { key: 'memory', label: 'Memory' },
  { key: 'reaction', label: 'Reaction' },
  { key: 'vocab', label: 'Vocab' },
]

function point(i: number, value: number): [number, number] {
  const angle = (Math.PI * 2 * i) / AXES.length - Math.PI / 2
  const r = (value / 100) * 60
  return [75 + r * Math.cos(angle), 75 + r * Math.sin(angle)]
}

export function RadarChart({ skills }: { skills: Partial<Record<Skill, number>> }) {
  const outline = AXES.map((_, i) => point(i, 100).join(',')).join(' ')
  const values = AXES.map((a, i) => point(i, skills[a.key] ?? 0).join(',')).join(' ')
  return (
    <svg viewBox="0 0 150 150" className="radar" role="img" aria-label="Skill profile">
      <polygon points={outline} fill="none" stroke="var(--muted)" strokeOpacity="0.35" />
      <polygon points={values} fill="rgba(0, 240, 255, 0.18)" stroke="var(--cyan)" />
      {AXES.map((a, i) => {
        const [x, y] = point(i, 122)
        return (
          <text key={a.key} x={x} y={y} textAnchor="middle" className="radar__label">
            {a.label}
          </text>
        )
      })}
    </svg>
  )
}
