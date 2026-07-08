import { useNavigate } from 'react-router-dom'
import { useAppStore } from '../state/store'
import { NeonButton } from './NeonButton'

interface Props {
  score: number
  delta: number | null
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

export function ResultsCard({ score, delta, onReplay }: Props) {
  const navigate = useNavigate()
  const storageOk = useAppStore(s => s.storageOk)
  return (
    <div className="results panel">
      <h2>Session complete</h2>
      <div className="results__score">{score}</div>
      <div className="results__delta">{deltaCopy(storageOk, delta)}</div>
      <div className="results__actions">
        <NeonButton onClick={onReplay}>Play again</NeonButton>
        <NeonButton variant="magenta" onClick={() => navigate('/games')}>All games</NeonButton>
        <NeonButton variant="lime" onClick={() => navigate('/')}>Home</NeonButton>
      </div>
    </div>
  )
}
