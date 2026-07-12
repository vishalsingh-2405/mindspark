import { createRng } from '../../lib/rng'
import { isPerfect, matrixConfig, pickCells, toScore } from './logic'

it('pins the config table for all 10 levels', () => {
  expect(matrixConfig(1)).toEqual({ grid: 3, count: 3, flashMs: 960 })
  expect(matrixConfig(2)).toEqual({ grid: 3, count: 4, flashMs: 920 })
  expect(matrixConfig(3)).toEqual({ grid: 3, count: 4, flashMs: 880 })
  expect(matrixConfig(4)).toEqual({ grid: 4, count: 4, flashMs: 840 })
  expect(matrixConfig(5)).toEqual({ grid: 4, count: 5, flashMs: 800 })
  expect(matrixConfig(6)).toEqual({ grid: 4, count: 6, flashMs: 760 })
  expect(matrixConfig(7)).toEqual({ grid: 4, count: 6, flashMs: 720 })
  expect(matrixConfig(8)).toEqual({ grid: 5, count: 6, flashMs: 680 })
  expect(matrixConfig(9)).toEqual({ grid: 5, count: 7, flashMs: 640 })
  expect(matrixConfig(10)).toEqual({ grid: 5, count: 8, flashMs: 600 })
})

it('pickCells returns distinct in-range indices across many seeds', () => {
  for (let seed = 1; seed <= 50; seed++) {
    const rng = createRng(seed)
    for (let level = 1; level <= 10; level++) {
      const { grid, count } = matrixConfig(level)
      const cells = pickCells(grid, count, rng)
      expect(cells).toHaveLength(count)
      expect(new Set(cells).size).toBe(count)
      for (const c of cells) {
        expect(c).toBeGreaterThanOrEqual(0)
        expect(c).toBeLessThan(grid * grid)
      }
    }
  }
})

it('isPerfect requires the pick set to equal the flashed set', () => {
  expect(isPerfect([1, 5, 7], [7, 1, 5])).toBe(true) // order-insensitive
  expect(isPerfect([1, 5, 7], [1, 5, 8])).toBe(false) // one wrong cell = miss
  expect(isPerfect([1, 5, 7], [1, 5])).toBe(false) // short pick never matches
})

it('toScore pins the difficulty/accuracy/speed curve', () => {
  expect(toScore({ difficultyReached: 10, accuracy: 1, avgMs: 3000 })).toBe(100)
  expect(toScore({ difficultyReached: 5, accuracy: 0.8, avgMs: 5500 })).toBe(58)
  expect(toScore({ difficultyReached: 1, accuracy: 0.5, avgMs: 8000 })).toBe(19)
  expect(toScore({ difficultyReached: 1, accuracy: 0, avgMs: 10_000 })).toBe(7)
})

it('gives no speed credit for zero-perfect runs (idle exploit guard)', () => {
  expect(toScore({ difficultyReached: 10, accuracy: 0, avgMs: 0 })).toBe(65) // difficulty only
  expect(toScore({ difficultyReached: 0, accuracy: 0, avgMs: 0 })).toBe(0)
})
