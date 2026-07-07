import { stepAdaptive, type AdaptiveState } from './adaptive'

const at = (level: number): AdaptiveState => ({ level, correctRun: 0, missRun: 0 })

it('levels up after 3 consecutive correct answers', () => {
  let s = at(4)
  s = stepAdaptive(s, true)
  s = stepAdaptive(s, true)
  expect(s.level).toBe(4)
  s = stepAdaptive(s, true)
  expect(s).toEqual({ level: 5, correctRun: 0, missRun: 0 })
})

it('levels down after 2 consecutive misses', () => {
  let s = at(4)
  s = stepAdaptive(s, false)
  expect(s.level).toBe(4)
  s = stepAdaptive(s, false)
  expect(s).toEqual({ level: 3, correctRun: 0, missRun: 0 })
})

it('a miss resets the correct run (and vice versa)', () => {
  let s = at(4)
  s = stepAdaptive(s, true)
  s = stepAdaptive(s, true)
  s = stepAdaptive(s, false)
  expect(s.correctRun).toBe(0)
  s = stepAdaptive(s, true)
  expect(s.missRun).toBe(0)
})

it('clamps at min 1 and max 10', () => {
  let low = at(1)
  low = stepAdaptive(low, false)
  low = stepAdaptive(low, false)
  expect(low).toEqual({ level: 1, correctRun: 0, missRun: 0 })

  let high = at(10)
  high = stepAdaptive(high, true)
  high = stepAdaptive(high, true)
  high = stepAdaptive(high, true)
  expect(high).toEqual({ level: 10, correctRun: 0, missRun: 0 })
})
