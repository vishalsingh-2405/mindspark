import { gradeWord, intervalDays, isMastered, newProgress, LADDER } from './srs'

const seen = (over: Partial<ReturnType<typeof newProgress>> = {}) =>
  ({ ...newProgress('word', '2026-07-07'), ...over })

it('ladder is the spec progression', () => {
  expect(LADDER).toEqual([1, 4, 10, 25, 60])
})

it('unscaled ladder at constant default ease', () => {
  for (let step = 0; step < 5; step++) {
    expect(intervalDays(seen({ step, ease: 2.5 }))).toBe(LADDER[step])
  }
})

it('a new word graded "knew" is due in 1 day', () => {
  const p = gradeWord(newProgress('w', '2026-07-07'), true, '2026-07-07')
  expect(p.step).toBe(0)
  expect(p.due).toBe('2026-07-08')
  expect(p.lastResult).toBe('knew')
})

it('successive "knew" climbs the ease-scaled ladder', () => {
  let p = newProgress('w', '2026-07-07')
  const gaps: number[] = []
  let day = '2026-07-07'
  for (let i = 0; i < 5; i++) {
    p = gradeWord(p, true, day)
    gaps.push(intervalDays(p))
    day = p.due
  }
  expect(gaps).toEqual([1, 4, 11, 29, 72]) // ladder scaled by growing ease — VERIFY AND PIN ACTUALS
})

it('"did not know" resets to 1 day, drops ease a notch, counts a lapse', () => {
  const p = gradeWord(seen({ step: 3, ease: 2.5 }), false, '2026-07-07')
  expect(p.step).toBe(0)
  expect(p.due).toBe('2026-07-08')
  expect(p.ease).toBeCloseTo(2.3)
  expect(p.lapses).toBe(1)
  expect(p.lastResult).toBe('missed')
})

it('ease is clamped to [1.3, 3.0]', () => {
  const floor = gradeWord(seen({ ease: 1.35 }), false, '2026-07-07')
  expect(floor.ease).toBeCloseTo(1.3)
  const ceil = gradeWord(seen({ ease: 2.95, step: 1 }), true, '2026-07-07')
  expect(ceil.ease).toBeCloseTo(3.0)
})

it('low ease shrinks intervals, high ease stretches them', () => {
  expect(intervalDays(seen({ step: 2, ease: 1.3 }))).toBe(5)   // round(10 * 1.3/2.5)
  expect(intervalDays(seen({ step: 2, ease: 3.0 }))).toBe(12)  // round(10 * 3.0/2.5)
})

it('mastered means top of the ladder', () => {
  expect(isMastered(seen({ step: 4 }))).toBe(true)
  expect(isMastered(seen({ step: 3 }))).toBe(false)
})
