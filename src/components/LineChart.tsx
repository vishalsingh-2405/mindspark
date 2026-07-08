interface Props {
  points: number[]
  width?: number
  height?: number
  max?: number
}

/** Minimal SVG polyline chart, 0..max scale, neon-styled via CSS. */
export function LineChart({ points, width = 300, height = 90, max = 100 }: Props) {
  if (points.length < 2) return null
  const step = width / (points.length - 1)
  const pad = 4
  const y = (v: number) => pad + (height - 2 * pad) * (1 - Math.min(max, Math.max(0, v)) / max)
  const d = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${(i * step).toFixed(1)},${y(p).toFixed(1)}`).join(' ')
  const lastX = (points.length - 1) * step
  return (
    <svg className="line-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="score trend">
      <path d={d} fill="none" stroke="var(--cyan)" strokeWidth="2" strokeLinejoin="round" />
      <circle cx={lastX} cy={y(points[points.length - 1])} r="3" fill="var(--cyan)" />
    </svg>
  )
}
