import { act, render, screen } from '@testing-library/react'
import { QuickMath } from './Component'

afterEach(() => vi.useRealTimers())

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
