import { useEffect, useState } from 'react'

function reducedMotion(): boolean {
  if (document.documentElement.classList.contains('reduced-motion')) return true
  return typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches
}

/** Ease-out count from 0 to target; snaps instantly under reduced motion. */
export function useCountUp(target: number, durMs = 800): number {
  const [value, setValue] = useState(0)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reduced-motion snap: one settled write, no animation loop to start, no cascade
    if (reducedMotion() || durMs <= 0) { setValue(target); return }
    let raf = 0
    const t0 = performance.now()
    const step = (now: number) => {
      const p = Math.min(1, (now - t0) / durMs)
      setValue(Math.round(target * (1 - Math.pow(1 - p, 3))))
      if (p < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [target, durMs])
  return value
}
