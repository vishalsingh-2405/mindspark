import { createRng } from '../../lib/rng'
import { checkEntry, makeDigits, spanConfig, toScore } from './logic'

it('spanConfig pins length and per-digit show time for all 10 levels', () => {
  const expected: Array<[number, number]> = [
    [3, 625],
    [4, 600],
    [5, 575],
    [6, 550],
    [7, 525],
    [8, 500],
    [9, 475],
    [10, 450],
    [11, 425],
    [11, 400],
  ]
  expected.forEach(([length, showMs], i) => {
    expect(spanConfig(i + 1)).toEqual({ length, showMs })
  })
})

it('makeDigits returns the requested length using digits 0–9 only', () => {
  const rng = createRng(7)
  for (let length = 3; length <= 11; length++) {
    for (let i = 0; i < 50; i++) {
      const s = makeDigits(length, rng)
      expect(s).toHaveLength(length)
      expect(s).toMatch(/^\d+$/)
    }
  }
})

it('makeDigits never lets a digit appear 3× in a row (many seeds)', () => {
  for (let seed = 1; seed <= 300; seed++) {
    const rng = createRng(seed)
    const s = makeDigits(11, rng)
    expect(s).not.toMatch(/(\d)\1\1/)
  }
})

it('checkEntry is exact string equality', () => {
  expect(checkEntry('123', '123')).toBe(true)
  expect(checkEntry('123', '124')).toBe(false)
  expect(checkEntry('123', '12')).toBe(false)
  expect(checkEntry('123', '1234')).toBe(false)
  expect(checkEntry('012', '12')).toBe(false) // leading zeros matter — string, not number, equality
})

it('toScore pins the difficulty/accuracy/speed curve', () => {
  // length-11 window (fullMs 6600, zeroMs 16500): fast perfect run maxes out
  expect(toScore({ difficultyReached: 10, accuracy: 1, avgMs: 4000, fullMs: 6600, zeroMs: 16500 })).toBe(100)
  // length-7 window (fullMs 4200, zeroMs 10500)
  expect(toScore({ difficultyReached: 5, accuracy: 0.8, avgMs: 6000, fullMs: 4200, zeroMs: 10500 })).toBe(60)
  expect(toScore({ difficultyReached: 5, accuracy: 1, avgMs: 4200, fullMs: 4200, zeroMs: 10500 })).toBe(68) // exactly fullMs → full speed
  expect(toScore({ difficultyReached: 5, accuracy: 1, avgMs: 10500, fullMs: 4200, zeroMs: 10500 })).toBe(58) // exactly zeroMs → no speed
  expect(toScore({ difficultyReached: 12, accuracy: 1, avgMs: 1000, fullMs: 1800, zeroMs: 4500 })).toBe(100) // difficulty clamped at 10
})

it('gives no speed credit for zero-correct runs (idle exploit guard)', () => {
  expect(toScore({ difficultyReached: 10, accuracy: 0, avgMs: 0, fullMs: 4200, zeroMs: 10500 })).toBe(65) // difficulty only
  expect(toScore({ difficultyReached: 1, accuracy: 0, avgMs: 0, fullMs: 1800, zeroMs: 4500 })).toBe(7)
})
