import { useEffect, useState } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import { ResultsCard } from '../components/ResultsCard'
import { getGame } from '../games/registry'
import type { GameResult } from '../games/types'
import { useAppStore } from '../state/store'
import { getGameLevel, lastSessionFor, setGameLevel } from '../storage/repos'

export function GamePlay() {
  const { gameId = '' } = useParams()
  const game = getGame(gameId)
  const recordSession = useAppStore(s => s.recordSession)
  const [startLevel, setStartLevel] = useState<number | null>(null)
  const [outcome, setOutcome] = useState<{ score: number; delta: number | null } | null>(null)
  const [runKey, setRunKey] = useState(0)

  useEffect(() => {
    if (!game) return
    let cancelled = false
    void getGameLevel(game.id).then(peak => {
      if (!cancelled) setStartLevel(Math.max(1, peak - 1))
    })
    return () => { cancelled = true }
  }, [game, runKey])

  async function handleFinish(result: GameResult) {
    const last = await lastSessionFor(result.gameId)
    await recordSession(result)
    await setGameLevel(result.gameId, result.difficultyReached)
    setOutcome({ score: result.score, delta: last ? result.score - last.score : null })
  }

  if (!game) return <Navigate to="/games" replace />
  if (startLevel === null) return <div className="screen" style={{ textAlign: 'center' }}>Loading…</div>

  if (outcome) {
    return (
      <ResultsCard
        score={outcome.score}
        delta={outcome.delta}
        onReplay={() => {
          setOutcome(null)
          setStartLevel(null)
          setRunKey(k => k + 1)
        }}
      />
    )
  }

  const Game = game.Component
  return <Game key={runKey} difficulty={startLevel} onFinish={handleFinish} />
}
