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

it('a lone review cannot swing the score (count-weighted retention)', () => {
  // 9/10 new known, missed the single review
  expect(deckScore({ knownNew: 9, totalNew: 10, knownReviews: 0, totalReviews: 1 })).toBe(77)
  // knew only the single review, missed all 10 new
  expect(deckScore({ knownNew: 0, totalNew: 10, knownReviews: 1, totalReviews: 1 })).toBe(15)
})

it('empty deck scores 0', () => {
  expect(deckScore({ knownNew: 0, totalNew: 0, knownReviews: 0, totalReviews: 0 })).toBe(0)
})

it('maps tiers to difficulty levels', () => {
  expect(tierLevel('everyday')).toBe(3)
  expect(tierLevel('intermediate')).toBe(6)
  expect(tierLevel('advanced')).toBe(9)
})
