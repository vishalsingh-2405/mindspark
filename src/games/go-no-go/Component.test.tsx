import { act, fireEvent, render, screen } from '@testing-library/react'
import { GoNoGo } from './Component'

vi.mock('../../audio/sfx', () => ({
  playBlip: vi.fn(),
  playBuzz: vi.fn(),
  playTick: vi.fn(),
  playChime: vi.fn(),
  playCombo: vi.fn(),
}))
import { playBlip, playBuzz } from '../../audio/sfx'

afterEach(() => vi.useRealTimers())
beforeEach(() => vi.clearAllMocks())

/**
 * Stimulus colour is random (red ratio ≥ 0.27 at level 1), so advance fake time in
 * small steps until the wanted colour is on stage. A 40s hunt across a 45s run makes
 * "never appeared" vanishingly unlikely for either colour.
 */
function findStim(container: HTMLElement, type: 'go' | 'no'): void {
  for (let i = 0; i < 1600; i++) {
    act(() => { vi.advanceTimersByTime(25) })
    if (container.querySelector(`.go-no-go__stim--${type}`)) return
  }
  throw new Error(`no ${type} stimulus appeared`)
}

function stage(container: HTMLElement): Element {
  return container.querySelector('.go-no-go__stage')!
}

it('renders HUD and a blank stage before the first stimulus', () => {
  vi.useFakeTimers()
  const { container } = render(<GoNoGo difficulty={1} onFinish={() => {}} />)
  expect(screen.getByText('45s')).toBeInTheDocument()
  expect(screen.getByText(/Lv 1/)).toBeInTheDocument()
  expect(container.querySelector('.go-no-go__stim')).toBeNull()
})

it('tapping a go stimulus is correct: blip, straight into the gap', () => {
  vi.useFakeTimers()
  const { container } = render(<GoNoGo difficulty={1} onFinish={() => {}} />)
  findStim(container, 'go')
  vi.clearAllMocks()
  fireEvent.click(stage(container))
  expect(playBlip).toHaveBeenCalledOnce()
  expect(playBuzz).not.toHaveBeenCalled()
  expect(container.querySelector('.go-no-go__stim')).toBeNull()
})

it('leaving a no-go alone is correct: soft blip when it expires', () => {
  vi.useFakeTimers()
  const { container } = render(<GoNoGo difficulty={1} onFinish={() => {}} />)
  findStim(container, 'no')
  vi.clearAllMocks()
  // let it expire untouched (window ≤ 855ms); stop as soon as it leaves the stage
  for (let i = 0; i < 40 && container.querySelector('.go-no-go__stim--no'); i++) {
    act(() => { vi.advanceTimersByTime(25) })
  }
  expect(container.querySelector('.go-no-go__stim--no')).toBeNull()
  expect(playBlip).toHaveBeenCalledOnce()
  expect(playBuzz).not.toHaveBeenCalled()
})

it('tapping a no-go is a miss: buzz, stimulus ends immediately', () => {
  vi.useFakeTimers()
  const { container } = render(<GoNoGo difficulty={1} onFinish={() => {}} />)
  findStim(container, 'no')
  vi.clearAllMocks()
  fireEvent.click(stage(container))
  expect(playBuzz).toHaveBeenCalledOnce()
  expect(playBlip).not.toHaveBeenCalled()
  expect(container.querySelector('.go-no-go__stim')).toBeNull()
})

it('flashes hit feedback on a correct go tap', () => {
  vi.useFakeTimers()
  const { container } = render(<GoNoGo difficulty={1} onFinish={() => {}} />)
  findStim(container, 'go')
  fireEvent.click(stage(container))
  expect(container.querySelector('.game')).toHaveAttribute('data-feedback', 'hit')
})

it('flashes miss feedback on a commission (no-go tapped)', () => {
  vi.useFakeTimers()
  const { container } = render(<GoNoGo difficulty={1} onFinish={() => {}} />)
  findStim(container, 'no')
  fireEvent.click(stage(container))
  expect(container.querySelector('.game')).toHaveAttribute('data-feedback', 'miss')
})

it('flashes miss feedback on an omission (go expired untapped)', () => {
  vi.useFakeTimers()
  const { container } = render(<GoNoGo difficulty={1} onFinish={() => {}} />)
  findStim(container, 'go')
  for (let i = 0; i < 40 && container.querySelector('.go-no-go__stim--go'); i++) {
    act(() => { vi.advanceTimersByTime(25) })
  }
  expect(container.querySelector('.go-no-go__stim--go')).toBeNull()
  expect(container.querySelector('.game')).toHaveAttribute('data-feedback', 'miss')
})

it('stays visually quiet on a correct no-go expiry: no feedback flash', () => {
  vi.useFakeTimers()
  const { container } = render(<GoNoGo difficulty={1} onFinish={() => {}} />)
  findStim(container, 'no')
  for (let i = 0; i < 40 && container.querySelector('.go-no-go__stim--no'); i++) {
    act(() => { vi.advanceTimersByTime(25) })
  }
  expect(container.querySelector('.go-no-go__stim--no')).toBeNull()
  expect(container.querySelector('.game')).not.toHaveAttribute('data-feedback')
})

it('ignores taps during the blank gap', () => {
  vi.useFakeTimers()
  const { container } = render(<GoNoGo difficulty={1} onFinish={() => {}} />)
  fireEvent.click(stage(container)) // lead-in gap: nothing on stage yet
  expect(playBlip).not.toHaveBeenCalled()
  expect(playBuzz).not.toHaveBeenCalled()
})

it('calls onFinish with a result when the timer expires, even mid-stimulus', () => {
  vi.useFakeTimers()
  const onFinish = vi.fn()
  render(<GoNoGo difficulty={1} onFinish={onFinish} />)
  act(() => { vi.advanceTimersByTime(46_000) })
  expect(onFinish).toHaveBeenCalledTimes(1)
  const result = onFinish.mock.calls[0][0]
  expect(result.gameId).toBe('go-no-go')
  expect(result.skill).toBe('reaction')
  expect(result.score).toBeGreaterThanOrEqual(0)
  expect(result.score).toBeLessThanOrEqual(100)
})
