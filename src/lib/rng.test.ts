import { createRng, randInt } from './rng'

it('is deterministic for the same seed', () => {
  const a = createRng(42)
  const b = createRng(42)
  expect([a(), a(), a()]).toEqual([b(), b(), b()])
})

it('produces values in [0, 1)', () => {
  const rng = createRng(7)
  for (let i = 0; i < 1000; i++) {
    const v = rng()
    expect(v).toBeGreaterThanOrEqual(0)
    expect(v).toBeLessThan(1)
  }
})

it('pins the mulberry32 output for seed 42 (cross-version determinism)', () => {
  const rng = createRng(42)
  const first = [rng(), rng(), rng()]
  expect(first).toEqual([0.6011037519201636, 0.44829055899754167, 0.8524657934904099])
})

it('randInt stays within inclusive bounds', () => {
  const rng = createRng(1)
  for (let i = 0; i < 1000; i++) {
    const v = randInt(rng, 3, 9)
    expect(v).toBeGreaterThanOrEqual(3)
    expect(v).toBeLessThanOrEqual(9)
  }
})
