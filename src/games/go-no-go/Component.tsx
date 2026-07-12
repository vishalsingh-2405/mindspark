import { useEffect, useMemo, useRef, useState } from 'react'
import { playBlip, playBuzz, playChime, playCombo, playTick } from '../../audio/sfx'
import { stepAdaptive, type AdaptiveState } from '../../lib/adaptive'
import { createRng } from '../../lib/rng'
import { useCountdown } from '../../lib/useCountdown'
import { useFeedback } from '../../lib/useFeedback'
import type { GameProps } from '../types'
import { gngConfig, judge, nextStimulus, toScore, type Stimulus } from './logic'

const ROUND_MS = 45_000
const GAP_MS = 350

export function GoNoGo({ difficulty, onFinish }: GameProps) {
  // eslint-disable-next-line react-hooks/purity -- intentional: seed the RNG from wall-clock time once per mount
  const rng = useMemo(() => createRng(Date.now() % 2 ** 31), [])
  const [adaptive, setAdaptive] = useState<AdaptiveState>({ level: difficulty, correctRun: 0, missRun: 0 })
  const [stim, setStim] = useState<Stimulus | null>(null) // null = blank gap between stimuli
  const { msLeft: timeLeft } = useCountdown(ROUND_MS, ROUND_MS) // fixed round: no time bonus, pace is the mechanic
  const [combo, setCombo] = useState(0)
  const [feedback, flash] = useFeedback()
  const statsRef = useRef({ correct: 0, total: 0, goMs: 0, goTaps: 0, peak: difficulty, correctPeak: 0, shownAt: 0 })
  const adaptiveRef = useRef<AdaptiveState>({ level: difficulty, correctRun: 0, missRun: 0 })
  const stimRef = useRef<Stimulus | null>(null)
  const resolveRef = useRef<(isGo: boolean, tapped: boolean) => void>(() => {})
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const doneRef = useRef(false)

  // Stimulus loop: show for windowMs → resolve → 350ms blank gap → next at the CURRENT adaptive level.
  // Lives in a mount effect so the tap handler and the expiry timeout share one resolver.
  useEffect(() => {
    function showNext() {
      if (doneRef.current) return
      const level = adaptiveRef.current.level
      const stimulus = nextStimulus(level, rng)
      stimRef.current = stimulus
      statsRef.current.shownAt = performance.now()
      setStim(stimulus)
      timeoutRef.current = setTimeout(() => resolve(stimulus.isGo, false), gngConfig(level).windowMs)
    }

    function resolve(isGo: boolean, tapped: boolean) {
      if (doneRef.current || !stimRef.current) return // already resolved — first tap counts
      clearTimeout(timeoutRef.current)
      stimRef.current = null
      const s = statsRef.current
      const prev = adaptiveRef.current
      const correct = judge(isGo, tapped)
      if (correct) playBlip() // doubles as the soft cue for a correctly withheld red
      else playBuzz()
      // Vignette only where attention belongs: hit on a tapped green, miss on commission/omission.
      // A quiet red expiry stays quiet — flashing every stimulus would be noise.
      if (correct && tapped) flash('hit')
      else if (!correct) flash('miss')
      s.total += 1
      if (correct) {
        s.correct += 1
        // level of the stimulus just resolved — difficulty must be demonstrated, not merely visited
        s.correctPeak = Math.max(s.correctPeak, prev.level)
        if (tapped) {
          // latency is only meaningful for correct go taps
          s.goMs += performance.now() - s.shownAt
          s.goTaps += 1
        }
      }
      const next = stepAdaptive(prev, correct)
      if (next.level > prev.level) playChime()
      s.peak = Math.max(s.peak, next.level)
      adaptiveRef.current = next
      setAdaptive(next)
      setCombo(c => {
        const nextCombo = correct ? c + 1 : 0
        if (nextCombo > 0 && nextCombo % 5 === 0) playCombo(nextCombo / 5)
        return nextCombo
      })
      setStim(null) // straight into the gap
      timeoutRef.current = setTimeout(showNext, GAP_MS)
    }

    resolveRef.current = resolve
    timeoutRef.current = setTimeout(showNext, GAP_MS) // lead-in gap so stimulus 1 lands after first paint
    return () => clearTimeout(timeoutRef.current) // only one timeout is ever pending
  }, [rng, flash])

  const secLeft = Math.max(0, Math.ceil(timeLeft / 1000))
  useEffect(() => {
    if (secLeft > 0 && secLeft <= 3 && !doneRef.current) playTick()
  }, [secLeft])

  useEffect(() => {
    if (timeLeft > 0 || doneRef.current) return
    doneRef.current = true
    clearTimeout(timeoutRef.current) // the timer hitting 0 wins even mid-stimulus
    const s = statsRef.current
    const accuracy = s.total ? s.correct / s.total : 0
    const avgMs = s.goTaps ? s.goMs / s.goTaps : 0 // speed measured on correct go taps only
    onFinish({
      gameId: 'go-no-go',
      skill: 'reaction',
      // score reflects demonstrated skill: nothing correct → correctPeak 0, accuracy 0 → score 0
      score: toScore({ difficultyReached: s.correctPeak, accuracy, avgMs }),
      difficultyReached: s.peak, // actual peak still reported for next-session level resume
      accuracy,
      avgMs,
    })
  }, [timeLeft, onFinish])

  function tap() {
    if (doneRef.current || !stimRef.current) return // taps during the blank gap are ignored
    resolveRef.current(stimRef.current.isGo, true)
  }

  return (
    <div className="game go-no-go" data-feedback={feedback}>
      <div className="hud">
        <span className={secLeft <= 5 ? 'hud__timer hud__timer--low' : 'hud__timer'}>{secLeft}s</span>
        <span className="hud__level" key={adaptive.level}>Lv {adaptive.level}</span>
        {combo > 1
          ? <span className={combo % 5 === 0 ? 'hud__combo hud__combo--milestone' : 'hud__combo'} key={combo} aria-hidden="true">×{combo}</span>
          : <span />}
      </div>
      <button
        type="button"
        className="go-no-go__stage"
        onClick={tap}
        aria-label="Response zone — tap on green, hold on red"
      >
        {stim ? (
          <span className={`go-no-go__stim ${stim.isGo ? 'go-no-go__stim--go' : 'go-no-go__stim--no'}`}>
            <span className="go-no-go__glyph" aria-hidden="true">{stim.isGo ? '●' : '⬣'}</span>
            {stim.isGo ? 'GO' : 'NO'}
          </span>
        ) : null}
      </button>
    </div>
  )
}
