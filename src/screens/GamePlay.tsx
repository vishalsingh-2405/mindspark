import { useEffect, useRef, useState } from 'react'
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
  const finishedRef = useRef(false)

  useEffect(() => {
    if (!game) return
    let cancelled = false
    void getGameLevel(game.id).then(
      peak => { if (!cancelled) setStartLevel(Math.max(1, peak - 1)) },
      () => { if (!cancelled) setStartLevel(1) }, // storage down — start fresh at level 1
    )
    return () => { cancelled = true }
  }, [game, runKey])

  async function handleFinish(result: GameResult) {
    if (!game || finishedRef.current) return
    finishedRef.current = true
    // The registry is authoritative for identity — a game component with a
    // typo'd gameId/skill must not silently orphan its sessions.
    const stamped = { ...result, gameId: game.id, skill: game.skill }
    // Every step tolerates storage failure — the ResultsCard must always appear.
    const last = await lastSessionFor(game.id).catch(() => undefined)
    await recordSession(stamped) // resolves even on storage failure, by design
    await setGameLevel(game.id, stamped.difficultyReached).catch(() => {})
    setOutcome({ score: stamped.score, delta: last ? stamped.score - last.score : null })
  }

  if (!game) return <Navigate to="/games" replace />
  if (startLevel === null) return <div className="screen" style={{ textAlign: 'center' }}>Loading…</div>

  if (outcome) {
    return (
      <ResultsCard
        score={outcome.score}
        delta={outcome.delta}
        onReplay={() => {
          finishedRef.current = false
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
