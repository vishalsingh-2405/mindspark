import { useCallback, useEffect, useRef, useState } from 'react'

export type Feedback = 'hit' | 'miss' | undefined

/** Transient answer feedback for game roots: flash('hit'|'miss') sets data-feedback, auto-clears. */
export function useFeedback(clearMs = 350): [Feedback, (kind: 'hit' | 'miss') => void] {
  const [feedback, setFeedback] = useState<Feedback>(undefined)
  const timer = useRef<number | undefined>(undefined)
  useEffect(() => () => window.clearTimeout(timer.current), [])
  const flash = useCallback((kind: 'hit' | 'miss') => {
    window.clearTimeout(timer.current)
    setFeedback(kind)
    timer.current = window.setTimeout(() => setFeedback(undefined), clearMs)
  }, [clearMs])
  return [feedback, flash]
}
