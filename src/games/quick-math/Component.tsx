import { useEffect, useMemo, useRef, useState } from 'react'
import { stepAdaptive, type AdaptiveState } from '../../lib/adaptive'
import { createRng } from '../../lib/rng'
import { useCountdown } from '../../lib/useCountdown'
import type { GameProps } from '../types'
import { generateQuestion, toScore, type Question } from './logic'

const ROUND_MS = 30_000
const BONUS_MS = 2_000
const MAX_MS = 60_000

export function QuickMath({ difficulty, onFinish }: GameProps) {
  const rng = useMemo(() => createRng(Date.now() % 2 ** 31), [])
  const [adaptive, setAdaptive] = useState<AdaptiveState>({ level: difficulty, correctRun: 0, missRun: 0 })
  const [question, setQuestion] = useState<Question>(() => generateQuestion(difficulty, rng))
  const [questionIndex, setQuestionIndex] = useState(0)
  const { msLeft: timeLeft, addTime } = useCountdown(ROUND_MS, MAX_MS)
  const [combo, setCombo] = useState(0)
  const statsRef = useRef({
    correct: 0,
    total: 0,
    correctMs: 0,
    peak: difficulty,
    correctPeak: 0,
    askedAt: performance.now(),
  })
  const doneRef = useRef(false)

  // question 1's clock starts at first paint, not at render start
  useEffect(() => {
    statsRef.current.askedAt = performance.now()
  }, [])

  useEffect(() => {
    if (timeLeft > 0 || doneRef.current) return
    doneRef.current = true
    const s = statsRef.current
    const accuracy = s.total ? s.correct / s.total : 0
    const avgMs = s.correct ? s.correctMs / s.correct : 0 // speed measured on correct answers only
    onFinish({
      gameId: 'quick-math',
      skill: 'math',
      // score reflects demonstrated skill: no correct answers → correctPeak 0 → score 0
      score: toScore({ difficultyReached: s.correctPeak, accuracy, avgMs }),
      difficultyReached: s.peak, // actual peak still reported for next-session level resume
      accuracy,
      avgMs,
    })
  }, [timeLeft, onFinish])

  function answer(choice: number) {
    if (doneRef.current) return
    const s = statsRef.current
    const correct = choice === question.answer
    s.total += 1
    if (correct) {
      s.correct += 1
      s.correctMs += performance.now() - s.askedAt
      // level of the question just answered — difficulty must be demonstrated, not merely visited
      s.correctPeak = Math.max(s.correctPeak, adaptive.level)
    }
    const next = stepAdaptive(adaptive, correct)
    s.peak = Math.max(s.peak, next.level)
    s.askedAt = performance.now()
    setAdaptive(next)
    setCombo(c => (correct ? c + 1 : 0))
    if (correct) addTime(BONUS_MS)
    setQuestion(generateQuestion(next.level, rng))
    setQuestionIndex(i => i + 1)
  }

  return (
    <div className="game quick-math">
      <div className="hud">
        <span className="hud__timer">{Math.max(0, Math.ceil(timeLeft / 1000))}s</span>
        <span className="hud__level">Lv {adaptive.level}</span>
        {combo > 1 ? <span className="hud__combo" aria-hidden="true">×{combo}</span> : <span />}
      </div>
      <div className="quick-math__q" aria-live="polite">{question.text}</div>
      <div className="quick-math__choices">
        {question.choices.map(c => (
          <button type="button" key={`${questionIndex}-${c}`} className="choice" onClick={() => answer(c)}>
            {c}
          </button>
        ))}
      </div>
    </div>
  )
}
