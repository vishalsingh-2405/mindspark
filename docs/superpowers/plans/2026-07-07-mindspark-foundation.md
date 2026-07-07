# MindSpark Foundation Implementation Plan (Plan 1 of 4)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A working MindSpark app shell with the full scoring/streak engine, neon design system, persistence, and one fully playable game (Quick Math) recorded end-to-end.

**Architecture:** Vite + React 18 + TypeScript SPA. Games are plugins: each exports pure logic (`logic.ts`, unit-tested without React) plus a thin component, registered in `src/games/registry.ts`. All user state flows through a zustand store into Dexie (IndexedDB). Scoring is pure functions: per-session 0–100 → per-skill EWMA → Brain Score → level.

**Tech Stack:** react, react-dom, react-router-dom, zustand, dexie · dev: vite, typescript, vitest, jsdom, @testing-library/react, fake-indexeddb

**Roadmap context:** Plan 1 of 4. Plan 2 = remaining 8 games. Plan 3 = Word Vault (pipeline + SRS). Plan 4 = Stats, audio, settings UI, PWA, CI, README. Spec: `docs/superpowers/specs/2026-07-07-mindspark-design.md`.

**All commands run from the repo root:** `/Users/vishalsingh/Documents/Testing/App-Brain Games/mindspark`

---

### Task 1: Project scaffold + test harness

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `index.html`, `.gitignore`
- Create: `src/main.tsx`, `src/App.tsx`, `src/test/setup.ts`, `src/App.test.tsx`

- [ ] **Step 1: Write the config files**

`package.json`:

```json
{
  "name": "mindspark",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

`vite.config.ts`:

```ts
/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    globals: true,
  },
})
```

`tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "skipLibCheck": true,
    "noEmit": true,
    "useDefineForClassFields": true,
    "types": ["vitest/globals", "@testing-library/jest-dom"]
  },
  "include": ["src"]
}
```

`index.html`:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    <meta name="theme-color" content="#070B14" />
    <title>MindSpark — Brain Training</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

`.gitignore`:

```
node_modules/
dist/
*.local
.DS_Store
coverage/
```

- [ ] **Step 2: Write the entry files**

`src/main.tsx`:

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

`src/App.tsx` (placeholder — replaced in Task 10):

```tsx
export default function App() {
  return <h1>MindSpark</h1>
}
```

`src/test/setup.ts`:

```ts
import '@testing-library/jest-dom/vitest'
import 'fake-indexeddb/auto'
```

(`fake-indexeddb/auto` gives every jsdom test a working IndexedDB so components that touch Dexie just work.)

`src/App.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import App from './App'

it('renders the app name', () => {
  render(<App />)
  expect(screen.getByText(/mindspark/i)).toBeInTheDocument()
})
```

- [ ] **Step 3: Install dependencies**

```bash
npm install react react-dom react-router-dom zustand dexie
npm install -D typescript vite @vitejs/plugin-react vitest jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event @types/react @types/react-dom fake-indexeddb
```

- [ ] **Step 4: Verify test harness and build**

Run: `npm test` → Expected: 1 test passes.
Run: `npm run build` → Expected: compiles clean, `dist/` created.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: scaffold Vite + React + TS project with Vitest harness"
```

---

### Task 2: Design tokens + global styles

**Files:**
- Create: `src/styles/tokens.css`, `src/styles/global.css`
- Modify: `src/main.tsx` (import the stylesheets)

- [ ] **Step 1: Write `src/styles/tokens.css`**

```css
:root {
  --bg: #070b14;
  --panel: #0e1526;
  --panel-glass: rgba(14, 21, 38, 0.7);
  --cyan: #00f0ff;
  --magenta: #ff2e97;
  --lime: #b6ff00;
  --text: #eaf6ff;
  --muted: #8a94a6;
  --glow-cyan: 0 0 12px rgba(0, 240, 255, 0.4);
  --glow-magenta: 0 0 12px rgba(255, 46, 151, 0.4);
  --glow-lime: 0 0 12px rgba(182, 255, 0, 0.4);
  --radius: 14px;
  --nav-h: 56px;
}
```

- [ ] **Step 2: Write `src/styles/global.css`**

```css
* { box-sizing: border-box; }
html, body, #root { height: 100%; }
body {
  margin: 0;
  background: var(--bg);
  color: var(--text);
  font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  -webkit-font-smoothing: antialiased;
}
button { font: inherit; cursor: pointer; }
a { color: inherit; }
:focus-visible { outline: 2px solid var(--cyan); outline-offset: 2px; }

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}

/* Layout */
.app { min-height: 100%; display: flex; flex-direction: column; max-width: 480px; margin: 0 auto; }
.app__main { flex: 1; padding: 16px 16px calc(var(--nav-h) + 16px); }
.screen { display: flex; flex-direction: column; gap: 16px; }
.app-title {
  text-align: center; color: var(--cyan); letter-spacing: 4px;
  font-size: 20px; font-weight: 800; text-shadow: var(--glow-cyan); margin: 8px 0;
}
.banner {
  background: rgba(255, 46, 151, 0.15); color: var(--magenta);
  border-bottom: 1px solid var(--magenta); padding: 8px 16px;
  font-size: 13px; text-align: center;
}

/* Panels */
.panel {
  background: var(--panel-glass); border: 1px solid rgba(0, 240, 255, 0.25);
  border-radius: var(--radius); backdrop-filter: blur(8px); padding: 16px;
}

/* Bottom nav */
.bottom-nav {
  position: fixed; bottom: 0; left: 50%; transform: translateX(-50%);
  width: 100%; max-width: 480px; height: var(--nav-h); display: flex;
  background: var(--panel); border-top: 1px solid rgba(0, 240, 255, 0.2);
}
.bottom-nav__tab {
  flex: 1; display: flex; align-items: center; justify-content: center;
  color: var(--muted); text-decoration: none; font-size: 13px; letter-spacing: 0.5px;
}
.bottom-nav__tab.is-active { color: var(--cyan); text-shadow: var(--glow-cyan); }

/* Neon buttons */
.neon-btn {
  background: transparent; border: 1px solid; border-radius: 12px;
  padding: 10px 18px; font-weight: 700; letter-spacing: 0.5px;
  transition: transform 0.1s ease, box-shadow 0.1s ease;
}
.neon-btn:active { transform: scale(0.97); }
.neon-btn--cyan { color: var(--cyan); border-color: var(--cyan); box-shadow: var(--glow-cyan); }
.neon-btn--magenta { color: var(--magenta); border-color: var(--magenta); box-shadow: var(--glow-magenta); }
.neon-btn--lime { color: var(--lime); border-color: var(--lime); box-shadow: var(--glow-lime); }

/* Score dial + radar */
.score-dial { width: 160px; margin: 0 auto; display: block; }
.score-dial__num { fill: var(--text); font-size: 30px; font-weight: 800; }
.score-dial__lvl { fill: var(--cyan); font-size: 10px; letter-spacing: 2px; text-transform: uppercase; }
.radar { width: 200px; margin: 0 auto; display: block; }
.radar__label { fill: var(--muted); font-size: 9px; }

/* Home */
.home__streak { display: flex; justify-content: center; gap: 12px; color: var(--lime); font-size: 14px; }
.home__freeze { color: var(--cyan); }
.home__tiles { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.tile {
  background: var(--panel); border: 1px solid rgba(0, 240, 255, 0.3);
  border-radius: var(--radius); padding: 14px 12px; text-decoration: none;
  display: flex; flex-direction: column; gap: 4px;
}
.tile span { font-weight: 700; font-size: 14px; }
.tile small { color: var(--muted); font-size: 11px; text-transform: capitalize; }

/* Game screens */
.game { display: flex; flex-direction: column; gap: 24px; min-height: 70vh; }
.hud { display: flex; justify-content: space-between; align-items: center; color: var(--muted); font-size: 14px; }
.hud__timer { color: var(--cyan); font-weight: 800; font-size: 18px; text-shadow: var(--glow-cyan); }
.hud__combo { color: var(--lime); font-weight: 700; }
.quick-math__q {
  text-align: center; font-size: 44px; font-weight: 800; letter-spacing: 2px;
  margin: auto 0; text-shadow: var(--glow-cyan);
}
.quick-math__choices { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.choice {
  background: var(--panel); color: var(--text); border: 1px solid rgba(0, 240, 255, 0.4);
  border-radius: var(--radius); padding: 18px; font-size: 22px; font-weight: 700;
}
.choice:active { border-color: var(--cyan); box-shadow: var(--glow-cyan); }

/* Results */
.results { text-align: center; display: flex; flex-direction: column; gap: 12px; margin-top: 15vh; }
.results__score { font-size: 56px; font-weight: 800; color: var(--cyan); text-shadow: var(--glow-cyan); }
.results__delta { color: var(--muted); font-size: 14px; }
.results__actions { display: flex; flex-direction: column; gap: 10px; margin-top: 8px; }
```

- [ ] **Step 3: Import styles in `src/main.tsx`**

Add below the `App` import:

```tsx
import './styles/tokens.css'
import './styles/global.css'
```

- [ ] **Step 4: Verify**

Run: `npm run dev` — open the URL: dark `#070B14` background, "MindSpark" heading visible. Run `npm test` → still passes.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: Cyber Cyan design tokens and global styles"
```

---

### Task 3: lib — seeded RNG + date utils

**Files:**
- Create: `src/lib/rng.ts`, `src/lib/dates.ts`
- Test: `src/lib/rng.test.ts`, `src/lib/dates.test.ts`

- [ ] **Step 1: Write the failing tests**

`src/lib/rng.test.ts`:

```ts
import { createRng, randInt } from './rng'

it('is deterministic for the same seed', () => {
  const a = createRng(42)
  const b = createRng(42)
  expect([a(), a(), a()]).toEqual([b(), b(), b()])
})

it('produces values in [0, 1)', () => {
  const rng = createRng(7)
  for (let i = 0; i < 1000; i++) {
    const v = rng()
    expect(v).toBeGreaterThanOrEqual(0)
    expect(v).toBeLessThan(1)
  }
})

it('randInt stays within inclusive bounds', () => {
  const rng = createRng(1)
  for (let i = 0; i < 1000; i++) {
    const v = randInt(rng, 3, 9)
    expect(v).toBeGreaterThanOrEqual(3)
    expect(v).toBeLessThanOrEqual(9)
  }
})
```

`src/lib/dates.test.ts`:

```ts
import { toDayString, daysBetween, addDays } from './dates'

it('formats a local date as YYYY-MM-DD', () => {
  expect(toDayString(new Date(2026, 6, 7))).toBe('2026-07-07')
})

it('computes day gaps', () => {
  expect(daysBetween('2026-07-01', '2026-07-07')).toBe(6)
  expect(daysBetween('2026-07-07', '2026-07-07')).toBe(0)
})

it('adds days across month boundaries', () => {
  expect(addDays('2026-07-30', 3)).toBe('2026-08-02')
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test` → Expected: FAIL, cannot resolve `./rng` / `./dates`.

- [ ] **Step 3: Implement**

`src/lib/rng.ts`:

```ts
/** mulberry32 — small, fast, seedable PRNG. */
export function createRng(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Random integer in [min, max], inclusive. */
export function randInt(rng: () => number, min: number, max: number): number {
  return Math.floor(rng() * (max - min + 1)) + min
}
```

`src/lib/dates.ts`:

```ts
/** Local calendar day as 'YYYY-MM-DD'. */
export function toDayString(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function toUTC(day: string): number {
  const [y, m, d] = day.split('-').map(Number)
  return Date.UTC(y, m - 1, d)
}

/** Whole days from day `a` to day `b` (positive when b is later). */
export function daysBetween(a: string, b: string): number {
  return Math.round((toUTC(b) - toUTC(a)) / 86_400_000)
}

export function addDays(day: string, n: number): string {
  const t = new Date(toUTC(day) + n * 86_400_000)
  const m = String(t.getUTCMonth() + 1).padStart(2, '0')
  const d = String(t.getUTCDate()).padStart(2, '0')
  return `${t.getUTCFullYear()}-${m}-${d}`
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test` → Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib
git commit -m "feat: seeded RNG and date utilities"
```

---

### Task 4: lib — adaptive difficulty stepper

**Files:**
- Create: `src/lib/adaptive.ts`
- Test: `src/lib/adaptive.test.ts`

- [ ] **Step 1: Write the failing test**

`src/lib/adaptive.test.ts`:

```ts
import { stepAdaptive, type AdaptiveState } from './adaptive'

const at = (level: number): AdaptiveState => ({ level, correctRun: 0, missRun: 0 })

it('levels up after 3 consecutive correct answers', () => {
  let s = at(4)
  s = stepAdaptive(s, true)
  s = stepAdaptive(s, true)
  expect(s.level).toBe(4)
  s = stepAdaptive(s, true)
  expect(s).toEqual({ level: 5, correctRun: 0, missRun: 0 })
})

it('levels down after 2 consecutive misses', () => {
  let s = at(4)
  s = stepAdaptive(s, false)
  expect(s.level).toBe(4)
  s = stepAdaptive(s, false)
  expect(s).toEqual({ level: 3, correctRun: 0, missRun: 0 })
})

it('a miss resets the correct run (and vice versa)', () => {
  let s = at(4)
  s = stepAdaptive(s, true)
  s = stepAdaptive(s, true)
  s = stepAdaptive(s, false)
  expect(s.correctRun).toBe(0)
  s = stepAdaptive(s, true)
  expect(s.missRun).toBe(0)
})

it('clamps at min 1 and max 10', () => {
  let low = at(1)
  low = stepAdaptive(low, false)
  low = stepAdaptive(low, false)
  expect(low.level).toBe(1)

  let high = at(10)
  high = stepAdaptive(high, true)
  high = stepAdaptive(high, true)
  high = stepAdaptive(high, true)
  expect(high.level).toBe(10)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test` → Expected: FAIL, cannot resolve `./adaptive`.

- [ ] **Step 3: Implement `src/lib/adaptive.ts`**

```ts
export interface AdaptiveState {
  level: number
  correctRun: number
  missRun: number
}

/** Spec: ~3 consecutive correct → step up; ~2 consecutive misses → step down. */
export function stepAdaptive(
  s: AdaptiveState,
  correct: boolean,
  min = 1,
  max = 10,
): AdaptiveState {
  if (correct) {
    const run = s.correctRun + 1
    if (run >= 3) return { level: Math.min(max, s.level + 1), correctRun: 0, missRun: 0 }
    return { ...s, correctRun: run, missRun: 0 }
  }
  const run = s.missRun + 1
  if (run >= 2) return { level: Math.max(min, s.level - 1), correctRun: 0, missRun: 0 }
  return { ...s, missRun: run, correctRun: 0 }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test` → Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/adaptive.ts src/lib/adaptive.test.ts
git commit -m "feat: adaptive difficulty stepper"
```

---

### Task 5: Core types + scoring (levels, skill EWMA, Brain Score)

**Files:**
- Create: `src/games/types.ts`, `src/scoring/levels.ts`, `src/scoring/skillScore.ts`, `src/scoring/brainScore.ts`
- Test: `src/scoring/levels.test.ts`, `src/scoring/skillScore.test.ts`, `src/scoring/brainScore.test.ts`

- [ ] **Step 1: Write `src/games/types.ts` (shared vocabulary for everything below)**

```ts
import type { ComponentType } from 'react'

export type Skill = 'math' | 'logic' | 'memory' | 'reaction' | 'vocab'

export interface GameResult {
  gameId: string
  skill: Skill
  score: number // 0–100
  difficultyReached: number
  accuracy: number // 0–1
  avgMs: number
}

export interface GameProps {
  /** Starting difficulty level for this run (1–10). */
  difficulty: number
  onFinish: (result: GameResult) => void
}

export interface GameDefinition {
  id: string
  name: string
  skill: Skill
  blurb: string
  Component: ComponentType<GameProps>
}
```

- [ ] **Step 2: Write the failing tests**

`src/scoring/levels.test.ts`:

```ts
import { levelFor } from './levels'

it('maps scores to the five level bands', () => {
  expect(levelFor(0)).toBe('Novice')
  expect(levelFor(19)).toBe('Novice')
  expect(levelFor(20)).toBe('Sharp')
  expect(levelFor(39)).toBe('Sharp')
  expect(levelFor(40)).toBe('Quick')
  expect(levelFor(59)).toBe('Quick')
  expect(levelFor(60)).toBe('Elite')
  expect(levelFor(79)).toBe('Elite')
  expect(levelFor(80)).toBe('Prodigy')
  expect(levelFor(100)).toBe('Prodigy')
})
```

`src/scoring/skillScore.test.ts`:

```ts
import { updateSkillScore } from './skillScore'

it('first session becomes the skill score', () => {
  expect(updateSkillScore(null, 72)).toBe(72)
})

it('EWMA weights the new session at 25%', () => {
  expect(updateSkillScore(60, 100)).toBe(70) // 0.25*100 + 0.75*60
  expect(updateSkillScore(80, 40)).toBe(70)
})

it('rounds to one decimal', () => {
  expect(updateSkillScore(70, 71)).toBe(70.3) // 70.25 → 70.3
})
```

`src/scoring/brainScore.test.ts`:

```ts
import { computeBrainScore } from './brainScore'

it('is null until any skill has been played', () => {
  expect(computeBrainScore({})).toBeNull()
})

it('averages only the played skills', () => {
  expect(computeBrainScore({ math: 80 })).toBe(80)
  expect(computeBrainScore({ math: 80, memory: 60 })).toBe(70)
  expect(computeBrainScore({ math: 80, memory: 60, vocab: 10 })).toBe(50)
})
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npm test` → Expected: FAIL, unresolved `./levels`, `./skillScore`, `./brainScore`.

- [ ] **Step 4: Implement**

`src/scoring/levels.ts`:

```ts
export function levelFor(score: number): string {
  if (score < 20) return 'Novice'
  if (score < 40) return 'Sharp'
  if (score < 60) return 'Quick'
  if (score < 80) return 'Elite'
  return 'Prodigy'
}
```

`src/scoring/skillScore.ts`:

```ts
const ALPHA = 0.25 // new session weight; history keeps 75%

export function updateSkillScore(prev: number | null, session: number): number {
  if (prev === null) return session
  return Math.round((ALPHA * session + (1 - ALPHA) * prev) * 10) / 10
}
```

`src/scoring/brainScore.ts`:

```ts
import type { Skill } from '../games/types'

export function computeBrainScore(skills: Partial<Record<Skill, number>>): number | null {
  const vals = Object.values(skills).filter((v): v is number => v != null)
  if (vals.length === 0) return null
  return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length)
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test` → Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add src/games/types.ts src/scoring
git commit -m "feat: core game types and scoring engine (levels, EWMA, Brain Score)"
```

---

### Task 6: Streak engine with freezes

**Files:**
- Create: `src/scoring/streak.ts`
- Test: `src/scoring/streak.test.ts`

- [ ] **Step 1: Write the failing test**

`src/scoring/streak.test.ts`:

```ts
import { advanceStreak, type StreakState } from './streak'

const base: StreakState = {
  streak: 0,
  bestStreak: 0,
  lastPlayedDate: null,
  freezesAvailable: 0,
  lastFreezeMilestone: 0,
  frozenDates: [],
}

it('first ever play starts the streak at 1', () => {
  const s = advanceStreak(base, '2026-07-07')
  expect(s.streak).toBe(1)
  expect(s.bestStreak).toBe(1)
  expect(s.lastPlayedDate).toBe('2026-07-07')
})

it('same-day repeat plays do not change anything', () => {
  const s1 = advanceStreak(base, '2026-07-07')
  const s2 = advanceStreak(s1, '2026-07-07')
  expect(s2).toEqual(s1)
})

it('consecutive days increment', () => {
  let s = advanceStreak(base, '2026-07-07')
  s = advanceStreak(s, '2026-07-08')
  expect(s.streak).toBe(2)
})

it('a missed day with a freeze available consumes it and survives', () => {
  let s: StreakState = { ...base, streak: 10, lastPlayedDate: '2026-07-07', freezesAvailable: 1 }
  s = advanceStreak(s, '2026-07-09') // missed the 8th
  expect(s.streak).toBe(11)
  expect(s.freezesAvailable).toBe(0)
  expect(s.frozenDates).toEqual(['2026-07-08'])
})

it('a missed day with no freeze resets to 1', () => {
  let s: StreakState = { ...base, streak: 10, bestStreak: 10, lastPlayedDate: '2026-07-07' }
  s = advanceStreak(s, '2026-07-09')
  expect(s.streak).toBe(1)
  expect(s.bestStreak).toBe(10)
  expect(s.lastFreezeMilestone).toBe(0)
})

it('two missed days need two freezes; one is not enough', () => {
  let s: StreakState = { ...base, streak: 60, lastPlayedDate: '2026-07-07', freezesAvailable: 1, lastFreezeMilestone: 50 }
  s = advanceStreak(s, '2026-07-10') // missed 8th and 9th
  expect(s.streak).toBe(1)
})

it('two missed days covered when two freezes are banked', () => {
  let s: StreakState = { ...base, streak: 100, lastPlayedDate: '2026-07-07', freezesAvailable: 2, lastFreezeMilestone: 100 }
  s = advanceStreak(s, '2026-07-10')
  expect(s.streak).toBe(101)
  expect(s.freezesAvailable).toBe(0)
  expect(s.frozenDates).toEqual(['2026-07-08', '2026-07-09'])
})

it('day 50 earns a freeze, capped at 2', () => {
  let s: StreakState = { ...base, streak: 49, lastPlayedDate: '2026-07-07', freezesAvailable: 0 }
  s = advanceStreak(s, '2026-07-08') // day 50
  expect(s.streak).toBe(50)
  expect(s.freezesAvailable).toBe(1)
  expect(s.lastFreezeMilestone).toBe(50)

  let capped: StreakState = { ...base, streak: 99, lastPlayedDate: '2026-07-07', freezesAvailable: 2, lastFreezeMilestone: 50 }
  capped = advanceStreak(capped, '2026-07-08') // day 100
  expect(capped.freezesAvailable).toBe(2) // cap holds
  expect(capped.lastFreezeMilestone).toBe(100)
})

it('milestone is not re-awarded for the same threshold', () => {
  let s: StreakState = { ...base, streak: 50, lastPlayedDate: '2026-07-07', freezesAvailable: 1, lastFreezeMilestone: 50 }
  s = advanceStreak(s, '2026-07-08') // day 51
  expect(s.freezesAvailable).toBe(1)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test` → Expected: FAIL, cannot resolve `./streak`.

- [ ] **Step 3: Implement `src/scoring/streak.ts`**

```ts
import { addDays, daysBetween } from '../lib/dates'

export interface StreakState {
  streak: number
  bestStreak: number
  lastPlayedDate: string | null // 'YYYY-MM-DD'
  freezesAvailable: number
  lastFreezeMilestone: number
  frozenDates: string[]
}

export const FREEZE_EVERY = 50
export const MAX_FREEZES = 2

/** Advance the streak for a completed activity on `today`. Pure; call once per completion. */
export function advanceStreak(s: StreakState, today: string): StreakState {
  if (s.lastPlayedDate === today) return s

  let next: StreakState
  if (s.lastPlayedDate === null) {
    next = { ...s, streak: 1, lastPlayedDate: today }
  } else {
    const missed = daysBetween(s.lastPlayedDate, today) - 1
    if (missed <= 0) {
      next = { ...s, streak: s.streak + 1, lastPlayedDate: today }
    } else if (missed <= s.freezesAvailable) {
      const frozen = Array.from({ length: missed }, (_, i) => addDays(s.lastPlayedDate!, i + 1))
      next = {
        ...s,
        streak: s.streak + 1,
        freezesAvailable: s.freezesAvailable - missed,
        frozenDates: [...s.frozenDates, ...frozen],
        lastPlayedDate: today,
      }
    } else {
      next = { ...s, streak: 1, lastFreezeMilestone: 0, lastPlayedDate: today }
    }
  }

  const milestone = Math.floor(next.streak / FREEZE_EVERY) * FREEZE_EVERY
  if (milestone > 0 && milestone > next.lastFreezeMilestone) {
    next = {
      ...next,
      freezesAvailable: Math.min(MAX_FREEZES, next.freezesAvailable + 1),
      lastFreezeMilestone: milestone,
    }
  }

  return { ...next, bestStreak: Math.max(next.bestStreak, next.streak) }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test` → Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add src/scoring/streak.ts src/scoring/streak.test.ts
git commit -m "feat: streak engine with 50-day freeze milestones"
```

---

### Task 7: Storage — Dexie schema + repositories

**Files:**
- Create: `src/storage/db.ts`, `src/storage/repos.ts`
- Test: `src/storage/repos.test.ts`

- [ ] **Step 1: Write the failing test**

`src/storage/repos.test.ts`:

```ts
import { db } from './db'
import {
  loadProfile, saveProfile, loadSettings, addSession,
  lastSessionFor, bestScoreFor, getGameLevel, setGameLevel,
} from './repos'

beforeEach(async () => {
  await db.delete()
  await db.open()
})

it('creates a default profile on first load', async () => {
  const p = await loadProfile()
  expect(p.streak).toBe(0)
  expect(p.brainScore).toBeNull()
  expect(p.freezesAvailable).toBe(0)
})

it('round-trips profile updates', async () => {
  const p = await loadProfile()
  await saveProfile({ ...p, streak: 5 })
  expect((await loadProfile()).streak).toBe(5)
})

it('creates default settings on first load', async () => {
  const s = await loadSettings()
  expect(s.soundOn).toBe(true)
  expect(s.wordsPerDay).toBe(10)
})

it('stores sessions and finds last and best per game', async () => {
  await addSession({ gameId: 'quick-math', skill: 'math', score: 50, difficultyReached: 3, accuracy: 0.8, avgMs: 1200, playedAt: '2026-07-07T10:00:00Z' })
  await addSession({ gameId: 'quick-math', skill: 'math', score: 70, difficultyReached: 4, accuracy: 0.9, avgMs: 1100, playedAt: '2026-07-07T11:00:00Z' })
  expect((await lastSessionFor('quick-math'))?.score).toBe(70)
  expect(await bestScoreFor('quick-math')).toBe(70)
  expect(await lastSessionFor('echo')).toBeUndefined()
  expect(await bestScoreFor('echo')).toBeUndefined()
})

it('game level defaults to 1 and round-trips', async () => {
  expect(await getGameLevel('echo')).toBe(1)
  await setGameLevel('echo', 5)
  expect(await getGameLevel('echo')).toBe(5)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test` → Expected: FAIL, cannot resolve `./db` / `./repos`.

- [ ] **Step 3: Implement**

`src/storage/db.ts`:

```ts
import Dexie, { type Table } from 'dexie'
import type { Skill } from '../games/types'

export interface SessionRow {
  id?: number
  gameId: string
  skill: Skill
  score: number
  difficultyReached: number
  accuracy: number
  avgMs: number
  playedAt: string // ISO timestamp
}

export interface ProfileRow {
  id: 'profile'
  brainScore: number | null
  skillScores: Partial<Record<Skill, number>>
  streak: number
  bestStreak: number
  lastPlayedDate: string | null
  freezesAvailable: number
  lastFreezeMilestone: number
  frozenDates: string[]
}

export interface SettingsRow {
  id: 'settings'
  soundOn: boolean
  wordsPerDay: number
  vocabMode: 'word-to-meaning' | 'meaning-to-word'
  reducedMotion: boolean
}

export interface GameLevelRow {
  gameId: string
  lastPeak: number
}

export const DEFAULT_PROFILE: ProfileRow = {
  id: 'profile',
  brainScore: null,
  skillScores: {},
  streak: 0,
  bestStreak: 0,
  lastPlayedDate: null,
  freezesAvailable: 0,
  lastFreezeMilestone: 0,
  frozenDates: [],
}

export const DEFAULT_SETTINGS: SettingsRow = {
  id: 'settings',
  soundOn: true,
  wordsPerDay: 10,
  vocabMode: 'word-to-meaning',
  reducedMotion: false,
}

export class MindSparkDB extends Dexie {
  sessions!: Table<SessionRow, number>
  profile!: Table<ProfileRow, string>
  settings!: Table<SettingsRow, string>
  gameLevels!: Table<GameLevelRow, string>

  constructor() {
    super('mindspark')
    this.version(1).stores({
      sessions: '++id, gameId, skill, playedAt',
      profile: 'id',
      settings: 'id',
      gameLevels: 'gameId',
    })
  }
}

export const db = new MindSparkDB()
```

`src/storage/repos.ts`:

```ts
import {
  db, DEFAULT_PROFILE, DEFAULT_SETTINGS,
  type ProfileRow, type SessionRow, type SettingsRow,
} from './db'

export { DEFAULT_PROFILE, DEFAULT_SETTINGS }

export async function loadProfile(): Promise<ProfileRow> {
  const row = await db.profile.get('profile')
  if (row) return row
  await db.profile.put(DEFAULT_PROFILE)
  return { ...DEFAULT_PROFILE }
}

export async function saveProfile(p: ProfileRow): Promise<void> {
  await db.profile.put(p)
}

export async function loadSettings(): Promise<SettingsRow> {
  const row = await db.settings.get('settings')
  if (row) return row
  await db.settings.put(DEFAULT_SETTINGS)
  return { ...DEFAULT_SETTINGS }
}

export async function saveSettings(s: SettingsRow): Promise<void> {
  await db.settings.put(s)
}

export async function addSession(row: Omit<SessionRow, 'id'>): Promise<void> {
  await db.sessions.add(row as SessionRow)
}

export async function lastSessionFor(gameId: string): Promise<SessionRow | undefined> {
  return db.sessions.where('gameId').equals(gameId).last()
}

export async function bestScoreFor(gameId: string): Promise<number | undefined> {
  const rows = await db.sessions.where('gameId').equals(gameId).toArray()
  return rows.length ? Math.max(...rows.map(r => r.score)) : undefined
}

export async function getGameLevel(gameId: string): Promise<number> {
  return (await db.gameLevels.get(gameId))?.lastPeak ?? 1
}

export async function setGameLevel(gameId: string, lastPeak: number): Promise<void> {
  await db.gameLevels.put({ gameId, lastPeak })
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test` → Expected: all pass (fake-indexeddb backs Dexie in tests).

- [ ] **Step 5: Commit**

```bash
git add src/storage
git commit -m "feat: Dexie schema and typed storage repositories"
```

---

### Task 8: App state store (zustand)

**Files:**
- Create: `src/state/store.ts`
- Test: `src/state/store.test.ts`

- [ ] **Step 1: Write the failing test**

`src/state/store.test.ts`:

```ts
import { db } from '../storage/db'
import { useAppStore } from './store'

beforeEach(async () => {
  await db.delete()
  await db.open()
  useAppStore.setState({ profile: null, settings: null, storageOk: true })
})

it('init loads default profile and settings', async () => {
  await useAppStore.getState().init()
  expect(useAppStore.getState().profile?.streak).toBe(0)
  expect(useAppStore.getState().settings?.wordsPerDay).toBe(10)
})

it('recordSession updates skill score, brain score, streak, and persists', async () => {
  await useAppStore.getState().init()
  await useAppStore.getState().recordSession({
    gameId: 'quick-math', skill: 'math', score: 80,
    difficultyReached: 5, accuracy: 0.9, avgMs: 1500,
  })
  const p = useAppStore.getState().profile!
  expect(p.skillScores.math).toBe(80)
  expect(p.brainScore).toBe(80)
  expect(p.streak).toBe(1)
  expect(await db.sessions.count()).toBe(1)
  expect((await db.profile.get('profile'))?.brainScore).toBe(80)
})

it('second session in the same skill applies the EWMA', async () => {
  await useAppStore.getState().init()
  const result = { gameId: 'quick-math', skill: 'math' as const, difficultyReached: 5, accuracy: 0.9, avgMs: 1500 }
  await useAppStore.getState().recordSession({ ...result, score: 60 })
  await useAppStore.getState().recordSession({ ...result, score: 100 })
  expect(useAppStore.getState().profile?.skillScores.math).toBe(70)
})

it('updateSettings merges and persists', async () => {
  await useAppStore.getState().init()
  await useAppStore.getState().updateSettings({ soundOn: false })
  expect(useAppStore.getState().settings?.soundOn).toBe(false)
  expect((await db.settings.get('settings'))?.soundOn).toBe(false)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test` → Expected: FAIL, cannot resolve `./store`.

- [ ] **Step 3: Implement `src/state/store.ts`**

```ts
import { create } from 'zustand'
import type { GameResult } from '../games/types'
import { toDayString } from '../lib/dates'
import { computeBrainScore } from '../scoring/brainScore'
import { updateSkillScore } from '../scoring/skillScore'
import { advanceStreak } from '../scoring/streak'
import type { ProfileRow, SettingsRow } from '../storage/db'
import * as repo from '../storage/repos'

interface AppState {
  profile: ProfileRow | null
  settings: SettingsRow | null
  /** false when IndexedDB is unavailable — app runs in-memory with a warning banner. */
  storageOk: boolean
  init: () => Promise<void>
  recordSession: (result: GameResult) => Promise<void>
  updateSettings: (patch: Partial<Omit<SettingsRow, 'id'>>) => Promise<void>
}

export const useAppStore = create<AppState>((set, get) => ({
  profile: null,
  settings: null,
  storageOk: true,

  async init() {
    try {
      const [profile, settings] = await Promise.all([repo.loadProfile(), repo.loadSettings()])
      set({ profile, settings, storageOk: true })
    } catch {
      set({ profile: { ...repo.DEFAULT_PROFILE }, settings: { ...repo.DEFAULT_SETTINGS }, storageOk: false })
    }
  },

  async recordSession(result) {
    const prev = get().profile ?? { ...repo.DEFAULT_PROFILE }
    const skillScores = {
      ...prev.skillScores,
      [result.skill]: updateSkillScore(prev.skillScores[result.skill] ?? null, result.score),
    }
    const streaked = advanceStreak(prev, toDayString(new Date()))
    const profile: ProfileRow = {
      ...prev,
      ...streaked,
      skillScores,
      brainScore: computeBrainScore(skillScores),
    }
    set({ profile })
    if (get().storageOk) {
      await repo.addSession({ ...result, playedAt: new Date().toISOString() })
      await repo.saveProfile(profile)
    }
  },

  async updateSettings(patch) {
    const settings: SettingsRow = { ...(get().settings ?? repo.DEFAULT_SETTINGS), ...patch }
    set({ settings })
    if (get().storageOk) await repo.saveSettings(settings)
  },
}))
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test` → Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add src/state
git commit -m "feat: zustand app store wiring scoring engine to storage"
```

---

### Task 9: Shared components — NeonButton, ScoreDial, RadarChart

**Files:**
- Create: `src/components/NeonButton.tsx`, `src/components/ScoreDial.tsx`, `src/components/RadarChart.tsx`
- Test: `src/components/components.test.tsx`

- [ ] **Step 1: Write the failing test**

`src/components/components.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { NeonButton } from './NeonButton'
import { ScoreDial } from './ScoreDial'
import { RadarChart } from './RadarChart'

it('NeonButton renders children and variant class', () => {
  render(<NeonButton variant="lime">Play</NeonButton>)
  const btn = screen.getByRole('button', { name: 'Play' })
  expect(btn.className).toContain('neon-btn--lime')
})

it('ScoreDial shows the score and its level', () => {
  render(<ScoreDial score={68} />)
  expect(screen.getByText('68')).toBeInTheDocument()
  expect(screen.getByText('Elite')).toBeInTheDocument()
})

it('ScoreDial shows a placeholder before any play', () => {
  render(<ScoreDial score={null} />)
  expect(screen.getByText('—')).toBeInTheDocument()
  expect(screen.getByText('Play to rate')).toBeInTheDocument()
})

it('RadarChart renders all five skill axes', () => {
  render(<RadarChart skills={{ math: 50 }} />)
  for (const label of ['Math', 'Logic', 'Memory', 'Reaction', 'Vocab']) {
    expect(screen.getByText(label)).toBeInTheDocument()
  }
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test` → Expected: FAIL, unresolved component imports.

- [ ] **Step 3: Implement**

`src/components/NeonButton.tsx`:

```tsx
import type { ButtonHTMLAttributes } from 'react'

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'cyan' | 'magenta' | 'lime'
}

export function NeonButton({ variant = 'cyan', className = '', ...rest }: Props) {
  return <button className={`neon-btn neon-btn--${variant} ${className}`} {...rest} />
}
```

`src/components/ScoreDial.tsx`:

```tsx
import { levelFor } from '../scoring/levels'

const R = 52
const CIRC = 2 * Math.PI * R

export function ScoreDial({ score }: { score: number | null }) {
  const pct = score ?? 0
  return (
    <svg viewBox="0 0 120 120" className="score-dial" role="img"
      aria-label={score != null ? `Brain Score ${score}` : 'Brain Score not yet rated'}>
      <circle cx="60" cy="60" r={R} fill="none" stroke="var(--panel)" strokeWidth="8" />
      <circle cx="60" cy="60" r={R} fill="none" stroke="var(--cyan)" strokeWidth="8"
        strokeDasharray={`${(pct / 100) * CIRC} ${CIRC}`} strokeLinecap="round"
        transform="rotate(-90 60 60)" style={{ filter: 'drop-shadow(0 0 6px var(--cyan))' }} />
      <text x="60" y="58" textAnchor="middle" className="score-dial__num">{score ?? '—'}</text>
      <text x="60" y="78" textAnchor="middle" className="score-dial__lvl">
        {score != null ? levelFor(score) : 'Play to rate'}
      </text>
    </svg>
  )
}
```

`src/components/RadarChart.tsx`:

```tsx
import type { Skill } from '../games/types'

const AXES: { key: Skill; label: string }[] = [
  { key: 'math', label: 'Math' },
  { key: 'logic', label: 'Logic' },
  { key: 'memory', label: 'Memory' },
  { key: 'reaction', label: 'Reaction' },
  { key: 'vocab', label: 'Vocab' },
]

function point(i: number, value: number): [number, number] {
  const angle = (Math.PI * 2 * i) / AXES.length - Math.PI / 2
  const r = (value / 100) * 60
  return [75 + r * Math.cos(angle), 75 + r * Math.sin(angle)]
}

export function RadarChart({ skills }: { skills: Partial<Record<Skill, number>> }) {
  const outline = AXES.map((_, i) => point(i, 100).join(',')).join(' ')
  const values = AXES.map((a, i) => point(i, skills[a.key] ?? 0).join(',')).join(' ')
  return (
    <svg viewBox="0 0 150 150" className="radar" role="img" aria-label="Skill profile">
      <polygon points={outline} fill="none" stroke="var(--muted)" strokeOpacity="0.35" />
      <polygon points={values} fill="rgba(0, 240, 255, 0.18)" stroke="var(--cyan)" />
      {AXES.map((a, i) => {
        const [x, y] = point(i, 122)
        return (
          <text key={a.key} x={x} y={y} textAnchor="middle" className="radar__label">
            {a.label}
          </text>
        )
      })}
    </svg>
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test` → Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add src/components
git commit -m "feat: NeonButton, ScoreDial, and RadarChart components"
```

---

### Task 10: App shell — router, bottom nav, error boundary, screen stubs

**Files:**
- Create: `src/AppShell.tsx`, `src/components/BottomNav.tsx`, `src/components/ErrorBoundary.tsx`, `src/screens/ComingSoon.tsx`
- Create (stubs, filled in Tasks 11–12): `src/screens/Home.tsx`, `src/screens/Games.tsx`
- Modify: `src/App.tsx`, `src/App.test.tsx`

- [ ] **Step 1: Update the failing test first**

Replace `src/App.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AppShell } from './AppShell'

it('renders Home with the app title and bottom nav', async () => {
  render(<MemoryRouter><AppShell /></MemoryRouter>)
  expect(await screen.findByText('MINDSPARK')).toBeInTheDocument()
  for (const tab of ['Home', 'Games', 'Vocab', 'Stats']) {
    expect(screen.getByRole('link', { name: tab })).toBeInTheDocument()
  }
})

it('shows placeholder screens for Vocab and Stats', async () => {
  render(<MemoryRouter initialEntries={['/vocab']}><AppShell /></MemoryRouter>)
  expect(await screen.findByText(/coming soon/i)).toBeInTheDocument()
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test` → Expected: FAIL, cannot resolve `./AppShell`.

- [ ] **Step 3: Implement**

`src/components/BottomNav.tsx`:

```tsx
import { NavLink } from 'react-router-dom'

const TABS = [
  { to: '/', label: 'Home' },
  { to: '/games', label: 'Games' },
  { to: '/vocab', label: 'Vocab' },
  { to: '/stats', label: 'Stats' },
]

export function BottomNav() {
  return (
    <nav className="bottom-nav">
      {TABS.map(t => (
        <NavLink key={t.to} to={t.to} end={t.to === '/'}
          className={({ isActive }) => `bottom-nav__tab${isActive ? ' is-active' : ''}`}>
          {t.label}
        </NavLink>
      ))}
    </nav>
  )
}
```

`src/components/ErrorBoundary.tsx`:

```tsx
import { Component, type ReactNode } from 'react'

interface Props { children: ReactNode }
interface State { error: Error | null }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  render() {
    if (this.state.error) {
      return (
        <div className="panel" style={{ margin: 16, textAlign: 'center' }}>
          <h2>Something glitched</h2>
          <p style={{ color: 'var(--muted)' }}>{this.state.error.message}</p>
          <button className="neon-btn neon-btn--cyan" onClick={() => this.setState({ error: null })}>
            Try again
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
```

`src/screens/ComingSoon.tsx`:

```tsx
export function ComingSoon({ title }: { title: string }) {
  return (
    <div className="screen" style={{ textAlign: 'center', marginTop: '20vh' }}>
      <h1 className="app-title">{title}</h1>
      <p style={{ color: 'var(--muted)' }}>Coming soon</p>
    </div>
  )
}
```

`src/screens/Home.tsx` (minimal stub — full version in Task 11):

```tsx
export function Home() {
  return <div className="screen"><h1 className="app-title">MINDSPARK</h1></div>
}
```

`src/screens/Games.tsx` (minimal stub — full version in Task 12):

```tsx
export function Games() {
  return <div className="screen"><h1 className="app-title">GAMES</h1></div>
}
```

`src/AppShell.tsx`:

```tsx
import { useEffect } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import { BottomNav } from './components/BottomNav'
import { ErrorBoundary } from './components/ErrorBoundary'
import { ComingSoon } from './screens/ComingSoon'
import { Games } from './screens/Games'
import { Home } from './screens/Home'
import { useAppStore } from './state/store'

export function AppShell() {
  const init = useAppStore(s => s.init)
  const storageOk = useAppStore(s => s.storageOk)
  const { pathname } = useLocation()
  const inGame = pathname.startsWith('/play')

  useEffect(() => { void init() }, [init])

  return (
    <div className="app">
      {!storageOk && <div className="banner">Storage unavailable — progress won't be saved</div>}
      <main className="app__main">
        <ErrorBoundary>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/games" element={<Games />} />
            <Route path="/vocab" element={<ComingSoon title="WORD VAULT" />} />
            <Route path="/stats" element={<ComingSoon title="STATS" />} />
          </Routes>
        </ErrorBoundary>
      </main>
      {!inGame && <BottomNav />}
    </div>
  )
}
```

(The `/play/:gameId` route is added in Task 15.)

Replace `src/App.tsx`:

```tsx
import { BrowserRouter } from 'react-router-dom'
import { AppShell } from './AppShell'

export default function App() {
  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test` → Expected: all pass.

- [ ] **Step 5: Verify in browser**

Run: `npm run dev` — tabs switch between Home / Games / Vocab / Stats; Vocab and Stats show "Coming soon"; active tab glows cyan.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: app shell with router, bottom nav, and error boundary"
```

---

### Task 11: Home screen

**Files:**
- Modify: `src/screens/Home.tsx`
- Create: `src/games/registry.ts` (empty registry so Home compiles; Task 14 fills it)
- Test: `src/screens/Home.test.tsx`

- [ ] **Step 1: Write the failing test**

`src/screens/Home.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { useAppStore } from '../state/store'
import { DEFAULT_PROFILE } from '../storage/repos'
import { Home } from './Home'

it('shows streak, freezes, dial, and quick-launch tiles', () => {
  useAppStore.setState({
    profile: {
      ...DEFAULT_PROFILE,
      brainScore: 68,
      skillScores: { math: 68 },
      streak: 12,
      freezesAvailable: 1,
    },
  })
  render(<MemoryRouter><Home /></MemoryRouter>)
  expect(screen.getByText('68')).toBeInTheDocument()
  expect(screen.getByText(/12-day streak/)).toBeInTheDocument()
  expect(screen.getByText(/×1/)).toBeInTheDocument()
  expect(screen.getByText('Quick Math')).toBeInTheDocument()
})

it('renders sanely with no profile yet', () => {
  useAppStore.setState({ profile: null })
  render(<MemoryRouter><Home /></MemoryRouter>)
  expect(screen.getByText('—')).toBeInTheDocument()
  expect(screen.getByText(/0-day streak/)).toBeInTheDocument()
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test` → Expected: FAIL — stub Home renders none of this.

- [ ] **Step 3: Implement `src/screens/Home.tsx`**

```tsx
import { Link } from 'react-router-dom'
import { RadarChart } from '../components/RadarChart'
import { ScoreDial } from '../components/ScoreDial'
import { games } from '../games/registry'
import { useAppStore } from '../state/store'

export function Home() {
  const profile = useAppStore(s => s.profile)
  const quick = games.slice(0, 4)

  return (
    <div className="screen">
      <h1 className="app-title">MINDSPARK</h1>
      <ScoreDial score={profile?.brainScore ?? null} />
      <div className="home__streak">
        <span>🔥 {profile?.streak ?? 0}-day streak</span>
        {(profile?.freezesAvailable ?? 0) > 0 && (
          <span className="home__freeze">❄️ ×{profile!.freezesAvailable}</span>
        )}
      </div>
      <RadarChart skills={profile?.skillScores ?? {}} />
      <div className="home__tiles">
        {quick.map(g => (
          <Link className="tile" key={g.id} to={`/play/${g.id}`}>
            <span>{g.name}</span>
            <small>{g.skill}</small>
          </Link>
        ))}
      </div>
    </div>
  )
}
```

`src/games/registry.ts` does not exist yet — create it now with an empty list so Home compiles before Quick Math lands (Task 14 fills it):

```ts
import type { GameDefinition } from './types'

export const games: GameDefinition[] = []

export function getGame(id: string): GameDefinition | undefined {
  return games.find(g => g.id === id)
}
```

**Note:** with the registry empty, the `Quick Math` tile assertion in the Home test still fails — that is expected and correct TDD. Mark it with `it.todo`-style skip NOW and un-skip in Task 14, OR (preferred) accept the red test locally and complete Task 14 before pushing. Preferred flow: change that one assertion to be added in Task 14. Concretely: in THIS task, write the first test without the `Quick Math` line; Task 14 adds it back. The test file above shows its final form.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test` → Expected: all pass (with the `Quick Math` assertion deferred to Task 14 as noted).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: Home screen with dial, streak, radar, and quick-launch tiles"
```

---

### Task 12: Games screen

**Files:**
- Modify: `src/screens/Games.tsx`
- Test: `src/screens/Games.test.tsx`

- [ ] **Step 1: Write the failing test**

`src/screens/Games.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { Games } from './Games'

it('renders the games heading and grid container', () => {
  render(<MemoryRouter><Games /></MemoryRouter>)
  expect(screen.getByText('GAMES')).toBeInTheDocument()
  expect(screen.getByTestId('games-grid')).toBeInTheDocument()
})
```

(With the registry still empty the grid is empty; Task 14's registry entry lights it up. The per-game best/last display is covered by manual verification in Task 16.)

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test` → Expected: FAIL — no `games-grid` test id yet.

- [ ] **Step 3: Implement `src/screens/Games.tsx`**

```tsx
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { games } from '../games/registry'
import { bestScoreFor, lastSessionFor } from '../storage/repos'

interface GameStats { best?: number; last?: number }

export function Games() {
  const [stats, setStats] = useState<Record<string, GameStats>>({})

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const entries = await Promise.all(
        games.map(async g => {
          const [best, last] = await Promise.all([bestScoreFor(g.id), lastSessionFor(g.id)])
          return [g.id, { best, last: last?.score }] as const
        }),
      )
      if (!cancelled) setStats(Object.fromEntries(entries))
    })()
    return () => { cancelled = true }
  }, [])

  return (
    <div className="screen">
      <h1 className="app-title">GAMES</h1>
      <div className="home__tiles" data-testid="games-grid">
        {games.map(g => (
          <Link className="tile" key={g.id} to={`/play/${g.id}`}>
            <span>{g.name}</span>
            <small>{g.skill}</small>
            <small>
              {stats[g.id]?.best != null
                ? `Best ${stats[g.id].best} · Last ${stats[g.id].last}`
                : 'Not played yet'}
            </small>
          </Link>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test` → Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: Games screen with per-game best/last stats"
```

---

### Task 13: Quick Math — pure logic

**Files:**
- Create: `src/games/quick-math/logic.ts`
- Test: `src/games/quick-math/logic.test.ts`

- [ ] **Step 1: Write the failing test**

`src/games/quick-math/logic.test.ts`:

```ts
import { createRng } from '../../lib/rng'
import { generateQuestion, toScore } from './logic'

it('always returns 4 unique choices containing the answer', () => {
  const rng = createRng(3)
  for (let level = 1; level <= 10; level++) {
    for (let i = 0; i < 50; i++) {
      const q = generateQuestion(level, rng)
      expect(q.choices).toHaveLength(4)
      expect(new Set(q.choices).size).toBe(4)
      expect(q.choices).toContain(q.answer)
    }
  }
})

it('level 1–2 is single-digit addition/subtraction with non-negative answers', () => {
  const rng = createRng(5)
  for (let i = 0; i < 100; i++) {
    const q = generateQuestion(1, rng)
    expect(q.text).toMatch(/^\d \+ \d$|^\d − \d$/)
    expect(q.answer).toBeGreaterThanOrEqual(0)
  }
})

it('level 5–6 is multiplication', () => {
  const rng = createRng(9)
  for (let i = 0; i < 20; i++) {
    expect(generateQuestion(6, rng).text).toContain('×')
  }
})

it('division questions always divide evenly', () => {
  const rng = createRng(11)
  for (let i = 0; i < 200; i++) {
    const q = generateQuestion(7, rng)
    if (q.text.includes('÷')) {
      const [a, b] = q.text.split(' ÷ ').map(Number)
      expect(a % b).toBe(0)
      expect(q.answer).toBe(a / b)
    }
  }
})

it('level 9–10 uses two operators with correct precedence', () => {
  const rng = createRng(13)
  const q = generateQuestion(9, rng)
  const m = q.text.match(/^(\d+) \+ (\d+) × (\d+)$/)
  expect(m).not.toBeNull()
  const [, a, b, c] = m!.map(Number)
  expect(q.answer).toBe(a + b * c)
})

it('toScore pins the difficulty/accuracy/speed curve', () => {
  expect(toScore({ difficultyReached: 10, accuracy: 1, avgMs: 1000 })).toBe(100)
  expect(toScore({ difficultyReached: 5, accuracy: 0.8, avgMs: 2500 })).toBe(58)
  expect(toScore({ difficultyReached: 1, accuracy: 0.5, avgMs: 4000 })).toBe(19)
  expect(toScore({ difficultyReached: 1, accuracy: 0, avgMs: 8000 })).toBe(6)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test` → Expected: FAIL, cannot resolve `./logic`.

- [ ] **Step 3: Implement `src/games/quick-math/logic.ts`**

```ts
import { randInt } from '../../lib/rng'

export interface Question {
  text: string
  answer: number
  choices: number[]
}

/** Difficulty 1–10 → question. Uses '−', '×', '÷' glyphs for display. */
export function generateQuestion(level: number, rng: () => number): Question {
  let text: string
  let answer: number

  if (level <= 2) {
    let a = randInt(rng, 2, 9)
    let b = randInt(rng, 2, 9)
    if (rng() < 0.5) { text = `${a} + ${b}`; answer = a + b }
    else { if (b > a) [a, b] = [b, a]; text = `${a} − ${b}`; answer = a - b }
  } else if (level <= 4) {
    let a = randInt(rng, 11, 99)
    let b = randInt(rng, 11, 99)
    if (rng() < 0.5) { text = `${a} + ${b}`; answer = a + b }
    else { if (b > a) [a, b] = [b, a]; text = `${a} − ${b}`; answer = a - b }
  } else if (level <= 6) {
    const a = randInt(rng, 3, 12)
    const b = randInt(rng, 3, 12)
    text = `${a} × ${b}`; answer = a * b
  } else if (level <= 8) {
    if (rng() < 0.5) {
      const a = randInt(rng, 12, 49)
      const b = randInt(rng, 3, 9)
      text = `${a} × ${b}`; answer = a * b
    } else {
      const b = randInt(rng, 3, 9)
      answer = randInt(rng, 4, 12)
      text = `${b * answer} ÷ ${b}`
    }
  } else {
    const a = randInt(rng, 11, 30)
    const b = randInt(rng, 11, 30)
    const c = randInt(rng, 2, 9)
    text = `${a} + ${b} × ${c}`; answer = a + b * c
  }

  return { text, answer, choices: makeChoices(answer, rng) }
}

function makeChoices(answer: number, rng: () => number): number[] {
  const set = new Set([answer])
  while (set.size < 4) {
    const delta = randInt(rng, 1, Math.max(3, Math.round(Math.abs(answer) * 0.2)))
    set.add(rng() < 0.5 ? answer + delta : Math.max(0, answer - delta))
  }
  const arr = [...set]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

/** Session score 0–100: 60% difficulty, 25% accuracy, 15% speed (≤1s full, ≥4s none). */
export function toScore(r: { difficultyReached: number; accuracy: number; avgMs: number }): number {
  const difficulty = Math.min(10, r.difficultyReached) / 10
  const speed = Math.max(0, Math.min(1, (4000 - r.avgMs) / 3000))
  const raw = difficulty * 60 + r.accuracy * 25 + speed * 15
  return Math.round(Math.max(0, Math.min(100, raw)))
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test` → Expected: all pass. If a pinned `toScore` value disagrees, fix the implementation — the test values are computed from the documented formula.

- [ ] **Step 5: Commit**

```bash
git add src/games/quick-math
git commit -m "feat: Quick Math question generator and score converter"
```

---

### Task 14: Quick Math — component + registry entry

**Files:**
- Create: `src/games/quick-math/Component.tsx`, `src/games/quick-math/index.ts`
- Modify: `src/games/registry.ts`, `src/screens/Home.test.tsx`
- Test: `src/games/quick-math/Component.test.tsx`

- [ ] **Step 1: Write the failing test**

`src/games/quick-math/Component.test.tsx`:

```tsx
import { act, render, screen } from '@testing-library/react'
import { QuickMath } from './Component'

afterEach(() => vi.useRealTimers())

it('renders HUD, question, and 4 answer choices', () => {
  render(<QuickMath difficulty={1} onFinish={() => {}} />)
  expect(screen.getByText(/^\d+s$/)).toBeInTheDocument()
  expect(screen.getByText(/Lv 1/)).toBeInTheDocument()
  expect(screen.getAllByRole('button')).toHaveLength(4)
})

it('calls onFinish with a result when the timer expires', () => {
  vi.useFakeTimers()
  const onFinish = vi.fn()
  render(<QuickMath difficulty={1} onFinish={onFinish} />)
  act(() => { vi.advanceTimersByTime(31_000) })
  expect(onFinish).toHaveBeenCalledTimes(1)
  const result = onFinish.mock.calls[0][0]
  expect(result.gameId).toBe('quick-math')
  expect(result.skill).toBe('math')
  expect(result.score).toBeGreaterThanOrEqual(0)
  expect(result.score).toBeLessThanOrEqual(100)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test` → Expected: FAIL, cannot resolve `./Component`.

- [ ] **Step 3: Implement `src/games/quick-math/Component.tsx`**

```tsx
import { useEffect, useMemo, useRef, useState } from 'react'
import { stepAdaptive, type AdaptiveState } from '../../lib/adaptive'
import { createRng } from '../../lib/rng'
import type { GameProps } from '../types'
import { generateQuestion, toScore, type Question } from './logic'

const ROUND_MS = 30_000
const BONUS_MS = 2_000
const MAX_MS = 60_000
const TICK = 100

export function QuickMath({ difficulty, onFinish }: GameProps) {
  const rng = useMemo(() => createRng(Date.now() % 2 ** 31), [])
  const [adaptive, setAdaptive] = useState<AdaptiveState>({ level: difficulty, correctRun: 0, missRun: 0 })
  const [question, setQuestion] = useState<Question>(() => generateQuestion(difficulty, rng))
  const [timeLeft, setTimeLeft] = useState(ROUND_MS)
  const [combo, setCombo] = useState(0)
  const statsRef = useRef({ correct: 0, total: 0, totalMs: 0, peak: difficulty, askedAt: performance.now() })
  const doneRef = useRef(false)

  useEffect(() => {
    const t = setInterval(() => setTimeLeft(ms => ms - TICK), TICK)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    if (timeLeft > 0 || doneRef.current) return
    doneRef.current = true
    const s = statsRef.current
    const accuracy = s.total ? s.correct / s.total : 0
    const avgMs = s.total ? s.totalMs / s.total : 0
    onFinish({
      gameId: 'quick-math',
      skill: 'math',
      // zero-answer runs score 0 — idling must never bank difficulty points
      score: s.total === 0 ? 0 : toScore({ difficultyReached: s.peak, accuracy, avgMs }),
      difficultyReached: s.peak,
      accuracy,
      avgMs,
    })
  }, [timeLeft, onFinish])

  function answer(choice: number) {
    if (doneRef.current) return
    const s = statsRef.current
    const correct = choice === question.answer
    s.total += 1
    s.totalMs += performance.now() - s.askedAt
    if (correct) s.correct += 1
    const next = stepAdaptive(adaptive, correct)
    s.peak = Math.max(s.peak, next.level)
    s.askedAt = performance.now()
    setAdaptive(next)
    setCombo(c => (correct ? c + 1 : 0))
    if (correct) setTimeLeft(ms => Math.min(MAX_MS, ms + BONUS_MS))
    setQuestion(generateQuestion(next.level, rng))
  }

  return (
    <div className="game quick-math">
      <div className="hud">
        <span className="hud__timer">{Math.max(0, Math.ceil(timeLeft / 1000))}s</span>
        <span className="hud__level">Lv {adaptive.level}</span>
        {combo > 1 ? <span className="hud__combo">×{combo}</span> : <span />}
      </div>
      <div className="quick-math__q">{question.text}</div>
      <div className="quick-math__choices">
        {question.choices.map(c => (
          <button key={c} className="choice" onClick={() => answer(c)}>{c}</button>
        ))}
      </div>
    </div>
  )
}
```

`src/games/quick-math/index.ts`:

```ts
import type { GameDefinition } from '../types'
import { QuickMath } from './Component'

export const quickMathGame: GameDefinition = {
  id: 'quick-math',
  name: 'Quick Math',
  skill: 'math',
  blurb: 'Solve fast, build combos, beat the clock.',
  Component: QuickMath,
}
```

Update `src/games/registry.ts`:

```ts
import { quickMathGame } from './quick-math'
import type { GameDefinition } from './types'

export const games: GameDefinition[] = [quickMathGame]

export function getGame(id: string): GameDefinition | undefined {
  return games.find(g => g.id === id)
}
```

Un-defer the Home test assertion from Task 11: add `expect(screen.getByText('Quick Math')).toBeInTheDocument()` to the first Home test.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test` → Expected: all pass, including the restored Home assertion.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: Quick Math game component, registered in the game registry"
```

---

### Task 15: GamePlay route + ResultsCard + session recording

**Files:**
- Create: `src/screens/GamePlay.tsx`, `src/components/ResultsCard.tsx`
- Modify: `src/AppShell.tsx` (add route)
- Test: `src/screens/GamePlay.test.tsx`

- [ ] **Step 1: Write the failing test**

`src/screens/GamePlay.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { GamePlay } from './GamePlay'

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/play/:gameId" element={<GamePlay />} />
        <Route path="/games" element={<div>GAMES SCREEN</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

it('redirects to /games for an unknown game id', () => {
  renderAt('/play/not-a-game')
  expect(screen.getByText('GAMES SCREEN')).toBeInTheDocument()
})

it('loads the game component for a valid id', async () => {
  renderAt('/play/quick-math')
  expect(await screen.findByText(/Lv \d/)).toBeInTheDocument()
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test` → Expected: FAIL, cannot resolve `./GamePlay`.

- [ ] **Step 3: Implement**

`src/components/ResultsCard.tsx` (note: navigation via `useNavigate` — wrapping a
`<button>` in a `<Link>` is invalid HTML and an a11y defect):

```tsx
import { useNavigate } from 'react-router-dom'
import { NeonButton } from './NeonButton'

interface Props {
  score: number
  delta: number | null
  onReplay: () => void
}

export function ResultsCard({ score, delta, onReplay }: Props) {
  const navigate = useNavigate()
  return (
    <div className="results panel">
      <h2>Session complete</h2>
      <div className="results__score">{score}</div>
      <div className="results__delta">
        {delta === null
          ? 'First run — baseline set'
          : delta >= 0
            ? `▲ +${delta} vs last time`
            : `▼ ${delta} vs last time`}
      </div>
      <div className="results__actions">
        <NeonButton onClick={onReplay}>Play again</NeonButton>
        <NeonButton variant="magenta" onClick={() => navigate('/games')}>All games</NeonButton>
        <NeonButton variant="lime" onClick={() => navigate('/')}>Home</NeonButton>
      </div>
    </div>
  )
}
```

`src/screens/GamePlay.tsx`:

```tsx
import { useEffect, useState } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import { ResultsCard } from '../components/ResultsCard'
import { getGame } from '../games/registry'
import type { GameResult } from '../games/types'
import { useAppStore } from '../state/store'
import { getGameLevel, lastSessionFor, setGameLevel } from '../storage/repos'

export function GamePlay() {
  const { gameId = '' } = useParams()
  const game = getGame(gameId)
  const recordSession = useAppStore(s => s.recordSession)
  const [startLevel, setStartLevel] = useState<number | null>(null)
  const [outcome, setOutcome] = useState<{ score: number; delta: number | null } | null>(null)
  const [runKey, setRunKey] = useState(0)

  useEffect(() => {
    if (!game) return
    let cancelled = false
    void getGameLevel(game.id).then(peak => {
      if (!cancelled) setStartLevel(Math.max(1, peak - 1))
    })
    return () => { cancelled = true }
  }, [game, runKey])

  if (!game) return <Navigate to="/games" replace />
  if (startLevel === null) return <div className="screen" style={{ textAlign: 'center' }}>Loading…</div>

  async function handleFinish(result: GameResult) {
    const last = await lastSessionFor(result.gameId)
    await recordSession(result)
    await setGameLevel(result.gameId, result.difficultyReached)
    setOutcome({ score: result.score, delta: last ? result.score - last.score : null })
  }

  if (outcome) {
    return (
      <ResultsCard
        score={outcome.score}
        delta={outcome.delta}
        onReplay={() => {
          setOutcome(null)
          setStartLevel(null)
          setRunKey(k => k + 1)
        }}
      />
    )
  }

  const Game = game.Component
  return <Game key={runKey} difficulty={startLevel} onFinish={handleFinish} />
}
```

Add the route to `src/AppShell.tsx` — import `GamePlay` and add inside `<Routes>`:

```tsx
<Route path="/play/:gameId" element={<GamePlay />} />
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test` → Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: GamePlay route with results card and session recording"
```

---

### Task 16: End-to-end verification

**Files:** none (verification only)

- [ ] **Step 1: Full test suite**

Run: `npm test` → Expected: every test passes, 0 failures.

- [ ] **Step 2: Type-check + production build**

Run: `npm run build` → Expected: clean compile, `dist/` produced.

- [ ] **Step 3: Manual play-through**

Run: `npm run dev`, open in a browser at mobile width (~390px):

1. Home shows dial "—" / "Play to rate", 0-day streak, empty radar, Quick Math tile.
2. Tap Quick Math → bottom nav disappears, timer counts down from 30, tapping correct answers adds time and grows the combo; 3 correct in a row bumps `Lv`.
3. Let the timer expire → ResultsCard with a 0–100 score and "First run — baseline set".
4. Home now shows a Brain Score, level name, math axis on the radar, and 🔥 1-day streak.
5. Play again → ResultsCard shows ▲/▼ delta vs last run.
6. Reload the page → everything persisted (IndexedDB).

- [ ] **Step 4: Commit any straggler fixes and close out**

```bash
git add -A
git commit -m "chore: foundation verification pass" --allow-empty
```

---

## Spec coverage (Plan 1 scope)

| Spec item | Where |
|---|---|
| Repo structure, publish-ready | Tasks 1–2 (structure), CI/README deferred to Plan 4 |
| Cyber Cyan tokens, reduced motion, focus states | Task 2 |
| Adaptive difficulty (3-up/2-down, resume peak−1) | Tasks 4, 15 |
| Session score / EWMA / Brain Score / levels | Tasks 5, 13 |
| Streak + 50-day freezes | Task 6 |
| Data model (4 tables + gameLevels) | Task 7 |
| Storage-unavailable banner | Tasks 8, 10 |
| Home / Games screens, radar, dial | Tasks 9–12 |
| Quick Math end-to-end | Tasks 13–15 |
| Games 2–9 | Plan 2 |
| Word Vault + pipeline | Plan 3 (incl. revisiting Home to add the "Today's Words" card from the design spec §Screens) |
| Stats, audio, settings UI, PWA, CI, README | Plan 4 |
