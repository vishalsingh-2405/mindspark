export interface AdaptiveState {
  level: number
  correctRun: number
  missRun: number
}

/** Spec: ~3 consecutive correct → step up; ~2 consecutive misses → step down. */
export function stepAdaptive(
  s: AdaptiveState,
  correct: boolean,
  min = 1,
  max = 10,
): AdaptiveState {
  if (correct) {
    const run = s.correctRun + 1
    if (run >= 3) return { level: Math.min(max, s.level + 1), correctRun: 0, missRun: 0 }
    return { ...s, correctRun: run, missRun: 0 }
  }
  const run = s.missRun + 1
  if (run >= 2) return { level: Math.max(min, s.level - 1), correctRun: 0, missRun: 0 }
  return { ...s, missRun: run, correctRun: 0 }
}
