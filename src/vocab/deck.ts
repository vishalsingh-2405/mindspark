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
