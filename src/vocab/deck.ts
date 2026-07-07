import type { DeckCard } from '../storage/db'

function shuffle<T>(arr: T[], rng: () => number): T[] {
  const out = [...arr]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

/** Today's deck: due reviews (shuffled, capped at maxReviews keeping the most overdue) first, then wordsPerDay new words drawn in frequency order (shuffled among themselves). */
export function buildDeck(opts: {
  wordsPerDay: number
  dueReviewIds: string[]   // due-ascending: most overdue first
  unseenByRank: string[]
  rng: () => number
  maxReviews?: number
}): DeckCard[] {
  const cap = opts.maxReviews ?? 50
  const reviews = shuffle(opts.dueReviewIds.slice(0, cap), opts.rng).map(wordId => ({ wordId, isReview: true }))
  const fresh = shuffle(opts.unseenByRank.slice(0, Math.max(0, opts.wordsPerDay)), opts.rng).map(wordId => ({ wordId, isReview: false }))
  return [...reviews, ...fresh]
}
