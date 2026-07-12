import { act, renderHook } from '@testing-library/react'
import { useCountUp } from './useCountUp'

const fakeRaf = () => vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'performance'] })

afterEach(() => {
  document.documentElement.classList.remove('reduced-motion')
  vi.useRealTimers()
})

it('starts at 0 and reaches exactly the target after the duration', () => {
  fakeRaf()
  const { result } = renderHook(() => useCountUp(87))
  expect(result.current).toBe(0)
  act(() => { vi.advanceTimersByTime(400) })
  expect(result.current).toBeGreaterThan(0)
  expect(result.current).toBeLessThan(87) // mid-flight, ease-out cubic
  act(() => { vi.advanceTimersByTime(600) })
  expect(result.current).toBe(87)
})

it('snaps instantly when the root reduced-motion class is set', () => {
  document.documentElement.classList.add('reduced-motion')
  const { result } = renderHook(() => useCountUp(64))
  expect(result.current).toBe(64)
})

it('cancels the pending frame on unmount', () => {
  fakeRaf()
  const cancel = vi.spyOn(window, 'cancelAnimationFrame')
  const { unmount } = renderHook(() => useCountUp(50))
  unmount()
  expect(cancel).toHaveBeenCalled()
})
