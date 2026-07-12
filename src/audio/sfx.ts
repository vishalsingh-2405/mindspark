import { useAppStore } from '../state/store'
import { hapticTap, hapticMiss, hapticLevelUp, hapticComplete } from './haptics'

let ctx: AudioContext | null = null
let master: GainNode | null = null

function context(): AudioContext | null {
  if (typeof AudioContext === 'undefined' || !AudioContext) return null
  ctx ??= new AudioContext()
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

function soundOn(): boolean {
  return useAppStore.getState().settings?.soundOn ?? true
}

/** Master bus singleton: gain(0.9) → compressor → destination — keeps layered notes from clipping. */
function bus(ac: AudioContext): AudioNode {
  if (!master) {
    master = ac.createGain()
    master.gain.value = 0.9
    const comp = ac.createDynamicsCompressor()
    master.connect(comp)
    comp.connect(ac.destination)
  }
  return master
}

/** Fire-and-forget synth tone: fast attack, exponential decay; optional schedule delay. */
function tone(freq: number, durMs: number, type: OscillatorType, peak: number, delayMs = 0): void {
  if (!soundOn()) return
  const ac = context()
  if (!ac) return
  const osc = ac.createOscillator()
  const gain = ac.createGain()
  osc.type = type
  osc.frequency.value = freq
  const t = ac.currentTime + delayMs / 1000
  gain.gain.setValueAtTime(0.0001, t)
  gain.gain.exponentialRampToValueAtTime(peak, t + 0.01)
  gain.gain.exponentialRampToValueAtTime(0.0001, t + durMs / 1000)
  osc.connect(gain)
  gain.connect(bus(ac))
  osc.start(t)
  osc.stop(t + durMs / 1000 + 0.02)
}

/** Correct answer: two-note micro-arpeggio + haptic tap. */
export function playBlip(): void {
  hapticTap()
  tone(1318.5, 70, 'triangle', 0.14)
  tone(1975.5, 80, 'triangle', 0.12, 45)
}
/** Wrong answer: soft low thud (was a harsh sawtooth) + haptic. */
export function playBuzz(): void {
  hapticMiss()
  tone(110, 160, 'sine', 0.16)
  tone(82.5, 160, 'sine', 0.1)
}
/** Low-timer warning (quieter than before; no haptic — it fires every second). */
export function playTick(): void { tone(1200, 40, 'square', 0.04) }
/** Level-up: C6-E6-G6 arpeggio + haptic pattern. */
export function playChime(): void {
  hapticLevelUp()
  tone(1046.5, 90, 'triangle', 0.12)
  tone(1318.5, 90, 'triangle', 0.12, 60)
  tone(1568, 140, 'triangle', 0.14, 120)
}
/** Combo milestone: rises a semitone per milestone step, capped at +12. */
export function playCombo(step: number): void {
  tone(880 * 2 ** (Math.min(12, step) / 12), 60, 'triangle', 0.1)
}
/** Session complete: resolved C5-G5-C6-E6 motif; NEW BEST appends G6. */
export function playComplete(newBest = false): void {
  hapticComplete()
  tone(523.25, 90, 'triangle', 0.12)
  tone(783.99, 90, 'triangle', 0.12, 70)
  tone(1046.5, 90, 'triangle', 0.13, 140)
  tone(1318.5, 160, 'triangle', 0.14, 210)
  if (newBest) tone(1568, 260, 'triangle', 0.15, 300)
}
/** Near-subliminal UI tap for nav/flips. */
export function playTap(): void { tone(800, 18, 'sine', 0.05) }

/** Test hook. */
export function _resetAudioForTests(): void { ctx = null; master = null }
