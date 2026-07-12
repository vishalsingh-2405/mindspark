import { useEffect, useMemo, useRef, useState } from 'react'
import { playBlip, playBuzz } from '../../audio/sfx'
import { createRng } from '../../lib/rng'
import { useFeedback } from '../../lib/useFeedback'
import type { GameProps } from '../types'
import { FALSE_START_PENALTY_MS, summarize, trialDelay, type Trial } from './logic'

const TRIAL_COUNT = 5
const RESULT_MS = 900

type Phase = 'wait' | 'go' | 'result'

export function ReactionSpeed({ onFinish }: GameProps) {
  // eslint-disable-next-line react-hooks/purity -- intentional: seed the RNG from wall-clock time once per mount
  const rng = useMemo(() => createRng(Date.now() % 2 ** 31), [])
  const [feedback, flash] = useFeedback()
  const [phase, setPhase] = useState<Phase>('wait')
  const [trialIndex, setTrialIndex] = useState(0)
  const [lastLabel, setLastLabel] = useState('')
  const [best, setBest] = useState<number | null>(null)
  const trialsRef = useRef<Trial[]>([])
  const goAtRef = useRef(0)
  const doneRef = useRef(false)

  useEffect(() => {
    if (phase === 'wait') {
      const t = setTimeout(() => {
        goAtRef.current = performance.now()
        setPhase('go')
      }, trialDelay(rng))
      return () => clearTimeout(t)
    }
    if (phase === 'result') {
      const t = setTimeout(() => {
        if (doneRef.current) return
        if (trialsRef.current.length >= TRIAL_COUNT) {
          doneRef.current = true
          const { avgMs, accuracy, score } = summarize(trialsRef.current)
          onFinish({
            gameId: 'reaction-speed',
            skill: 'reaction',
            score,
            difficultyReached: 1, // non-adaptive: raw milliseconds, no levels
            accuracy,
            avgMs,
          })
          return
        }
        setTrialIndex(i => i + 1)
        setPhase('wait')
      }, RESULT_MS)
      return () => clearTimeout(t)
    }
  }, [phase, trialIndex, rng, onFinish])

  function tap() {
    if (doneRef.current) return
    if (phase === 'wait') {
      playBuzz()
      flash('miss')
      trialsRef.current.push({ ms: FALSE_START_PENALTY_MS, falseStart: true })
      setLastLabel('Too soon!')
      setPhase('result')
    } else if (phase === 'go') {
      const ms = Math.round(performance.now() - goAtRef.current)
      playBlip()
      flash('hit')
      trialsRef.current.push({ ms, falseStart: false })
      setLastLabel(`${ms} ms`)
      setBest(b => (b === null || ms < b ? ms : b))
      setPhase('result')
    }
    // taps during 'result' are ignored
  }

  const label = phase === 'wait' ? 'WAIT…' : phase === 'go' ? 'TAP!' : lastLabel

  return (
    <div className="game reaction-speed" data-feedback={feedback}>
      <div className="hud">
        <span className="hud__combo" key={trialIndex}>Trial {Math.min(trialIndex + 1, TRIAL_COUNT)}/{TRIAL_COUNT}</span>
        <span className="reaction-speed__best">{best !== null ? `Best ${best} ms` : 'Best —'}</span>
      </div>
      <button type="button" className={`reaction-speed__stage reaction-speed__stage--${phase}`} onClick={tap}>
        <span className="reaction-speed__label" aria-live="polite">{label}</span>
      </button>
    </div>
  )
}
