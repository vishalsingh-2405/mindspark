import { act, fireEvent, render, screen } from '@testing-library/react'
import { ReactionSpeed } from './Component'

vi.mock('../../audio/sfx', () => ({
  playBlip: vi.fn(),
  playBuzz: vi.fn(),
}))
import { playBlip, playBuzz } from '../../audio/sfx'

afterEach(() => vi.useRealTimers())
beforeEach(() => vi.clearAllMocks())

const MAX_DELAY = 3800 // trialDelay upper bound — advancing this far always turns the stage green

/** Wait out the arm delay, tap on green, then sit through the ~900 ms result flash. */
function playCleanTrial() {
  act(() => { vi.advanceTimersByTime(MAX_DELAY) })
  fireEvent.click(screen.getByRole('button'))
  act(() => { vi.advanceTimersByTime(1000) })
}

it('shows WAIT…, turns green after the delay, and records a ms result on tap', () => {
  vi.useFakeTimers()
  render(<ReactionSpeed difficulty={1} onFinish={() => {}} />)
  expect(screen.getByText('WAIT…')).toBeInTheDocument()
  expect(screen.getByText('Trial 1/5')).toBeInTheDocument()
  act(() => { vi.advanceTimersByTime(MAX_DELAY) })
  expect(screen.getByText('TAP!')).toBeInTheDocument()
  act(() => { vi.advanceTimersByTime(150) })
  fireEvent.click(screen.getByRole('button'))
  expect(playBlip).toHaveBeenCalledOnce()
  expect(screen.getByText(/^\d+ ms$/)).toBeInTheDocument()
})

it('a tap during WAIT is a false start: buzz + "Too soon!"', () => {
  vi.useFakeTimers()
  render(<ReactionSpeed difficulty={1} onFinish={() => {}} />)
  fireEvent.click(screen.getByRole('button'))
  expect(playBuzz).toHaveBeenCalledOnce()
  expect(screen.getByText('Too soon!')).toBeInTheDocument()
})

it('finishes once after 5 clean trials with a plausible result', () => {
  vi.useFakeTimers()
  const onFinish = vi.fn()
  render(<ReactionSpeed difficulty={1} onFinish={onFinish} />)
  for (let i = 0; i < 5; i++) playCleanTrial()
  expect(onFinish).toHaveBeenCalledTimes(1)
  const result = onFinish.mock.calls[0][0]
  expect(result.gameId).toBe('reaction-speed')
  expect(result.skill).toBe('reaction')
  expect(result.difficultyReached).toBe(1)
  expect(result.accuracy).toBe(1)
  expect(result.avgMs).toBeGreaterThan(0)
  expect(result.score).toBeGreaterThanOrEqual(0)
  expect(result.score).toBeLessThanOrEqual(100)
})

it('flashes data-feedback="hit" on the game root after a valid green tap', () => {
  vi.useFakeTimers()
  const { container } = render(<ReactionSpeed difficulty={1} onFinish={() => {}} />)
  const root = container.querySelector('.game')
  expect(root).not.toHaveAttribute('data-feedback')
  act(() => { vi.advanceTimersByTime(MAX_DELAY) })
  fireEvent.click(screen.getByRole('button'))
  expect(root).toHaveAttribute('data-feedback', 'hit')
})

it('flashes data-feedback="miss" on the game root after a false start', () => {
  vi.useFakeTimers()
  const { container } = render(<ReactionSpeed difficulty={1} onFinish={() => {}} />)
  fireEvent.click(screen.getByRole('button')) // tap during WAIT
  expect(container.querySelector('.game')).toHaveAttribute('data-feedback', 'miss')
})

it('a false start counts against accuracy in the final result', () => {
  vi.useFakeTimers()
  const onFinish = vi.fn()
  render(<ReactionSpeed difficulty={1} onFinish={onFinish} />)
  fireEvent.click(screen.getByRole('button')) // trial 1: too soon
  act(() => { vi.advanceTimersByTime(1000) })
  for (let i = 0; i < 4; i++) playCleanTrial()
  expect(onFinish).toHaveBeenCalledTimes(1)
  expect(onFinish.mock.calls[0][0].accuracy).toBe(0.8)
})
