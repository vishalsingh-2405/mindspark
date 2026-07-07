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

it('randInt stays within inclusive bounds', () => {
  const rng = createRng(1)
  for (let i = 0; i < 1000; i++) {
    const v = randInt(rng, 3, 9)
    expect(v).toBeGreaterThanOrEqual(3)
    expect(v).toBeLessThanOrEqual(9)
  }
})
