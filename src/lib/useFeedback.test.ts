import { act, renderHook } from '@testing-library/react'
import { useFeedback } from './useFeedback'

afterEach(() => vi.useRealTimers())

it('flashes then auto-clears', () => {
  vi.useFakeTimers()
  const { result } = renderHook(() => useFeedback(350))
  act(() => result.current[1]('hit'))
  expect(result.current[0]).toBe('hit')
  act(() => vi.advanceTimersByTime(350))
  expect(result.current[0]).toBeUndefined()
})

it('a re-flash restarts the clear timer and replaces the kind', () => {
  vi.useFakeTimers()
  const { result } = renderHook(() => useFeedback(350))
  act(() => result.current[1]('hit'))
  act(() => vi.advanceTimersByTime(200))
  act(() => result.current[1]('miss'))
  act(() => vi.advanceTimersByTime(200))
  expect(result.current[0]).toBe('miss') // 400ms after first flash, 200ms after second
  act(() => vi.advanceTimersByTime(150))
  expect(result.current[0]).toBeUndefined()
})

it('defaults to a 350ms clear window', () => {
  vi.useFakeTimers()
  const { result } = renderHook(() => useFeedback())
  act(() => result.current[1]('miss'))
  act(() => vi.advanceTimersByTime(349))
  expect(result.current[0]).toBe('miss')
  act(() => vi.advanceTimersByTime(1))
  expect(result.current[0]).toBeUndefined()
})

it('clears its timer on unmount', () => {
  vi.useFakeTimers()
  const { result, unmount } = renderHook(() => useFeedback(350))
  act(() => result.current[1]('hit'))
  unmount()
  expect(vi.getTimerCount()).toBe(0)
})
