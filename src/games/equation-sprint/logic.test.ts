import { createRng } from '../../lib/rng'
import { generateEquation, toScore } from './logic'

/** Evaluate the left-hand side of a displayed equation (× before + for the L9–10 two-op form). */
function evalExpr(expr: string): number {
  const two = expr.match(/^(\d+) \+ (\d+) × (\d+)$/)
  if (two) return Number(two[1]) + Number(two[2]) * Number(two[3])
  const one = expr.match(/^(\d+) ([+−×÷]) (\d+)$/)
  if (!one) throw new Error(`unparsed expression: ${expr}`)
  const a = Number(one[1])
  const b = Number(one[3])
  switch (one[2]) {
    case '+': return a + b
    case '−': return a - b
    case '×': return a * b
    default: return a / b
  }
}

/** Split "expr = shown" into its parsed halves, asserting the overall shape. */
function parse(text: string): { expr: string; shown: number } {
  const m = text.match(/^(.+) = (\d+)$/)
  expect(m).not.toBeNull()
  return { expr: m![1], shown: Number(m![2]) }
}

it('isTrue matches the actual evaluation of the displayed equation across levels and seeds', () => {
  for (let seed = 1; seed <= 20; seed++) {
    const rng = createRng(seed)
    for (let level = 1; level <= 10; level++) {
      for (let i = 0; i < 25; i++) {
        const eq = generateEquation(level, rng)
        const { expr, shown } = parse(eq.text)
        expect(evalExpr(expr) === shown).toBe(eq.isTrue)
      }
    }
  }
})

it('false equations are near-misses: off by 1–3, never negative', () => {
  for (let seed = 1; seed <= 20; seed++) {
    const rng = createRng(seed)
    for (let level = 1; level <= 10; level++) {
      for (let i = 0; i < 25; i++) {
        const eq = generateEquation(level, rng)
        if (eq.isTrue) continue
        const { expr, shown } = parse(eq.text)
        const diff = Math.abs(evalExpr(expr) - shown)
        expect(diff).toBeGreaterThanOrEqual(1)
        expect(diff).toBeLessThanOrEqual(3)
        expect(shown).toBeGreaterThanOrEqual(0)
      }
    }
  }
})

it('produces both true and false equations (p≈0.5)', () => {
  const rng = createRng(7)
  let trues = 0
  for (let i = 0; i < 200; i++) {
    if (generateEquation(1, rng).isTrue) trues += 1
  }
  expect(trues).toBeGreaterThan(60)
  expect(trues).toBeLessThan(140)
})

it('level 1–2 is single-digit addition/subtraction with non-negative truth', () => {
  const rng = createRng(5)
  for (let i = 0; i < 100; i++) {
    const eq = generateEquation(1, rng)
    const { expr } = parse(eq.text)
    expect(expr).toMatch(/^\d [+−] \d$/)
    expect(evalExpr(expr)).toBeGreaterThanOrEqual(0)
  }
})

it('level 3–4 is two-digit addition/subtraction', () => {
  const rng = createRng(6)
  for (let i = 0; i < 100; i++) {
    const { expr } = parse(generateEquation(3, rng).text)
    expect(expr).toMatch(/^\d{2} [+−] \d{2}$/)
  }
})

it('level 5–6 is times tables (3–12)', () => {
  const rng = createRng(9)
  for (let i = 0; i < 100; i++) {
    const { expr } = parse(generateEquation(6, rng).text)
    const m = expr.match(/^(\d+) × (\d+)$/)
    expect(m).not.toBeNull()
    const [, a, b] = m!.map(Number)
    expect(a).toBeGreaterThanOrEqual(3)
    expect(a).toBeLessThanOrEqual(12)
    expect(b).toBeGreaterThanOrEqual(3)
    expect(b).toBeLessThanOrEqual(12)
  }
})

it('level 7–8 division always divides evenly', () => {
  const rng = createRng(11)
  for (let i = 0; i < 200; i++) {
    const { expr } = parse(generateEquation(7, rng).text)
    if (expr.includes('÷')) {
      const [a, b] = expr.split(' ÷ ').map(Number)
      expect(a % b).toBe(0)
    }
  }
})

it('level 9–10 uses the two-op a + b × c form', () => {
  const rng = createRng(13)
  for (let i = 0; i < 50; i++) {
    const { expr } = parse(generateEquation(9, rng).text)
    expect(expr).toMatch(/^\d+ \+ \d+ × \d+$/)
  }
})

it('toScore pins the difficulty/accuracy/speed curve', () => {
  expect(toScore({ difficultyReached: 10, accuracy: 1, avgMs: 700 })).toBe(100)
  expect(toScore({ difficultyReached: 10, accuracy: 1, avgMs: 300 })).toBe(100) // speed clamps at full below 700
  expect(toScore({ difficultyReached: 5, accuracy: 0.8, avgMs: 1600 })).toBe(58) // 27.5 + 20 + 10
  expect(toScore({ difficultyReached: 1, accuracy: 0.5, avgMs: 2500 })).toBe(18) // 5.5 + 12.5 + 0
  expect(toScore({ difficultyReached: 1, accuracy: 0, avgMs: 5000 })).toBe(6) // 5.5 → rounds up
})

it('gives no speed credit for zero-answer runs (idle exploit guard)', () => {
  expect(toScore({ difficultyReached: 10, accuracy: 0, avgMs: 0 })).toBe(55) // difficulty only
  expect(toScore({ difficultyReached: 1, accuracy: 0, avgMs: 0 })).toBe(6)
})
