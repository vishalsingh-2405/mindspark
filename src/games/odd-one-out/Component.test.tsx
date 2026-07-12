import { act, fireEvent, render, screen } from '@testing-library/react'
import { OddOneOut } from './Component'
import { EMOJI_POOLS } from './logic'

vi.mock('../../audio/sfx', () => ({
  playBlip: vi.fn(),
  playBuzz: vi.fn(),
  playTick: vi.fn(),
  playChime: vi.fn(),
}))
import { playBlip, playBuzz, playChime } from '../../audio/sfx'

afterEach(() => vi.useRealTimers())
beforeEach(() => vi.clearAllMocks())

/** Difficulty-1 puzzles are emoji: the odd button is the only one whose pool appears once. */
function findOddOnScreen(): { odd: HTMLElement; other: HTMLElement } {
  const buttons = screen.getAllByRole('button')
  const pools = buttons.map(b => EMOJI_POOLS.findIndex(p => p.includes(b.textContent!)))
  const counts = new Map<number, number>()
  for (const p of pools) counts.set(p, (counts.get(p) ?? 0) + 1)
  const oddAt = pools.findIndex(p => counts.get(p) === 1)
  return { odd: buttons[oddAt], other: buttons[(oddAt + 1) % buttons.length] }
}

function isPrime(n: number): boolean {
  if (n < 2) return false
  for (let f = 2; f * f <= n; f++) if (n % f === 0) return false
  return true
}

function isSquare(n: number): boolean {
  const r = Math.round(Math.sqrt(n))
  return r * r === n
}

function digitSum(n: number): number {
  let s = 0
  for (let v = n; v > 0; v = Math.floor(v / 10)) s += v % 10
  return s
}

/**
 * Solve any level-7+ puzzle from its rendered item texts: find the single item that
 * breaks the rule all eight others share (multiples, squares, digit sum, primes,
 * arithmetic progression, or anagram sets).
 */
function oddIndexOf(texts: string[]): number {
  if (!texts.every(t => /^\d+$/.test(t))) {
    const key = (s: string) => [...s].sort().join('')
    const counts = new Map<string, number>()
    for (const t of texts) counts.set(key(t), (counts.get(key(t)) ?? 0) + 1)
    return texts.findIndex(t => counts.get(key(t)) === 1)
  }
  const ns = texts.map(Number)
  const rules: ((n: number) => boolean)[] = [
    isPrime,
    isSquare,
    ...[6, 7, 8, 9].map(k => (n: number) => n % k === 0),
  ]
  for (const rule of rules) {
    const fails = ns.map((n, i) => (rule(n) ? -1 : i)).filter(i => i >= 0)
    if (fails.length === 1) return fails[0]
  }
  const sums = ns.map(digitSum)
  const sumCounts = new Map<number, number>()
  for (const s of sums) sumCounts.set(s, (sumCounts.get(s) ?? 0) + 1)
  if (sumCounts.size === 2) {
    const unique = [...sumCounts.entries()].find(([, c]) => c === 1)
    if (unique) return sums.indexOf(unique[0])
  }
  for (let i = 0; i < ns.length; i++) {
    const rest = ns.filter((_, j) => j !== i).sort((a, b) => a - b)
    const step = rest[1] - rest[0]
    if (step > 0 && rest.every((v, k) => v === rest[0] + k * step)) return i
  }
  throw new Error(`no odd item found in: ${texts.join(', ')}`)
}

it('renders HUD, prompt, and 4 items at difficulty 1', () => {
  render(<OddOneOut difficulty={1} onFinish={() => {}} />)
  expect(screen.getByText(/^\d+s$/)).toBeInTheDocument()
  expect(screen.getByText(/Lv 1/)).toBeInTheDocument()
  expect(screen.getByText(/does not belong/)).toBeInTheDocument()
  expect(screen.getAllByRole('button')).toHaveLength(4)
})

it('uses the 2-column grid for 4 items and the 3-column grid for 9', () => {
  const a = render(<OddOneOut difficulty={1} onFinish={() => {}} />)
  expect(a.container.querySelector('.odd-one-out__grid--2col')).not.toBeNull()
  expect(a.container.querySelectorAll('.odd-one-out__item')).toHaveLength(4)
  a.unmount()
  const b = render(<OddOneOut difficulty={10} onFinish={() => {}} />)
  expect(b.container.querySelector('.odd-one-out__grid--3col')).not.toBeNull()
  expect(b.container.querySelectorAll('.odd-one-out__item')).toHaveLength(9)
})

it('calls onFinish with a result when the timer expires', () => {
  vi.useFakeTimers()
  const onFinish = vi.fn()
  render(<OddOneOut difficulty={1} onFinish={onFinish} />)
  act(() => { vi.advanceTimersByTime(61_000) })
  expect(onFinish).toHaveBeenCalledTimes(1)
  const result = onFinish.mock.calls[0][0]
  expect(result.gameId).toBe('odd-one-out')
  expect(result.skill).toBe('logic')
  expect(result.score).toBeGreaterThanOrEqual(0)
  expect(result.score).toBeLessThanOrEqual(100)
})

it('an idle run (no answers) scores 0', () => {
  vi.useFakeTimers()
  const onFinish = vi.fn()
  render(<OddOneOut difficulty={10} onFinish={onFinish} />)
  act(() => { vi.advanceTimersByTime(61_000) })
  expect(onFinish.mock.calls[0][0].score).toBe(0)
})

it('junk-tapping wrong answers never banks difficulty points', () => {
  vi.useFakeTimers()
  const onFinish = vi.fn()
  render(<OddOneOut difficulty={10} onFinish={onFinish} />)
  for (let i = 0; i < 5; i++) {
    const buttons = screen.getAllByRole('button')
    const oddAt = oddIndexOf(buttons.map(b => b.textContent!))
    fireEvent.click(buttons[(oddAt + 1) % buttons.length])
  }
  act(() => { vi.advanceTimersByTime(61_000) })
  expect(onFinish).toHaveBeenCalledTimes(1)
  const result = onFinish.mock.calls[0][0]
  expect(result.accuracy).toBe(0)
  expect(result.score).toBe(0)
})

it('plays blip on correct and buzz on wrong', () => {
  render(<OddOneOut difficulty={1} onFinish={() => {}} />)
  fireEvent.click(findOddOnScreen().odd)
  expect(playBlip).toHaveBeenCalledOnce()
  fireEvent.click(findOddOnScreen().other)
  expect(playBuzz).toHaveBeenCalledOnce()
})

it('plays chime on level-up (3 consecutive correct)', () => {
  render(<OddOneOut difficulty={1} onFinish={() => {}} />)
  for (let i = 0; i < 3; i++) {
    fireEvent.click(findOddOnScreen().odd)
  }
  expect(playChime).toHaveBeenCalledOnce()
})
