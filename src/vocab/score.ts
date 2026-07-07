import type { VocabTier } from '../storage/db'

/**
 * Deck session score: 70% overall accuracy + 30% review retention (mastery in action).
 * Retention is count-weighted: with fewer than 5 reviews it blends toward accuracy,
 * so a lone review card cannot swing 30 points.
 */
export function deckScore(r: { knownNew: number; totalNew: number; knownReviews: number; totalReviews: number }): number {
  const total = r.totalNew + r.totalReviews
  if (total === 0) return 0
  const accuracy = (r.knownNew + r.knownReviews) / total
  const raw = r.totalReviews > 0 ? r.knownReviews / r.totalReviews : accuracy
  const w = Math.min(1, r.totalReviews / 5)
  const retention = w * raw + (1 - w) * accuracy
  return Math.round(Math.max(0, Math.min(100, 70 * accuracy + 30 * retention)))
}

/** Tier → GameResult.difficultyReached mapping. */
export function tierLevel(tier: VocabTier): number {
  return tier === 'everyday' ? 3 : tier === 'intermediate' ? 6 : 9
}
