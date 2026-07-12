# MindSpark Arcade Games Implementation Plan (Plan 2 of 4)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The 8 remaining arcade mini-games (games 2–9 of the design spec): Equation Sprint, Pattern Break, Odd One Out, Memory Matrix, Digit Span, Echo, Reaction Speed, Go / No-Go — each a plugin folder with pure tested logic, a thin component, a registry entry, and neon styles.

**Architecture:** identical to `quick-math` (the reference implementation — read all four of its files first): `src/games/<id>/logic.ts` (pure: generator + checker + `toScore`, zero React), `logic.test.ts`, `Component.tsx` (thin, uses `stepAdaptive`, `createRng`, `useCountdown` where fixed-duration, sfx), `Component.test.tsx` (smoke + interaction), `index.ts` (the `GameDefinition`). Registry order = Games-screen order = spec numbering, with Word Vault last. No storage/scoring/screen changes — `GamePlay` and the EWMA pipeline already handle any registered game.

**Shared conventions (all games):**
- `onFinish` fires at most once (doneRef pattern), reporting `{ gameId, skill, score, difficultyReached, accuracy, avgMs }`.
- Score reflects *demonstrated* skill: difficulty component uses the peak level of a **correctly answered** round (`correctPeak`), while `difficultyReached` reports the actual adaptive peak for next-session resume. Zero correct answers → score 0.
- `avgMs` is measured on correct answers only; `avgMs = 0` is the zero-answers sentinel (no speed credit).
- Adaptive: `stepAdaptive` (3 consecutive correct → up, 2 consecutive misses → down), chime on level-up, blip/buzz on correct/wrong, tick at ≤3s left (timed games).
- RNG: `createRng(Date.now() % 2**31)` seeded once per mount; logic functions take `rng` as a parameter so tests use fixed seeds.
- `toScore` curves pinned by unit tests (exact expected integers at boundary inputs).
- Class names: `game <id>` root, `hud` row, per-game BEM (`.echo__tile` etc.). Styles land in `src/styles/global.css` during integration (Task 9).

**All commands run from the repo root:** `/Users/vishalsingh/Documents/Testing/App-Brain Games/mindspark`
**Standing rule:** work on branch `plan-2-games`; push allowed for this repo (user-authorized 2026-07-08).

---

### Task 1: Equation Sprint (`equation-sprint`, math)

Judge `a op b = shown` as TRUE/FALSE against the clock. 45 s fixed round (no time bonus — pace is the mechanic).

- [ ] `logic.ts`: `generateEquation(level, rng): { text: string; isTrue: boolean }`. The shown result is correct with p=0.5; wrong results are near-misses (±1…±3, never equal to the true answer, never negative when the true answer is ≥0). Complexity: L1–2 single-digit `+`/`−`; L3–4 two-digit `+`/`−`; L5–6 times tables (3–12); L7–8 mixed `×`/`÷` (exact division); L9–10 two-op `a + b × c`. Display glyphs `−`, `×`, `÷`. `toScore`: 55% difficulty + 25% accuracy + 20% speed (avgMs ≤ 700 → full, ≥ 2500 → none).
- [ ] `logic.test.ts`: across levels 1–10 × many seeds — text parses, `isTrue` matches actual evaluation of the displayed equation, false equations are near-misses; score-curve pins.
- [ ] `Component.tsx`: 45 s `useCountdown` (no addTime), big equation, TRUE (lime) / FALSE (magenta) buttons, combo counter.
- [ ] `Component.test.tsx` + `index.ts` (blurb: "True or false? Decide in a blink.").

### Task 2: Pattern Break (`pattern-break`, logic)

"What comes next?" number sequences, 4 choices. 60 s round.

- [ ] `logic.ts`: `generateSequence(level, rng): { terms: number[]; answer: number; choices: number[] }` — 4 shown terms + hidden next. Rules: L1–2 arithmetic (+2…+9); L3–4 arithmetic with negative steps / bigger starts; L5–6 geometric ×2/×3 or perfect squares; L7–8 alternating two-step (+a,+b,+a,+b) or Fibonacci-style (sum of previous two); L9–10 interleaved pair of arithmetic sequences (answer continues the one whose turn is next) or second-order differences (+1,+2,+3…). Distractors: off-by-one-step, wrong-rule continuation, near-miss — all distinct from the answer. `toScore`: 60/25/15, speed window ≤ 3000 → full, ≥ 10000 → none.
- [ ] `logic.test.ts`: every level × seeds — 4 terms, answer consistent with the generating rule, 4 distinct choices containing the answer; score pins.
- [ ] `Component.tsx`: 60 s countdown, terms rendered as `3 · 7 · 11 · 15 · ?`, 4 choice buttons.
- [ ] `Component.test.tsx` + `index.ts` (blurb: "Crack the rule, name what comes next.").

### Task 3: Odd One Out (`odd-one-out`, logic)

Tap the item that doesn't belong. 60 s round, emoji/text items (no assets).

- [ ] `logic.ts`: `generatePuzzle(level, rng): { items: string[]; oddIndex: number }`. L1–3: 4 items (2×2), obvious emoji semantics (fruits vs a vehicle, animals vs a plant — ≥8 category pools, each ≥6 members); L4–6: 6 items, subtler (all even numbers + one odd, vowels + one consonant, same-letter words + one other); L7–8: 9 items, math property (multiples of k + one not, squares + one not); L9–10: 9 items, subtle traps (primes + 91, sequential set with one duplicate-pattern breaker). Odd item must never satisfy the category rule; grid size from a pure `gridFor(level)`. `toScore`: 60/25/15, speed ≤ 2500 → full, ≥ 8000 → none.
- [ ] `logic.test.ts`: every level × seeds — correct grid size, exactly one rule-breaker at `oddIndex`, no duplicate items; score pins.
- [ ] `Component.tsx`: 60 s countdown, responsive grid (2/3 columns), tap = answer, next puzzle.
- [ ] `Component.test.tsx` + `index.ts` (blurb: "One of these things is not like the others.").

### Task 4: Memory Matrix (`memory-matrix`, memory)

Cells flash, then reproduce the pattern. Round-based, 60 s cap.

- [ ] `logic.ts`: `matrixConfig(level): { grid: number; count: number; flashMs: number }` — L1–3 grid 3 (counts 3,4,4), L4–7 grid 4 (counts 4,5,6,6), L8–10 grid 5 (counts 6,7,8); `flashMs = 1000 − level·40`. `pickCells(grid, count, rng): number[]` (distinct indices). Round is correct only if all selections match (selection count is capped at `count`; any wrong cell = miss). `toScore`: 65% difficulty + 25% accuracy + 10% speed (input phase ≤ 3000 → full, ≥ 8000 → none).
- [ ] `logic.test.ts`: config table pins, `pickCells` distinctness/range across seeds; score pins.
- [ ] `Component.tsx`: phases show→input→feedback (700 ms) → next round; flashed cells glow cyan, picks lime/magenta on reveal; timer keeps running (60 s wall clock ends the run at the next round boundary or input).
- [ ] `Component.test.tsx` (fake timers: flash → recall flow) + `index.ts` (blurb: "Watch the flash. Redraw it from memory.").

### Task 5: Digit Span (`digit-span`, memory)

Digits flash one-by-one; type them back. Round-based, 60 s cap.

- [ ] `logic.ts`: `spanConfig(level): { length: number; showMs: number }` — length `min(2 + level, 11)` (L1→3 … L9/10→11), `showMs = 650 − level·25` per digit (+150 ms gap in the component). `makeDigits(length, rng): string` — digits 0-9, no 3-in-a-row repeats. Checker = string equality. `toScore`: 65% difficulty + 25% accuracy + 10% speed (entry ≤ length·600 → full, ≥ length·1500 → none).
- [ ] `logic.test.ts`: config pins, digit-string properties across seeds; score pins.
- [ ] `Component.tsx`: show phase (one digit at a time, aria-live), then on-screen keypad 0-9 + ⌫; auto-submit at target length; feedback then next round.
- [ ] `Component.test.tsx` + `index.ts` (blurb: "Hold the digits. Type them back.").

### Task 6: Echo (`echo`, memory)

Simon-style: 4 neon tiles play a sequence; repeat it. Round-based, 75 s cap.

- [ ] `logic.ts`: `echoConfig(level): { seqLen: number; playMs: number }` — `seqLen = 2 + ceil(level/2)` (L1→3 … L10→7), `playMs = 650 − level·30` per tile. `makeSequence(seqLen, rng): number[]` (tiles 0–3, no immediate triples). Judging: first wrong tap fails the round immediately. `toScore`: 65% difficulty + 25% accuracy + 10% speed (avg per-tap interval ≤ 600 → full, ≥ 1500 → none).
- [ ] `logic.test.ts`: config pins, sequence properties; score pins.
- [ ] `Component.tsx`: 2×2 tile grid (cyan/magenta/lime/violet), playback phase lights tiles with per-tile tones (`playBlip`-style distinct pitches fine via existing sfx or plain playBlip), input phase, wrong tap → buzz + round ends as miss.
- [ ] `Component.test.tsx` (fake timers) + `index.ts` (blurb: "Watch the tiles sing. Echo them back.").

### Task 7: Reaction Speed (`reaction-speed`, reaction)

Red → green, tap instantly. 5 trials, non-adaptive (measures raw ms).

- [ ] `logic.ts`: `trialDelay(rng): number` in [1200, 3800] ms. `msToScore(avgMs)` pinned to the spec curve: 180 ms → 95, 400 ms → 40 (linear `95 − (ms − 180)·0.25`, clamped 0–100); false starts add a 600 ms penalty entry to the average and count as inaccurate. `summarize(trials)` → `{ avgMs, accuracy, score }`.
- [ ] `logic.test.ts`: delay bounds across seeds; curve pins 180→95, 400→40, ≤~160→100-cap, ≥560→0; false-start math.
- [ ] `Component.tsx`: full-screen tap zone; states wait (magenta "WAIT…") → go (lime "TAP!") → per-trial result (ms) → next; early tap = "Too soon!" penalty trial; after 5 trials finish with `difficultyReached: 1`, `skill: 'reaction'`.
- [ ] `Component.test.tsx` (fake timers: early-tap penalty + normal trial) + `index.ts` (blurb: "Green means go. How fast are you?").

### Task 8: Go / No-Go (`go-no-go`, reaction)

Tap GREEN stimuli, withhold on RED. 45 s run, adaptive pace.

- [ ] `logic.ts`: `gngConfig(level): { windowMs: number; redRatio: number }` — `windowMs = 900 − level·45`, `redRatio = 0.25 + level·0.02`. `nextStimulus(level, rng): { isGo: boolean }` honoring redRatio. Judging: green+tap-in-window = correct (records latency); green+no-tap = miss; red+tap = miss; red+no-tap = correct (no latency sample). `toScore`: 50% difficulty + 30% accuracy + 20% speed (avg go-latency ≤ 350 → full, ≥ 900 → none).
- [ ] `logic.test.ts`: config pins, red-ratio behavior over many draws; judging table; score pins.
- [ ] `Component.tsx`: 45 s countdown; stimuli appear centered (lime ● GO / magenta ⬣ NO) for `windowMs` then a 350 ms gap; tap anywhere on the stage answers; correct/incorrect feedback flashes.
- [ ] `Component.test.tsx` (fake timers) + `index.ts` (blurb: "Green: tap. Red: hold everything.").

### Task 9: Integration — registry, styles, order

- [ ] `src/games/registry.ts`: import all 8; order = spec numbering: quick-math, equation-sprint, pattern-break, odd-one-out, memory-matrix, digit-span, echo, reaction-speed, go-no-go, word-vault. (Home quick-launch shows the first 4 automatically.)
- [ ] `src/styles/global.css`: per-game style blocks (BEM classes from each component), consistent with the existing `.quick-math__*` neon idiom; respect `prefers-reduced-motion` for flash/pulse animations.
- [ ] Smoke-check `Games` screen test still passes (it renders from the registry).

### Task 10: Verification & ship

- [ ] `npm run lint` — clean.
- [ ] `npm test` — full suite green.
- [ ] `npm run build` — tsc + vite green.
- [ ] Manual spot-check via `npm run dev` (each game reachable from /games, finishes into ResultsCard).
- [ ] Commit on `plan-2-games`, merge to `main`, push (deploys via Pages workflow).
