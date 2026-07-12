import { act, fireEvent, render, screen } from '@testing-library/react'
import { EquationSprint } from './Component'

vi.mock('../../audio/sfx', () => ({
  playBlip: vi.fn(),
  playBuzz: vi.fn(),
  playTick: vi.fn(),
  playChime: vi.fn(),
}))
import { playBlip, playBuzz, playChime } from '../../audio/sfx'

afterEach(() => vi.useRealTimers())
beforeEach(() => vi.clearAllMocks())

/**
 * Decide whether the on-screen equation is true by parsing its display text.
 * NOTE: the operator class uses the real Unicode minus sign (U+2212, "−") that
 * generateEquation() renders — not the ASCII hyphen — and × binds before + in
 * the L9–10 two-op form.
 */
function onScreenIsTrue(): boolean {
  const text = screen.getByText(/ = \d+$/).textContent!
  const m = text.match(/^(.+) = (\d+)$/)!
  const expr = m[1]
  const shown = Number(m[2])
  const two = expr.match(/^(\d+) \+ (\d+) × (\d+)$/)
  if (two) return Number(two[1]) + Number(two[2]) * Number(two[3]) === shown
  const one = expr.match(/^(\d+) ([+−×÷]) (\d+)$/)!
  const a = Number(one[1])
  const b = Number(one[3])
  const truth = one[2] === '+' ? a + b : one[2] === '−' ? a - b : one[2] === '×' ? a * b : a / b
  return truth === shown
}

function clickCorrect() {
  fireEvent.click(screen.getByRole('button', { name: onScreenIsTrue() ? 'TRUE' : 'FALSE' }))
}

function clickWrong() {
  fireEvent.click(screen.getByRole('button', { name: onScreenIsTrue() ? 'FALSE' : 'TRUE' }))
}

it('renders HUD, equation, and TRUE/FALSE buttons', () => {
  render(<EquationSprint difficulty={1} onFinish={() => {}} />)
  expect(screen.getByText(/^\d+s$/)).toBeInTheDocument()
  expect(screen.getByText(/Lv 1/)).toBeInTheDocument()
  expect(screen.getByText(/ = \d+$/)).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'TRUE' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'FALSE' })).toBeInTheDocument()
})

it('calls onFinish with a result when the timer expires', () => {
  vi.useFakeTimers()
  const onFinish = vi.fn()
  render(<EquationSprint difficulty={1} onFinish={onFinish} />)
  act(() => { vi.advanceTimersByTime(46_000) })
  expect(onFinish).toHaveBeenCalledTimes(1)
  const result = onFinish.mock.calls[0][0]
  expect(result.gameId).toBe('equation-sprint')
  expect(result.skill).toBe('math')
  expect(result.score).toBeGreaterThanOrEqual(0)
  expect(result.score).toBeLessThanOrEqual(100)
})

it('an idle run (no answers) scores 0', () => {
  vi.useFakeTimers()
  const onFinish = vi.fn()
  render(<EquationSprint difficulty={10} onFinish={onFinish} />)
  act(() => { vi.advanceTimersByTime(46_000) })
  expect(onFinish.mock.calls[0][0].score).toBe(0)
})

it('junk-tapping wrong answers never banks difficulty points', () => {
  vi.useFakeTimers()
  const onFinish = vi.fn()
  render(<EquationSprint difficulty={10} onFinish={onFinish} />)
  for (let i = 0; i < 5; i++) clickWrong()
  act(() => { vi.advanceTimersByTime(46_000) })
  expect(onFinish).toHaveBeenCalledTimes(1)
  const result = onFinish.mock.calls[0][0]
  expect(result.accuracy).toBe(0)
  expect(result.score).toBe(0)
})

it('plays blip on correct and buzz on wrong', () => {
  render(<EquationSprint difficulty={1} onFinish={() => {}} />)
  clickCorrect()
  expect(playBlip).toHaveBeenCalledOnce()
  clickWrong()
  expect(playBuzz).toHaveBeenCalledOnce()
})

it('plays chime on level-up (3 consecutive correct)', () => {
  render(<EquationSprint difficulty={1} onFinish={() => {}} />)
  for (let i = 0; i < 3; i++) clickCorrect()
  expect(playChime).toHaveBeenCalledOnce()
})
