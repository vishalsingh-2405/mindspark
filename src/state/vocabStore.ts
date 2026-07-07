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
const TIER_ORDER: VocabTier[] = ['everyday', 'intermediate', 'advanced']
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
let elapsedMs = 0

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
      // Entry lookup spans current + all lower tiers: shards are disjoint word sets,
      // and post-promotion review cards reference lower-tier words. New-word selection
      // stays current-tier only (bank = last of the slice).
      const tierIdx = TIER_ORDER.indexOf(tier)
      const banks = await Promise.all(TIER_ORDER.slice(0, tierIdx + 1).map(loadTier))
      const bank = banks[banks.length - 1]
      bankById = new Map()
      for (const b of banks) for (const [id, e] of b.byId) bankById.set(id, e)

      let row = await repo.getDeckRow(today).catch(() => undefined)
      if (!row) {
        const due = (await repo.dueReviews(today).catch(() => []))
          .filter(d => bankById.has(d.wordId)) // words can vanish from the bank across regenerations
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
      elapsedMs = 0
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

    elapsedMs += performance.now() - shownAt

    // Advance the deck synchronously, before any await. flipped:false alone isn't a
    // sufficient re-entrancy guard: it re-shows this same card as "revealable" while
    // the writes below are still in flight, and a fast enough reveal→grade→reveal→grade
    // cycle (rapid taps, or a tight test loop) can flip and grade it a second time
    // before the first pass's writes land, corrupting the index. Committing the index
    // move here — synchronously, in the same tick as the guard check — closes that
    // window entirely: by the time control returns to any caller, the store already
    // reflects the next card.
    if (knew && card.isReview) deckRow.knownReviews += 1
    if (knew && !card.isReview) deckRow.knownNew += 1
    deckRow.index += 1
    const done = deckRow.index >= deckRow.cards.length
    if (done) deckRow.completed = true

    if (done) {
      set({ status: 'complete', index: deckRow.index, flipped: false, summary: summarize(deckRow) })
    } else {
      shownAt = performance.now()
      set({
        index: deckRow.index,
        entry: bankById.get(deckRow.cards[deckRow.index].wordId) ?? null,
        flipped: false,
      })
    }

    const prev = await repo.getVocabProgress(card.wordId).catch(() => undefined)
    const graded = gradeWord(prev ?? newProgress(card.wordId, today), knew, today)
    await repo.saveVocabProgress(graded).catch(() => {})
    await repo.saveDeckRow(deckRow).catch(() => {})

    if (done) {
      const summary = summarize(deckRow)
      await useAppStore.getState().recordSession({
        gameId: 'word-vault',
        skill: 'vocab',
        score: summary.score,
        difficultyReached: tierLevel(useAppStore.getState().profile!.vocabTier),
        accuracy: summary.total ? summary.known / summary.total : 0,
        avgMs: summary.total ? elapsedMs / summary.total : 0,
      })
      await maybePromoteTier()
    }
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
    const rows = await repo.getVocabProgressBulk(served)
    const mastered = rows.filter(r => r && isMastered(r)).length
    if (mastered / served.length >= PROMOTE_RATIO) {
      const profile = { ...app.profile!, vocabTier: next }
      useAppStore.setState({ profile })
      await repo.saveProfile(profile).catch(() => {})
    }
  } catch {
    // promotion is best-effort; storage/bank hiccups must not block deck completion
  }
}
