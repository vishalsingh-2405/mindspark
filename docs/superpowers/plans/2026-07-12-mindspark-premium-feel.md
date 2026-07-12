# MindSpark Premium Feel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Elevate MindSpark's look, motion, sound, and tactile feel per the premium-feel spec (`docs/superpowers/specs/2026-07-12-mindspark-premium-feel.md`) with zero new runtime dependencies.

**Architecture:** Three infra tasks (CSS motion/ambience system · sound+haptics+settings · ceremony hooks/components), then a mechanical 9-game sweep wiring standardized feedback, then full verification. Task dependency order: **Task 1 ∥ Task 2 → Task 3 → Tasks 4–12 (all parallel) → Task 13.** Parallel tasks touch disjoint files.

**Tech Stack:** existing only — custom CSS, React 18, Web Audio, Vibration API, Vitest/RTL.

**All commands run from repo root:** `/Users/vishalsingh/Documents/Testing/App-Brain Games/mindspark`
**Branch:** `premium-feel`. Commit per task. Push only at ship (Task 13).

**Shared conventions:** every new animation must die under the existing global reduced-motion kill (it zeroes durations app-wide — do NOT add per-animation reduced-motion guards). All changed numerals get `tabular-nums`. Class names are pinned here — Task 1 creates the CSS; later tasks use these exact names.

---

### Task 1: CSS motion system, ambience, glass depth, screen/nav/tile polish

**Files:**
- Modify: `src/styles/tokens.css`, `src/styles/global.css`
- Modify: `src/AppShell.tsx` (route-fade wrapper), `src/screens/Home.tsx` + `src/screens/Games.tsx` (stagger index), `src/components/BottomNav.tsx` (only if a class hook is needed for the dot)
- Tests: existing screen tests must stay green (`npx vitest run src/screens src/App.test.tsx`)

- [ ] **Step 1: tokens.css — add motion/visual tokens inside `:root`:**

```css
  /* Premium-feel pass */
  --ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
  --ease-out: cubic-bezier(0.22, 1, 0.36, 1);
  --t-fast: 120ms;
  --t-med: 240ms;
  --t-slow: 400ms;
  --violet: #9d4dff;
  --shadow-panel: inset 0 1px 0 rgba(255, 255, 255, 0.06), 0 8px 24px rgba(0, 0, 0, 0.45);
```

- [ ] **Step 2: global.css — ambience + glass. Add after the reduced-motion blocks:**

```css
/* Ambient backdrop: two neon glows + faint grid; fixed → paints once */
body::before {
  content: ''; position: fixed; inset: 0; z-index: -1; pointer-events: none;
  background:
    radial-gradient(600px 400px at 15% 8%, rgba(0, 240, 255, 0.06), transparent 70%),
    radial-gradient(700px 500px at 90% 95%, rgba(255, 46, 151, 0.05), transparent 70%),
    repeating-linear-gradient(0deg, rgba(138, 148, 166, 0.025) 0 1px, transparent 1px 32px),
    repeating-linear-gradient(90deg, rgba(138, 148, 166, 0.025) 0 1px, transparent 1px 32px);
}
```

Then add `box-shadow: var(--shadow-panel);` to the existing `.panel` rule and to `.tile`.

- [ ] **Step 3: global.css — shared press physics + hover lift. Add:**

```css
/* Press physics — every interactive surface */
.choice, .tile, .neon-btn, .odd-one-out__item, .digit-span__key, .echo__tile,
.memory-matrix__cell, .reaction-speed__stage, .go-no-go__stage, .flip-card, .nav a {
  transition: transform var(--t-fast) var(--ease-spring), box-shadow var(--t-fast) ease,
    border-color var(--t-fast) ease, background var(--t-fast) ease, opacity var(--t-fast) ease;
}
.choice:active, .tile:active, .neon-btn:active, .odd-one-out__item:active,
.digit-span__key:active, .echo__tile:not(:disabled):active, .memory-matrix__cell:active,
.flip-card:active { transform: scale(0.96); }
@media (hover: hover) {
  .tile:hover, .neon-btn:hover { transform: translateY(-2px); box-shadow: var(--shadow-panel), var(--glow-cyan); }
  .choice:hover { border-color: var(--cyan); }
}
```

(Check the real class name NeonButton renders — if it isn't `.neon-btn`, use the actual one everywhere in this task.)

- [ ] **Step 4: global.css — tile stagger, route fade, chip pops, timer urgency, nav dot, tabular numerals:**

```css
/* Entrances */
@keyframes tile-in { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: none; } }
.home__tiles .tile { animation: tile-in var(--t-med) var(--ease-out) both; animation-delay: calc(var(--i, 0) * 35ms); }
@keyframes route-in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
.route-fade { animation: route-in var(--t-med) var(--ease-out); }

/* HUD micro-pops */
@keyframes chip-pop { from { transform: scale(1.25); } to { transform: scale(1); } }
.hud__level, .hud__combo { display: inline-block; animation: chip-pop var(--t-fast) var(--ease-spring); }
.hud__combo--milestone { animation: chip-pop var(--t-slow) var(--ease-spring); text-shadow: var(--glow-lime); font-size: 16px; }
@keyframes timer-low { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.12); } }
.hud__timer--low { color: var(--magenta); text-shadow: var(--glow-magenta); animation: timer-low 1s ease-in-out infinite; display: inline-block; }
.hud__timer, .hud__combo, .results__score { font-variant-numeric: tabular-nums; }

/* Bottom-nav active dot (adapt selector to BottomNav's active class — react-router NavLink adds .active) */
.nav a { position: relative; }
.nav a::after {
  content: ''; position: absolute; left: 50%; bottom: -6px; width: 4px; height: 4px;
  border-radius: 50%; background: var(--cyan); box-shadow: var(--glow-cyan);
  transform: translateX(-50%) scale(0); transition: transform var(--t-med) var(--ease-spring);
}
.nav a.active::after { transform: translateX(-50%) scale(1); }
```

- [ ] **Step 5: global.css — standardized game feedback (used by Tasks 4–12):**

```css
/* In-game hit/miss feedback — games set data-feedback="hit"|"miss" on .game root */
.game { position: relative; }
.game::after {
  content: ''; position: fixed; inset: 0; pointer-events: none; opacity: 0; z-index: 5;
}
@keyframes vignette-hit { 0% { opacity: 0; } 20% { opacity: 1; } 100% { opacity: 0; } }
.game[data-feedback='hit']::after {
  background: radial-gradient(120% 120% at 50% 50%, transparent 55%, rgba(0, 240, 255, 0.18));
  animation: vignette-hit 300ms ease-out;
}
@keyframes stage-shake {
  0%, 100% { transform: translateX(0); }
  20% { transform: translateX(-6px); } 45% { transform: translateX(5px); }
  70% { transform: translateX(-3px); } 85% { transform: translateX(2px); }
}
.game[data-feedback='miss'] { animation: stage-shake 250ms ease-in-out; }
.game[data-feedback='miss']::after {
  background: radial-gradient(120% 120% at 50% 50%, transparent 55%, rgba(255, 46, 151, 0.2));
  animation: vignette-hit 300ms ease-out;
}
```

- [ ] **Step 6: global.css — results ceremony styles (used by Task 3):**

```css
/* Results ceremony */
@keyframes card-in { from { opacity: 0; transform: scale(0.92); } to { opacity: 1; transform: scale(1); } }
.results { animation: card-in var(--t-slow) var(--ease-spring); }
.results__dial { position: relative; width: 128px; height: 128px; margin: 0 auto; }
.results__dial svg { position: absolute; inset: 0; transform: rotate(-90deg); }
.results__dial .results__score { position: absolute; inset: 0; display: grid; place-items: center; font-size: 44px; }
.results__ring-bg { stroke: var(--border-cyan-strong); }
.results__ring { stroke: var(--cyan); filter: drop-shadow(0 0 6px rgba(0, 240, 255, 0.6)); }
@keyframes rise-in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
.results__delta { animation: rise-in var(--t-med) var(--ease-out) 250ms both; }
.results__actions > * { animation: rise-in var(--t-med) var(--ease-out) both; }
.results__actions > *:nth-child(1) { animation-delay: 350ms; }
.results__actions > *:nth-child(2) { animation-delay: 430ms; }
.results__actions > *:nth-child(3) { animation-delay: 510ms; }
@keyframes ribbon-in { from { opacity: 0; transform: scale(0.6); } to { opacity: 1; transform: scale(1); } }
.results__ribbon {
  color: var(--lime); text-shadow: var(--glow-lime); font-weight: 800; letter-spacing: 3px;
  font-size: 14px; animation: ribbon-in var(--t-slow) var(--ease-spring) 150ms both;
}
@keyframes burst { from { opacity: 0.5; transform: scale(0.4); } to { opacity: 0; transform: scale(1.6); } }
.results__burst {
  position: absolute; inset: -24px; border-radius: 50%; pointer-events: none;
  background: radial-gradient(circle, rgba(182, 255, 0, 0.35), transparent 60%);
  animation: burst 700ms var(--ease-out) 150ms both;
}

/* Hero gradient border (Home dial panel + results card get wrapped in .glow-border) */
.glow-border {
  padding: 1px; border-radius: var(--radius);
  background: linear-gradient(135deg, rgba(0, 240, 255, 0.5), rgba(255, 46, 151, 0.25) 50%, rgba(182, 255, 0, 0.35));
}
.glow-border > * { border-radius: calc(var(--radius) - 1px); background: var(--panel); }
```

- [ ] **Step 7: AppShell.tsx — route fade.** Read the file; wrap the element that renders the routed screen in `<div className="route-fade" key={location.pathname}>…</div>` using `useLocation()` (AppShell renders inside the router; if `useLocation` can't be called there, introduce a tiny inner `<RouteFade>` component around the Routes/Outlet). Do not alter any logic.

- [ ] **Step 8: Home.tsx + Games.tsx — stagger index.** In each tile `.map((g, i) => …)`, add `style={{ '--i': i } as React.CSSProperties}` to the `<Link className="tile">`. In Home also apply to the Today's Words card if it's in the same grid (give it `--i: 0` and shift game tiles by +1). Additionally in Home: wrap the Brain Score dial panel (the hero `.panel` containing ScoreDial + level) in `<div className="glow-border">…</div>` per the spec's hero-surface gradient border (the `.glow-border` CSS lands in Step 6-adjacent block; ensure the inner keeps its padding).

- [ ] **Step 9: echo tile violet — replace the hardcoded `#9d4dff` in global.css echo rules with `var(--violet)`.**

- [ ] **Step 10: Verify + commit.**

Run: `npx vitest run src/screens src/App.test.tsx src/components && npx eslint src && npx tsc --noEmit` → all pass (screen smoke tests tolerate the wrappers; fix any brittle selector fallout).
Run: `git add -A && git commit -m "feat: premium motion/ambience CSS system, route fade, tile stagger"`

---

### Task 2: Sound redesign + haptics + settings toggle

**Files:**
- Modify: `src/audio/sfx.ts`, `src/audio/sfx.test.ts`
- Create: `src/audio/haptics.ts`, `src/audio/haptics.test.ts`
- Modify: `src/storage/db.ts` (SettingsRow + default), `src/components/SettingsSheet.tsx`, `src/components/SettingsSheet.test.tsx`
- Check: wherever legacy settings rows get defaults backfilled (mirror the `reducedMotion` pattern — find it in `src/storage/repos.ts` or the store) and add `hapticsOn`.

- [ ] **Step 1: Write failing haptics tests — `src/audio/haptics.test.ts`:**

```ts
import { hapticTap, hapticMiss, hapticLevelUp, hapticComplete } from './haptics'
import { useAppStore } from '../state/store'

function setHaptics(on: boolean | undefined) {
  useAppStore.setState({ settings: { ...(useAppStore.getState().settings ?? {}), hapticsOn: on } as never })
}

describe('haptics', () => {
  let vibrate: ReturnType<typeof vi.fn>
  beforeEach(() => {
    vibrate = vi.fn()
    Object.defineProperty(navigator, 'vibrate', { value: vibrate, configurable: true })
  })

  it('fires patterns when enabled', () => {
    setHaptics(true)
    hapticTap(); expect(vibrate).toHaveBeenLastCalledWith(8)
    hapticMiss(); expect(vibrate).toHaveBeenLastCalledWith(25)
    hapticLevelUp(); expect(vibrate).toHaveBeenLastCalledWith([10, 40, 10])
    hapticComplete(); expect(vibrate).toHaveBeenLastCalledWith([12, 30, 12, 30, 24])
  })
  it('defaults ON for legacy settings rows missing the field', () => {
    setHaptics(undefined)
    hapticTap(); expect(vibrate).toHaveBeenCalled()
  })
  it('silent when setting off', () => {
    setHaptics(false)
    hapticTap(); expect(vibrate).not.toHaveBeenCalled()
  })
  it('no-ops without the API', () => {
    setHaptics(true)
    Object.defineProperty(navigator, 'vibrate', { value: undefined, configurable: true })
    expect(() => hapticTap()).not.toThrow()
  })
})
```

- [ ] **Step 2: Run `npx vitest run src/audio/haptics.test.ts` → FAIL (module missing).**

- [ ] **Step 3: Implement `src/audio/haptics.ts`:**

```ts
import { useAppStore } from '../state/store'

/** Gated by the hapticsOn setting (default on) and Vibration API presence (absent on iOS Safari). */
function vibrate(pattern: number | number[]): void {
  if (useAppStore.getState().settings?.hapticsOn === false) return
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return
  navigator.vibrate(pattern)
}

export function hapticTap(): void { vibrate(8) }
export function hapticMiss(): void { vibrate(25) }
export function hapticLevelUp(): void { vibrate([10, 40, 10]) }
export function hapticComplete(): void { vibrate([12, 30, 12, 30, 24]) }
```

- [ ] **Step 4: settings plumbing.** `db.ts`: add `hapticsOn: boolean` to `SettingsRow` and `hapticsOn: true` to the defaults object. Find where a loaded legacy row gets missing fields backfilled (the `reducedMotion`/`vocabMode` pattern) and include `hapticsOn`. SettingsSheet: add a toggle row directly under the Sound toggle, same markup pattern, label **Haptics**:

```tsx
<label>
  <span>Haptics</span>
  <input type="checkbox" checked={settings.hapticsOn}
    onChange={e => void updateSettings({ hapticsOn: e.target.checked })} />
</label>
```

(Match the exact existing row structure in the file — copy the Sound row's classes/wrappers.) Extend `SettingsSheet.test.tsx` with a toggle test mirroring the existing sound-toggle test.

- [ ] **Step 5: sfx rework — `src/audio/sfx.ts`.** Keep `context()`/`soundOn()`; add a master bus; revoice; haptics ride along BEFORE the sound gate:

```ts
let master: GainNode | null = null
function bus(ac: AudioContext): AudioNode {
  if (!master) {
    master = ac.createGain()
    master.gain.value = 0.9
    const comp = ac.createDynamicsCompressor()
    master.connect(comp)
    comp.connect(ac.destination)
  }
  return master
}
```

`tone(freq, durMs, type, peak, delayMs = 0)` gains the `delayMs` param (schedule at `t + delayMs / 1000`) and connects to `bus(ac)` instead of `ac.destination`. Then:

```ts
/** Correct answer: two-note micro-arpeggio + haptic tap. */
export function playBlip(): void {
  hapticTap()
  tone(1318.5, 70, 'triangle', 0.14)
  tone(1975.5, 80, 'triangle', 0.12, 45)
}
/** Wrong answer: soft low thud (was a harsh sawtooth) + haptic. */
export function playBuzz(): void {
  hapticMiss()
  tone(110, 160, 'sine', 0.16)
  tone(82.5, 160, 'sine', 0.1)
}
/** Low-timer warning (quieter than before; no haptic — it fires every second). */
export function playTick(): void { tone(1200, 40, 'square', 0.04) }
/** Level-up: C6-E6-G6 arpeggio + haptic pattern. */
export function playChime(): void {
  hapticLevelUp()
  tone(1046.5, 90, 'triangle', 0.12)
  tone(1318.5, 90, 'triangle', 0.12, 60)
  tone(1568, 140, 'triangle', 0.14, 120)
}
/** Combo milestone: rises a semitone per milestone step, capped at +12. */
export function playCombo(step: number): void {
  tone(880 * 2 ** (Math.min(12, step) / 12), 60, 'triangle', 0.1)
}
/** Session complete: resolved C5-G5-C6-E6 motif; NEW BEST appends G6. */
export function playComplete(newBest = false): void {
  hapticComplete()
  tone(523.25, 90, 'triangle', 0.12)
  tone(783.99, 90, 'triangle', 0.12, 70)
  tone(1046.5, 90, 'triangle', 0.13, 140)
  tone(1318.5, 160, 'triangle', 0.14, 210)
  if (newBest) tone(1568, 260, 'triangle', 0.15, 300)
}
/** Near-subliminal UI tap for nav/flips. */
export function playTap(): void { tone(800, 18, 'sine', 0.05) }
```

`import { hapticTap, hapticMiss, hapticLevelUp, hapticComplete } from './haptics'`.

- [ ] **Step 6: update `src/audio/sfx.test.ts`.** Read it first; extend in its existing mocking style: new functions don't throw with sound off; haptics still fire when sound is OFF (assert vibrate mock called by `playBlip` with `soundOn: false`); `playCombo(99)` caps (no throw).

- [ ] **Step 7: Run `npx vitest run src/audio src/components && npx eslint src && npx tsc --noEmit` → all pass. Also run the FULL suite (`npm test`) — games consume these sfx.**

- [ ] **Step 8: Commit — `git add -A && git commit -m "feat: musical sfx redesign, haptics with settings toggle"`**

---

### Task 3: Ceremony hooks + ResultsCard + GamePlay newBest + FlipCard tap

**Depends on Task 2 (playComplete) and Task 1 (CSS classes).**

**Files:**
- Create: `src/lib/useCountUp.ts`, `src/lib/useCountUp.test.ts`, `src/lib/useFeedback.ts`, `src/lib/useFeedback.test.ts`
- Modify: `src/components/ResultsCard.tsx`, `src/components/components.test.tsx` (ResultsCard cases), `src/screens/GamePlay.tsx`, `src/screens/GamePlay.test.tsx`, `src/vocab/FlipCard.tsx` (playTap on flip)

- [ ] **Step 1: failing hook tests.** `src/lib/useFeedback.test.ts`:

```ts
import { act, renderHook } from '@testing-library/react'
import { useFeedback } from './useFeedback'

it('flashes then auto-clears', () => {
  vi.useFakeTimers()
  const { result } = renderHook(() => useFeedback(350))
  act(() => result.current[1]('hit'))
  expect(result.current[0]).toBe('hit')
  act(() => vi.advanceTimersByTime(350))
  expect(result.current[0]).toBeUndefined()
  vi.useRealTimers()
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
  vi.useRealTimers()
})
```

`src/lib/useCountUp.test.ts` (fake rAF via `vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'performance'] })` or a manual rAF stub — match project style): asserts it starts at 0, reaches exactly `target` after ≥800ms of frames, and snaps instantly when `document.documentElement.classList.add('reduced-motion')` is set (clean up the class after).

- [ ] **Step 2: run them → FAIL (modules missing).**

- [ ] **Step 3: implement `src/lib/useFeedback.ts`:**

```ts
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
```

and `src/lib/useCountUp.ts`:

```ts
import { useEffect, useState } from 'react'

function reducedMotion(): boolean {
  if (document.documentElement.classList.contains('reduced-motion')) return true
  return typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches
}

/** Ease-out count from 0 to target; snaps instantly under reduced motion. */
export function useCountUp(target: number, durMs = 800): number {
  const [value, setValue] = useState(0)
  useEffect(() => {
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
```

- [ ] **Step 4: run hook tests → PASS.**

- [ ] **Step 5: ResultsCard ceremony.** New prop `newBest?: boolean`. Structure (keep `deltaCopy` and the three buttons exactly as they are):

```tsx
export function ResultsCard({ score, delta, newBest, onReplay }: Props) {
  const navigate = useNavigate()
  const storageOk = useAppStore(s => s.storageOk)
  const shown = useCountUp(score)
  useEffect(() => { playComplete(newBest) }, [newBest])
  const C = 2 * Math.PI * 56
  return (
    <div className="glow-border" style={{ margin: '15dvh auto 0', maxWidth: 420 }}>
      <div className="results panel" style={{ marginTop: 0 }}>
        <h2>Session complete</h2>
        <div className="results__dial">
          {newBest && <div className="results__burst" />}
          <svg viewBox="0 0 128 128" aria-hidden="true">
            <circle className="results__ring-bg" cx="64" cy="64" r="56" fill="none" strokeWidth="6" />
            <circle className="results__ring" cx="64" cy="64" r="56" fill="none" strokeWidth="6"
              strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - shown / 100)} />
          </svg>
          <div className="results__score">{shown}</div>
        </div>
        {newBest && <div className="results__ribbon">NEW BEST</div>}
        <div className="results__delta">{deltaCopy(storageOk, delta)}</div>
        <div className="results__actions">…unchanged…</div>
      </div>
    </div>
  )
}
```

Adjust the existing `.results` margin-top rule expectation: the wrapper now carries the top margin — verify visually in Task 13 and keep CSS coherent (either style works; pick one place). Update the ResultsCard tests in `components.test.tsx`: render with fake timers/rAF or assert via `findByText` after advancing; add a `newBest` case asserting the NEW BEST ribbon; non-newBest case asserts its absence. Mock `playComplete` in the sfx mock (the file already mocks sfx for other components — extend it).

- [ ] **Step 6: GamePlay newBest.** In `handleFinish`, alongside the existing `lastSessionFor` fetch:

```ts
const [last, best] = await Promise.all([
  lastSessionFor(game.id).catch(() => undefined),
  bestScoreFor(game.id).catch(() => undefined),
])
…
setOutcome({ score: stamped.score, delta: last ? stamped.score - last.score : null,
  newBest: best !== undefined && stamped.score > best })
```

`bestScoreFor` already exists in `src/storage/repos.ts`. NEW BEST is **never** shown on a first-ever run (best undefined → false). Pass `newBest` through the outcome state to `<ResultsCard newBest={outcome.newBest} …/>`. Extend `GamePlay.test.tsx`: a finish with a prior lower best renders NEW BEST; a first run does not.

- [ ] **Step 7: FlipCard — `playTap()` on flip toggle** (import from `../audio/sfx`; call in the existing flip handler; sfx is already mocked in vocab tests — extend the mock if it enumerates functions).

- [ ] **Step 8: Run `npx vitest run src/lib src/components src/screens src/vocab && npx eslint src && npx tsc --noEmit` → pass. Commit: `git add -A && git commit -m "feat: results ceremony (count-up dial, NEW BEST), feedback hook, flip tap"`**

---

### Tasks 4–12: The 9-game feedback sweep (one task per game, all parallel after Task 3)

**Games:** 4 quick-math · 5 equation-sprint · 6 pattern-break · 7 odd-one-out · 8 memory-matrix · 9 digit-span · 10 echo · 11 reaction-speed · 12 go-no-go.
**Files per task:** `src/games/<id>/Component.tsx` + `src/games/<id>/Component.test.tsx` ONLY.

Each game gets the same mechanical wiring (exemplar below is quick-math — Task 4 — shown in full; other games apply the same pattern at their own call sites):

1. `import { useFeedback } from '../../lib/useFeedback'` → `const [feedback, flash] = useFeedback()`.
2. Root div: `<div className="game <id>" data-feedback={feedback}>`.
3. `flash('hit')` / `flash('miss')` at **answer resolution only** — exactly where the game already calls `playBlip()`/`playBuzz()` **for an answer** (never for playback/flash-phase blips, never for ticks):
   - quick-math, equation-sprint, pattern-break, odd-one-out: in `answer()` beside playBlip/playBuzz.
   - memory-matrix: at round evaluation (perfect → hit, else miss) — NOT at flash-start blip.
   - digit-span: at entry submit evaluation.
   - echo: at round resolution (perfect round → hit, wrong tap → miss) — NOT per-tap/playback blips.
   - reaction-speed: valid green tap → hit; false start → miss.
   - go-no-go: correct green tap → hit; commission (red tapped) and omission (green expired) → miss; quiet red expiry stays quiet (no flash — a pulse every stimulus would be noise).
4. Timer urgency (games with a countdown — all except reaction-speed): ensure a `secLeft` const exists (`Math.max(0, Math.ceil(timeLeft / 1000))` — most games already compute it) and render `className={secLeft <= 5 ? 'hud__timer hud__timer--low' : 'hud__timer'}`.
5. Level chip pop (games with adaptive — all except reaction-speed): `<span className="hud__level" key={adaptive.level}>`.
6. Combo/round chip pop: whichever chip the HUD shows (`hud__combo` combo counter or round counter), add `key={combo}` (or `key={rounds}`). Combo games (quick-math, equation-sprint, pattern-break, odd-one-out, and go-no-go if it renders a combo) additionally: when the NEW combo value is a positive multiple of 5, use `className="hud__combo hud__combo--milestone"` and call `playCombo(newCombo / 5)` (import from sfx) beside the blip.
7. Test: add one RTL case to the game's Component.test.tsx — answer correctly (or resolve a round correctly), assert the root's `data-feedback` becomes `'hit'`; where cheap, also a wrong answer → `'miss'`. Use the game's existing test helpers/mocks.

**Task 4 exemplar — quick-math `answer()` after the edit:**

```tsx
const [feedback, flash] = useFeedback()
…
function answer(choice: number) {
  if (doneRef.current) return
  const s = statsRef.current
  const correct = choice === question.answer
  if (correct) playBlip()
  else playBuzz()
  flash(correct ? 'hit' : 'miss')
  …existing stats/adaptive logic unchanged…
  setCombo(c => {
    const next = correct ? c + 1 : 0
    if (next > 0 && next % 5 === 0) playCombo(next / 5)
    return next
  })
  …
}
…
const secLeft = Math.max(0, Math.ceil(timeLeft / 1000))
return (
  <div className="game quick-math" data-feedback={feedback}>
    <div className="hud">
      <span className={secLeft <= 5 ? 'hud__timer hud__timer--low' : 'hud__timer'}>{secLeft}s</span>
      <span className="hud__level" key={adaptive.level}>Lv {adaptive.level}</span>
      {combo > 1
        ? <span className={combo % 5 === 0 ? 'hud__combo hud__combo--milestone' : 'hud__combo'} key={combo} aria-hidden="true">×{combo}</span>
        : <span />}
    </div>
    …
```

(quick-math currently calls `addTime`/`setCombo` separately — merge the milestone logic without changing behavior; keep the existing combo semantics.)

- [ ] Steps per game task: **(1)** write the failing data-feedback test → **(2)** run it, see FAIL → **(3)** wire items 1–6 above → **(4)** `npx vitest run src/games/<id> && npx eslint src/games/<id> && npx tsc --noEmit` → PASS → **(5)** `git add src/games/<id> && git commit -m "feat: premium feedback wiring — <id>"`.

---

### Task 13: Full verification & ship

- [ ] `npm run lint && npm test && npm run build` — all green.
- [ ] Runtime drive via the project verify skill (`.claude/skills/verify/SKILL.md`): screenshot ambience/glass on Home, tile stagger, a hit vignette + miss shake mid-game, timer-low pulse, results ceremony (count-up + ring), a NEW BEST run (play a game twice: first run poorly — tap nothing; second run well), settings sheet with the Haptics toggle.
- [ ] Reduced-motion probe: toggle the setting in the Settings sheet, replay a results screen, confirm score renders instantly (no count-up) and screenshots show no motion artifacts.
- [ ] Commit any fixes, merge `premium-feel` → `main` (ff), push (deploys).
