import { act, fireEvent, render, screen } from '@testing-library/react'
import { QuickMath } from './Component'

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

/**
 * The question text is deterministic per render tree; compute its answer from the text.
 * NOTE: the operator class uses the real Unicode minus sign (U+2212, "−") that
 * generateQuestion() renders — not the ASCII hyphen — otherwise subtraction
 * questions (~half of difficulty-1 renders) fail to match and the test flakes.
 */
function solveOnScreen(): { correct: number; wrong: number } {
  const text = screen.getByText(/\d+ [+−×÷] \d+/).textContent!
  const m = text.match(/(\d+) ([+−×÷]) (\d+)/)!
  const a = Number(m[1]); const b = Number(m[3])
  const answer = m[2] === '+' ? a + b : m[2] === '−' ? a - b : m[2] === '×' ? a * b : a / b
  const choices = screen.getAllByRole('button').map(btn => Number(btn.textContent))
  return { correct: answer, wrong: choices.find(c => c !== answer)! }
}

/** Parse a question's display text (−, ×, ÷ glyphs; + before × precedence form). */
function solve(text: string): number {
  const two = text.match(/^(\d+) \+ (\d+) × (\d+)$/)
  if (two) return Number(two[1]) + Number(two[2]) * Number(two[3])
  const one = text.match(/^(\d+) ([+−×÷]) (\d+)$/)
  if (!one) throw new Error(`unparsed question: ${text}`)
  const a = Number(one[1])
  const b = Number(one[3])
  switch (one[2]) {
    case '+': return a + b
    case '−': return a - b
    case '×': return a * b
    default: return a / b
  }
}

it('renders HUD, question, and 4 answer choices', () => {
  render(<QuickMath difficulty={1} onFinish={() => {}} />)
  expect(screen.getByText(/^\d+s$/)).toBeInTheDocument()
  expect(screen.getByText(/Lv 1/)).toBeInTheDocument()
  expect(screen.getAllByRole('button')).toHaveLength(4)
})

it('calls onFinish with a result when the timer expires', () => {
  vi.useFakeTimers()
  const onFinish = vi.fn()
  render(<QuickMath difficulty={1} onFinish={onFinish} />)
  act(() => { vi.advanceTimersByTime(31_000) })
  expect(onFinish).toHaveBeenCalledTimes(1)
  const result = onFinish.mock.calls[0][0]
  expect(result.gameId).toBe('quick-math')
  expect(result.skill).toBe('math')
  expect(result.score).toBeGreaterThanOrEqual(0)
  expect(result.score).toBeLessThanOrEqual(100)
})

it('an idle run (no answers) scores 0', () => {
  vi.useFakeTimers()
  const onFinish = vi.fn()
  render(<QuickMath difficulty={10} onFinish={onFinish} />)
  act(() => { vi.advanceTimersByTime(31_000) })
  expect(onFinish.mock.calls[0][0].score).toBe(0)
})

it('junk-tapping wrong answers never banks difficulty points', () => {
  vi.useFakeTimers()
  const onFinish = vi.fn()
  const { container } = render(<QuickMath difficulty={10} onFinish={onFinish} />)
  for (let i = 0; i < 5; i++) {
    const answer = solve(container.querySelector('.quick-math__q')!.textContent!)
    const wrong = screen.getAllByRole('button').find(b => Number(b.textContent) !== answer)!
    fireEvent.click(wrong)
  }
  act(() => { vi.advanceTimersByTime(31_000) })
  expect(onFinish).toHaveBeenCalledTimes(1)
  const result = onFinish.mock.calls[0][0]
  expect(result.accuracy).toBe(0)
  expect(result.score).toBe(0)
})

it('plays blip on correct and buzz on wrong', () => {
  render(<QuickMath difficulty={1} onFinish={() => {}} />)
  fireEvent.click(screen.getByRole('button', { name: String(solveOnScreen().correct) }))
  expect(playBlip).toHaveBeenCalledOnce()
  fireEvent.click(screen.getByRole('button', { name: String(solveOnScreen().wrong) }))
  expect(playBuzz).toHaveBeenCalledOnce()
})

it('flashes hit feedback on a correct answer and miss on a wrong one', () => {
  const { container } = render(<QuickMath difficulty={1} onFinish={() => {}} />)
  const root = container.querySelector('.game.quick-math')!
  expect(root).not.toHaveAttribute('data-feedback')
  fireEvent.click(screen.getByRole('button', { name: String(solveOnScreen().correct) }))
  expect(root).toHaveAttribute('data-feedback', 'hit')
  fireEvent.click(screen.getByRole('button', { name: String(solveOnScreen().wrong) }))
  expect(root).toHaveAttribute('data-feedback', 'miss')
})

it('plays chime on level-up (3 consecutive correct)', () => {
  render(<QuickMath difficulty={1} onFinish={() => {}} />)
  for (let i = 0; i < 3; i++) {
    fireEvent.click(screen.getByRole('button', { name: String(solveOnScreen().correct) }))
  }
  expect(playChime).toHaveBeenCalledOnce()
})
