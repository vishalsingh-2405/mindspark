# MindSpark — Premium Feel Pass (Design Spec)

*2026-07-12 · validated through brainstorming; user chose "the full pass", delegated approach choice — approach B (handcrafted, zero new dependencies) selected for best outcome on a lean offline PWA.*

Elevate MindSpark's look, motion, sound, and tactile feel to "very premium" while keeping the
settled constraints: no new runtime dependencies, Cyber Cyan palette, reduced-motion respected,
all pure logic unit-tested.

## Layers

### 1. Motion & visual tokens (`src/styles/tokens.css`)

```
--ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);   /* overshoot press/pop */
--ease-out:    cubic-bezier(0.22, 1, 0.36, 1);      /* entrances */
--t-fast: 120ms;  --t-med: 240ms;  --t-slow: 400ms;
--shadow-panel: inset 0 1px 0 rgba(255,255,255,0.06), 0 8px 24px rgba(0,0,0,0.45);
--violet: #9d4dff;                                   /* promote echo's hardcoded hex to a token */
```

### 2. Ambience & glass depth (`global.css`, no JS)

- `body::before` fixed, `pointer-events:none`, `z-index:-1`: two radial-gradient glows
  (cyan upper-left, magenta lower-right, ≤6% alpha) + a faint 32px grid via
  `repeating-linear-gradient` (≤3% alpha). Fixed attachment → paints once.
- `.panel` and tiles gain `--shadow-panel` (inner top highlight = glass edge) on top of
  existing border/blur.
- Hero surfaces (Brain Score dial panel on Home, ResultsCard) get a 1px gradient border:
  wrapper `padding:1px; background:linear-gradient(135deg, cyan→magenta→lime at low alpha);
  border-radius` — inner keeps `--panel` background.
- All numerals that change (timers, scores, dial, combo): `font-variant-numeric: tabular-nums`.

### 3. Interaction feel (`global.css` only)

- Shared press physics on every interactive element (`.choice`, `.tile`, `.neon-btn`,
  `.odd-one-out__item`, `.digit-span__key`, `.echo__tile`, `.memory-matrix__cell`,
  `.reaction-speed__stage`, `.go-no-go__stage`, `.flip-card`, nav links):
  `transition: transform var(--t-fast) var(--ease-spring), box-shadow var(--t-fast) ease,
  border-color var(--t-fast) ease;` + `:active { transform: scale(0.96) }`.
- `@media (hover:hover)`: hover lift `translateY(-2px)` + glow bloom on tiles/buttons.
- Tile grids (Home quick-launch, Games): staggered entrance — screens set `style={{'--i': i}}`
  per tile; CSS `animation: tile-in var(--t-med) var(--ease-out) both;
  animation-delay: calc(var(--i) * 35ms)` (fade + 12px rise).
- Bottom nav: active link gets a glow dot (`::after`) that scales/fades in.

### 4. Screen transitions (`AppShell.tsx` + CSS)

Wrap the routed screen in `<div className="route-fade" key={location.pathname}>` →
CSS `route-in` animation: opacity 0→1, translateY 8px→0, `var(--t-med) var(--ease-out)`.
No exit animations (not worth a dependency).

### 5. Standardized in-game feedback (all 9 arcade games + shared hook)

- New `src/lib/useFeedback.ts`: `const [feedback, flash] = useFeedback()` —
  `flash('hit'|'miss')` sets the value and auto-clears after 350ms (timeout, cleaned up;
  re-flash restarts). ~20 lines, unit-tested.
- Game roots render `data-feedback={feedback}` (`hit` | `miss` | absent). CSS on `.game`:
  - `[data-feedback="hit"]` → `game-hit` animation: brief cyan radial vignette via `::after`
    overlay (fixed, pointer-events none), 300ms.
  - `[data-feedback="miss"]` → `game-miss`: 4-keyframe horizontal shake (±6px, 250ms)
    + magenta vignette.
- Timer urgency: timed games add `hud__timer--low` class when ≤5s → CSS pulse + magenta shift.
- Level chip pop: `key={adaptive.level}` on `.hud__level` + `chip-pop` animation (scale 1.25→1).
- Combo chip pop: `key={combo}` on `.hud__combo` + same `chip-pop`; at combo %5==0 add
  `hud__combo--milestone` (bigger pop + brighter).
- Per-game edits are mechanical: call `flash()` in the answer/resolve handler, add the three
  className/key bits. Games keep their existing sfx calls.

### 6. Results ceremony (`ResultsCard.tsx`, `GamePlay.tsx`, `useCountUp.ts`)

- New `src/lib/useCountUp.ts`: rAF ease-out count 0→value over 800ms; if reduced motion
  (OS media query OR `:root.reduced-motion`) snap instantly. Unit-tested with fake rAF.
- ResultsCard sequence (CSS delays, one keyframe set):
  card scales in (spring) → score counts up inside an SVG ring whose stroke sweeps with the
  same animated value (score/100 of circumference) → delta line slides in (+250ms) →
  action buttons stagger (+80ms each).
- `GamePlay` computes `newBest` (via existing `bestScoreFor` **before** recording) and passes
  `newBest: boolean` to ResultsCard → lime **NEW BEST** ribbon (scale-in) + one-shot radial
  glow burst behind the score.
- On mount: `playComplete(newBest)` motif + `hapticComplete()`.

### 7. Sound redesign (`src/audio/sfx.ts` — same file, richer voices)

- Master chain singleton: `GainNode(0.9)` → `DynamicsCompressorNode` → destination;
  all tones route through it (keeps layered notes from clipping).
- `playBlip` → two-note micro-arpeggio (E6 1318.5Hz → B6 1975.5Hz, 45ms apart, triangle, soft).
- `playBuzz` → soft low thud: sine 110Hz + 82.5Hz dyad, 160ms, low gain (replace harsh sawtooth).
- `playTick` → gain down to ~0.04.
- `playChime` → C6-E6-G6 major-triad arpeggio (60ms steps).
- New `playCombo(step)` → single note rising a semitone per milestone
  (880 × 2^(step/12), capped at +12).
- New `playComplete(newBest)` → C5-G5-C6-E6 motif (70ms steps); newBest appends G6 + longer tail.
- New `playTap()` → near-subliminal 800Hz/18ms click for nav + card flips.
- **Haptics ride along inside sfx functions**, gated independently (see 8) *before* the
  `soundOn` check — sound off must not kill haptics. Public API stays superset-compatible;
  update `sfx.test.ts`.

### 8. Haptics (`src/audio/haptics.ts` new + settings)

- `hapticTap()` 8ms · `hapticMiss()` 25ms · `hapticLevelUp()` [10,40,10] ·
  `hapticComplete()` [12,30,12,30,24]. No-op when `navigator.vibrate` missing (iOS Safari)
  or setting off. Unit-tested with a vibrate mock.
- Settings: `hapticsOn: boolean` default `true` — Dexie `SettingsRow` + default + legacy
  backfill (mirror `reducedMotion` pattern), SettingsSheet toggle "Haptics — vibration on
  mobile", test updated.
- Wired inside sfx: blip→tap, buzz→miss, chime→level-up, complete→complete.

### 9. Vocab touch-up

FlipCard: press scale (shared physics) + `playTap()` on flip. Nothing else — the deck flow
already feels good.

### 10. Reduced motion

The existing global kill (OS media query + `:root.reduced-motion`) zeroes every new
animation/transition automatically. `useCountUp` snaps. Vignette flashes become instant
(duration ~0 — acceptable). Haptics is its own toggle, not tied to motion.

## Explicitly out of scope

Confetti/particle systems, exit animations, framer-motion, theme variants, new games/screens.

## Testing

- Unit: `useCountUp` (fake rAF + reduced-motion snap), `useFeedback` (set/auto-clear/restart),
  `haptics` (gating matrix: setting × API presence), `sfx` new functions (no-throw, soundOn
  gate, haptic pass-through), settings backfill, SettingsSheet toggle, ResultsCard
  (count-up completes, NEW BEST ribbon when prop set), one game asserting `data-feedback`
  flips on answer.
- Runtime: project verify skill — drive games, screenshot ambience, feedback flash, results
  ceremony, NEW BEST run, settings toggle.
