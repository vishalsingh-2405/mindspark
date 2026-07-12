import { act, fireEvent, render, screen } from '@testing-library/react'
import { MemoryMatrix } from './Component'

vi.mock('../../audio/sfx', () => ({
  playBlip: vi.fn(),
  playBuzz: vi.fn(),
  playTick: vi.fn(),
  playChime: vi.fn(),
}))
import { playBlip, playBuzz, playChime } from '../../audio/sfx'

afterEach(() => vi.useRealTimers())
beforeEach(() => vi.clearAllMocks())

/** Indices of the currently flashed cells (meaningful during the show phase only). */
function litCells(container: HTMLElement): number[] {
  const cells = [...container.querySelectorAll('.memory-matrix__cell')]
  return cells.flatMap((c, i) => (c.classList.contains('memory-matrix__cell--lit') ? [i] : []))
}

function cells(container: HTMLElement): HTMLElement[] {
  return [...container.querySelectorAll<HTMLElement>('.memory-matrix__cell')]
}

it('renders HUD and a 3×3 grid at difficulty 1', () => {
  const { container } = render(<MemoryMatrix difficulty={1} onFinish={() => {}} />)
  expect(screen.getByText(/^\d+s$/)).toBeInTheDocument()
  expect(screen.getByText(/Lv 1/)).toBeInTheDocument()
  expect(cells(container)).toHaveLength(9)
})

it('flashes exactly 3 cells at difficulty 1, then hides them for input', () => {
  vi.useFakeTimers()
  const { container } = render(<MemoryMatrix difficulty={1} onFinish={() => {}} />)
  expect(litCells(container)).toHaveLength(3)
  expect(playBlip).toHaveBeenCalledOnce() // flash-start blip
  act(() => { vi.advanceTimersByTime(960) })
  expect(litCells(container)).toHaveLength(0)
})

it('reproducing the flash is a perfect round: blip, lime reveal, accuracy 1', () => {
  vi.useFakeTimers()
  const onFinish = vi.fn()
  const { container } = render(<MemoryMatrix difficulty={1} onFinish={onFinish} />)
  const flashed = litCells(container)
  act(() => { vi.advanceTimersByTime(960) }) // show → input
  vi.mocked(playBlip).mockClear() // drop the flash-start blip
  for (const i of flashed) fireEvent.click(cells(container)[i])
  expect(playBlip).toHaveBeenCalledOnce()
  expect(container.querySelectorAll('.memory-matrix__cell--hit')).toHaveLength(3)
  expect(container.querySelectorAll('.memory-matrix__cell--miss')).toHaveLength(0)
  act(() => { vi.advanceTimersByTime(61_000) })
  expect(onFinish).toHaveBeenCalledTimes(1)
  const result = onFinish.mock.calls[0][0]
  expect(result.gameId).toBe('memory-matrix')
  expect(result.skill).toBe('memory')
  expect(result.accuracy).toBe(1)
  expect(result.score).toBeGreaterThan(0)
})

it('a wrong reproduction buzzes, reveals misses in magenta, and scores 0', () => {
  vi.useFakeTimers()
  const onFinish = vi.fn()
  const { container } = render(<MemoryMatrix difficulty={1} onFinish={onFinish} />)
  const flashed = litCells(container)
  act(() => { vi.advanceTimersByTime(960) })
  const wrong = cells(container).map((_, i) => i).filter(i => !flashed.includes(i)).slice(0, 3)
  for (const i of wrong) fireEvent.click(cells(container)[i])
  expect(playBuzz).toHaveBeenCalledOnce()
  expect(container.querySelectorAll('.memory-matrix__cell--miss')).toHaveLength(3)
  expect(container.querySelectorAll('.memory-matrix__cell--hit')).toHaveLength(3) // true pattern revealed
  act(() => { vi.advanceTimersByTime(61_000) })
  const result = onFinish.mock.calls[0][0]
  expect(result.accuracy).toBe(0)
  expect(result.score).toBe(0)
})

it('tapping a picked cell toggles it off before the round evaluates', () => {
  vi.useFakeTimers()
  const { container } = render(<MemoryMatrix difficulty={1} onFinish={() => {}} />)
  const flashed = litCells(container)
  act(() => { vi.advanceTimersByTime(960) })
  fireEvent.click(cells(container)[flashed[0]])
  expect(container.querySelectorAll('.memory-matrix__cell--pick')).toHaveLength(1)
  fireEvent.click(cells(container)[flashed[0]])
  expect(container.querySelectorAll('.memory-matrix__cell--pick')).toHaveLength(0)
})

it('taps during the show phase are ignored', () => {
  vi.useFakeTimers()
  const { container } = render(<MemoryMatrix difficulty={1} onFinish={() => {}} />)
  fireEvent.click(cells(container)[0])
  expect(container.querySelectorAll('.memory-matrix__cell--pick')).toHaveLength(0)
})

it('plays chime on level-up (3 perfect rounds)', () => {
  vi.useFakeTimers()
  const { container } = render(<MemoryMatrix difficulty={1} onFinish={() => {}} />)
  for (let r = 0; r < 3; r++) {
    const flashed = litCells(container)
    act(() => { vi.advanceTimersByTime(960) }) // flash ends → input (level 1 flashMs)
    for (const i of flashed) fireEvent.click(cells(container)[i])
    act(() => { vi.advanceTimersByTime(700) }) // feedback → next round
  }
  expect(playChime).toHaveBeenCalledOnce()
  expect(screen.getByText(/Lv 2/)).toBeInTheDocument()
})

it('flashes hit on the root after a perfect round and miss after a wrong pick', () => {
  vi.useFakeTimers()
  const { container } = render(<MemoryMatrix difficulty={1} onFinish={() => {}} />)
  const root = container.querySelector('.memory-matrix')!
  expect(root).not.toHaveAttribute('data-feedback') // flash-phase start blip must not flash the root
  const flashed = litCells(container)
  act(() => { vi.advanceTimersByTime(960) }) // show → input
  for (const i of flashed) fireEvent.click(cells(container)[i])
  expect(root).toHaveAttribute('data-feedback', 'hit')
  act(() => { vi.advanceTimersByTime(700) }) // feedback clears (350ms), next round flashes
  expect(root).not.toHaveAttribute('data-feedback')
  const flashed2 = litCells(container)
  act(() => { vi.advanceTimersByTime(960) })
  const wrong = cells(container).map((_, i) => i).filter(i => !flashed2.includes(i)).slice(0, 3)
  for (const i of wrong) fireEvent.click(cells(container)[i])
  expect(root).toHaveAttribute('data-feedback', 'miss')
})

it('an idle run (no input) finishes once and scores 0', () => {
  vi.useFakeTimers()
  const onFinish = vi.fn()
  render(<MemoryMatrix difficulty={10} onFinish={onFinish} />)
  act(() => { vi.advanceTimersByTime(61_000) })
  expect(onFinish).toHaveBeenCalledTimes(1)
  expect(onFinish.mock.calls[0][0].score).toBe(0)
})
