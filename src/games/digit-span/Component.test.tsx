import { act, fireEvent, render, screen } from '@testing-library/react'
import { DigitSpan } from './Component'

vi.mock('../../audio/sfx', () => ({
  playBlip: vi.fn(),
  playBuzz: vi.fn(),
  playTick: vi.fn(),
  playChime: vi.fn(),
}))
import { playBlip, playBuzz, playChime } from '../../audio/sfx'

afterEach(() => vi.useRealTimers())
beforeEach(() => vi.clearAllMocks())

const L1_SHOW_MS = 625 // spanConfig(1).showMs
const L1_LENGTH = 3 // spanConfig(1).length
const GAP_MS = 150
const FEEDBACK_MS = 700

/** Read the target off the show phase, advancing fake timers digit by digit (showMs + gap each). */
function watchDigits(container: HTMLElement, length: number, showMs: number): string[] {
  const digits: string[] = []
  for (let i = 0; i < length; i++) {
    digits.push(container.querySelector('.digit-span__digit')!.textContent!)
    act(() => { vi.advanceTimersByTime(showMs) }) // digit hides
    act(() => { vi.advanceTimersByTime(GAP_MS) }) // next digit, or keypad after the last one
  }
  return digits
}

/** Tap the keypad; the component auto-submits once the entry reaches target length. */
function typeEntry(digits: string[], transform: (d: string) => string = d => d) {
  for (const d of digits) {
    fireEvent.click(screen.getByRole('button', { name: transform(d) }))
  }
}

it('renders HUD and flashes the first digit (no keypad yet)', () => {
  const { container } = render(<DigitSpan difficulty={1} onFinish={() => {}} />)
  expect(screen.getByText(/^\d+s$/)).toBeInTheDocument()
  expect(screen.getByText(/Lv 1/)).toBeInTheDocument()
  expect(container.querySelector('.digit-span__digit')!.textContent).toMatch(/^\d$/)
  expect(container.querySelector('.digit-span__pad')).toBeNull()
})

it('shows digits one at a time, accepts keypad entry, and advances to the next round', () => {
  vi.useFakeTimers()
  const { container } = render(<DigitSpan difficulty={1} onFinish={() => {}} />)
  const digits = watchDigits(container, L1_LENGTH, L1_SHOW_MS)
  digits.forEach(d => expect(d).toMatch(/^\d$/))
  // keypad is up: 10 digit keys + backspace
  expect(container.querySelectorAll('.digit-span__key')).toHaveLength(11)
  typeEntry(digits) // correct entry auto-submits at target length
  expect(playBlip).toHaveBeenCalledOnce()
  expect(container.querySelector('.digit-span__digit--good')).not.toBeNull()
  act(() => { vi.advanceTimersByTime(FEEDBACK_MS) })
  // next round: back in the show phase
  expect(container.querySelector('.digit-span__digit--good')).toBeNull()
  expect(container.querySelector('.digit-span__digit')!.textContent).toMatch(/^\d$/)
  expect(container.querySelector('.digit-span__pad')).toBeNull()
})

it('buzzes on a wrong entry and reveals the correct digits', () => {
  vi.useFakeTimers()
  const { container } = render(<DigitSpan difficulty={1} onFinish={() => {}} />)
  const digits = watchDigits(container, L1_LENGTH, L1_SHOW_MS)
  typeEntry(digits, d => String((Number(d) + 1) % 10)) // every digit off by one
  expect(playBuzz).toHaveBeenCalledOnce()
  expect(container.querySelector('.digit-span__digit--bad')!.textContent).toBe(digits.join(''))
})

it('backspace removes the last typed digit', () => {
  vi.useFakeTimers()
  const { container } = render(<DigitSpan difficulty={1} onFinish={() => {}} />)
  const digits = watchDigits(container, L1_LENGTH, L1_SHOW_MS)
  fireEvent.click(screen.getByRole('button', { name: digits[0] }))
  expect(container.querySelector('.digit-span__entry')!.textContent).toBe(`${digits[0]}··`)
  fireEvent.click(screen.getByRole('button', { name: 'Backspace' }))
  expect(container.querySelector('.digit-span__entry')!.textContent).toBe('···')
})

it('calls onFinish with a result when the 60 s clock runs out', () => {
  vi.useFakeTimers()
  const onFinish = vi.fn()
  render(<DigitSpan difficulty={1} onFinish={onFinish} />)
  act(() => { vi.advanceTimersByTime(61_000) })
  expect(onFinish).toHaveBeenCalledTimes(1)
  const result = onFinish.mock.calls[0][0]
  expect(result.gameId).toBe('digit-span')
  expect(result.skill).toBe('memory')
  expect(result.score).toBeGreaterThanOrEqual(0)
  expect(result.score).toBeLessThanOrEqual(100)
})

it('an idle run (no entries) scores 0', () => {
  vi.useFakeTimers()
  const onFinish = vi.fn()
  render(<DigitSpan difficulty={10} onFinish={onFinish} />)
  act(() => { vi.advanceTimersByTime(61_000) })
  expect(onFinish.mock.calls[0][0].score).toBe(0)
})

it('plays chime on level-up (3 consecutive correct rounds)', () => {
  vi.useFakeTimers()
  const { container } = render(<DigitSpan difficulty={1} onFinish={() => {}} />)
  for (let i = 0; i < 3; i++) {
    const digits = watchDigits(container, L1_LENGTH, L1_SHOW_MS)
    typeEntry(digits)
    act(() => { vi.advanceTimersByTime(FEEDBACK_MS) })
  }
  expect(playChime).toHaveBeenCalledOnce()
})
