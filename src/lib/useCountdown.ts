import { useCallback, useEffect, useRef, useState } from 'react'

/** Wall-clock countdown: survives tab throttling, stops ticking at 0. */
export function useCountdown(initialMs: number, maxMs: number) {
  const deadlineRef = useRef(performance.now() + initialMs)
  const [msLeft, setMsLeft] = useState(initialMs)

  useEffect(() => {
    const t = setInterval(() => {
      const next = Math.max(0, deadlineRef.current - performance.now())
      setMsLeft(next)
      if (next === 0) clearInterval(t)
    }, 100)
    return () => clearInterval(t)
  }, [])

  const addTime = useCallback((bonusMs: number) => {
    deadlineRef.current = Math.min(performance.now() + maxMs, deadlineRef.current + bonusMs)
  }, [maxMs])

  return { msLeft, addTime }
}
