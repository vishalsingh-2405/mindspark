# MindSpark Word Vault Implementation Plan (Plan 3 of 4)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The complete Word Vault: a build-time pipeline producing a ~15k-word tiered vocabulary bank, an SM-2-lite spaced-repetition engine, a daily deck flow with tap-to-flip cards in both study modes, session recording into the existing scoring/streak system, and tier promotion.

**Architecture:** `data-pipeline/` (build-time Node, runs once, output committed to `public/data/vocab/`) is fully separate from app code. Runtime: pure logic modules (`src/vocab/srs.ts`, `deck.ts`, `score.ts`), a shard loader (`bank.ts`), a dedicated zustand store (`src/state/vocabStore.ts`) that orchestrates them and hands completed decks to the existing `useAppStore.recordSession`, and UI (`FlipCard.tsx`, rebuilt Vocab screen, Home "Today's Words" card, registry tile).

**Tech Stack:** existing stack + dev-only pipeline deps: `wordnet-db` (Princeton WordNet files via npm, permissive license), `naughty-words` (profanity blocklist). Frequency list fetched once from hermitdave/FrequencyWords (MIT) and cached (gitignored).

**Decisions resolved from Plan 1 handoff notes:**
- **Vocab skill score:** each completed deck records a standard `GameResult` via `recordSession` (EWMA path unchanged). Deck score = `round(70·accuracy + 30·retention)` where retention = correct reviews / due reviews (falls back to accuracy when no reviews were due). Mastery additionally drives tier promotion (below) and Stats (Plan 4).
- **Registry:** `GameDefinition` gains optional `route?: string`. Word Vault registers with `route: '/vocab'`; Home/Games tiles link to `route ?? '/play/' + id`. Its `Component` is a `<Navigate to="/vocab" replace />` shim so a stray `/play/word-vault` deep link also lands correctly.
- **Dexie v2:** `vocabProgress` ('wordId, due') + `vocabDeck` ('day') tables; v1 tables restated. `ProfileRow` gains `vocabTier` (default `'everyday'`), backfilled on load for existing profiles.
- **Tier promotion:** after each deck, if `served ≥ 50` and `mastered/served ≥ 0.8` for the current tier → promote to next tier (everyday → intermediate → advanced).

**All commands run from the repo root:** `/Users/vishalsingh/Documents/Testing/App-Brain Games/mindspark`
**Standing rule:** commit locally; NEVER push.

---

### Task 1: Dexie v2 — vocab tables + profile tier

**Files:**
- Modify: `src/storage/db.ts`, `src/storage/repos.ts`
- Test: `src/storage/vocabRepos.test.ts`

- [ ] **Step 1: Write the failing test — `src/storage/vocabRepos.test.ts`:**

```ts
import { db } from './db'
import {
  loadProfile, saveVocabProgress, getVocabProgress, dueReviews,
  seenWordIds, getDeckRow, saveDeckRow,
} from './repos'

beforeEach(async () => {
  await db.delete()
  await db.open()
})

it('profile gains vocabTier defaulting to everyday (including legacy rows)', async () => {
  const p = await loadProfile()
  expect(p.vocabTier).toBe('everyday')
  // simulate a legacy v1 profile row missing the field
  await db.profile.put({ ...p, vocabTier: undefined as never })
  expect((await loadProfile()).vocabTier).toBe('everyday')
})

it('round-trips word progress and queries due reviews', async () => {
  await saveVocabProgress({ wordId: 'ephemeral', step: 1, ease: 2.5, due: '2026-07-08', lapses: 0, lastResult: 'knew', seenAt: '2026-07-07' })
  await saveVocabProgress({ wordId: 'serendipity', step: 0, ease: 2.3, due: '2026-07-10', lapses: 1, lastResult: 'missed', seenAt: '2026-07-07' })
  expect((await getVocabProgress('ephemeral'))?.step).toBe(1)
  expect((await dueReviews('2026-07-08')).map(p => p.wordId)).toEqual(['ephemeral'])
  expect((await dueReviews('2026-07-10')).map(p => p.wordId).sort()).toEqual(['ephemeral', 'serendipity'])
  expect((await seenWordIds()).sort()).toEqual(['ephemeral', 'serendipity'])
})

it('round-trips the daily deck row', async () => {
  expect(await getDeckRow('2026-07-07')).toBeUndefined()
  await saveDeckRow({ day: '2026-07-07', cards: [{ wordId: 'a', isReview: false }], index: 1, knownNew: 1, knownReviews: 0, completed: true })
  expect((await getDeckRow('2026-07-07'))?.completed).toBe(true)
})
```

- [ ] **Step 2: Run `npm test` — expect FAIL (missing exports/tables).**

- [ ] **Step 3: Implement.** In `src/storage/db.ts` add:

```ts
export type VocabTier = 'everyday' | 'intermediate' | 'advanced'

export interface VocabProgressRow {
  wordId: string
  step: number          // 0..4 index into the SRS ladder; -1 never graded
  ease: number          // 1.3..3.0, starts 2.5
  due: string           // 'YYYY-MM-DD'
  lapses: number
  lastResult: 'knew' | 'missed' | null
  seenAt: string        // day first seen
}

export interface DeckCard { wordId: string; isReview: boolean }

export interface VocabDeckRow {
  day: string           // 'YYYY-MM-DD' primary key
  cards: DeckCard[]
  index: number         // next card to show
  knownNew: number
  knownReviews: number
  completed: boolean
}
```

Add `vocabTier: VocabTier` to `ProfileRow` and `vocabTier: 'everyday'` to `DEFAULT_PROFILE`. Add tables to the class and bump the schema **keeping version(1) intact** and adding:

```ts
this.version(2).stores({
  sessions: '++id, gameId, skill, playedAt',
  profile: 'id',
  settings: 'id',
  gameLevels: 'gameId',
  vocabProgress: 'wordId, due',
  vocabDeck: 'day',
})
```

with `vocabProgress!: Table<VocabProgressRow, string>` and `vocabDeck!: Table<VocabDeckRow, string>`.

In `src/storage/repos.ts`: make `loadProfile` backfill missing fields on legacy rows — replace the `if (row) return row` line with `if (row) return { ...structuredClone(DEFAULT_PROFILE), ...row, vocabTier: row.vocabTier ?? 'everyday' }`. Add:

```ts
export async function saveVocabProgress(p: VocabProgressRow): Promise<void> {
  await db.vocabProgress.put(p)
}

export async function getVocabProgress(wordId: string): Promise<VocabProgressRow | undefined> {
  return db.vocabProgress.get(wordId)
}

export async function dueReviews(today: string): Promise<VocabProgressRow[]> {
  return db.vocabProgress.where('due').belowOrEqual(today).toArray()
}

export async function seenWordIds(): Promise<string[]> {
  return (await db.vocabProgress.toArray()).map(p => p.wordId)
}

export async function getDeckRow(day: string): Promise<VocabDeckRow | undefined> {
  return db.vocabDeck.get(day)
}

export async function saveDeckRow(row: VocabDeckRow): Promise<void> {
  await db.vocabDeck.put(row)
}
```

(Import the new row types; re-export nothing else.)

- [ ] **Step 4: Run `npm test` — all pass (84 total). `npm run build` — clean.**

- [ ] **Step 5: Commit** — `feat: Dexie v2 with vocab progress and daily deck tables`

---

### Task 2: SRS engine (SM-2 lite)

**Files:**
- Create: `src/vocab/srs.ts`
- Test: `src/vocab/srs.test.ts`

- [ ] **Step 1: Write the failing test — `src/vocab/srs.test.ts`:**

```ts
import { gradeWord, intervalDays, isMastered, newProgress, LADDER } from './srs'

const seen = (over: Partial<ReturnType<typeof newProgress>> = {}) =>
  ({ ...newProgress('word', '2026-07-07'), ...over })

it('ladder is the spec progression', () => {
  expect(LADDER).toEqual([1, 4, 10, 25, 60])
})

it('a new word graded "knew" is due in 1 day', () => {
  const p = gradeWord(newProgress('w', '2026-07-07'), true, '2026-07-07')
  expect(p.step).toBe(0)
  expect(p.due).toBe('2026-07-08')
  expect(p.lastResult).toBe('knew')
})

it('successive "knew" climbs the ladder: 1 → 4 → 10 → 25 → 60', () => {
  let p = newProgress('w', '2026-07-07')
  const gaps: number[] = []
  let day = '2026-07-07'
  for (let i = 0; i < 5; i++) {
    p = gradeWord(p, true, day)
    gaps.push(intervalDays(p))
    day = p.due
  }
  expect(gaps).toEqual([1, 4, 10, 25, 60]) // default ease 2.5 = unscaled ladder
})

it('"did not know" resets to 1 day, drops ease a notch, counts a lapse', () => {
  const p = gradeWord(seen({ step: 3, ease: 2.5 }), false, '2026-07-07')
  expect(p.step).toBe(0)
  expect(p.due).toBe('2026-07-08')
  expect(p.ease).toBeCloseTo(2.3)
  expect(p.lapses).toBe(1)
  expect(p.lastResult).toBe('missed')
})

it('ease is clamped to [1.3, 3.0]', () => {
  const floor = gradeWord(seen({ ease: 1.35 }), false, '2026-07-07')
  expect(floor.ease).toBeCloseTo(1.3)
  const ceil = gradeWord(seen({ ease: 2.95, step: 1 }), true, '2026-07-07')
  expect(ceil.ease).toBeCloseTo(3.0)
})

it('low ease shrinks intervals, high ease stretches them', () => {
  expect(intervalDays(seen({ step: 2, ease: 1.3 }))).toBe(5)   // round(10 * 1.3/2.5)
  expect(intervalDays(seen({ step: 2, ease: 3.0 }))).toBe(12)  // round(10 * 3.0/2.5)
})

it('mastered means top of the ladder', () => {
  expect(isMastered(seen({ step: 4 }))).toBe(true)
  expect(isMastered(seen({ step: 3 }))).toBe(false)
})
```

- [ ] **Step 2: Run `npm test` — expect FAIL.**

- [ ] **Step 3: Implement `src/vocab/srs.ts`:**

```ts
import { addDays } from '../lib/dates'
import type { VocabProgressRow } from '../storage/db'

/** Spec §Word Vault: interval grows 1 → 4 → 10 → 25 → 60 days, scaled by ease. */
export const LADDER = [1, 4, 10, 25, 60] as const
const EASE_START = 2.5
const EASE_MIN = 1.3
const EASE_MAX = 3.0
const EASE_UP = 0.1
const EASE_DOWN = 0.2

export function newProgress(wordId: string, today: string): VocabProgressRow {
  return { wordId, step: -1, ease: EASE_START, due: today, lapses: 0, lastResult: null, seenAt: today }
}

/** Interval in days for the current step, scaled by ease (2.5 = unscaled). */
export function intervalDays(p: VocabProgressRow): number {
  const base = LADDER[Math.max(0, Math.min(4, p.step))]
  return Math.max(1, Math.round(base * p.ease / EASE_START))
}

export function isMastered(p: VocabProgressRow): boolean {
  return p.step >= LADDER.length - 1
}

/** Grade a card. Pure — call once per grading. */
export function gradeWord(p: VocabProgressRow, knew: boolean, today: string): VocabProgressRow {
  if (knew) {
    const next: VocabProgressRow = {
      ...p,
      step: Math.min(LADDER.length - 1, p.step + 1),
      ease: Math.min(EASE_MAX, p.ease + EASE_UP),
      lastResult: 'knew',
    }
    return { ...next, due: addDays(today, intervalDays(next)) }
  }
  const next: VocabProgressRow = {
    ...p,
    step: 0,
    ease: Math.max(EASE_MIN, p.ease - EASE_DOWN),
    lapses: p.lapses + 1,
    lastResult: 'missed',
  }
  return { ...next, due: addDays(today, 1) }
}
```

**Note on the ladder test:** with ease climbing +0.1 per success, `intervalDays` for the successive-knew test must still produce 1,4,10,25,60 — it does NOT, because ease grows. Compute honestly: after each knew, ease is 2.6, 2.7, 2.8, 2.9, 3.0 → intervals round(1·2.6/2.5)=1, round(4·2.7/2.5)=4, round(10·2.8/2.5)=11, round(25·2.9/2.5)=29, round(60·3.0/2.5)=72. **Fix the test to pin those real values** — `expect(gaps).toEqual([1, 4, 11, 29, 72])` with a comment `// ladder scaled by growing ease` — and keep a separate assertion that a constant-ease 2.5 word walks exactly 1/4/10/25/60 by calling `intervalDays` directly per step. The implementer must verify the arithmetic and pin ACTUAL computed values, not aspirational ones.

- [ ] **Step 4: Run `npm test` — all pass. `npm run build` — clean.**

- [ ] **Step 5: Commit** — `feat: SM-2-lite spaced repetition engine`

---

### Task 3: Deck builder + deck score

**Files:**
- Create: `src/vocab/deck.ts`, `src/vocab/score.ts`
- Test: `src/vocab/deck.test.ts`, `src/vocab/score.test.ts`

- [ ] **Step 1: Write the failing tests.**

`src/vocab/deck.test.ts`:

```ts
import { createRng } from '../lib/rng'
import { buildDeck } from './deck'

it('deck = shuffled due reviews first, then wordsPerDay new words in frequency order (shuffled)', () => {
  const deck = buildDeck({
    wordsPerDay: 3,
    dueReviewIds: ['r1', 'r2'],
    unseenByRank: ['n1', 'n2', 'n3', 'n4', 'n5'],
    rng: createRng(1),
  })
  expect(deck).toHaveLength(5)
  const reviews = deck.slice(0, 2)
  const fresh = deck.slice(2)
  expect(reviews.every(c => c.isReview)).toBe(true)
  expect(reviews.map(c => c.wordId).sort()).toEqual(['r1', 'r2'])
  expect(fresh.every(c => !c.isReview)).toBe(true)
  expect(fresh.map(c => c.wordId).sort()).toEqual(['n1', 'n2', 'n3']) // first 3 by rank, order shuffled
})

it('handles no reviews and fewer unseen than requested', () => {
  const deck = buildDeck({ wordsPerDay: 10, dueReviewIds: [], unseenByRank: ['a', 'b'], rng: createRng(2) })
  expect(deck.map(c => c.wordId).sort()).toEqual(['a', 'b'])
})

it('is deterministic for the same seed', () => {
  const opts = { wordsPerDay: 5, dueReviewIds: ['r1', 'r2', 'r3'], unseenByRank: ['n1', 'n2', 'n3', 'n4', 'n5', 'n6'] }
  const a = buildDeck({ ...opts, rng: createRng(7) })
  const b = buildDeck({ ...opts, rng: createRng(7) })
  expect(a).toEqual(b)
})
```

`src/vocab/score.test.ts`:

```ts
import { deckScore, tierLevel } from './score'

it('scores 70% accuracy + 30% retention', () => {
  // 8/10 new known, 4/5 reviews known: accuracy 12/15 = 0.8, retention 0.8
  expect(deckScore({ knownNew: 8, totalNew: 10, knownReviews: 4, totalReviews: 5 })).toBe(80)
  // perfect day
  expect(deckScore({ knownNew: 10, totalNew: 10, knownReviews: 5, totalReviews: 5 })).toBe(100)
})

it('falls back to accuracy for the retention share when no reviews were due', () => {
  expect(deckScore({ knownNew: 7, totalNew: 10, knownReviews: 0, totalReviews: 0 })).toBe(70)
})

it('empty deck scores 0', () => {
  expect(deckScore({ knownNew: 0, totalNew: 0, knownReviews: 0, totalReviews: 0 })).toBe(0)
})

it('maps tiers to difficulty levels', () => {
  expect(tierLevel('everyday')).toBe(3)
  expect(tierLevel('intermediate')).toBe(6)
  expect(tierLevel('advanced')).toBe(9)
})
```

- [ ] **Step 2: Run `npm test` — expect FAIL.**

- [ ] **Step 3: Implement.**

`src/vocab/deck.ts`:

```ts
import type { DeckCard } from '../storage/db'

function shuffle<T>(arr: T[], rng: () => number): T[] {
  const out = [...arr]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

/** Today's deck: due reviews (shuffled) first, then wordsPerDay new words drawn in frequency order (shuffled among themselves). */
export function buildDeck(opts: {
  wordsPerDay: number
  dueReviewIds: string[]
  unseenByRank: string[]
  rng: () => number
}): DeckCard[] {
  const reviews = shuffle(opts.dueReviewIds, opts.rng).map(wordId => ({ wordId, isReview: true }))
  const fresh = shuffle(opts.unseenByRank.slice(0, opts.wordsPerDay), opts.rng).map(wordId => ({ wordId, isReview: false }))
  return [...reviews, ...fresh]
}
```

`src/vocab/score.ts`:

```ts
import type { VocabTier } from '../storage/db'

/** Deck session score: 70% overall accuracy + 30% review retention (mastery in action). */
export function deckScore(r: { knownNew: number; totalNew: number; knownReviews: number; totalReviews: number }): number {
  const total = r.totalNew + r.totalReviews
  if (total === 0) return 0
  const accuracy = (r.knownNew + r.knownReviews) / total
  const retention = r.totalReviews > 0 ? r.knownReviews / r.totalReviews : accuracy
  return Math.round(Math.max(0, Math.min(100, 70 * accuracy + 30 * retention)))
}

/** Tier → GameResult.difficultyReached mapping. */
export function tierLevel(tier: VocabTier): number {
  return tier === 'everyday' ? 3 : tier === 'intermediate' ? 6 : 9
}
```

- [ ] **Step 4: Run `npm test` — all pass. `npm run build` — clean.**

- [ ] **Step 5: Commit** — `feat: daily deck builder and deck session score`

---

### Task 4: Pipeline pure helpers

**Files:**
- Create: `data-pipeline/lib.mjs`
- Test: `data-pipeline/lib.test.mjs`

Plain JS (`.mjs`) — the pipeline is build-time Node, not app code. Vitest picks up `*.test.mjs` automatically.

- [ ] **Step 1: Write the failing test — `data-pipeline/lib.test.mjs`:**

```js
import { isCleanWord, tierForRank, parseGloss, buildEntries } from './lib.mjs'

it('accepts lowercase alphabetic words of 3-14 chars only', () => {
  expect(isCleanWord('ephemeral')).toBe(true)
  expect(isCleanWord('ox')).toBe(false)          // too short
  expect(isCleanWord('a_b')).toBe(false)          // underscore (multiword)
  expect(isCleanWord("don't")).toBe(false)        // punctuation
  expect(isCleanWord('Paris')).toBe(false)        // proper noun casing
  expect(isCleanWord('internationalization')).toBe(false) // too long
})

it('tiers by frequency rank', () => {
  expect(tierForRank(0)).toBe('everyday')
  expect(tierForRank(2999)).toBe('everyday')
  expect(tierForRank(3000)).toBe('intermediate')
  expect(tierForRank(7999)).toBe('intermediate')
  expect(tierForRank(8000)).toBe('advanced')
  expect(tierForRank(14999)).toBe('advanced')
  expect(tierForRank(15000)).toBe(null)
})

it('splits a WordNet gloss into meaning and example', () => {
  expect(parseGloss('lasting a very short time; "the ephemeral joys of childhood"')).toEqual({
    meaning: 'lasting a very short time',
    example: 'the ephemeral joys of childhood',
  })
  expect(parseGloss('a coarse term for defecation')).toEqual({
    meaning: 'a coarse term for defecation',
    example: '',
  })
})

it('builds tiered entries: frequency-ranked, defined, clean, blocklist-filtered', () => {
  const freq = ['the', 'time', 'shit', 'ephemeral', 'zzzz', 'ox']
  const defs = new Map([
    ['the', { pos: 'article', meaning: 'definite article', example: '' }],
    ['time', { pos: 'noun', meaning: 'a nonspatial continuum', example: 'time flies' }],
    ['shit', { pos: 'noun', meaning: 'obscene term', example: '' }],
    ['ephemeral', { pos: 'adjective', meaning: 'lasting a very short time', example: 'ephemeral joys' }],
    ['ox', { pos: 'noun', meaning: 'bovine animal', example: '' }],
  ])
  const entries = buildEntries(freq, defs, new Set(['shit']), 15000)
  // 'zzzz' (no definition), 'shit' (blocklist), 'ox' (too short) are excluded
  expect(entries.map(e => e.word)).toEqual(['the', 'time', 'ephemeral'])
  expect(entries[0]).toEqual({ id: 'the', word: 'the', pos: 'article', meaning: 'definite article', example: '', tier: 'everyday', rank: 0 })
})
```

- [ ] **Step 2: Run `npm test` — expect FAIL.**

- [ ] **Step 3: Implement `data-pipeline/lib.mjs`:**

```js
/** Lowercase alphabetic, 3-14 chars — filters multiword (_), punctuation, casing (proper nouns). */
export function isCleanWord(w) {
  return /^[a-z]{3,14}$/.test(w)
}

const TIERS = [
  [3000, 'everyday'],
  [8000, 'intermediate'],
  [15000, 'advanced'],
]

export function tierForRank(rank) {
  for (const [limit, tier] of TIERS) if (rank < limit) return tier
  return null
}

/** WordNet gloss: definition, optionally followed by quoted example sentences. */
export function parseGloss(gloss) {
  const quote = gloss.indexOf('"')
  if (quote === -1) return { meaning: gloss.trim().replace(/;\s*$/, ''), example: '' }
  const meaning = gloss.slice(0, quote).trim().replace(/;\s*$/, '')
  const example = (gloss.slice(quote).match(/"([^"]+)"/)?.[1] ?? '').trim()
  return { meaning, example }
}

/**
 * freqWords: array of words in descending frequency order (already deduped).
 * defs: Map word → { pos, meaning, example }.
 * blocklist: Set of excluded words.
 * Returns entries with tier + rank, capped at `limit` accepted words.
 */
export function buildEntries(freqWords, defs, blocklist, limit) {
  const entries = []
  for (const word of freqWords) {
    if (entries.length >= limit) break
    if (!isCleanWord(word) || blocklist.has(word)) continue
    const def = defs.get(word)
    if (!def || !def.meaning) continue
    const rank = entries.length
    entries.push({ id: word, word, pos: def.pos, meaning: def.meaning, example: def.example, tier: tierForRank(rank), rank })
  }
  return entries
}
```

- [ ] **Step 4: Run `npm test` — all pass.**

- [ ] **Step 5: Commit** — `feat: vocab pipeline pure helpers`

---

### Task 5: Pipeline main — generate and commit the real word bank

**Files:**
- Create: `data-pipeline/build-vocab.mjs`, `data-pipeline/README.md`
- Modify: `.gitignore` (add `data-pipeline/cache/`), `package.json` (script + dev deps)
- Generated (committed): `public/data/vocab/everyday.json`, `intermediate.json`, `advanced.json`

This task touches real external data. The reference implementation below is the intended shape; **the WordNet data-file format details may require adaptation — adapt freely, but the acceptance criteria are non-negotiable and every deviation must be reported.**

- [ ] **Step 1: Install pipeline deps**

```bash
npm install -D wordnet-db naughty-words
```

- [ ] **Step 2: Implement `data-pipeline/build-vocab.mjs`** (reference implementation):

```js
import { createReadStream, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createInterface } from 'node:readline'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildEntries, isCleanWord, parseGloss } from './lib.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const CACHE = join(here, 'cache')
const OUT = join(here, '..', 'public', 'data', 'vocab')
const FREQ_URL = 'https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/content/2018/en/en_full.txt'
const LIMIT = 15_000

// 1. Frequency list (download once, cache)
async function loadFrequencyList() {
  mkdirSync(CACHE, { recursive: true })
  const cached = join(CACHE, 'en_full.txt')
  if (!existsSync(cached)) {
    console.log('downloading frequency list…')
    const res = await fetch(FREQ_URL)
    if (!res.ok) throw new Error(`frequency download failed: ${res.status}`)
    writeFileSync(cached, await res.text())
  }
  const words = []
  const seen = new Set()
  for (const line of readFileSync(cached, 'utf8').split('\n')) {
    const word = line.split(' ')[0]?.toLowerCase()
    if (word && !seen.has(word)) { seen.add(word); words.push(word) }
  }
  return words
}

// 2. WordNet definitions from the wordnet-db package's data files
async function loadDefinitions() {
  const { path: wnPath } = await import('wordnet-db').then(m => m.default ?? m)
  const posFiles = [
    ['data.noun', 'noun'],
    ['data.verb', 'verb'],
    ['data.adj', 'adjective'],
    ['data.adv', 'adverb'],
  ]
  const defs = new Map()
  for (const [file, pos] of posFiles) {
    const rl = createInterface({ input: createReadStream(join(wnPath, file)) })
    for await (const line of rl) {
      if (line.startsWith(' ')) continue // license header
      const bar = line.indexOf('|')
      if (bar === -1) continue
      const gloss = line.slice(bar + 1).trim()
      const fields = line.slice(0, bar).trim().split(' ')
      const wordCount = parseInt(fields[3], 16)
      for (let i = 0; i < wordCount; i++) {
        const word = fields[4 + i * 2]?.toLowerCase()
        if (!word || !isCleanWord(word) || defs.has(word)) continue
        const { meaning, example } = parseGloss(gloss)
        if (meaning) defs.set(word, { pos, meaning, example })
      }
    }
  }
  return defs
}

// 3. Blocklist
async function loadBlocklist() {
  const naughty = await import('naughty-words').then(m => m.default ?? m)
  return new Set(naughty.en)
}

const [freq, defs, blocklist] = await Promise.all([loadFrequencyList(), loadDefinitions(), loadBlocklist()])
const entries = buildEntries(freq, defs, blocklist, LIMIT)

mkdirSync(OUT, { recursive: true })
for (const tier of ['everyday', 'intermediate', 'advanced']) {
  const shard = entries.filter(e => e.tier === tier).map(({ tier: _t, rank: _r, ...e }) => e)
  writeFileSync(join(OUT, `${tier}.json`), JSON.stringify(shard))
  console.log(`${tier}: ${shard.length} words`)
}
console.log(`total: ${entries.length}`)
```

Add to `package.json` scripts: `"build:vocab": "node data-pipeline/build-vocab.mjs"`. Add `data-pipeline/cache/` to `.gitignore`.

- [ ] **Step 3: Run `npm run build:vocab` and VERIFY the output (acceptance criteria — all mandatory):**
1. Three shards exist under `public/data/vocab/`; total words between 12,000 and 15,000; everyday ≈ 3,000.
2. Spot-check 10 sampled words per tier (print them): every entry has non-empty `word`, `pos`, `meaning`; meanings read as definitions (not fragments); no underscores/uppercase; no obvious profanity.
3. Sanity-check tier feel: everyday should contain words like "time/people/water"-class vocabulary; advanced should look GRE-ish. If tiers look wrong, investigate rank handling before proceeding.
4. Shard file sizes: each under 2.5 MB.
5. `npm test` still green (pipeline unit tests unaffected).

If the wordnet-db data-file parsing needs adjustment (field offsets, adjective satellite handling `data.adj` `ss_type`, etc.), adapt `loadDefinitions` and REPORT the adaptation. If `naughty-words` or `wordnet-db` import shapes differ, adapt and report.

- [ ] **Step 4: Write `data-pipeline/README.md`** — data sources with licenses (WordNet 3.0 license — permissive with attribution; hermitdave/FrequencyWords — MIT, derived from OpenSubtitles; naughty-words — MIT/LDNOOBW), how to regenerate (`npm run build:vocab`), and the tier thresholds.

- [ ] **Step 5: Commit** (shards INCLUDED — the repo must stay clone-and-run):

```bash
git add -A
git commit -m "feat: vocabulary bank pipeline and committed 15k-word tiered shards"
```

---

### Task 6: Shard loader

**Files:**
- Create: `src/vocab/bank.ts`
- Test: `src/vocab/bank.test.ts`

- [ ] **Step 1: Failing test — `src/vocab/bank.test.ts`:**

```ts
import { loadTier, clearBankCache } from './bank'

const SHARD = [{ id: 'ephemeral', word: 'ephemeral', pos: 'adjective', meaning: 'lasting a very short time', example: 'x' }]

beforeEach(() => {
  clearBankCache()
  vi.restoreAllMocks()
})

it('fetches a tier shard and indexes it by id', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(SHARD))))
  const bank = await loadTier('everyday')
  expect(fetch).toHaveBeenCalledWith('/data/vocab/everyday.json')
  expect(bank.entries).toHaveLength(1)
  expect(bank.byId.get('ephemeral')?.pos).toBe('adjective')
})

it('caches per tier (single fetch)', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(SHARD))))
  await loadTier('everyday')
  await loadTier('everyday')
  expect(fetch).toHaveBeenCalledTimes(1)
})

it('throws on HTTP failure so the UI can show retry', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => new Response('nope', { status: 500 })))
  await expect(loadTier('advanced')).rejects.toThrow()
})
```

- [ ] **Step 2: Run `npm test` — FAIL.**

- [ ] **Step 3: Implement `src/vocab/bank.ts`:**

```ts
import type { VocabTier } from '../storage/db'

export interface VocabEntry {
  id: string
  word: string
  pos: string
  meaning: string
  example: string
}

export interface TierBank {
  entries: VocabEntry[]        // frequency order
  byId: Map<string, VocabEntry>
}

const cache = new Map<VocabTier, TierBank>()

export async function loadTier(tier: VocabTier): Promise<TierBank> {
  const hit = cache.get(tier)
  if (hit) return hit
  const res = await fetch(`/data/vocab/${tier}.json`)
  if (!res.ok) throw new Error(`vocab shard ${tier} failed: ${res.status}`)
  const entries = (await res.json()) as VocabEntry[]
  const bank: TierBank = { entries, byId: new Map(entries.map(e => [e.id, e])) }
  cache.set(tier, bank)
  return bank
}

/** Test hook. */
export function clearBankCache(): void {
  cache.clear()
}
```

- [ ] **Step 4: `npm test` all pass; `npm run build` clean.**

- [ ] **Step 5: Commit** — `feat: tier shard loader with in-memory cache`

---

### Task 7: Vocab store — deck orchestration

**Files:**
- Create: `src/state/vocabStore.ts`
- Test: `src/state/vocabStore.test.ts`

The store composes everything: load bank + progress → build/restore today's deck (persisted so refresh resumes) → grade cards → on completion, record the session through `useAppStore.recordSession` (streak + EWMA + Brain Score all reuse the existing path) and check tier promotion.

- [ ] **Step 1: Failing test — `src/state/vocabStore.test.ts`:**

```ts
import { db } from '../storage/db'
import { useAppStore } from './store'
import { useVocabStore } from './vocabStore'
import { clearBankCache } from '../vocab/bank'

const SHARD = Array.from({ length: 20 }, (_, i) => ({
  id: `word${i}`, word: `word${i}`, pos: 'noun', meaning: `meaning ${i}`, example: '',
}))

beforeEach(async () => {
  await db.delete()
  await db.open()
  clearBankCache()
  useAppStore.setState({ profile: null, settings: null, storageOk: true })
  useVocabStore.setState({ status: 'idle', deck: null, index: 0, entry: null, flipped: false, error: null, summary: null })
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(SHARD))))
})

afterEach(() => vi.unstubAllGlobals())

it('initToday builds a deck of wordsPerDay new words for a fresh user', async () => {
  await useVocabStore.getState().initToday()
  const s = useVocabStore.getState()
  expect(s.status).toBe('ready')
  expect(s.deck).toHaveLength(10) // default wordsPerDay
  expect(s.entry?.word).toMatch(/^word\d+$/)
  expect((await db.vocabDeck.toArray())).toHaveLength(1) // persisted
})

it('grading walks the deck, persists progress, and completing records a session', async () => {
  await useVocabStore.getState().initToday()
  const total = useVocabStore.getState().deck!.length
  for (let i = 0; i < total; i++) {
    useVocabStore.getState().flip()
    await useVocabStore.getState().grade(true)
  }
  const s = useVocabStore.getState()
  expect(s.status).toBe('complete')
  expect(s.summary?.score).toBe(100) // all known, no reviews → 70·1 + 30·1
  expect(await db.vocabProgress.count()).toBe(total)
  expect(await db.sessions.count()).toBe(1)
  const session = (await db.sessions.toArray())[0]
  expect(session.gameId).toBe('word-vault')
  expect(session.skill).toBe('vocab')
  expect(useAppStore.getState().profile?.streak).toBe(1)
})

it('a refresh mid-deck resumes where it left off', async () => {
  await useVocabStore.getState().initToday()
  useVocabStore.getState().flip()
  await useVocabStore.getState().grade(false)
  // simulate reload
  useVocabStore.setState({ status: 'idle', deck: null, index: 0, entry: null, flipped: false, error: null, summary: null })
  clearBankCache()
  await useVocabStore.getState().initToday()
  expect(useVocabStore.getState().index).toBe(1)
})

it('bank failure surfaces an error state for retry UI', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => new Response('x', { status: 500 })))
  await useVocabStore.getState().initToday()
  expect(useVocabStore.getState().status).toBe('error')
})
```

- [ ] **Step 2: Run `npm test` — FAIL.**

- [ ] **Step 3: Implement `src/state/vocabStore.ts`:**

```ts
import { create } from 'zustand'
import { toDayString } from '../lib/dates'
import { createRng } from '../lib/rng'
import type { DeckCard, VocabDeckRow, VocabTier } from '../storage/db'
import * as repo from '../storage/repos'
import { loadTier, type VocabEntry } from '../vocab/bank'
import { buildDeck } from '../vocab/deck'
import { deckScore, tierLevel } from '../vocab/score'
import { gradeWord, isMastered, newProgress } from '../vocab/srs'
import { useAppStore } from './store'

const PROMOTE_MIN_SERVED = 50
const PROMOTE_RATIO = 0.8
const NEXT_TIER: Record<VocabTier, VocabTier | null> = {
  everyday: 'intermediate',
  intermediate: 'advanced',
  advanced: null,
}

interface DeckSummary { score: number; known: number; total: number; reviews: number }

interface VocabState {
  status: 'idle' | 'loading' | 'ready' | 'complete' | 'error'
  deck: DeckCard[] | null
  index: number
  entry: VocabEntry | null
  flipped: boolean
  error: string | null
  summary: DeckSummary | null
  initToday: () => Promise<void>
  flip: () => void
  grade: (knew: boolean) => Promise<void>
}

let deckRow: VocabDeckRow | null = null
let bankById: Map<string, VocabEntry> = new Map()
let shownAt = 0

export const useVocabStore = create<VocabState>((set, get) => ({
  status: 'idle',
  deck: null,
  index: 0,
  entry: null,
  flipped: false,
  error: null,
  summary: null,

  async initToday() {
    set({ status: 'loading', error: null })
    try {
      if (!useAppStore.getState().profile) await useAppStore.getState().init()
      const app = useAppStore.getState()
      const tier = app.profile!.vocabTier
      const wordsPerDay = app.settings!.wordsPerDay
      const today = toDayString(new Date())
      const bank = await loadTier(tier)
      bankById = bank.byId

      let row = await repo.getDeckRow(today).catch(() => undefined)
      if (!row) {
        const due = await repo.dueReviews(today).catch(() => [])
        const seen = new Set(await repo.seenWordIds().catch(() => []))
        const unseen = bank.entries.filter(e => !seen.has(e.id)).map(e => e.id)
        const cards = buildDeck({
          wordsPerDay,
          dueReviewIds: due.map(d => d.wordId),
          unseenByRank: unseen,
          rng: createRng(Date.now() % 2 ** 31),
        })
        row = { day: today, cards, index: 0, knownNew: 0, knownReviews: 0, completed: false }
        await repo.saveDeckRow(row).catch(() => {})
      }
      deckRow = row
      if (row.completed || row.index >= row.cards.length) {
        set({ status: 'complete', deck: row.cards, index: row.index, summary: summarize(row) })
        return
      }
      shownAt = performance.now()
      set({
        status: 'ready',
        deck: row.cards,
        index: row.index,
        entry: bankById.get(row.cards[row.index].wordId) ?? null,
        flipped: false,
        summary: null,
      })
    } catch (e) {
      set({ status: 'error', error: e instanceof Error ? e.message : 'failed to load' })
    }
  },

  flip() {
    if (get().status === 'ready') set({ flipped: true })
  },

  async grade(knew) {
    const s = get()
    if (s.status !== 'ready' || !s.flipped || !deckRow) return
    const card = deckRow.cards[deckRow.index]
    const today = toDayString(new Date())

    const prev = await repo.getVocabProgress(card.wordId).catch(() => undefined)
    const graded = gradeWord(prev ?? newProgress(card.wordId, today), knew, today)
    await repo.saveVocabProgress(graded).catch(() => {})

    if (knew && card.isReview) deckRow.knownReviews += 1
    if (knew && !card.isReview) deckRow.knownNew += 1
    deckRow.index += 1
    await repo.saveDeckRow(deckRow).catch(() => {})

    if (deckRow.index >= deckRow.cards.length) {
      deckRow.completed = true
      await repo.saveDeckRow(deckRow).catch(() => {})
      const summary = summarize(deckRow)
      const totalMs = performance.now() - shownAt
      await useAppStore.getState().recordSession({
        gameId: 'word-vault',
        skill: 'vocab',
        score: summary.score,
        difficultyReached: tierLevel(useAppStore.getState().profile!.vocabTier),
        accuracy: summary.total ? summary.known / summary.total : 0,
        avgMs: summary.total ? totalMs / summary.total : 0,
      })
      await maybePromoteTier()
      set({ status: 'complete', index: deckRow.index, summary })
      return
    }
    shownAt = performance.now()
    set({
      index: deckRow.index,
      entry: bankById.get(deckRow.cards[deckRow.index].wordId) ?? null,
      flipped: false,
    })
  },
}))

function summarize(row: VocabDeckRow): DeckSummary {
  const totalReviews = row.cards.filter(c => c.isReview).length
  const totalNew = row.cards.length - totalReviews
  return {
    score: deckScore({ knownNew: row.knownNew, totalNew, knownReviews: row.knownReviews, totalReviews }),
    known: row.knownNew + row.knownReviews,
    total: row.cards.length,
    reviews: totalReviews,
  }
}

async function maybePromoteTier(): Promise<void> {
  const app = useAppStore.getState()
  const tier = app.profile!.vocabTier
  const next = NEXT_TIER[tier]
  if (!next) return
  try {
    const bank = await loadTier(tier)
    const seen = await repo.seenWordIds()
    const served = seen.filter(id => bank.byId.has(id))
    if (served.length < PROMOTE_MIN_SERVED) return
    let mastered = 0
    for (const id of served) {
      const p = await repo.getVocabProgress(id)
      if (p && isMastered(p)) mastered += 1
    }
    if (mastered / served.length >= PROMOTE_RATIO) {
      const profile = { ...app.profile!, vocabTier: next }
      useAppStore.setState({ profile })
      await repo.saveProfile(profile).catch(() => {})
    }
  } catch {
    // promotion is best-effort; storage/bank hiccups must not block deck completion
  }
}
```

Note the timing simplification: `shownAt`/`totalMs` measures only the final card precisely; per-card timing accumulation is acceptable to add, but keep whatever you do consistent and REPORT it. Simplest correct version: accumulate `elapsedMs += performance.now() - shownAt` inside `grade()` before advancing, and use that total — prefer this; adjust the code accordingly.

- [ ] **Step 4: `npm test` all pass; `npm run build` clean.**

- [ ] **Step 5: Commit** — `feat: vocab store orchestrating deck flow, SRS, and session recording`

---

### Task 8: FlipCard component + flip CSS

**Files:**
- Create: `src/vocab/FlipCard.tsx`
- Modify: `src/styles/global.css` (flip-card styles)
- Test: `src/vocab/FlipCard.test.tsx`

- [ ] **Step 1: Failing test — `src/vocab/FlipCard.test.tsx`:**

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FlipCard } from './FlipCard'

const ENTRY = { id: 'ephemeral', word: 'ephemeral', pos: 'adjective', meaning: 'lasting a very short time', example: 'the ephemeral joys of childhood' }

it('word→meaning: shows the word up front, meaning after flip', async () => {
  const onFlip = vi.fn()
  const { rerender } = render(<FlipCard entry={ENTRY} mode="word-to-meaning" flipped={false} onFlip={onFlip} />)
  expect(screen.getByText('ephemeral')).toBeInTheDocument()
  expect(screen.getByText(/tap to reveal/i)).toBeInTheDocument()
  await userEvent.click(screen.getByRole('button', { name: /reveal/i }))
  expect(onFlip).toHaveBeenCalledOnce()
  rerender(<FlipCard entry={ENTRY} mode="word-to-meaning" flipped={true} onFlip={onFlip} />)
  expect(screen.getByText('lasting a very short time')).toBeInTheDocument()
  expect(screen.getByText(/ephemeral joys/)).toBeInTheDocument()
})

it('meaning→word: shows the meaning + first-letter hint up front, word after flip', () => {
  const { rerender } = render(<FlipCard entry={ENTRY} mode="meaning-to-word" flipped={false} onFlip={() => {}} />)
  expect(screen.getByText('lasting a very short time')).toBeInTheDocument()
  expect(screen.getByText(/starts with "e"/i)).toBeInTheDocument()
  expect(screen.queryByText('ephemeral')).not.toBeInTheDocument()
  rerender(<FlipCard entry={ENTRY} mode="meaning-to-word" flipped={true} onFlip={() => {}} />)
  expect(screen.getByText('ephemeral')).toBeInTheDocument()
})
```

- [ ] **Step 2: `npm test` — FAIL.**

- [ ] **Step 3: Implement.**

`src/vocab/FlipCard.tsx`:

```tsx
import type { VocabEntry } from './bank'

interface Props {
  entry: VocabEntry
  mode: 'word-to-meaning' | 'meaning-to-word'
  flipped: boolean
  onFlip: () => void
}

export function FlipCard({ entry, mode, flipped, onFlip }: Props) {
  const wordFirst = mode === 'word-to-meaning'
  return (
    <button
      type="button"
      className={`flip-card${flipped ? ' is-flipped' : ''}`}
      onClick={onFlip}
      aria-label={flipped ? 'card revealed' : 'tap to reveal'}
      disabled={flipped}
    >
      <div className="flip-card__inner">
        <div className="flip-card__face flip-card__face--front">
          {wordFirst ? (
            <>
              <div className="flip-card__word">{entry.word}</div>
              <div className="flip-card__pos">{entry.pos}</div>
            </>
          ) : (
            <>
              <div className="flip-card__meaning">{entry.meaning}</div>
              <div className="flip-card__pos">{entry.pos} · starts with "{entry.word[0]}"</div>
            </>
          )}
          <div className="flip-card__hint">tap to reveal</div>
        </div>
        <div className="flip-card__face flip-card__face--back">
          {wordFirst ? (
            <>
              <div className="flip-card__word flip-card__word--small">{entry.word}</div>
              <div className="flip-card__meaning">{entry.meaning}</div>
            </>
          ) : (
            <div className="flip-card__word">{entry.word}</div>
          )}
          {entry.example && <div className="flip-card__example">"{entry.example}"</div>}
        </div>
      </div>
    </button>
  )
}
```

Append to `src/styles/global.css`:

```css
/* Word Vault flip card */
.flip-card {
  background: transparent; border: none; padding: 0; width: 100%;
  perspective: 900px; cursor: pointer; min-height: 280px;
}
.flip-card__inner {
  position: relative; width: 100%; min-height: 280px;
  transform-style: preserve-3d; transition: transform 0.5s cubic-bezier(0.4, 0.1, 0.2, 1);
}
.flip-card.is-flipped .flip-card__inner { transform: rotateY(180deg); }
.flip-card__face {
  position: absolute; inset: 0; backface-visibility: hidden; -webkit-backface-visibility: hidden;
  border-radius: var(--radius); padding: 24px; display: flex; flex-direction: column;
  align-items: center; justify-content: center; gap: 10px; text-align: center;
  background: var(--panel-glass); -webkit-backdrop-filter: blur(8px); backdrop-filter: blur(8px);
}
.flip-card__face--front { border: 1px solid var(--border-cyan-strong); box-shadow: var(--glow-cyan); }
.flip-card__face--back { border: 1px solid rgba(255, 46, 151, 0.4); box-shadow: var(--glow-magenta); transform: rotateY(180deg); }
.flip-card__word { font-size: 30px; font-weight: 800; letter-spacing: 1px; text-shadow: var(--glow-cyan); text-transform: uppercase; }
.flip-card__word--small { font-size: 18px; }
.flip-card__pos { color: var(--cyan); font-style: italic; font-size: 13px; }
.flip-card__meaning { font-size: 16px; line-height: 1.5; color: var(--text); }
.flip-card__example { font-size: 13px; line-height: 1.5; color: var(--muted); font-style: italic; border-top: 1px solid rgba(255, 255, 255, 0.08); padding-top: 10px; }
.flip-card__hint { color: var(--muted); font-size: 11px; margin-top: 12px; }

/* Vocab screen */
.vocab__grade { display: flex; gap: 12px; }
.vocab__grade .neon-btn { flex: 1; }
.vocab__meta { display: flex; justify-content: space-between; color: var(--muted); font-size: 12px; }
.vocab__mode { display: flex; background: var(--panel); border: 1px solid var(--border-cyan-weak); border-radius: 20px; padding: 3px; font-size: 12px; }
.vocab__mode button { flex: 1; background: none; border: none; border-radius: 16px; padding: 6px 0; color: var(--muted); }
.vocab__mode button.is-on { background: rgba(0, 240, 255, 0.13); color: var(--cyan); font-weight: 700; }
.vocab__progress { height: 4px; background: var(--panel); border-radius: 2px; overflow: hidden; }
.vocab__progress span { display: block; height: 100%; background: var(--cyan); box-shadow: var(--glow-cyan); transition: width 0.3s ease; }
```

(The reduced-motion global override already flattens the flip transition.)

- [ ] **Step 4: `npm test` all pass; `npm run build` clean.**

- [ ] **Step 5: Commit** — `feat: tap-to-flip vocabulary card with both study modes`

---

### Task 9: Vocab screen

**Files:**
- Create: `src/screens/Vocab.tsx`
- Modify: `src/AppShell.tsx` (route `/vocab` → `Vocab` instead of ComingSoon)
- Test: `src/screens/Vocab.test.tsx`

- [ ] **Step 1: Failing test — `src/screens/Vocab.test.tsx`:**

```tsx
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { db } from '../storage/db'
import { useAppStore } from '../state/store'
import { useVocabStore } from '../state/vocabStore'
import { clearBankCache } from '../vocab/bank'
import { Vocab } from './Vocab'
import { fireEvent } from '@testing-library/react'

const SHARD = Array.from({ length: 12 }, (_, i) => ({
  id: `word${i}`, word: `word${i}`, pos: 'noun', meaning: `meaning ${i}`, example: '',
}))

beforeEach(async () => {
  await db.delete()
  await db.open()
  clearBankCache()
  useAppStore.setState({ profile: null, settings: null, storageOk: true })
  useVocabStore.setState({ status: 'idle', deck: null, index: 0, entry: null, flipped: false, error: null, summary: null })
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(SHARD))))
})

afterEach(() => vi.unstubAllGlobals())

it('loads the daily deck and walks a card: flip → grade → next card', async () => {
  render(<MemoryRouter><Vocab /></MemoryRouter>)
  expect(await screen.findByText(/card 1 of 10/i)).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: /knew it/i })).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: /reveal/i }))
  const knew = await screen.findByRole('button', { name: /knew it/i })
  fireEvent.click(knew)
  expect(await screen.findByText(/card 2 of 10/i)).toBeInTheDocument()
})

it('completing the deck shows the summary panel', async () => {
  render(<MemoryRouter><Vocab /></MemoryRouter>)
  await screen.findByText(/card 1 of 10/i)
  for (let i = 0; i < 10; i++) {
    fireEvent.click(screen.getByRole('button', { name: /reveal/i }))
    fireEvent.click(await screen.findByRole('button', { name: /knew it/i }))
  }
  expect(await screen.findByText(/deck complete/i)).toBeInTheDocument()
  expect(screen.getByText('100')).toBeInTheDocument()
})

it('shows retry on bank failure', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => new Response('x', { status: 500 })))
  render(<MemoryRouter><Vocab /></MemoryRouter>)
  expect(await screen.findByRole('button', { name: /retry/i })).toBeInTheDocument()
})
```

- [ ] **Step 2: `npm test` — FAIL.**

- [ ] **Step 3: Implement `src/screens/Vocab.tsx`:**

```tsx
import { useEffect } from 'react'
import { NeonButton } from '../components/NeonButton'
import { FlipCard } from '../vocab/FlipCard'
import { useAppStore } from '../state/store'
import { useVocabStore } from '../state/vocabStore'

export function Vocab() {
  const vocab = useVocabStore()
  const settings = useAppStore(s => s.settings)
  const updateSettings = useAppStore(s => s.updateSettings)
  const mode = settings?.vocabMode ?? 'word-to-meaning'

  useEffect(() => {
    if (vocab.status === 'idle') void vocab.initToday()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vocab.status])

  if (vocab.status === 'idle' || vocab.status === 'loading') {
    return <div className="screen" style={{ textAlign: 'center' }}><h1 className="app-title">WORD VAULT</h1><p style={{ color: 'var(--muted)' }}>Loading…</p></div>
  }

  if (vocab.status === 'error') {
    return (
      <div className="screen" style={{ textAlign: 'center' }}>
        <h1 className="app-title">WORD VAULT</h1>
        <p style={{ color: 'var(--muted)' }}>Couldn't load the word bank.</p>
        <NeonButton onClick={() => void vocab.initToday()}>Retry</NeonButton>
      </div>
    )
  }

  if (vocab.status === 'complete') {
    return (
      <div className="screen" style={{ textAlign: 'center' }}>
        <h1 className="app-title">WORD VAULT</h1>
        <div className="results panel" style={{ marginTop: '5vh' }}>
          <h2>Deck complete</h2>
          <div className="results__score">{vocab.summary?.score ?? 0}</div>
          <div className="results__delta">
            {vocab.summary ? `${vocab.summary.known}/${vocab.summary.total} known · ${vocab.summary.reviews} reviews` : ''}
          </div>
          <div className="results__delta">🔥 streak day banked — fresh words tomorrow</div>
        </div>
      </div>
    )
  }

  const deck = vocab.deck!
  const pct = Math.round((vocab.index / deck.length) * 100)
  return (
    <div className="screen">
      <h1 className="app-title">WORD VAULT</h1>
      <div className="vocab__mode" role="tablist">
        <button type="button" className={mode === 'word-to-meaning' ? 'is-on' : ''}
          onClick={() => void updateSettings({ vocabMode: 'word-to-meaning' })}>Word → Meaning</button>
        <button type="button" className={mode === 'meaning-to-word' ? 'is-on' : ''}
          onClick={() => void updateSettings({ vocabMode: 'meaning-to-word' })}>Meaning → Word</button>
      </div>
      <div className="vocab__progress"><span style={{ width: `${pct}%` }} /></div>
      <div className="vocab__meta">
        <span>Card {vocab.index + 1} of {deck.length}</span>
        <span>{deck[vocab.index].isReview ? 'review' : 'new word'}</span>
      </div>
      {vocab.entry && (
        <FlipCard entry={vocab.entry} mode={mode} flipped={vocab.flipped} onFlip={vocab.flip} />
      )}
      {vocab.flipped && (
        <div className="vocab__grade">
          <NeonButton variant="magenta" onClick={() => void vocab.grade(false)}>✕ Didn't know</NeonButton>
          <NeonButton variant="lime" onClick={() => void vocab.grade(true)}>✓ Knew it</NeonButton>
        </div>
      )}
    </div>
  )
}
```

In `src/AppShell.tsx`: import `Vocab` and change the `/vocab` route to `<Route path="/vocab" element={<Vocab />} />` (ComingSoon stays for `/stats` only).

- [ ] **Step 4: `npm test` all pass (update the AppShell "coming soon" test if it targeted /vocab — point it at /stats instead). `npm run build` clean.**

- [ ] **Step 5: Commit** — `feat: Word Vault screen with daily deck flow`

---

### Task 10: Registry entry + Home "Today's Words" card

**Files:**
- Modify: `src/games/types.ts` (optional `route`), `src/games/registry.ts`, `src/screens/Home.tsx`, `src/screens/Games.tsx` (route-aware links)
- Create: `src/games/word-vault/index.tsx`
- Test: extend `src/screens/Home.test.tsx`, `src/screens/Games.test.tsx`

- [ ] **Step 1: Failing tests.** In `Home.test.tsx` add:

```tsx
it('shows the Today\'s Words card linking to /vocab', () => {
  useAppStore.setState({ profile: structuredClone(DEFAULT_PROFILE) })
  render(<MemoryRouter><Home /></MemoryRouter>)
  const card = screen.getByRole('link', { name: /today's words/i })
  expect(card).toHaveAttribute('href', '/vocab')
})
```

In `Games.test.tsx` add:

```tsx
it('Word Vault tile links to /vocab, not /play', () => {
  render(<MemoryRouter><Games /></MemoryRouter>)
  const tile = screen.getByRole('link', { name: /word vault/i })
  expect(tile).toHaveAttribute('href', '/vocab')
})
```

- [ ] **Step 2: `npm test` — FAIL.**

- [ ] **Step 3: Implement.**

`src/games/types.ts` — add to `GameDefinition`:

```ts
  /** Non-arcade games can override where their tile navigates (default: /play/{id}). */
  route?: string
```

`src/games/word-vault/index.tsx`:

```tsx
import { Navigate } from 'react-router-dom'
import type { GameDefinition } from '../types'

export const wordVaultGame: GameDefinition = {
  id: 'word-vault',
  name: 'Word Vault',
  skill: 'vocab',
  blurb: 'Daily flashcards with spaced repetition.',
  route: '/vocab',
  // Deep links to /play/word-vault land on the real experience:
  Component: () => <Navigate to="/vocab" replace />,
}
```

`src/games/registry.ts`: `export const games: GameDefinition[] = [quickMathGame, wordVaultGame]`.

In `Home.tsx` and `Games.tsx`, change tile links to `to={g.route ?? \`/play/${g.id}\`}`. In `Home.tsx` add the Today's Words card between the radar and the tiles:

```tsx
<Link className="tile" to="/vocab" style={{ gridColumn: '1 / -1' }}>
  <span>📖 Today's Words</span>
  <small>10 new words + your reviews — keep the streak alive</small>
</Link>
```

(Static copy is fine for now; live due-counts arrive with Stats in Plan 4.)

- [ ] **Step 4: `npm test` all pass; `npm run build` clean.**

- [ ] **Step 5: Commit** — `feat: Word Vault registry tile and Today's Words card on Home`

---

### Task 11: End-to-end verification

**Files:** none (verification only)

- [ ] **Step 1:** `npm test` → full suite green. `npm run build` → clean.
- [ ] **Step 2:** Shard sanity: `node -e "const a=require('./public/data/vocab/everyday.json'); console.log(a.length, a[0], a[a.length-1])"` — counts and samples look right.
- [ ] **Step 3:** Manual play-through (dev server): Home shows Today's Words card → /vocab loads a 10-card deck of real words → flip works in both modes (toggle mid-deck) → grade all cards → Deck complete panel with score → Home: vocab axis on radar, streak banked → reload: deck stays completed today → Games screen shows Word Vault tile → DevTools Application tab: `vocabProgress` rows exist.
- [ ] **Step 4:** Commit any stragglers — `chore: word vault verification pass`

---

## Spec coverage (Plan 3 scope)

| Spec item | Where |
|---|---|
| 10-20k word bank, tiered, offline, from open datasets | Tasks 4-5 (committed shards) |
| Licensing recorded | Task 5 README |
| Daily deck: N new (default 10, adjustable) + due reviews | Tasks 3, 7 |
| Tap-to-flip, both study modes, first-letter hint | Task 8 |
| Knew it / Didn't know + SM-2 lite (1→4→10→25→60, ease-scaled) | Task 2 |
| Mastery = top interval; tier promotion at 80% of ≥50 served | Task 7 |
| Deck completion banks streak + records vocab session (EWMA) | Task 7 (via existing recordSession) |
| Vocab screen with progress, mode toggle, complete state, retry | Task 9 |
| Home Today's Words card; Games tile | Task 10 |
| Only-seen-words progress storage (tiny user data) | Tasks 1-2 |

**Deferred to Plan 4:** live due-counts on the Home card, words-learned/mastered display (Stats), PWA caching of shards, sound on grade.
