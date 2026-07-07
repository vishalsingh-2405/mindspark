import { act, fireEvent, render, screen } from '@testing-library/react'
import { QuickMath } from './Component'

afterEach(() => vi.useRealTimers())

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
