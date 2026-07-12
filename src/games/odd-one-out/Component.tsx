import { useEffect, useMemo, useRef, useState } from 'react'
import { playBlip, playBuzz, playChime, playCombo, playTick } from '../../audio/sfx'
import { stepAdaptive, type AdaptiveState } from '../../lib/adaptive'
import { createRng } from '../../lib/rng'
import { useCountdown } from '../../lib/useCountdown'
import { useFeedback } from '../../lib/useFeedback'
import type { GameProps } from '../types'
import { generatePuzzle, toScore, type Puzzle } from './logic'

const ROUND_MS = 60_000

export function OddOneOut({ difficulty, onFinish }: GameProps) {
  // eslint-disable-next-line react-hooks/purity -- intentional: seed the RNG from wall-clock time once per mount
  const rng = useMemo(() => createRng(Date.now() % 2 ** 31), [])
  const [adaptive, setAdaptive] = useState<AdaptiveState>({ level: difficulty, correctRun: 0, missRun: 0 })
  const [puzzle, setPuzzle] = useState<Puzzle>(() => generatePuzzle(difficulty, rng))
  const [puzzleIndex, setPuzzleIndex] = useState(0)
  const { msLeft: timeLeft } = useCountdown(ROUND_MS, ROUND_MS) // fixed 60 s round, no time bonus
  const [combo, setCombo] = useState(0)
  const [feedback, flash] = useFeedback()
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

  // puzzle 1's clock starts at first paint, not at render start
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
      gameId: 'odd-one-out',
      skill: 'logic',
      // score reflects demonstrated skill: no correct answers → correctPeak 0 → score 0
      score: toScore({ difficultyReached: s.correctPeak, accuracy, avgMs }),
      difficultyReached: s.peak, // actual peak still reported for next-session level resume
      accuracy,
      avgMs,
    })
  }, [timeLeft, onFinish])

  function answer(index: number) {
    if (doneRef.current) return
    const s = statsRef.current
    const correct = index === puzzle.oddIndex
    if (correct) playBlip()
    else playBuzz()
    flash(correct ? 'hit' : 'miss')
    s.total += 1
    if (correct) {
      s.correct += 1
      // eslint-disable-next-line react-hooks/purity -- answer() only runs from the onClick handler, never during render
      s.correctMs += performance.now() - s.askedAt
      // level of the puzzle just answered — difficulty must be demonstrated, not merely visited
      s.correctPeak = Math.max(s.correctPeak, adaptive.level)
    }
    const next = stepAdaptive(adaptive, correct)
    if (next.level > adaptive.level) playChime()
    s.peak = Math.max(s.peak, next.level)
    // eslint-disable-next-line react-hooks/purity -- answer() only runs from the onClick handler, never during render
    s.askedAt = performance.now()
    setAdaptive(next)
    setCombo(c => {
      const nextCombo = correct ? c + 1 : 0
      if (nextCombo > 0 && nextCombo % 5 === 0) playCombo(nextCombo / 5)
      return nextCombo
    })
    setPuzzle(generatePuzzle(next.level, rng))
    setPuzzleIndex(i => i + 1)
  }

  const cols = puzzle.items.length === 4 ? '2col' : '3col'

  return (
    <div className="game odd-one-out" data-feedback={feedback}>
      <div className="hud">
        <span className={secLeft <= 5 ? 'hud__timer hud__timer--low' : 'hud__timer'}>{secLeft}s</span>
        <span className="hud__level" key={adaptive.level}>Lv {adaptive.level}</span>
        {combo > 1
          ? <span className={combo % 5 === 0 ? 'hud__combo hud__combo--milestone' : 'hud__combo'} key={combo} aria-hidden="true">×{combo}</span>
          : <span />}
      </div>
      <p className="odd-one-out__prompt" aria-live="polite">Tap the one that does not belong</p>
      <div className={`odd-one-out__grid odd-one-out__grid--${cols}`}>
        {puzzle.items.map((item, i) => (
          <button type="button" key={`${puzzleIndex}-${item}`} className="odd-one-out__item" onClick={() => answer(i)}>
            {item}
          </button>
        ))}
      </div>
    </div>
  )
}
