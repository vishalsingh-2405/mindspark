import { useEffect, useMemo, useRef, useState } from 'react'
import { stepAdaptive, type AdaptiveState } from '../../lib/adaptive'
import { createRng } from '../../lib/rng'
import type { GameProps } from '../types'
import { generateQuestion, toScore, type Question } from './logic'

const ROUND_MS = 30_000
const BONUS_MS = 2_000
const MAX_MS = 60_000
const TICK = 100

export function QuickMath({ difficulty, onFinish }: GameProps) {
  const rng = useMemo(() => createRng(Date.now() % 2 ** 31), [])
  const [adaptive, setAdaptive] = useState<AdaptiveState>({ level: difficulty, correctRun: 0, missRun: 0 })
  const [question, setQuestion] = useState<Question>(() => generateQuestion(difficulty, rng))
  const [timeLeft, setTimeLeft] = useState(ROUND_MS)
  const [combo, setCombo] = useState(0)
  const statsRef = useRef({ correct: 0, total: 0, totalMs: 0, peak: difficulty, askedAt: performance.now() })
  const doneRef = useRef(false)

  useEffect(() => {
    const t = setInterval(() => setTimeLeft(ms => ms - TICK), TICK)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    if (timeLeft > 0 || doneRef.current) return
    doneRef.current = true
    const s = statsRef.current
    const accuracy = s.total ? s.correct / s.total : 0
    const avgMs = s.total ? s.totalMs / s.total : 0
    onFinish({
      gameId: 'quick-math',
      skill: 'math',
      // zero-answer runs score 0 — idling must never bank difficulty points
      score: s.total === 0 ? 0 : toScore({ difficultyReached: s.peak, accuracy, avgMs }),
      difficultyReached: s.peak,
      accuracy,
      avgMs,
    })
  }, [timeLeft, onFinish])

  function answer(choice: number) {
    if (doneRef.current) return
    const s = statsRef.current
    const correct = choice === question.answer
    s.total += 1
    s.totalMs += performance.now() - s.askedAt
    if (correct) s.correct += 1
    const next = stepAdaptive(adaptive, correct)
    s.peak = Math.max(s.peak, next.level)
    s.askedAt = performance.now()
    setAdaptive(next)
    setCombo(c => (correct ? c + 1 : 0))
    if (correct) setTimeLeft(ms => Math.min(MAX_MS, ms + BONUS_MS))
    setQuestion(generateQuestion(next.level, rng))
  }

  return (
    <div className="game quick-math">
      <div className="hud">
        <span className="hud__timer">{Math.max(0, Math.ceil(timeLeft / 1000))}s</span>
        <span className="hud__level">Lv {adaptive.level}</span>
        {combo > 1 ? <span className="hud__combo">×{combo}</span> : <span />}
      </div>
      <div className="quick-math__q">{question.text}</div>
      <div className="quick-math__choices">
        {question.choices.map(c => (
          <button type="button" key={c} className="choice" onClick={() => answer(c)}>{c}</button>
        ))}
      </div>
    </div>
  )
}
