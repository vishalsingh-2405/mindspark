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
