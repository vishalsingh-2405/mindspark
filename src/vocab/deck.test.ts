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
