import { useEffect, useMemo, useRef, useState } from 'react'
import { playBlip, playBuzz, playChime, playTick } from '../../audio/sfx'
import { stepAdaptive, type AdaptiveState } from '../../lib/adaptive'
import { createRng } from '../../lib/rng'
import { useCountdown } from '../../lib/useCountdown'
import type { GameProps } from '../types'
import { generateEquation, toScore, type Equation } from './logic'

const ROUND_MS = 45_000

export function EquationSprint({ difficulty, onFinish }: GameProps) {
  // eslint-disable-next-line react-hooks/purity -- intentional: seed the RNG from wall-clock time once per mount
  const rng = useMemo(() => createRng(Date.now() % 2 ** 31), [])
  const [adaptive, setAdaptive] = useState<AdaptiveState>({ level: difficulty, correctRun: 0, missRun: 0 })
  const [equation, setEquation] = useState<Equation>(() => generateEquation(difficulty, rng))
  const { msLeft: timeLeft } = useCountdown(ROUND_MS, ROUND_MS) // fixed round: no time bonus, pace is the mechanic
  const [combo, setCombo] = useState(0)
  const statsRef = useRef({
    correct: 0,
    total: 0,
    correctMs: 0,
    peak: difficulty,
    correctPeak: 0,
    // eslint-disable-next-line react-hooks/purity -- placeholder value, overwritten by the mount effect below before any answer can occur
    askedAt: performance.now(),
  })
  const doneRef = useRef(false)

  // question 1's clock starts at first paint, not at render start
  useEffect(() => {
    statsRef.current.askedAt = performance.now()
  }, [])

  const secLeft = Math.max(0, Math.ceil(timeLeft / 1000))
  useEffect(() => {
    if (secLeft > 0 && secLeft <= 3 && !doneRef.current) playTick()
  }, [secLeft])

  useEffect(() => {
    if (timeLeft > 0 || doneRef.current) return
    doneRef.current = true
    const s = statsRef.current
    const accuracy = s.total ? s.correct / s.total : 0
    const avgMs = s.correct ? s.correctMs / s.correct : 0 // speed measured on correct answers only
    onFinish({
      gameId: 'equation-sprint',
      skill: 'math',
      // score reflects demonstrated skill: no correct answers → correctPeak 0 → score 0
      score: toScore({ difficultyReached: s.correctPeak, accuracy, avgMs }),
      difficultyReached: s.peak, // actual peak still reported for next-session level resume
      accuracy,
      avgMs,
    })
  }, [timeLeft, onFinish])

  function answer(guess: boolean) {
    if (doneRef.current) return
    const s = statsRef.current
    const correct = guess === equation.isTrue
    if (correct) playBlip()
    else playBuzz()
    s.total += 1
    if (correct) {
      s.correct += 1
      s.correctMs += performance.now() - s.askedAt
      // level of the equation just answered — difficulty must be demonstrated, not merely visited
      s.correctPeak = Math.max(s.correctPeak, adaptive.level)
    }
    const next = stepAdaptive(adaptive, correct)
    if (next.level > adaptive.level) playChime()
    s.peak = Math.max(s.peak, next.level)
    s.askedAt = performance.now()
    setAdaptive(next)
    setCombo(c => (correct ? c + 1 : 0))
    setEquation(generateEquation(next.level, rng))
  }

  return (
    <div className="game equation-sprint">
      <div className="hud">
        <span className="hud__timer">{Math.max(0, Math.ceil(timeLeft / 1000))}s</span>
        <span className="hud__level">Lv {adaptive.level}</span>
        {combo > 1 ? <span className="hud__combo" aria-hidden="true">×{combo}</span> : <span />}
      </div>
      <div className="equation-sprint__q" aria-live="polite">{equation.text}</div>
      <div className="equation-sprint__choices">
        <button type="button" className="choice choice--true" onClick={() => answer(true)}>
          TRUE
        </button>
        <button type="button" className="choice choice--false" onClick={() => answer(false)}>
          FALSE
        </button>
      </div>
    </div>
  )
}
