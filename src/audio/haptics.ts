import { useAppStore } from '../state/store'

/** Gated by the hapticsOn setting (default on) and Vibration API presence (absent on iOS Safari). */
function vibrate(pattern: number | number[]): void {
  if (useAppStore.getState().settings?.hapticsOn === false) return
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return
  navigator.vibrate(pattern)
}

export function hapticTap(): void { vibrate(8) }
export function hapticMiss(): void { vibrate(25) }
export function hapticLevelUp(): void { vibrate([10, 40, 10]) }
export function hapticComplete(): void { vibrate([12, 30, 12, 30, 24]) }
