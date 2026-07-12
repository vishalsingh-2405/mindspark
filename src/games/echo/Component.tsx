import { useEffect, useMemo, useRef, useState } from 'react'
import { playBlip, playBuzz, playChime, playTick } from '../../audio/sfx'
import { stepAdaptive, type AdaptiveState } from '../../lib/adaptive'
import { createRng } from '../../lib/rng'
import { useCountdown } from '../../lib/useCountdown'
import { useFeedback } from '../../lib/useFeedback'
import type { GameProps } from '../types'
import { echoConfig, makeSequence, toScore } from './logic'

const RUN_MS = 75_000
const GAP_MS = 150 // dark pause between lit tiles during playback
const FEEDBACK_MS = 600

type Phase = 'play' | 'input' | 'feedback'

interface Round {
  seq: number[]
  playMs: number
}

export function Echo({ difficulty, onFinish }: GameProps) {
  // eslint-disable-next-line react-hooks/purity -- intentional: seed the RNG from wall-clock time once per mount
  const rng = useMemo(() => createRng(Date.now() % 2 ** 31), [])
  const [adaptive, setAdaptive] = useState<AdaptiveState>({ level: difficulty, correctRun: 0, missRun: 0 })
  const [round, setRound] = useState<Round>(() => {
    const cfg = echoConfig(difficulty)
    return { seq: makeSequence(cfg.seqLen, rng), playMs: cfg.playMs }
  })
  const [phase, setPhase] = useState<Phase>('play')
  const [lit, setLit] = useState<number | null>(null)
  const [inputPos, setInputPos] = useState(0)
  const [lastPerfect, setLastPerfect] = useState(false)
  const { msLeft: timeLeft } = useCountdown(RUN_MS, RUN_MS)
  const [feedback, flash] = useFeedback()
  const statsRef = useRef({
    rounds: 0,
    perfect: 0,
    perfectTapMs: 0, // per-tap interval total, perfect rounds only
    perfectTaps: 0,
    peak: difficulty,
    correctPeak: 0,
    roundTapMs: 0, // current round's accumulator, discarded on a miss
    roundTaps: 0,
    lastTapAt: 0,
  })
  const doneRef = useRef(false)

  const secLeft = Math.max(0, Math.ceil(timeLeft / 1000))
  useEffect(() => {
    if (secLeft > 0 && secLeft <= 3 && !doneRef.current) playTick()
  }, [secLeft])

  useEffect(() => {
    if (timeLeft > 0 || doneRef.current) return
    doneRef.current = true
    const s = statsRef.current
    const accuracy = s.rounds ? s.perfect / s.rounds : 0
    const avgMs = s.perfectTaps ? s.perfectTapMs / s.perfectTaps : 0 // speed measured on perfect rounds only
    onFinish({
      gameId: 'echo',
      skill: 'memory',
      // score reflects demonstrated skill: no perfect rounds → correctPeak 0 → score 0
      score: toScore({ difficultyReached: s.correctPeak, accuracy, avgMs }),
      difficultyReached: s.peak, // actual peak still reported for next-session level resume
      accuracy,
      avgMs,
    })
  }, [timeLeft, onFinish])

  // playback: light each tile in order for playMs, with a short dark gap between tiles
  useEffect(() => {
    if (phase !== 'play') return
    const timers: ReturnType<typeof setTimeout>[] = []
    round.seq.forEach((tile, i) => {
      const at = i * (round.playMs + GAP_MS)
      timers.push(setTimeout(() => {
        if (doneRef.current) return
        setLit(tile)
        playBlip() // one shared pitch: sfx has no per-tile tones and stays unmodified
      }, at))
      timers.push(setTimeout(() => setLit(null), at + round.playMs))
    })
    timers.push(setTimeout(() => {
      if (doneRef.current) return
      statsRef.current.lastTapAt = performance.now() // input clock starts when the tiles unlock
      setPhase('input')
    }, round.seq.length * (round.playMs + GAP_MS)))
    return () => timers.forEach(clearTimeout)
  }, [phase, round])

  // feedback: brief pause, then deal the next round at the (already stepped) adaptive level
  useEffect(() => {
    if (phase !== 'feedback') return
    const t = setTimeout(() => {
      if (doneRef.current) return
      const s = statsRef.current
      s.roundTapMs = 0
      s.roundTaps = 0
      const cfg = echoConfig(adaptive.level)
      setRound({ seq: makeSequence(cfg.seqLen, rng), playMs: cfg.playMs })
      setInputPos(0)
      setPhase('play')
    }, FEEDBACK_MS)
    return () => clearTimeout(t)
  }, [phase, adaptive.level, rng])

  function endRound(perfect: boolean) {
    const s = statsRef.current
    s.rounds += 1
    if (perfect) {
      s.perfect += 1
      s.perfectTapMs += s.roundTapMs
      s.perfectTaps += s.roundTaps
      // level of the round just echoed — difficulty must be demonstrated, not merely visited
      s.correctPeak = Math.max(s.correctPeak, adaptive.level)
    }
    const next = stepAdaptive(adaptive, perfect)
    if (next.level > adaptive.level) playChime()
    s.peak = Math.max(s.peak, next.level)
    flash(perfect ? 'hit' : 'miss') // round resolution only — playback/input blips stay quiet
    setAdaptive(next)
    setLastPerfect(perfect)
    setPhase('feedback')
  }

  function tap(tile: number) {
    if (doneRef.current || phase !== 'input') return
    if (tile !== round.seq[inputPos]) {
      playBuzz()
      endRound(false) // first wrong tap fails the round immediately
      return
    }
    playBlip()
    const s = statsRef.current
    // eslint-disable-next-line react-hooks/purity -- tap() only runs from the onClick handler, never during render
    const now = performance.now()
    s.roundTapMs += now - s.lastTapAt
    s.roundTaps += 1
    s.lastTapAt = now
    if (inputPos + 1 === round.seq.length) endRound(true)
    else setInputPos(inputPos + 1)
  }

  const status = phase === 'play' ? 'Watch…' : phase === 'input' ? 'Your turn' : lastPerfect ? 'Perfect!' : 'Miss!'
  const statusMod = phase === 'feedback' ? (lastPerfect ? ' echo__status--hit' : ' echo__status--miss') : ''

  return (
    <div className="game echo" data-feedback={feedback}>
      <div className="hud">
        <span className={secLeft <= 5 ? 'hud__timer hud__timer--low' : 'hud__timer'}>{secLeft}s</span>
        <span className="hud__level" key={adaptive.level}>Lv {adaptive.level}</span>
        <span />
      </div>
      <div className={`echo__status${statusMod}`} aria-live="polite">{status}</div>
      <div className="echo__grid">
        {[0, 1, 2, 3].map(tile => (
          <button
            type="button"
            key={tile}
            className={`echo__tile echo__tile--${tile}${lit === tile ? ' echo__tile--lit' : ''}`}
            aria-label={`Tile ${tile + 1}`}
            disabled={phase === 'play'}
            onClick={() => tap(tile)}
          />
        ))}
      </div>
    </div>
  )
}
