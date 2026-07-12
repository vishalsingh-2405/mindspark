import { useEffect, useMemo, useRef, useState } from 'react'
import { playBlip, playBuzz, playChime, playTick } from '../../audio/sfx'
import { stepAdaptive, type AdaptiveState } from '../../lib/adaptive'
import { createRng } from '../../lib/rng'
import { useCountdown } from '../../lib/useCountdown'
import type { GameProps } from '../types'
import { checkEntry, FULL_MS_PER_DIGIT, makeDigits, spanConfig, toScore, ZERO_MS_PER_DIGIT } from './logic'

const RUN_MS = 60_000
const GAP_MS = 150
const FEEDBACK_MS = 700
const PAD_DIGITS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0']

type Phase = 'show' | 'entry' | 'feedback'

interface Round {
  target: string
  showMs: number
}

function makeRound(level: number, rng: () => number): Round {
  const cfg = spanConfig(level)
  return { target: makeDigits(cfg.length, rng), showMs: cfg.showMs }
}

export function DigitSpan({ difficulty, onFinish }: GameProps) {
  // eslint-disable-next-line react-hooks/purity -- intentional: seed the RNG from wall-clock time once per mount
  const rng = useMemo(() => createRng(Date.now() % 2 ** 31), [])
  const [adaptive, setAdaptive] = useState<AdaptiveState>({ level: difficulty, correctRun: 0, missRun: 0 })
  const [round, setRound] = useState<Round>(() => makeRound(difficulty, rng))
  const [phase, setPhase] = useState<Phase>('show')
  const [showIndex, setShowIndex] = useState(0)
  const [digitVisible, setDigitVisible] = useState(true)
  const [entry, setEntry] = useState('')
  const [lastCorrect, setLastCorrect] = useState(false)
  const [combo, setCombo] = useState(0)
  const { msLeft: timeLeft } = useCountdown(RUN_MS, RUN_MS)
  const statsRef = useRef({
    correct: 0,
    total: 0,
    correctMs: 0,
    correctLen: 0,
    peak: difficulty,
    correctPeak: 0,
    entryStartedAt: 0, // placeholder value, always overwritten when the entry phase begins
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
    const accuracy = s.total ? s.correct / s.total : 0
    const avgMs = s.correct ? s.correctMs / s.correct : 0 // speed measured on correct recalls only
    const avgLen = s.correct ? s.correctLen / s.correct : 0
    onFinish({
      gameId: 'digit-span',
      skill: 'memory',
      // score reflects demonstrated skill: no correct rounds → correctPeak 0 → score 0
      score: toScore({
        difficultyReached: s.correctPeak,
        accuracy,
        avgMs,
        fullMs: avgLen * FULL_MS_PER_DIGIT,
        zeroMs: avgLen * ZERO_MS_PER_DIGIT,
      }),
      difficultyReached: s.peak, // actual peak still reported for next-session level resume
      accuracy,
      avgMs,
    })
  }, [timeLeft, onFinish])

  // show phase: each digit stays up for showMs, then a GAP_MS blank before the next (or the keypad)
  useEffect(() => {
    if (phase !== 'show') return
    if (digitVisible) {
      const t = setTimeout(() => setDigitVisible(false), round.showMs)
      return () => clearTimeout(t)
    }
    const t = setTimeout(() => {
      if (showIndex + 1 >= round.target.length) {
        statsRef.current.entryStartedAt = performance.now()
        setPhase('entry')
      } else {
        setShowIndex(i => i + 1)
        setDigitVisible(true)
      }
    }, GAP_MS)
    return () => clearTimeout(t)
  }, [phase, digitVisible, showIndex, round])

  // feedback phase: brief verdict, then the next round at the (possibly stepped) level
  useEffect(() => {
    if (phase !== 'feedback') return
    const t = setTimeout(() => {
      if (doneRef.current) return
      setRound(makeRound(adaptive.level, rng))
      setEntry('')
      setShowIndex(0)
      setDigitVisible(true)
      setPhase('show')
    }, FEEDBACK_MS)
    return () => clearTimeout(t)
  }, [phase, adaptive.level, rng])

  function submit(finalEntry: string) {
    if (doneRef.current) return
    const s = statsRef.current
    const correct = checkEntry(round.target, finalEntry)
    if (correct) playBlip()
    else playBuzz()
    s.total += 1
    if (correct) {
      s.correct += 1
      // eslint-disable-next-line react-hooks/purity -- submit() only runs from the onClick handler, never during render
      s.correctMs += performance.now() - s.entryStartedAt
      s.correctLen += round.target.length
      // level of the span just recalled — difficulty must be demonstrated, not merely visited
      s.correctPeak = Math.max(s.correctPeak, adaptive.level)
    }
    const next = stepAdaptive(adaptive, correct)
    if (next.level > adaptive.level) playChime()
    s.peak = Math.max(s.peak, next.level)
    setAdaptive(next)
    setCombo(c => (correct ? c + 1 : 0))
    setLastCorrect(correct)
    setPhase('feedback')
  }

  function press(digit: string) {
    if (phase !== 'entry' || doneRef.current) return
    const next = entry + digit
    setEntry(next)
    if (next.length >= round.target.length) submit(next) // auto-submit at target length
  }

  function backspace() {
    if (phase !== 'entry' || doneRef.current) return
    setEntry(e => e.slice(0, -1))
  }

  return (
    <div className="game digit-span">
      <div className="hud">
        <span className="hud__timer">{secLeft}s</span>
        <span className="hud__level">Lv {adaptive.level}</span>
        {combo > 1 ? <span className="hud__combo" aria-hidden="true">×{combo}</span> : <span />}
      </div>
      {phase === 'show' && (
        <div className="digit-span__digit" aria-live="polite">
          {digitVisible ? round.target[showIndex] : '\u00a0'}
        </div>
      )}
      {phase === 'entry' && (
        <>
          <div className="digit-span__entry" aria-live="polite">
            {entry.padEnd(round.target.length, '·')}
          </div>
          <div className="digit-span__pad">
            {PAD_DIGITS.map(d => (
              <button
                type="button"
                key={d}
                className={d === '0' ? 'digit-span__key digit-span__key--zero' : 'digit-span__key'}
                onClick={() => press(d)}
              >
                {d}
              </button>
            ))}
            <button
              type="button"
              className="digit-span__key digit-span__key--del"
              aria-label="Backspace"
              onClick={backspace}
            >
              ⌫
            </button>
          </div>
        </>
      )}
      {phase === 'feedback' && (
        <div
          className={`digit-span__digit ${lastCorrect ? 'digit-span__digit--good' : 'digit-span__digit--bad'}`}
          aria-live="polite"
        >
          {lastCorrect ? '✓' : round.target}
        </div>
      )}
    </div>
  )
}
