# MindSpark Polish & Ship (Plan 4) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship MindSpark as an installable, offline-capable PWA on GitHub Pages, with the Stats screen, Web Audio SFX, a Settings sheet, ESLint + CI, README and LICENSE.

**Architecture:** All new UI follows the existing screen/panel patterns (custom SVG charts, no chart library; design tokens from tokens.css). Audio is a tiny imperative synth module gated by `settings.soundOn`. Deploy is GitHub Pages under the `/mindspark/` subpath, so every absolute URL goes through `import.meta.env.BASE_URL`. CI (lint + test + build) and Pages deploy are separate GitHub Actions workflows.

**Tech Stack:** Existing stack (Vite 8 + React 18 + TS strict + zustand + Dexie + Vitest) plus: ESLint 9 flat config, vite-plugin-pwa (Workbox), sharp (build-time icon generation only), GitHub Actions.

**Context for implementers:**
- Repo root: `/Users/vishalsingh/Documents/Testing/App-Brain Games/mindspark` — the parent path contains a SPACE; always quote paths in shell commands.
- Suite currently 133 tests / 26 files green; `npm run build` = `tsc --noEmit && vite build`.
- CRITICAL: NEVER `git push` — the coordinator handles all pushes. Local commits only.
- Vitest globals are enabled (`it`/`expect`/`vi` without imports). Tests use fake-indexeddb via `src/test/setup.ts`.
- Deploy target URL shape: `https://<user>.github.io/mindspark/` — hence `base: '/mindspark/'`.

**File map (created → responsibility):**
- `eslint.config.js` — flat ESLint config
- `src/audio/sfx.ts` (+test) — Web Audio synth: blip/buzz/tick/chime, soundOn-gated
- `src/state/reset.ts` (+test) — full data wipe (avoids store↔vocabStore import cycle)
- `src/components/SettingsSheet.tsx` (+test) — bottom-sheet settings UI
- `src/stats/history.ts` (+test) — pure session-replay math for charts
- `src/components/LineChart.tsx` (+test) — minimal SVG polyline chart
- `src/screens/Stats.tsx` (+test) — stats screen (replaces ComingSoon)
- `scripts/make-icons.mjs` — one-off PWA icon generation (outputs committed)
- `src/vite-env.d.ts` — vite/client + pwa client types
- `.github/workflows/ci.yml`, `.github/workflows/deploy.yml`
- `README.md`, `LICENSE`

---

### Task 1: ESLint bootstrap

**Files:**
- Create: `eslint.config.js`
- Modify: `package.json` (devDeps + `lint` script)
- Modify: any files with lint errors (mechanical fixes only)

No test framework for config — verification is `npm run lint` passing.

- [ ] **Step 1: Install dependencies**

```bash
npm install -D eslint @eslint/js typescript-eslint eslint-plugin-react-hooks eslint-plugin-react-refresh globals
```

- [ ] **Step 2: Create `eslint.config.js`:**

```js
import js from '@eslint/js'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  { ignores: ['dist', 'coverage', 'public', 'data-pipeline/cache'] },
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommended,
      reactHooks.configs['recommended-latest'],
      reactRefresh.configs.vite,
    ],
    languageOptions: { globals: { ...globals.browser } },
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
  {
    files: ['**/*.test.{ts,tsx}', 'src/test/**'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        it: 'readonly', expect: 'readonly', vi: 'readonly', describe: 'readonly',
        beforeEach: 'readonly', afterEach: 'readonly', beforeAll: 'readonly', afterAll: 'readonly',
      },
    },
    rules: { 'react-refresh/only-export-components': 'off' },
  },
  {
    files: ['**/*.mjs'],
    languageOptions: { globals: { ...globals.node } },
  },
)
```

(If `reactHooks.configs['recommended-latest']` doesn't exist in the installed plugin version, use `reactHooks.configs.recommended` — check `node_modules/eslint-plugin-react-hooks/package.json` exports and report which you used.)

- [ ] **Step 3: Add script to `package.json`:** `"lint": "eslint ."`

- [ ] **Step 4: Run `npm run lint`.** Expect a small number of findings. Fix them MECHANICALLY (unused vars → prefix `_` or remove; missing hook deps → judge each: add the dep if safe, otherwise keep the existing eslint-disable comment style already used in `Vocab.tsx`). `src/games/word-vault/index.tsx` exports a non-component object with an inline component — if `react-refresh/only-export-components` fires there, add a one-line disable comment with reason. Do NOT change any runtime behavior; if a fix would change behavior, report it instead.

- [ ] **Step 5: `npm run lint` clean, `npm test` still 133 green, `npm run build` clean.**

- [ ] **Step 6: Commit** — `chore: ESLint 9 flat config and lint script`

---

### Task 2: Base-path readiness (subpath deploy)

**Files:**
- Modify: `vite.config.ts` (add `base`)
- Modify: `src/App.tsx` (router basename)
- Modify: `src/vocab/bank.ts` (BASE_URL-aware fetch)
- Modify: `src/components/ErrorBoundary.tsx` (escape anchor href)
- Modify: `src/vocab/bank.test.ts` ONLY IF an assertion needs the BASE_URL form (in Vitest `import.meta.env.BASE_URL` is `'/'`, so existing assertions should pass unchanged — verify, don't assume)

- [ ] **Step 1: `vite.config.ts`** — add `base: '/mindspark/'` to the config object (sibling of `plugins`).

- [ ] **Step 2: `src/App.tsx`:**

```tsx
import { BrowserRouter } from 'react-router-dom'
import { AppShell } from './AppShell'

export default function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <AppShell />
    </BrowserRouter>
  )
}
```

- [ ] **Step 3: `src/vocab/bank.ts`** — change the fetch line to:

```ts
  const res = await fetch(`${import.meta.env.BASE_URL}data/vocab/${tier}.json`)
```

(Note: BASE_URL always ends with `/`, so no separator slash before `data`.)

- [ ] **Step 4: `src/components/ErrorBoundary.tsx`** — the escape anchor currently has `href="/"`; change to `href={import.meta.env.BASE_URL}`.

- [ ] **Step 5: Verify.** `npm test` (133 green — bank test still expects `/data/vocab/everyday.json` because BASE_URL is `/` under Vitest). `npm run build`, then check the built HTML references the subpath:

```bash
grep -o '/mindspark/assets/[^"]*' dist/index.html | head -3
```

Expected: `/mindspark/assets/index-*.js` etc. Then `npm run preview &`, `curl -s -o /dev/null -w "%{http_code}\n" http://localhost:4173/mindspark/` → 200, kill the preview.

- [ ] **Step 6: Commit** — `feat: base-path readiness for GitHub Pages subpath deploy`

---

### Task 3: Audio engine

**Files:**
- Create: `src/audio/sfx.ts`
- Test: `src/audio/sfx.test.ts`

Design: imperative module (not a hook) so game logic and stores can call it directly. Every public function is a no-op when `settings.soundOn` is false, when no settings are loaded yet it defaults to ON (spec: sound defaults on), and when the environment lacks AudioContext (jsdom) it exits silently.

- [ ] **Step 1: Failing test — `src/audio/sfx.test.ts`:**

```ts
import { useAppStore } from '../state/store'
import { DEFAULT_SETTINGS } from '../storage/repos'
import { playBlip, playBuzz, playChime, _resetAudioForTests } from './sfx'

class FakeParam {
  setValueAtTime = vi.fn()
  exponentialRampToValueAtTime = vi.fn()
}
class FakeOsc {
  type = 'sine'
  frequency = { value: 0 }
  connect = vi.fn()
  start = vi.fn()
  stop = vi.fn()
}
let created: FakeOsc[] = []
class FakeCtx {
  state = 'running'
  currentTime = 0
  destination = {}
  resume = vi.fn()
  createOscillator() { const o = new FakeOsc(); created.push(o); return o }
  createGain() { return { gain: new FakeParam(), connect: vi.fn() } }
}

beforeEach(() => {
  created = []
  _resetAudioForTests()
  vi.stubGlobal('AudioContext', FakeCtx)
  useAppStore.setState({ settings: structuredClone(DEFAULT_SETTINGS) })
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

it('blip plays a triangle tone at 880Hz', () => {
  playBlip()
  expect(created).toHaveLength(1)
  expect(created[0].type).toBe('triangle')
  expect(created[0].frequency.value).toBe(880)
  expect(created[0].start).toHaveBeenCalled()
})

it('buzz plays a low sawtooth', () => {
  playBuzz()
  expect(created[0].type).toBe('sawtooth')
  expect(created[0].frequency.value).toBe(140)
})

it('is silent when soundOn is false', () => {
  useAppStore.setState({ settings: { ...structuredClone(DEFAULT_SETTINGS), soundOn: false } })
  playBlip(); playBuzz(); playChime()
  expect(created).toHaveLength(0)
})

it('chime plays a rising two-note sequence', () => {
  vi.useFakeTimers()
  playChime()
  expect(created).toHaveLength(1)
  vi.advanceTimersByTime(150)
  expect(created).toHaveLength(2)
  expect(created[1].frequency.value).toBeGreaterThan(created[0].frequency.value)
})

it('does not throw when AudioContext is missing', () => {
  vi.unstubAllGlobals()
  vi.stubGlobal('AudioContext', undefined)
  _resetAudioForTests()
  expect(() => playBlip()).not.toThrow()
})
```

- [ ] **Step 2: `npm test` — FAIL** (cannot resolve './sfx').

- [ ] **Step 3: Implement `src/audio/sfx.ts`:**

```ts
import { useAppStore } from '../state/store'

let ctx: AudioContext | null = null

function context(): AudioContext | null {
  if (typeof AudioContext === 'undefined' || !AudioContext) return null
  ctx ??= new AudioContext()
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

function soundOn(): boolean {
  return useAppStore.getState().settings?.soundOn ?? true
}

/** Fire-and-forget synth tone: fast attack, exponential decay. */
function tone(freq: number, durMs: number, type: OscillatorType, peak: number): void {
  if (!soundOn()) return
  const ac = context()
  if (!ac) return
  const osc = ac.createOscillator()
  const gain = ac.createGain()
  osc.type = type
  osc.frequency.value = freq
  const t = ac.currentTime
  gain.gain.setValueAtTime(0.0001, t)
  gain.gain.exponentialRampToValueAtTime(peak, t + 0.01)
  gain.gain.exponentialRampToValueAtTime(0.0001, t + durMs / 1000)
  osc.connect(gain)
  gain.connect(ac.destination)
  osc.start(t)
  osc.stop(t + durMs / 1000 + 0.02)
}

/** Correct answer. */
export function playBlip(): void { tone(880, 90, 'triangle', 0.18) }
/** Wrong answer. */
export function playBuzz(): void { tone(140, 180, 'sawtooth', 0.12) }
/** Low-timer warning. */
export function playTick(): void { tone(1200, 40, 'square', 0.06) }
/** Level-up / deck complete: rising two-note. */
export function playChime(): void {
  tone(660, 120, 'sine', 0.16)
  setTimeout(() => tone(990, 160, 'sine', 0.16), 110)
}

/** Test hook. */
export function _resetAudioForTests(): void { ctx = null }
```

(Note: `playChime`'s second note re-checks `soundOn()` inside `tone` at fire time — muting mid-chime silences the tail. That's fine.)

- [ ] **Step 4: `npm test` — all pass (138 expected: 133 + 5).** `npm run build` clean.

- [ ] **Step 5: Commit** — `feat: Web Audio synth SFX engine gated by sound setting`

---

### Task 4: Audio wiring (Quick Math + Word Vault)

**Files:**
- Modify: `src/games/quick-math/Component.tsx`
- Modify: `src/screens/Vocab.tsx`
- Create: `src/games/quick-math/Component.test.tsx`
- Modify: `src/screens/Vocab.test.tsx` (chime assertion)

- [ ] **Step 1: Failing test — `src/games/quick-math/Component.test.tsx`:**

```tsx
import { fireEvent, render, screen } from '@testing-library/react'
import { QuickMath } from './Component'

vi.mock('../../audio/sfx', () => ({
  playBlip: vi.fn(),
  playBuzz: vi.fn(),
  playTick: vi.fn(),
  playChime: vi.fn(),
}))
import { playBlip, playBuzz, playChime } from '../../audio/sfx'

/** The question text is deterministic per render tree; compute its answer from the text. */
function solveOnScreen(): { correct: number; wrong: number } {
  const text = screen.getByText(/\d+ [+\-×÷] \d+/).textContent!
  const m = text.match(/(\d+) ([+\-×÷]) (\d+)/)!
  const a = Number(m[1]); const b = Number(m[3])
  const answer = m[2] === '+' ? a + b : m[2] === '-' ? a - b : m[2] === '×' ? a * b : a / b
  const choices = screen.getAllByRole('button').map(btn => Number(btn.textContent))
  return { correct: answer, wrong: choices.find(c => c !== answer)! }
}

beforeEach(() => vi.clearAllMocks())

it('plays blip on correct and buzz on wrong', () => {
  render(<QuickMath difficulty={1} onFinish={() => {}} />)
  fireEvent.click(screen.getByRole('button', { name: String(solveOnScreen().correct) }))
  expect(playBlip).toHaveBeenCalledOnce()
  fireEvent.click(screen.getByRole('button', { name: String(solveOnScreen().wrong) }))
  expect(playBuzz).toHaveBeenCalledOnce()
})

it('plays chime on level-up (3 consecutive correct)', () => {
  render(<QuickMath difficulty={1} onFinish={() => {}} />)
  for (let i = 0; i < 3; i++) {
    fireEvent.click(screen.getByRole('button', { name: String(solveOnScreen().correct) }))
  }
  expect(playChime).toHaveBeenCalledOnce()
})
```

(If multiple identically-numbered buttons exist for a question, `getByRole` with an exact name may match more than one — use `getAllByRole(...)[0]` in that case and note it. The adaptive step-up threshold is 3 consecutive correct — see `src/lib/adaptive.ts`; verify the constant before pinning the loop count.)

- [ ] **Step 2: `npm test` — the new file FAILS** (no sfx calls yet).

- [ ] **Step 3: Wire `src/games/quick-math/Component.tsx`.** Add the import:

```tsx
import { playBlip, playBuzz, playChime, playTick } from '../../audio/sfx'
```

In `answer(choice)`, after `const correct = choice === question.answer`:

```tsx
    if (correct) playBlip()
    else playBuzz()
```

After `const next = stepAdaptive(adaptive, correct)`:

```tsx
    if (next.level > adaptive.level) playChime()
```

Low-timer tick — add alongside the other hooks (top level of the component):

```tsx
  const secLeft = Math.max(0, Math.ceil(timeLeft / 1000))
  useEffect(() => {
    if (secLeft > 0 && secLeft <= 3 && !doneRef.current) playTick()
  }, [secLeft])
```

- [ ] **Step 4: Wire `src/screens/Vocab.tsx`.** Add imports (`useRef` from react, `playChime` from `../audio/sfx`). Inside the component:

```tsx
  const prevStatus = useRef(vocab.status)
  useEffect(() => {
    if (prevStatus.current === 'ready' && vocab.status === 'complete') playChime()
    prevStatus.current = vocab.status
  }, [vocab.status])
```

(Fires only on the live ready→complete transition — NOT when resuming an already-complete deck.)

- [ ] **Step 5: Add the chime assertion to `src/screens/Vocab.test.tsx`.** At the top (after existing imports):

```tsx
vi.mock('../audio/sfx', () => ({ playBlip: vi.fn(), playBuzz: vi.fn(), playTick: vi.fn(), playChime: vi.fn() }))
import { playChime } from '../audio/sfx'
```

In the existing `completing the deck shows the summary panel` test, after the summary assertion:

```tsx
  expect(playChime).toHaveBeenCalledOnce()
```

- [ ] **Step 6: `npm test` — all pass (140 expected: 138 + 2).** `npm run build` clean.

- [ ] **Step 7: Commit** — `feat: wire SFX into Quick Math and Word Vault`

---

### Task 5: Store diagnostics, wordsPerDay clamp, degraded ResultsCard

**Files:**
- Modify: `src/state/store.ts`
- Modify: `src/components/ResultsCard.tsx`
- Modify: `src/state/store.test.ts` (clamp tests — file exists; check its patterns first)
- Modify: `src/components/components.test.tsx` (degraded ResultsCard test)

- [ ] **Step 1: Failing tests.** In the store test file add:

```ts
it('clamps wordsPerDay to 5–25', async () => {
  await useAppStore.getState().updateSettings({ wordsPerDay: 99 })
  expect(useAppStore.getState().settings?.wordsPerDay).toBe(25)
  await useAppStore.getState().updateSettings({ wordsPerDay: 1 })
  expect(useAppStore.getState().settings?.wordsPerDay).toBe(5)
})
```

In `components.test.tsx` add (match the file's existing render/wrapper patterns — ResultsCard needs a router for useNavigate):

```tsx
it('ResultsCard shows a storage warning instead of a bogus baseline when storage is down', () => {
  useAppStore.setState({ storageOk: false })
  render(<MemoryRouter><ResultsCard score={50} delta={null} onReplay={() => {}} /></MemoryRouter>)
  expect(screen.getByText(/storage off/i)).toBeInTheDocument()
  expect(screen.queryByText(/first run/i)).not.toBeInTheDocument()
  useAppStore.setState({ storageOk: true })
})
```

(Add the needed `useAppStore` import; if the file's other tests assume `storageOk: true`, reset it as shown.)

- [ ] **Step 2: `npm test` — the two new tests FAIL.**

- [ ] **Step 3: Implement.** In `src/state/store.ts`:

`updateSettings` — clamp before merging:

```ts
  async updateSettings(patch) {
    if (!get().settings) await get().init() // init guarantees non-null settings afterward
    const clamped = { ...patch }
    if (clamped.wordsPerDay != null) {
      clamped.wordsPerDay = Math.min(25, Math.max(5, Math.round(clamped.wordsPerDay)))
    }
    const settings: SettingsRow = { ...get().settings!, ...clamped }
    set({ settings })
    if (get().storageOk) {
      try {
        await repo.saveSettings(settings)
      } catch (e) {
        console.warn('mindspark: settings persist failed — running in-memory', e)
        set({ storageOk: false })
      }
    }
  },
```

The other two silent catches get diagnostics (behavior unchanged):
- `init` catch: `console.warn('mindspark: storage unavailable — starting with in-memory defaults', e)` (bind `catch (e)`)
- `recordSession` catch: `console.warn('mindspark: session persist failed — storage marked unavailable', e)`

In `src/components/ResultsCard.tsx` — read storageOk and branch the delta line:

```tsx
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '../state/store'
import { NeonButton } from './NeonButton'
```

```tsx
  const storageOk = useAppStore(s => s.storageOk)
```

```tsx
      <div className="results__delta">
        {!storageOk
          ? 'Storage off — this run wasn\'t saved'
          : delta === null
            ? 'First run — baseline set'
            : delta === 0
              ? '— same as last time'
              : delta > 0
                ? `▲ +${delta} vs last time`
                : `▼ ${delta} vs last time`}
      </div>
```

- [ ] **Step 4: `npm test` — all pass (142 expected: 140 + 2).** `npm run build` clean.

- [ ] **Step 5: Commit** — `fix: clamp wordsPerDay, storage diagnostics, honest degraded results copy`

---

### Task 6: Data reset + reduced-motion wiring

**Files:**
- Create: `src/state/reset.ts`
- Test: `src/state/reset.test.ts`
- Modify: `src/AppShell.tsx` (reduced-motion class effect)
- Modify: `src/styles/global.css` (class-based reduced-motion block)

`reset.ts` is a standalone module (NOT a store action) because it must touch both `useAppStore` and `useVocabStore` — putting it in store.ts would create an import cycle (vocabStore already imports store).

- [ ] **Step 1: Failing test — `src/state/reset.test.ts`:**

```ts
import { db } from '../storage/db'
import { DEFAULT_PROFILE } from '../storage/repos'
import { useAppStore } from './store'
import { useVocabStore } from './vocabStore'
import { resetAllData } from './reset'

it('wipes the database and returns both stores to first-run state', async () => {
  await db.open()
  await db.sessions.add({ gameId: 'quick-math', skill: 'math', score: 80, difficultyReached: 3, accuracy: 1, avgMs: 900, playedAt: new Date().toISOString() })
  useAppStore.setState({ profile: { ...structuredClone(DEFAULT_PROFILE), streak: 9 } })
  useVocabStore.setState({ status: 'complete', index: 5 })

  await resetAllData()

  expect(await db.sessions.count()).toBe(0)
  expect(useAppStore.getState().profile?.streak).toBe(0)
  expect(useAppStore.getState().profile?.brainScore).toBeNull()
  expect(useVocabStore.getState().status).toBe('idle')
  expect(useVocabStore.getState().index).toBe(0)
})
```

(If `profile` is null at test start, seed it first with `structuredClone(DEFAULT_PROFILE)` — follow the state-reset patterns used in `vocabStore.test.ts`'s beforeEach.)

- [ ] **Step 2: `npm test` — FAIL** (cannot resolve './reset').

- [ ] **Step 3: Implement `src/state/reset.ts`:**

```ts
import { db } from '../storage/db'
import { DEFAULT_PROFILE, DEFAULT_SETTINGS } from '../storage/repos'
import { clearBankCache } from '../vocab/bank'
import { useAppStore } from './store'
import { useVocabStore } from './vocabStore'

/** Full wipe: IndexedDB, in-memory stores, bank cache. The app returns to first-run state. */
export async function resetAllData(): Promise<void> {
  try {
    await db.delete()
    await db.open()
  } catch (e) {
    console.warn('mindspark: reset could not recreate storage', e)
  }
  clearBankCache()
  useVocabStore.setState({
    status: 'idle', deck: null, index: 0, entry: null,
    flipped: false, error: null, summary: null, day: null,
  })
  useAppStore.setState({
    profile: structuredClone(DEFAULT_PROFILE),
    settings: structuredClone(DEFAULT_SETTINGS),
    storageOk: true,
  })
}
```

- [ ] **Step 4: Reduced-motion wiring.** In `src/AppShell.tsx`, add to the component (a second effect after the init effect):

```tsx
  const settings = useAppStore(s => s.settings)
  useEffect(() => {
    document.documentElement.classList.toggle('reduced-motion', settings?.reducedMotion ?? false)
  }, [settings?.reducedMotion])
```

Append to `src/styles/global.css` (mirrors the existing `prefers-reduced-motion` media block, but driven by the setting):

```css
/* Settings-driven reduced motion (mirrors the prefers-reduced-motion block above) */
:root.reduced-motion *, :root.reduced-motion *::before, :root.reduced-motion *::after {
  animation-duration: 0.01ms !important;
  animation-iteration-count: 1 !important;
  transition-duration: 0.01ms !important;
  scroll-behavior: auto !important;
}
```

- [ ] **Step 5: `npm test` — all pass (143 expected: 142 + 1).** `npm run build` clean.

- [ ] **Step 6: Commit** — `feat: full data reset and settings-driven reduced motion`

---

### Task 7: Settings sheet

**Files:**
- Create: `src/components/SettingsSheet.tsx`
- Test: `src/components/SettingsSheet.test.tsx`
- Modify: `src/screens/Home.tsx` (gear button + sheet state)
- Modify: `src/styles/global.css` (sheet styles)

- [ ] **Step 1: Failing test — `src/components/SettingsSheet.test.tsx`:**

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { db } from '../storage/db'
import { DEFAULT_SETTINGS } from '../storage/repos'
import { useAppStore } from '../state/store'
import { SettingsSheet } from './SettingsSheet'

beforeEach(async () => {
  await db.delete()
  await db.open()
  useAppStore.setState({ profile: null, settings: structuredClone(DEFAULT_SETTINGS), storageOk: true })
})

it('toggles sound off through the store', async () => {
  render(<SettingsSheet open onClose={() => {}} />)
  await userEvent.click(screen.getByRole('checkbox', { name: /sound/i }))
  expect(useAppStore.getState().settings?.soundOn).toBe(false)
})

it('renders nothing when closed', () => {
  const { container } = render(<SettingsSheet open={false} onClose={() => {}} />)
  expect(container).toBeEmptyDOMElement()
})

it('reset requires a second confirming tap', async () => {
  render(<SettingsSheet open onClose={() => {}} />)
  await userEvent.click(screen.getByRole('button', { name: /reset all data/i }))
  // first tap arms — data still there, button now asks to confirm
  expect(screen.getByRole('button', { name: /tap again/i })).toBeInTheDocument()
})
```

- [ ] **Step 2: `npm test` — FAIL.**

- [ ] **Step 3: Implement `src/components/SettingsSheet.tsx`:**

```tsx
import { useState } from 'react'
import { resetAllData } from '../state/reset'
import { useAppStore } from '../state/store'
import { NeonButton } from './NeonButton'

interface Props {
  open: boolean
  onClose: () => void
}

export function SettingsSheet({ open, onClose }: Props) {
  const settings = useAppStore(s => s.settings)
  const updateSettings = useAppStore(s => s.updateSettings)
  const [armReset, setArmReset] = useState(false)
  if (!open || !settings) return null

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" role="dialog" aria-label="Settings" onClick={e => e.stopPropagation()}>
        <h2 className="sheet__title">SETTINGS</h2>

        <label className="sheet__row">
          <span>Sound</span>
          <input type="checkbox" checked={settings.soundOn}
            onChange={e => void updateSettings({ soundOn: e.target.checked })} />
        </label>

        <label className="sheet__row sheet__row--stack">
          <span>Words per day: {settings.wordsPerDay}</span>
          <input type="range" min={5} max={25} value={settings.wordsPerDay}
            onChange={e => void updateSettings({ wordsPerDay: Number(e.target.value) })} />
        </label>

        <div className="sheet__row sheet__row--stack">
          <span>Vocab mode</span>
          <div className="vocab__mode">
            <button type="button" className={settings.vocabMode === 'word-to-meaning' ? 'is-on' : ''}
              onClick={() => void updateSettings({ vocabMode: 'word-to-meaning' })}>Word → Meaning</button>
            <button type="button" className={settings.vocabMode === 'meaning-to-word' ? 'is-on' : ''}
              onClick={() => void updateSettings({ vocabMode: 'meaning-to-word' })}>Meaning → Word</button>
          </div>
        </div>

        <label className="sheet__row">
          <span>Reduced motion</span>
          <input type="checkbox" checked={settings.reducedMotion}
            onChange={e => void updateSettings({ reducedMotion: e.target.checked })} />
        </label>

        {armReset ? (
          <NeonButton variant="magenta" onClick={() => { void resetAllData(); setArmReset(false); onClose() }}>
            ⚠ Tap again to erase everything
          </NeonButton>
        ) : (
          <NeonButton variant="magenta" onClick={() => setArmReset(true)}>Reset all data</NeonButton>
        )}

        <NeonButton onClick={onClose}>Done</NeonButton>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Gear button on Home.** In `src/screens/Home.tsx` add state + button + sheet (imports: `useState` from react, `SettingsSheet` from `../components/SettingsSheet`):

```tsx
  const [settingsOpen, setSettingsOpen] = useState(false)
```

Right after `<h1 className="app-title">MINDSPARK</h1>`:

```tsx
      <button type="button" className="home__gear" aria-label="Settings"
        onClick={() => setSettingsOpen(true)}>⚙</button>
```

Before the closing `</div>` of the screen:

```tsx
      <SettingsSheet open={settingsOpen} onClose={() => setSettingsOpen(false)} />
```

- [ ] **Step 5: Styles — append to `src/styles/global.css`:**

```css
/* Settings sheet */
.home__gear {
  position: absolute; top: 14px; right: 16px;
  background: none; border: none; color: var(--muted); font-size: 20px; line-height: 1;
}
.screen { position: relative; }
.sheet-backdrop {
  position: fixed; inset: 0; background: rgba(0, 0, 0, 0.6); z-index: 40;
  display: flex; align-items: flex-end; justify-content: center;
}
.sheet {
  width: 100%; max-width: 480px; background: var(--panel);
  border-top: 1px solid var(--border-cyan-med); border-radius: 16px 16px 0 0;
  padding: 20px 20px calc(20px + env(safe-area-inset-bottom));
  display: flex; flex-direction: column; gap: 14px;
}
.sheet__title { color: var(--cyan); letter-spacing: 3px; font-size: 15px; margin: 0; text-align: center; }
.sheet__row { display: flex; justify-content: space-between; align-items: center; gap: 12px; font-size: 14px; }
.sheet__row--stack { flex-direction: column; align-items: stretch; gap: 8px; }
.sheet input[type='checkbox'] { width: 20px; height: 20px; accent-color: var(--cyan); }
.sheet input[type='range'] { width: 100%; accent-color: var(--cyan); }
```

(`.screen { position: relative; }` anchors the gear. Verify no existing rule conflicts — `.screen` currently only sets flex properties.)

- [ ] **Step 6: `npm test` — all pass (146 expected: 143 + 3).** Check no existing Home test breaks (the gear adds a button — Home tests query links, should be unaffected; fix mechanically if one asserts button counts). `npm run build` clean.

- [ ] **Step 7: Commit** — `feat: settings sheet with sound, words per day, vocab mode, motion, reset`

---

### Task 8: Stats history module (pure math)

**Files:**
- Create: `src/stats/history.ts`
- Test: `src/stats/history.test.ts`
- Modify: `src/storage/repos.ts` (two read helpers)

- [ ] **Step 1: Failing test — `src/stats/history.test.ts`:**

```ts
import type { SessionRow } from '../storage/db'
import { activityDays, brainScoreHistory, skillTrend } from './history'

function session(partial: Partial<SessionRow> & Pick<SessionRow, 'skill' | 'score' | 'playedAt'>): SessionRow {
  return { gameId: 'quick-math', difficultyReached: 1, accuracy: 1, avgMs: 1000, ...partial }
}

it('replays sessions through the EWMA: one point per day, last value wins', () => {
  const sessions = [
    session({ skill: 'math', score: 80, playedAt: '2026-07-01T10:00:00.000Z' }),
    session({ skill: 'math', score: 40, playedAt: '2026-07-01T11:00:00.000Z' }),
  ]
  const points = brainScoreHistory(sessions)
  expect(points).toHaveLength(1)
  // first session sets 80; second: round((0.25*40 + 0.75*80)*10)/10 = 70 → brain = round(70) = 70
  expect(points[0].brainScore).toBe(70)
})

it('multi-skill brain score averages the replayed skills', () => {
  const sessions = [
    session({ skill: 'math', score: 80, playedAt: '2026-07-01T10:00:00.000Z' }),
    session({ skill: 'vocab', score: 60, playedAt: '2026-07-02T10:00:00.000Z' }),
  ]
  const points = brainScoreHistory(sessions)
  expect(points).toHaveLength(2)
  expect(points[0].brainScore).toBe(80)
  expect(points[1].brainScore).toBe(70) // mean(80, 60)
})

it('orders by playedAt even when input is shuffled', () => {
  const sessions = [
    session({ skill: 'math', score: 40, playedAt: '2026-07-02T10:00:00.000Z' }),
    session({ skill: 'math', score: 80, playedAt: '2026-07-01T10:00:00.000Z' }),
  ]
  const points = brainScoreHistory(sessions)
  expect(points.map(p => p.brainScore)).toEqual([80, 70])
})

it('skillTrend returns the last n scores for one skill in time order', () => {
  const sessions = [
    session({ skill: 'math', score: 10, playedAt: '2026-07-01T10:00:00.000Z' }),
    session({ skill: 'vocab', score: 99, playedAt: '2026-07-01T11:00:00.000Z' }),
    session({ skill: 'math', score: 20, playedAt: '2026-07-02T10:00:00.000Z' }),
    session({ skill: 'math', score: 30, playedAt: '2026-07-03T10:00:00.000Z' }),
  ]
  expect(skillTrend(sessions, 'math', 2)).toEqual([20, 30])
})

it('activityDays flags the played days in the trailing window (oldest first)', () => {
  const sessions = [
    session({ skill: 'math', score: 50, playedAt: '2026-07-08T09:00:00.000Z' }),
    session({ skill: 'math', score: 50, playedAt: '2026-07-06T09:00:00.000Z' }),
  ]
  const days = activityDays(sessions, '2026-07-08', 3) // covers 07-06, 07-07, 07-08
  expect(days).toEqual([true, false, true])
})
```

(NOTE on the activityDays test: `toDayString` converts the ISO timestamp to a LOCAL day string. Pick timestamps mid-day UTC so the local day is stable in the dev timezone (IST = UTC+5:30 → 09:00Z is 14:30 local, same date). Keep them as written.)

- [ ] **Step 2: `npm test` — FAIL.**

- [ ] **Step 3: Implement `src/stats/history.ts`:**

```ts
import type { Skill } from '../games/types'
import { addDays, toDayString } from '../lib/dates'
import { computeBrainScore } from '../scoring/brainScore'
import { updateSkillScore } from '../scoring/skillScore'
import type { SessionRow } from '../storage/db'

export interface BrainPoint {
  day: string
  brainScore: number
}

/** Replay all sessions chronologically through the SAME EWMA the app uses live; one point per day (day's last value). */
export function brainScoreHistory(sessions: SessionRow[]): BrainPoint[] {
  const ordered = [...sessions].sort((a, b) => a.playedAt.localeCompare(b.playedAt))
  const skills: Partial<Record<Skill, number>> = {}
  const byDay = new Map<string, number>()
  for (const s of ordered) {
    skills[s.skill] = updateSkillScore(skills[s.skill] ?? null, s.score)
    const brain = computeBrainScore(skills)
    if (brain !== null) byDay.set(toDayString(new Date(s.playedAt)), brain)
  }
  return [...byDay.entries()].map(([day, brainScore]) => ({ day, brainScore }))
}

/** Last n session scores for one skill, oldest → newest. */
export function skillTrend(sessions: SessionRow[], skill: Skill, n = 10): number[] {
  return sessions
    .filter(s => s.skill === skill)
    .sort((a, b) => a.playedAt.localeCompare(b.playedAt))
    .slice(-n)
    .map(s => s.score)
}

/** Played/not flags for the trailing n days ending at `today`, oldest first. */
export function activityDays(sessions: SessionRow[], today: string, n = 14): boolean[] {
  const played = new Set(sessions.map(s => toDayString(new Date(s.playedAt))))
  return Array.from({ length: n }, (_, i) => played.has(addDays(today, i - (n - 1))))
}
```

- [ ] **Step 4: Repo helpers — add to `src/storage/repos.ts`:**

```ts
export async function allSessions(): Promise<SessionRow[]> {
  return db.sessions.toArray()
}

export async function allVocabProgress(): Promise<VocabProgressRow[]> {
  return db.vocabProgress.toArray()
}
```

- [ ] **Step 5: `npm test` — all pass (151 expected: 146 + 5).** `npm run build` clean.

- [ ] **Step 6: Commit** — `feat: stats history math (brain score replay, skill trends, activity)`

---

### Task 9: LineChart component

**Files:**
- Create: `src/components/LineChart.tsx`
- Modify: `src/components/components.test.tsx` (two tests)
- Modify: `src/styles/global.css` (chart glow)

- [ ] **Step 1: Failing tests — add to `components.test.tsx`:**

```tsx
it('LineChart renders a path through the points and a dot on the last one', () => {
  const { container } = render(<LineChart points={[0, 50, 100]} />)
  expect(container.querySelector('path')).toBeInTheDocument()
  expect(container.querySelector('circle')).toBeInTheDocument()
})

it('LineChart renders nothing for fewer than 2 points', () => {
  const { container } = render(<LineChart points={[42]} />)
  expect(container).toBeEmptyDOMElement()
})
```

- [ ] **Step 2: `npm test` — FAIL.**

- [ ] **Step 3: Implement `src/components/LineChart.tsx`:**

```tsx
interface Props {
  points: number[]
  width?: number
  height?: number
  max?: number
}

/** Minimal SVG polyline chart, 0..max scale, neon-styled via CSS. */
export function LineChart({ points, width = 300, height = 90, max = 100 }: Props) {
  if (points.length < 2) return null
  const step = width / (points.length - 1)
  const pad = 4
  const y = (v: number) => pad + (height - 2 * pad) * (1 - Math.min(max, Math.max(0, v)) / max)
  const d = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${(i * step).toFixed(1)},${y(p).toFixed(1)}`).join(' ')
  const lastX = (points.length - 1) * step
  return (
    <svg className="line-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="score trend">
      <path d={d} fill="none" stroke="var(--cyan)" strokeWidth="2" strokeLinejoin="round" />
      <circle cx={lastX} cy={y(points[points.length - 1])} r="3" fill="var(--cyan)" />
    </svg>
  )
}
```

Append to `src/styles/global.css`:

```css
/* Stats */
.line-chart { width: 100%; height: auto; display: block; filter: drop-shadow(0 0 4px rgba(0, 240, 255, 0.5)); }
```

- [ ] **Step 4: `npm test` — all pass (153 expected: 151 + 2).** `npm run build` clean.

- [ ] **Step 5: Commit** — `feat: neon SVG line chart component`

---

### Task 10: Stats screen

**Files:**
- Create: `src/screens/Stats.tsx`
- Test: `src/screens/Stats.test.tsx`
- Modify: `src/AppShell.tsx` (route), `src/App.test.tsx` (placeholder test → real Stats assertion)
- Delete: `src/screens/ComingSoon.tsx` (no longer referenced anywhere after this)
- Modify: `src/styles/global.css` (stats styles)

- [ ] **Step 1: Failing test — `src/screens/Stats.test.tsx`:**

```tsx
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { db } from '../storage/db'
import { DEFAULT_PROFILE } from '../storage/repos'
import { useAppStore } from '../state/store'
import { Stats } from './Stats'

beforeEach(async () => {
  await db.delete()
  await db.open()
  useAppStore.setState({
    profile: { ...structuredClone(DEFAULT_PROFILE), streak: 3, bestStreak: 7, freezesAvailable: 0 },
    settings: null,
    storageOk: true,
  })
})

it('renders all four stat sections with seeded data', async () => {
  await db.sessions.add({ gameId: 'quick-math', skill: 'math', score: 80, difficultyReached: 3, accuracy: 1, avgMs: 900, playedAt: '2026-07-01T10:00:00.000Z' })
  await db.sessions.add({ gameId: 'quick-math', skill: 'math', score: 60, difficultyReached: 3, accuracy: 1, avgMs: 900, playedAt: '2026-07-02T10:00:00.000Z' })
  // two learned words, exactly one mastered → counts are distinct (2 and 1), so getByText stays unambiguous
  await db.vocabProgress.put({ wordId: 'w1', step: 4, ease: 2.5, due: '2099-01-01', lapses: 0, lastResult: true, seenAt: '2026-07-01' })
  await db.vocabProgress.put({ wordId: 'w2', step: 0, ease: 2.5, due: '2099-01-01', lapses: 0, lastResult: true, seenAt: '2026-07-01' })
  render(<MemoryRouter><Stats /></MemoryRouter>)
  expect(await screen.findByText(/words learned/i)).toBeInTheDocument()
  expect(screen.getByText(/3 days/)).toBeInTheDocument()   // current streak
  expect(screen.getByText(/7 days/)).toBeInTheDocument()   // best streak
  expect(await screen.findByText('2')).toBeInTheDocument() // words learned
  expect(screen.getByText('1')).toBeInTheDocument()        // words mastered
  expect(screen.getByRole('img', { name: /score trend/i })).toBeInTheDocument() // brain chart (2 points)
})

it('renders the empty state when no sessions exist yet', async () => {
  render(<MemoryRouter><Stats /></MemoryRouter>)
  expect(await screen.findByText(/play a few sessions/i)).toBeInTheDocument()
})
```

(Adapt the `VocabProgressRow` literal mechanically to the real interface in `src/storage/db.ts` if field names differ — `step: 4` must satisfy `isMastered`.)

- [ ] **Step 2: `npm test` — FAIL.**

- [ ] **Step 3: Implement `src/screens/Stats.tsx`:**

```tsx
import { useEffect, useState } from 'react'
import { LineChart } from '../components/LineChart'
import type { Skill } from '../games/types'
import { toDayString } from '../lib/dates'
import { useAppStore } from '../state/store'
import { activityDays, brainScoreHistory, skillTrend } from '../stats/history'
import type { SessionRow } from '../storage/db'
import { allSessions, allVocabProgress } from '../storage/repos'
import { isMastered } from '../vocab/srs'

const SKILLS: Skill[] = ['math', 'logic', 'memory', 'reaction', 'vocab']

export function Stats() {
  const profile = useAppStore(s => s.profile)
  const [sessions, setSessions] = useState<SessionRow[]>([])
  const [vocab, setVocab] = useState({ learned: 0, mastered: 0 })

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const [s, v] = await Promise.all([allSessions(), allVocabProgress()])
        if (cancelled) return
        setSessions(s)
        setVocab({ learned: v.length, mastered: v.filter(isMastered).length })
      } catch {
        // storage down — sections render their empty states
      }
    })()
    return () => { cancelled = true }
  }, [])

  const history = brainScoreHistory(sessions)
  const days = activityDays(sessions, toDayString(new Date()))

  return (
    <div className="screen">
      <h1 className="app-title">STATS</h1>

      <div className="panel">
        <h2 className="stats__h">Brain Score</h2>
        {history.length >= 2
          ? <LineChart points={history.map(p => p.brainScore)} />
          : <p className="stats__empty">Play a few sessions on different days to see your trend.</p>}
      </div>

      <div className="panel">
        <h2 className="stats__h">Skills</h2>
        {SKILLS.map(skill => {
          const trend = skillTrend(sessions, skill)
          const current = profile?.skillScores[skill]
          return (
            <div className="stats__skill" key={skill}>
              <span className="stats__skill-name">{skill}</span>
              {trend.length >= 2 ? <span className="stats__spark"><LineChart points={trend} width={120} height={28} /></span> : <span />}
              <span className="stats__skill-score">{current != null ? Math.round(current) : '—'}</span>
            </div>
          )
        })}
      </div>

      <div className="panel">
        <h2 className="stats__h">Word Vault</h2>
        <div className="stats__pair"><span>Words learned</span><span>{vocab.learned}</span></div>
        <div className="stats__pair"><span>Words mastered</span><span>{vocab.mastered}</span></div>
      </div>

      <div className="panel">
        <h2 className="stats__h">Streak</h2>
        <div className="stats__pair"><span>🔥 Current</span><span>{profile?.streak ?? 0} days</span></div>
        <div className="stats__pair"><span>🏆 Best</span><span>{profile?.bestStreak ?? 0} days</span></div>
        <div className="stats__pair"><span>❄️ Freezes banked</span><span>{profile?.freezesAvailable ?? 0}</span></div>
        <div className="stats__strip" aria-label="Last 14 days of activity">
          {days.map((played, i) => <span key={i} className={`stats__day${played ? ' is-played' : ''}`} />)}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Route + cleanup.** In `src/AppShell.tsx`: import `Stats`, replace the `/stats` route element with `<Stats />`, remove the `ComingSoon` import. Delete `src/screens/ComingSoon.tsx`. In `src/App.test.tsx`, replace the `shows placeholder screen for Stats` test with:

```tsx
it('renders the Stats screen', async () => {
  render(<MemoryRouter initialEntries={['/stats']}><AppShell /></MemoryRouter>)
  expect(await screen.findByText('STATS')).toBeInTheDocument()
  expect(await screen.findByText(/words learned/i)).toBeInTheDocument()
})
```

- [ ] **Step 5: Styles — append to `src/styles/global.css`:**

```css
.stats__h { color: var(--cyan); font-size: 13px; letter-spacing: 2px; margin: 0 0 10px; text-transform: uppercase; }
.stats__empty { color: var(--muted); font-size: 13px; margin: 0; }
.stats__skill { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 6px 0; }
.stats__skill-name { text-transform: capitalize; font-size: 14px; flex: 0 0 70px; }
.stats__spark { flex: 1; max-width: 140px; }
.stats__skill-score { color: var(--cyan); font-weight: 700; min-width: 32px; text-align: right; }
.stats__pair { display: flex; justify-content: space-between; font-size: 14px; padding: 4px 0; }
.stats__strip { display: flex; gap: 4px; margin-top: 10px; }
.stats__day { flex: 1; height: 8px; border-radius: 2px; background: var(--bg); border: 1px solid var(--border-cyan-weak); }
.stats__day.is-played { background: var(--lime); box-shadow: var(--glow-lime); border-color: var(--lime); }
```

- [ ] **Step 6: `npm test` — all pass (155 expected: 153 + 2, placeholder test replaced 1:1).** `npm run build` clean.

- [ ] **Step 7: Commit** — `feat: Stats screen with brain score history, skill trends, vocab and streak panels`

---

### Task 11: PWA icons

**Files:**
- Create: `scripts/make-icons.mjs`
- Create (generated, committed): `public/icons/icon-192.png`, `public/icons/icon-512.png`, `public/icons/maskable-512.png`, `public/icons/apple-touch-icon.png`, `public/icons/favicon.svg`
- Modify: `package.json` (script + sharp devDep), `index.html` (icon links)

- [ ] **Step 1: `npm install -D sharp`**

- [ ] **Step 2: Create `scripts/make-icons.mjs`:**

```js
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const here = dirname(fileURLToPath(import.meta.url))
const OUT = join(here, '..', 'public', 'icons')
mkdirSync(OUT, { recursive: true })

/** Neon spark bolt on the app background. maskable=true keeps content inside the 80% safe zone. */
function svg({ maskable }) {
  const bolt = 'M300 64 L164 292 h84 l-44 156 L352 216 h-88 L300 64 Z'
  const scale = maskable ? 0.72 : 0.88
  const t = (512 - 512 * scale) / 2
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="10" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>
  <rect width="512" height="512" fill="#070B14"/>
  <g transform="translate(${t} ${t}) scale(${scale})">
    <path d="${bolt}" fill="#00F0FF" filter="url(#glow)"/>
  </g>
</svg>`
}

const std = Buffer.from(svg({ maskable: false }))
const mask = Buffer.from(svg({ maskable: true }))

await sharp(std).resize(192, 192).png().toFile(join(OUT, 'icon-192.png'))
await sharp(std).resize(512, 512).png().toFile(join(OUT, 'icon-512.png'))
await sharp(mask).resize(512, 512).png().toFile(join(OUT, 'maskable-512.png'))
await sharp(std).resize(180, 180).png().toFile(join(OUT, 'apple-touch-icon.png'))
writeFileSync(join(OUT, 'favicon.svg'), svg({ maskable: false }))
console.log('icons written to', OUT)
```

- [ ] **Step 3: Add script** `"make:icons": "node scripts/make-icons.mjs"` to package.json, run `npm run make:icons`, confirm the five files exist and each PNG is non-trivial (>1 KB):

```bash
ls -la public/icons/
```

- [ ] **Step 4: `index.html`** — add inside `<head>` (Vite rebases absolute URLs in index.html with `base` at build time, so keep them root-absolute):

```html
    <link rel="icon" href="/icons/favicon.svg" type="image/svg+xml" />
    <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
```

- [ ] **Step 5: `npm test` green, `npm run build` clean; check the rebase:** `grep icons dist/index.html` → expect `/mindspark/icons/...`.

- [ ] **Step 6: Commit** (icons INCLUDED) — `feat: PWA icon set and favicon`

---

### Task 12: PWA — installability + offline

**Files:**
- Modify: `vite.config.ts` (VitePWA plugin), `src/main.tsx` (SW registration), `package.json` (404.html copy in build script)
- Create: `src/vite-env.d.ts`

- [ ] **Step 1: `npm install -D vite-plugin-pwa`**

- [ ] **Step 2: `vite.config.ts`** — full new content:

```ts
/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/mindspark/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/favicon.svg', 'icons/apple-touch-icon.png'],
      manifest: {
        name: 'MindSpark — Brain Training',
        short_name: 'MindSpark',
        description: 'Neon brain training: quick-fire mini-games and daily vocabulary with spaced repetition. Fully offline.',
        theme_color: '#070B14',
        background_color: '#070B14',
        display: 'standalone',
        start_url: '.',
        scope: '.',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // precache EVERYTHING including the three vocab shards → the app is fully offline after first load
        globPatterns: ['**/*.{js,css,html,svg,png,json,webmanifest}'],
        navigateFallback: '/mindspark/index.html',
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    globals: true,
  },
})
```

- [ ] **Step 3: Create `src/vite-env.d.ts`:**

```ts
/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />
```

- [ ] **Step 4: `src/main.tsx`** — register the service worker (top of file, after imports):

```ts
import { registerSW } from 'virtual:pwa-register'

registerSW({ immediate: true })
```

(Tests never import main.tsx, so the virtual module doesn't affect Vitest — verify by running the suite.)

- [ ] **Step 5: SPA deep links on GitHub Pages** — Pages serves `404.html` for unknown paths; make it a copy of the app so `/mindspark/vocab` cold-loads. In `package.json`:

```json
    "build": "tsc --noEmit && vite build && cp dist/index.html dist/404.html",
```

- [ ] **Step 6: Verify.** `npm test` green. `npm run build`, then:

```bash
ls dist/sw.js dist/manifest.webmanifest dist/404.html
grep -c 'data/vocab' dist/sw.js   # ≥1 → shards are precached
```

`npm run preview &`, then `curl -s http://localhost:4173/mindspark/manifest.webmanifest | head -5` (JSON with MindSpark name), kill preview.

- [ ] **Step 7: Commit** — `feat: PWA install and full offline support via service worker`

---

### Task 13: README + LICENSE

**Files:**
- Create: `README.md`, `LICENSE`

- [ ] **Step 1: `LICENSE`** — exact content:

```
MIT License

Copyright (c) 2026 Vishal Singh

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

- [ ] **Step 2: `README.md`:**

```markdown
# ⚡ MindSpark

Neon brain training in your browser — quick-fire mini-games across math, logic,
memory and reaction, plus a daily vocabulary vault with spaced repetition.
Everything runs on-device: no account, no server, fully offline once installed.

## Features

- **Quick Math** — beat the shrinking timer; correct answers buy time
- **Word Vault** — daily flashcards from a 15,000-word bank (3 tiers), SM-2-lite
  spaced repetition, tap-to-flip cards in two study modes
- **Brain Score** — one number from per-skill moving averages, with levels from
  Novice to Prodigy
- **Streaks & freezes** — daily streak with earned streak freezes (every 50 days)
- **Stats** — score history, per-skill trends, words mastered, activity strip
- **Adaptive difficulty**, Web Audio sound effects, reduced-motion support
- **Installable PWA** — add to home screen on Android/iOS, works offline
- 8 more games are on the roadmap (pattern, memory span, reaction and more)

## Run it locally

    npm ci
    npm run dev        # http://localhost:5173/mindspark/

## Scripts

    npm test           # unit tests (Vitest)
    npm run lint       # ESLint
    npm run build      # type-check + production build (dist/)
    npm run build:vocab  # regenerate the word bank (downloads sources, ~1 min)
    npm run make:icons   # regenerate PWA icons

## Install on your phone

Open the deployed URL in Chrome (Android) or Safari (iOS) → menu →
**Add to Home Screen**. The app caches everything and works with no connection.

## Tech

Vite · React 18 · TypeScript · zustand · Dexie (IndexedDB) · vite-plugin-pwa ·
custom CSS (design tokens, no framework) · Vitest + Testing Library

## Word bank data

Generated at build time from [WordNet 3.1](https://wordnet.princeton.edu/)
(Princeton University), frequency-ranked with
[hermitdave/FrequencyWords](https://github.com/hermitdave/FrequencyWords)
(OpenSubtitles 2018), filtered with the LDNOOBW blocklist. Details and licenses
in [data-pipeline/README.md](data-pipeline/README.md).

## License

[MIT](LICENSE)
```

- [ ] **Step 3: `npm test` + `npm run build` still green (no code touched — sanity only).**

- [ ] **Step 4: Commit** — `docs: README and MIT license`

---

### Task 14: CI + Pages deploy workflows

**Files:**
- Create: `.github/workflows/ci.yml`, `.github/workflows/deploy.yml`

- [ ] **Step 1: `.github/workflows/ci.yml`:**

```yaml
name: CI
on:
  push:
    branches: [main]
  pull_request:
jobs:
  ci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run lint
      - run: npm test
      - run: npm run build
```

- [ ] **Step 2: `.github/workflows/deploy.yml`:**

```yaml
name: Deploy to GitHub Pages
on:
  push:
    branches: [main]
  workflow_dispatch:
permissions:
  contents: read
  pages: write
  id-token: write
concurrency:
  group: pages
  cancel-in-progress: true
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run build
      - uses: actions/configure-pages@v5
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist
  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 3: Validate YAML locally** (no push!):

```bash
node -e "console.log('ok')" && npx --yes yaml-lint .github/workflows/ci.yml .github/workflows/deploy.yml 2>/dev/null || python3 -c "import yaml,sys; [yaml.safe_load(open(f)) for f in ['.github/workflows/ci.yml','.github/workflows/deploy.yml']]; print('yaml ok')"
```

- [ ] **Step 4: Commit** — `ci: lint/test/build workflow and GitHub Pages deploy`

---

## Ship & verify (coordinator + user — NOT a subagent task)

1. Coordinator: push `main` to the `mindspark` GitHub repo (remote added during setup; the ONLY authorized push destination).
2. Coordinator: ensure Pages is set to "GitHub Actions" source (`gh api repos/{owner}/mindspark/pages -X POST -f build_type=workflow` on first setup).
3. Coordinator: watch the deploy run (`gh run watch`), then verify `https://<user>.github.io/mindspark/` serves the app (HTTP 200, manifest reachable).
4. User (phone): open the URL in Chrome on Android → play a Quick Math round + flip a vocab card → menu → **Add to Home Screen** → launch from the icon (standalone, no browser chrome) → enable airplane mode → app still loads and plays.
5. User: confirm sound effects, settings sheet, stats screen on the phone.

## Spec coverage (Plan 4 scope)

| Spec item | Task |
|---|---|
| Stats screen (score over time, skill trends, words mastered, streak history) | 8, 9, 10 |
| Settings sheet (sound, words/day 5–25, vocab mode, reduced motion, reset) | 5, 6, 7 |
| Web Audio SFX (blip/buzz/tick/chime) + mute persisted | 3, 4 |
| PWA: installable, offline (incl. vocab shards), icons | 11, 12 |
| CI: lint + test + build on push | 1, 14 |
| README screenshots/features/run instructions + LICENSE | 13 |
| Handoff: ESLint bootstrap | 1 |
| Handoff: router basename / vite base / ErrorBoundary anchor | 2 |
| Handoff: reducedMotion wired, store catch diagnostics, degraded ResultsCard copy | 5, 6 |
| Plan 3 deferral: wordsPerDay clamp | 5 |
| GitHub Pages deploy + SPA 404 fallback | 12, 14 |

Deliberately NOT in scope: live due-counts on the Home card (needs a store read on Home — trivial once Plan 2's game count makes Home busier; revisit then), leech handling (spec-recorded deferral), midnight rollover for a tab that never navigates (adjudicated nit), README screenshots (add once the full game set exists in Plan 2).

