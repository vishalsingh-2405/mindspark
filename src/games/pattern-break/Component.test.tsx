import { act, fireEvent, render, screen } from '@testing-library/react'
import { PatternBreak } from './Component'

vi.mock('../../audio/sfx', () => ({
  playBlip: vi.fn(),
  playBuzz: vi.fn(),
  playTick: vi.fn(),
  playChime: vi.fn(),
  playCombo: vi.fn(),
}))
import { playBlip, playBuzz, playChime } from '../../audio/sfx'

afterEach(() => vi.useRealTimers())
beforeEach(() => vi.clearAllMocks())

/** Read the 4 shown terms from the sequence line ("3 · 7 · 11 · 15 · ?"). */
function termsOnScreen(container: HTMLElement): number[] {
  const text = container.querySelector('.pattern-break__seq')!.textContent!
  return text.split(' · ').slice(0, 4).map(Number)
}

/** Difficulty-1 sequences are always arithmetic: next = last term + first difference. */
function solveOnScreen(container: HTMLElement): { correct: number; wrong: number } {
  const t = termsOnScreen(container)
  const answer = t[3] + (t[1] - t[0])
  const choices = screen.getAllByRole('button').map(btn => Number(btn.textContent))
  return { correct: answer, wrong: choices.find(c => c !== answer)! }
}

/**
 * Every continuation consistent with ANY generator rule. The true answer is always
 * in this set (some term quadruples fit more than one rule, so a single solver could
 * pick the wrong rule); a button whose value is NOT in the set is guaranteed wrong.
 * Second-order differences subsume arithmetic (growth 0) and squares (growth 2).
 */
function plausibleAnswers(t: number[]): Set<number> {
  const [d1, d2, d3] = [t[1] - t[0], t[2] - t[1], t[3] - t[2]]
  const set = new Set<number>()
  if (d2 - d1 === d3 - d2) set.add(t[3] + d3 + (d3 - d2)) // second-order / arithmetic / squares
  if (d1 === d3 && d1 !== d2) set.add(t[3] + d2) // alternating two-step
  if (t[2] === t[0] + t[1] && t[3] === t[1] + t[2]) set.add(t[2] + t[3]) // Fibonacci-style
  set.add(2 * t[2] - t[0]) // interleaved: continue the even-index subsequence
  const r = t[0] !== 0 ? t[1] / t[0] : 0
  if (Number.isInteger(r) && r > 1 && t[2] === t[1] * r && t[3] === t[2] * r) set.add(t[3] * r) // geometric
  return set
}

it('renders HUD, sequence line, and 4 answer choices', () => {
  const { container } = render(<PatternBreak difficulty={1} onFinish={() => {}} />)
  expect(screen.getByText(/^\d+s$/)).toBeInTheDocument()
  expect(screen.getByText(/Lv 1/)).toBeInTheDocument()
  expect(container.querySelector('.pattern-break__seq')!.textContent).toMatch(/ · \?$/)
  expect(screen.getAllByRole('button')).toHaveLength(4)
})

it('calls onFinish with a result when the timer expires', () => {
  vi.useFakeTimers()
  const onFinish = vi.fn()
  render(<PatternBreak difficulty={1} onFinish={onFinish} />)
  act(() => { vi.advanceTimersByTime(61_000) })
  expect(onFinish).toHaveBeenCalledTimes(1)
  const result = onFinish.mock.calls[0][0]
  expect(result.gameId).toBe('pattern-break')
  expect(result.skill).toBe('logic')
  expect(result.score).toBeGreaterThanOrEqual(0)
  expect(result.score).toBeLessThanOrEqual(100)
})

it('an idle run (no answers) scores 0', () => {
  vi.useFakeTimers()
  const onFinish = vi.fn()
  render(<PatternBreak difficulty={10} onFinish={onFinish} />)
  act(() => { vi.advanceTimersByTime(61_000) })
  expect(onFinish.mock.calls[0][0].score).toBe(0)
})

it('junk-tapping wrong answers never banks difficulty points', () => {
  vi.useFakeTimers()
  const onFinish = vi.fn()
  const { container } = render(<PatternBreak difficulty={10} onFinish={onFinish} />)
  for (let i = 0; i < 5; i++) {
    const banned = plausibleAnswers(termsOnScreen(container))
    const wrong = screen.getAllByRole('button').find(b => !banned.has(Number(b.textContent)))!
    fireEvent.click(wrong)
  }
  act(() => { vi.advanceTimersByTime(61_000) })
  expect(onFinish).toHaveBeenCalledTimes(1)
  const result = onFinish.mock.calls[0][0]
  expect(result.accuracy).toBe(0)
  expect(result.score).toBe(0)
})

it('plays blip on correct and buzz on wrong', () => {
  const { container } = render(<PatternBreak difficulty={1} onFinish={() => {}} />)
  fireEvent.click(screen.getByRole('button', { name: String(solveOnScreen(container).correct) }))
  expect(playBlip).toHaveBeenCalledOnce()
  fireEvent.click(screen.getByRole('button', { name: String(solveOnScreen(container).wrong) }))
  expect(playBuzz).toHaveBeenCalledOnce()
})

it('flashes data-feedback: hit on correct, miss on wrong', () => {
  const { container } = render(<PatternBreak difficulty={1} onFinish={() => {}} />)
  const root = container.querySelector('.pattern-break')!
  expect(root).not.toHaveAttribute('data-feedback')
  fireEvent.click(screen.getByRole('button', { name: String(solveOnScreen(container).correct) }))
  expect(root).toHaveAttribute('data-feedback', 'hit')
  fireEvent.click(screen.getByRole('button', { name: String(solveOnScreen(container).wrong) }))
  expect(root).toHaveAttribute('data-feedback', 'miss')
})

it('plays chime on level-up (3 consecutive correct)', () => {
  const { container } = render(<PatternBreak difficulty={1} onFinish={() => {}} />)
  for (let i = 0; i < 3; i++) {
    fireEvent.click(screen.getByRole('button', { name: String(solveOnScreen(container).correct) }))
  }
  expect(playChime).toHaveBeenCalledOnce()
})
