import { act, renderHook } from '@testing-library/react'
import { useCountdown } from './useCountdown'

afterEach(() => vi.useRealTimers())

it('starts at initialMs and counts down on the wall clock', () => {
  vi.useFakeTimers()
  const { result } = renderHook(() => useCountdown(30_000, 60_000))
  expect(result.current.msLeft).toBe(30_000)
  act(() => { vi.advanceTimersByTime(5_000) })
  expect(result.current.msLeft).toBe(25_000)
})

it('addTime extends the deadline', () => {
  vi.useFakeTimers()
  const { result } = renderHook(() => useCountdown(30_000, 60_000))
  act(() => { vi.advanceTimersByTime(1_000) })
  expect(result.current.msLeft).toBe(29_000)
  act(() => { result.current.addTime(2_000) })
  act(() => { vi.advanceTimersByTime(100) })
  expect(result.current.msLeft).toBe(30_900)
})

it('never extends beyond maxMs from now', () => {
  vi.useFakeTimers()
  const { result } = renderHook(() => useCountdown(30_000, 60_000))
  act(() => { result.current.addTime(100_000) })
  act(() => { vi.advanceTimersByTime(100) })
  expect(result.current.msLeft).toBe(59_900)
})

it('floors at 0 and stops ticking', () => {
  vi.useFakeTimers()
  const { result } = renderHook(() => useCountdown(1_000, 60_000))
  act(() => { vi.advanceTimersByTime(5_000) })
  expect(result.current.msLeft).toBe(0)
  expect(vi.getTimerCount()).toBe(0)
})
