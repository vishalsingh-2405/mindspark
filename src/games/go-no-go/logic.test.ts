import { createRng } from '../../lib/rng'
import { gngConfig, judge, nextStimulus, toScore } from './logic'

it('gngConfig pins window and red ratio for all 10 levels', () => {
  const windows = [855, 810, 765, 720, 675, 630, 585, 540, 495, 450]
  const ratios = [0.27, 0.29, 0.31, 0.33, 0.35, 0.37, 0.39, 0.41, 0.43, 0.45]
  for (let level = 1; level <= 10; level++) {
    const cfg = gngConfig(level)
    expect(cfg.windowMs).toBe(windows[level - 1])
    expect(cfg.redRatio).toBeCloseTo(ratios[level - 1], 10)
  }
})

it('nextStimulus honors the red ratio over many draws', () => {
  const rng = createRng(7)
  for (const level of [1, 5, 10]) {
    const n = 5000
    let go = 0
    for (let i = 0; i < n; i++) {
      if (nextStimulus(level, rng).isGo) go++
    }
    const expected = 1 - gngConfig(level).redRatio
    expect(go / n).toBeGreaterThan(expected - 0.03)
    expect(go / n).toBeLessThan(expected + 0.03)
  }
})

it('judge truth table: tap greens, withhold reds', () => {
  expect(judge(true, true)).toBe(true) // green + tap → correct
  expect(judge(true, false)).toBe(false) // green ignored → miss
  expect(judge(false, true)).toBe(false) // red tapped → miss
  expect(judge(false, false)).toBe(true) // red withheld → correct
})

it('toScore pins the difficulty/accuracy/speed curve', () => {
  expect(toScore({ difficultyReached: 10, accuracy: 1, avgMs: 350 })).toBe(100)
  expect(toScore({ difficultyReached: 10, accuracy: 1, avgMs: 200 })).toBe(100) // speed clamps at full
  expect(toScore({ difficultyReached: 5, accuracy: 0.8, avgMs: 625 })).toBe(59)
  expect(toScore({ difficultyReached: 3, accuracy: 0.9, avgMs: 480 })).toBe(57)
  expect(toScore({ difficultyReached: 1, accuracy: 0.5, avgMs: 900 })).toBe(20)
  expect(toScore({ difficultyReached: 10, accuracy: 1, avgMs: 1200 })).toBe(80) // speed clamps at none
})

it('gives no speed credit for runs with no go taps (idle exploit guard)', () => {
  expect(toScore({ difficultyReached: 10, accuracy: 1, avgMs: 0 })).toBe(80) // difficulty + accuracy only
  expect(toScore({ difficultyReached: 1, accuracy: 0, avgMs: 0 })).toBe(5)
  expect(toScore({ difficultyReached: 0, accuracy: 0, avgMs: 0 })).toBe(0) // nothing correct → score 0
})
