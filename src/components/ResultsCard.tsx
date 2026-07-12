import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { playComplete } from '../audio/sfx'
import { useCountUp } from '../lib/useCountUp'
import { useAppStore } from '../state/store'
import { NeonButton } from './NeonButton'

interface Props {
  score: number
  delta: number | null
  newBest?: boolean
  onReplay: () => void
}

/** Delta line copy: honest storage-down notice takes priority over the (potentially misleading) baseline/delta text. */
function deltaCopy(storageOk: boolean, delta: number | null): string {
  if (!storageOk) return 'Storage off — this run wasn\'t saved'
  if (delta === null) return 'First run — baseline set'
  if (delta === 0) return '— same as last time'
  if (delta > 0) return `▲ +${delta} vs last time`
  return `▼ ${delta} vs last time`
}

export function ResultsCard({ score, delta, newBest, onReplay }: Props) {
  const navigate = useNavigate()
  const storageOk = useAppStore(s => s.storageOk)
  const shown = useCountUp(score)
  useEffect(() => { playComplete(newBest) }, [newBest])
  const C = 2 * Math.PI * 56
  return (
    <div className="glow-border" style={{ margin: '15dvh auto 0', maxWidth: 420 }}>
      <div className="results panel" style={{ marginTop: 0 }}>
        <h2>Session complete</h2>
        <div className="results__dial">
          {newBest && <div className="results__burst" />}
          <svg viewBox="0 0 128 128" aria-hidden="true">
            <circle className="results__ring-bg" cx="64" cy="64" r="56" fill="none" strokeWidth="6" />
            <circle className="results__ring" cx="64" cy="64" r="56" fill="none" strokeWidth="6"
              strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - shown / 100)} />
          </svg>
          <div className="results__score">{shown}</div>
        </div>
        {newBest && <div className="results__ribbon">NEW BEST</div>}
        <div className="results__delta">{deltaCopy(storageOk, delta)}</div>
        <div className="results__actions">
          <NeonButton onClick={onReplay}>Play again</NeonButton>
          <NeonButton variant="magenta" onClick={() => navigate('/games')}>All games</NeonButton>
          <NeonButton variant="lime" onClick={() => navigate('/')}>Home</NeonButton>
        </div>
      </div>
    </div>
  )
}
