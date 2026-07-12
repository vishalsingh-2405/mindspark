import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { playBlip, playBuzz, playChime, playTick } from '../../audio/sfx'
import { stepAdaptive, type AdaptiveState } from '../../lib/adaptive'
import { createRng } from '../../lib/rng'
import { useCountdown } from '../../lib/useCountdown'
import { useFeedback } from '../../lib/useFeedback'
import type { GameProps } from '../types'
import { isPerfect, matrixConfig, pickCells, toScore, type MatrixConfig } from './logic'

const RUN_MS = 60_000
const FEEDBACK_MS = 700

type Phase = 'show' | 'input' | 'feedback'

export function MemoryMatrix({ difficulty, onFinish }: GameProps) {
  // eslint-disable-next-line react-hooks/purity -- intentional: seed the RNG from wall-clock time once per mount
  const rng = useMemo(() => createRng(Date.now() % 2 ** 31), [])
  const [adaptive, setAdaptive] = useState<AdaptiveState>({ level: difficulty, correctRun: 0, missRun: 0 })
  const [config, setConfig] = useState<MatrixConfig>(() => matrixConfig(difficulty))
  const [target, setTarget] = useState<number[]>(() => pickCells(config.grid, config.count, rng))
  const [picks, setPicks] = useState<number[]>([])
  const [phase, setPhase] = useState<Phase>('show')
  const [round, setRound] = useState(0)
  const [feedback, flash] = useFeedback()
  const { msLeft: timeLeft } = useCountdown(RUN_MS, RUN_MS)
  const statsRef = useRef({
    rounds: 0,
    perfect: 0,
    perfectMs: 0, // input-phase ms summed over perfect rounds only
    peak: difficulty,
    correctPeak: 0,
    inputStartedAt: 0,
  })
  const doneRef = useRef(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // round 1's flash starts at first paint, not at render start
  useEffect(() => {
    playBlip()
    timerRef.current = setTimeout(() => {
      if (doneRef.current) return
      statsRef.current.inputStartedAt = performance.now()
      setPhase('input')
    }, matrixConfig(difficulty).flashMs)
    return () => {
      // clears whichever phase timer is pending at unmount, not just round 1's
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [difficulty])

  const secLeft = Math.max(0, Math.ceil(timeLeft / 1000))
  useEffect(() => {
    if (secLeft > 0 && secLeft <= 3 && !doneRef.current) playTick()
  }, [secLeft])

  useEffect(() => {
    if (timeLeft > 0 || doneRef.current) return
    doneRef.current = true
    if (timerRef.current) clearTimeout(timerRef.current)
    const s = statsRef.current
    const accuracy = s.rounds ? s.perfect / s.rounds : 0
    const avgMs = s.perfect ? s.perfectMs / s.perfect : 0 // speed measured on perfect rounds only
    onFinish({
      gameId: 'memory-matrix',
      skill: 'memory',
      // score reflects demonstrated skill: no perfect rounds → correctPeak 0 → score 0
      score: toScore({ difficultyReached: s.correctPeak, accuracy, avgMs }),
      difficultyReached: s.peak, // actual peak still reported for next-session level resume
      accuracy,
      avgMs,
    })
  }, [timeLeft, onFinish])

  function beginRound(level: number) {
    const cfg = matrixConfig(level)
    setConfig(cfg)
    setTarget(pickCells(cfg.grid, cfg.count, rng))
    setPicks([])
    setPhase('show')
    setRound(r => r + 1)
    playBlip()
    timerRef.current = setTimeout(() => {
      if (doneRef.current) return
      statsRef.current.inputStartedAt = performance.now()
      setPhase('input')
    }, cfg.flashMs)
  }

  function evaluate(finalPicks: number[]) {
    const s = statsRef.current
    const correct = isPerfect(target, finalPicks)
    if (correct) playBlip()
    else playBuzz()
    flash(correct ? 'hit' : 'miss')
    s.rounds += 1
    if (correct) {
      s.perfect += 1
      // eslint-disable-next-line react-hooks/purity -- evaluate() only runs from the tap handler, never during render
      s.perfectMs += performance.now() - s.inputStartedAt
      // level of the round just reproduced — difficulty must be demonstrated, not merely visited
      s.correctPeak = Math.max(s.correctPeak, adaptive.level)
    }
    const next = stepAdaptive(adaptive, correct)
    if (next.level > adaptive.level) playChime()
    s.peak = Math.max(s.peak, next.level)
    setAdaptive(next)
    setPhase('feedback')
    timerRef.current = setTimeout(() => {
      if (doneRef.current) return
      beginRound(next.level)
    }, FEEDBACK_MS)
  }

  function tap(cell: number) {
    if (doneRef.current || phase !== 'input') return
    const picked = picks.includes(cell)
    if (!picked && picks.length >= config.count) return // selection capped at the flashed count
    const next = picked ? picks.filter(c => c !== cell) : [...picks, cell]
    setPicks(next)
    if (next.length === config.count) evaluate(next)
  }

  const targetSet = new Set(target)
  const pickSet = new Set(picks)

  function cellClass(i: number): string {
    let cls = 'memory-matrix__cell'
    if (phase === 'show' && targetSet.has(i)) cls += ' memory-matrix__cell--lit'
    if (phase === 'input' && pickSet.has(i)) cls += ' memory-matrix__cell--pick'
    if (phase === 'feedback') {
      if (targetSet.has(i)) cls += ' memory-matrix__cell--hit'
      else if (pickSet.has(i)) cls += ' memory-matrix__cell--miss'
    }
    return cls
  }

  const prompt =
    phase === 'show' ? 'Memorize…'
    : phase === 'input' ? `Redraw it — ${config.count - picks.length} to go`
    : isPerfect(target, picks) ? 'Perfect!'
    : 'Not quite'

  return (
    <div className="game memory-matrix" data-feedback={feedback}>
      <div className="hud">
        <span className={secLeft <= 5 ? 'hud__timer hud__timer--low' : 'hud__timer'}>{secLeft}s</span>
        <span className="hud__level" key={adaptive.level}>Lv {adaptive.level}</span>
        <span className="hud__combo" key={round + 1}>R{round + 1}</span>
      </div>
      <p className="memory-matrix__prompt" aria-live="polite">{prompt}</p>
      <div
        className="memory-matrix__grid"
        style={{ '--grid': config.grid } as CSSProperties}
      >
        {Array.from({ length: config.grid * config.grid }, (_, i) => (
          <button
            type="button"
            key={`${round}-${i}`}
            className={cellClass(i)}
            aria-label={`Cell ${i + 1}`}
            onClick={() => tap(i)}
          />
        ))}
      </div>
    </div>
  )
}
