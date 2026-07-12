import { act, fireEvent, render, screen } from '@testing-library/react'
import { Echo } from './Component'

vi.mock('../../audio/sfx', () => ({
  playBlip: vi.fn(),
  playBuzz: vi.fn(),
  playTick: vi.fn(),
  playChime: vi.fn(),
}))
import { playBlip, playBuzz, playChime } from '../../audio/sfx'

afterEach(() => vi.useRealTimers())
beforeEach(() => {
  vi.clearAllMocks()
  vi.useFakeTimers()
})

// difficulty 1 → echoConfig(1) = { seqLen: 3, playMs: 620 }; playback slot = playMs + 150ms gap
const SEQ_LEN = 3
const PLAY_MS = 620
const SLOT_MS = PLAY_MS + 150

/**
 * Advance through the playback phase, reading which tile is lit in each slot.
 * The RNG is time-seeded, so the sequence must be observed, not predicted.
 * Ends with the component in the 'input' phase.
 */
function watchSequence(container: HTMLElement): number[] {
  const seq: number[] = []
  for (let i = 0; i < SEQ_LEN; i++) {
    act(() => { vi.advanceTimersByTime(i === 0 ? 1 : SLOT_MS) })
    const lit = container.querySelector('.echo__tile--lit')!
    seq.push(Number(lit.className.match(/echo__tile--(\d)/)![1]))
  }
  act(() => { vi.advanceTimersByTime(SLOT_MS) })
  return seq
}

function tiles(): HTMLElement[] {
  return screen.getAllByRole('button')
}

it('renders HUD and a 2×2 grid of tiles, disabled during playback', () => {
  render(<Echo difficulty={1} onFinish={() => {}} />)
  expect(screen.getByText(/^\d+s$/)).toBeInTheDocument()
  expect(screen.getByText(/Lv 1/)).toBeInTheDocument()
  expect(screen.getByText('Watch…')).toBeInTheDocument()
  expect(tiles()).toHaveLength(4)
  for (const tile of tiles()) expect(tile).toBeDisabled()
})

it('lights each sequence tile with a blip, then unlocks the tiles for input', () => {
  const { container } = render(<Echo difficulty={1} onFinish={() => {}} />)
  watchSequence(container)
  expect(playBlip).toHaveBeenCalledTimes(SEQ_LEN)
  expect(screen.getByText('Your turn')).toBeInTheDocument()
  for (const tile of tiles()) expect(tile).toBeEnabled()
})

it('calls onFinish exactly once when the 75s clock runs out', () => {
  const onFinish = vi.fn()
  render(<Echo difficulty={1} onFinish={onFinish} />)
  act(() => { vi.advanceTimersByTime(76_000) })
  expect(onFinish).toHaveBeenCalledTimes(1)
  const result = onFinish.mock.calls[0][0]
  expect(result.gameId).toBe('echo')
  expect(result.skill).toBe('memory')
  expect(result.score).toBeGreaterThanOrEqual(0)
  expect(result.score).toBeLessThanOrEqual(100)
})

it('an idle run (no taps) scores 0', () => {
  const onFinish = vi.fn()
  render(<Echo difficulty={10} onFinish={onFinish} />)
  act(() => { vi.advanceTimersByTime(76_000) })
  expect(onFinish.mock.calls[0][0].score).toBe(0)
})

it('echoing the sequence back is a perfect round', () => {
  const onFinish = vi.fn()
  const { container } = render(<Echo difficulty={1} onFinish={onFinish} />)
  const seq = watchSequence(container)
  for (const tile of seq) fireEvent.click(tiles()[tile])
  expect(screen.getByText('Perfect!')).toBeInTheDocument()
  act(() => { vi.advanceTimersByTime(76_000) })
  const result = onFinish.mock.calls[0][0]
  expect(result.accuracy).toBe(1)
  expect(result.score).toBeGreaterThan(0)
})

it('a wrong tap buzzes and ends the round as a miss', () => {
  const onFinish = vi.fn()
  const { container } = render(<Echo difficulty={1} onFinish={onFinish} />)
  const seq = watchSequence(container)
  const wrong = [0, 1, 2, 3].find(t => t !== seq[0])!
  fireEvent.click(tiles()[wrong])
  expect(playBuzz).toHaveBeenCalledOnce()
  expect(screen.getByText('Miss!')).toBeInTheDocument()
  act(() => { vi.advanceTimersByTime(76_000) })
  const result = onFinish.mock.calls[0][0]
  expect(result.accuracy).toBe(0)
  expect(result.score).toBe(0)
})

it('plays chime on level-up (3 consecutive perfect rounds)', () => {
  const { container } = render(<Echo difficulty={1} onFinish={() => {}} />)
  for (let r = 0; r < 3; r++) {
    const seq = watchSequence(container)
    for (const tile of seq) fireEvent.click(tiles()[tile])
    act(() => { vi.advanceTimersByTime(600) }) // feedback → next round
  }
  expect(playChime).toHaveBeenCalledOnce()
  expect(screen.getByText(/Lv 2/)).toBeInTheDocument()
})
