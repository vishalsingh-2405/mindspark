import { useAppStore } from '../state/store'

let ctx: AudioContext | null = null

function context(): AudioContext | null {
  if (typeof AudioContext === 'undefined' || !AudioContext) return null
  ctx ??= new AudioContext()
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

function soundOn(): boolean {
  return useAppStore.getState().settings?.soundOn ?? true
}

/** Fire-and-forget synth tone: fast attack, exponential decay. */
function tone(freq: number, durMs: number, type: OscillatorType, peak: number): void {
  if (!soundOn()) return
  const ac = context()
  if (!ac) return
  const osc = ac.createOscillator()
  const gain = ac.createGain()
  osc.type = type
  osc.frequency.value = freq
  const t = ac.currentTime
  gain.gain.setValueAtTime(0.0001, t)
  gain.gain.exponentialRampToValueAtTime(peak, t + 0.01)
  gain.gain.exponentialRampToValueAtTime(0.0001, t + durMs / 1000)
  osc.connect(gain)
  gain.connect(ac.destination)
  osc.start(t)
  osc.stop(t + durMs / 1000 + 0.02)
}

/** Correct answer. */
export function playBlip(): void { tone(880, 90, 'triangle', 0.18) }
/** Wrong answer. */
export function playBuzz(): void { tone(140, 180, 'sawtooth', 0.12) }
/** Low-timer warning. */
export function playTick(): void { tone(1200, 40, 'square', 0.06) }
/** Level-up / deck complete: rising two-note. */
export function playChime(): void {
  tone(660, 120, 'sine', 0.16)
  setTimeout(() => tone(990, 160, 'sine', 0.16), 110)
}

/** Test hook. */
export function _resetAudioForTests(): void { ctx = null }
