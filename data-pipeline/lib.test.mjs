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
