import { useNavigate } from 'react-router-dom'
import { NeonButton } from './NeonButton'

interface Props {
  score: number
  delta: number | null
  onReplay: () => void
}

export function ResultsCard({ score, delta, onReplay }: Props) {
  const navigate = useNavigate()
  return (
    <div className="results panel">
      <h2>Session complete</h2>
      <div className="results__score">{score}</div>
      <div className="results__delta">
        {delta === null
          ? 'First run — baseline set'
          : delta >= 0
            ? `▲ +${delta} vs last time`
            : `▼ ${delta} vs last time`}
      </div>
      <div className="results__actions">
        <NeonButton onClick={onReplay}>Play again</NeonButton>
        <NeonButton variant="magenta" onClick={() => navigate('/games')}>All games</NeonButton>
        <NeonButton variant="lime" onClick={() => navigate('/')}>Home</NeonButton>
      </div>
    </div>
  )
}
