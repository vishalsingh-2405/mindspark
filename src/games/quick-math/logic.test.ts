import { createRng } from '../../lib/rng'
import { generateQuestion, toScore } from './logic'

it('always returns 4 unique choices containing the answer', () => {
  const rng = createRng(3)
  for (let level = 1; level <= 10; level++) {
    for (let i = 0; i < 50; i++) {
      const q = generateQuestion(level, rng)
      expect(q.choices).toHaveLength(4)
      expect(new Set(q.choices).size).toBe(4)
      expect(q.choices).toContain(q.answer)
    }
  }
})

it('level 1–2 is single-digit addition/subtraction with non-negative answers', () => {
  const rng = createRng(5)
  for (let i = 0; i < 100; i++) {
    const q = generateQuestion(1, rng)
    expect(q.text).toMatch(/^\d \+ \d$|^\d − \d$/)
    expect(q.answer).toBeGreaterThanOrEqual(0)
  }
})

it('level 5–6 is multiplication', () => {
  const rng = createRng(9)
  for (let i = 0; i < 20; i++) {
    expect(generateQuestion(6, rng).text).toContain('×')
  }
})

it('division questions always divide evenly', () => {
  const rng = createRng(11)
  for (let i = 0; i < 200; i++) {
    const q = generateQuestion(7, rng)
    if (q.text.includes('÷')) {
      const [a, b] = q.text.split(' ÷ ').map(Number)
      expect(a % b).toBe(0)
      expect(q.answer).toBe(a / b)
    }
  }
})

it('level 9–10 uses two operators with correct precedence', () => {
  const rng = createRng(13)
  const q = generateQuestion(9, rng)
  const m = q.text.match(/^(\d+) \+ (\d+) × (\d+)$/)
  expect(m).not.toBeNull()
  const [, a, b, c] = m!.map(Number)
  expect(q.answer).toBe(a + b * c)
})

it('toScore pins the difficulty/accuracy/speed curve', () => {
  expect(toScore({ difficultyReached: 10, accuracy: 1, avgMs: 1000 })).toBe(100)
  expect(toScore({ difficultyReached: 5, accuracy: 0.8, avgMs: 2500 })).toBe(58)
  expect(toScore({ difficultyReached: 1, accuracy: 0.5, avgMs: 4000 })).toBe(19)
  expect(toScore({ difficultyReached: 1, accuracy: 0, avgMs: 8000 })).toBe(6)
})

it('gives no speed credit for zero-answer runs (idle exploit guard)', () => {
  expect(toScore({ difficultyReached: 10, accuracy: 0, avgMs: 0 })).toBe(60) // difficulty only
  expect(toScore({ difficultyReached: 1, accuracy: 0, avgMs: 0 })).toBe(6)
})
