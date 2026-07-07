import { levelFor } from '../scoring/levels'

const R = 52
const CIRC = 2 * Math.PI * R

export function ScoreDial({ score }: { score: number | null }) {
  const pct = score ?? 0
  return (
    <svg viewBox="0 0 120 120" className="score-dial" role="img"
      aria-label={score != null ? `Brain Score ${score}` : 'Brain Score not yet rated'}>
      <circle cx="60" cy="60" r={R} fill="none" stroke="var(--panel)" strokeWidth="8" />
      <circle cx="60" cy="60" r={R} fill="none" stroke="var(--cyan)" strokeWidth="8"
        strokeDasharray={`${(pct / 100) * CIRC} ${CIRC}`} strokeLinecap="round"
        transform="rotate(-90 60 60)" style={{ filter: 'drop-shadow(0 0 6px var(--cyan))' }} />
      <text x="60" y="58" textAnchor="middle" className="score-dial__num">{score ?? '—'}</text>
      <text x="60" y="78" textAnchor="middle" className="score-dial__lvl">
        {score != null ? levelFor(score) : 'Play to rate'}
      </text>
    </svg>
  )
}
