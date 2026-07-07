import { isCleanWord, tierForRank, parseGloss, buildEntries, parseIndexLine, isObjectionableGloss } from './lib.mjs'

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

it('parses real WordNet index lines: lemma, tagsense count, first (primary-sense) offset', () => {
  // verbatim from wordnet-db index.verb: p_cnt=5, so tagsense_cnt is field 10, first offset field 11
  expect(parseIndexLine('know v 11 5 ! @ ~ $ + 11 7 00596016 00597330 00597025 00595732 00598039 00594278 00597527 01429048 00610224 00610056 00609926  ')).toEqual({
    lemma: 'know',
    tagCnt: 7,
    firstOffset: '00596016',
  })
  // verbatim from wordnet-db index.noun: p_cnt=4, tagsense_cnt 0
  expect(parseIndexLine('gorge n 3 4 @ ~ #p %p 3 0 09313350 09286818 05541581  ')).toEqual({
    lemma: 'gorge',
    tagCnt: 0,
    firstOffset: '09313350',
  })
  // license-header lines start with whitespace; blanks are null too
  expect(parseIndexLine('  1 This software and database is being provided to you, the LICENSEE, by  ')).toBe(null)
  expect(parseIndexLine('')).toBe(null)
})

it('flags obscene/slur glosses and passes clean ones', () => {
  expect(isObjectionableGloss('(ethnic slur) offensive term for a person of Mexican descent')).toBe(true)
  expect(isObjectionableGloss('obscene terms for penis')).toBe(true)
  expect(isObjectionableGloss('a deep ravine (usually with a river running through it)')).toBe(false)
})

it('handles real WordNet gloss shapes: multi-example, attribution, trailing punctuation, parenthetical quote', () => {
  // first example wins
  expect(parseGloss('cause to run; "run the water"; "run the machine"')).toEqual({
    meaning: 'cause to run',
    example: 'run the water',
  })
  // attribution tail after the quote is dropped
  expect(parseGloss('lasting a very short time; "the ephemeral joys"- John Milton')).toEqual({
    meaning: 'lasting a very short time',
    example: 'the ephemeral joys',
  })
  // trailing colon before a word-mention quote is stripped
  expect(parseGloss('female of domestic cattle: "moo-cow" is a child\'s term')).toEqual({
    meaning: 'female of domestic cattle',
    example: 'moo-cow',
  })
  // quote inside a parenthetical: meaning must not end mid-paren
  expect(parseGloss('spread by scattering ("straw" is archaic); "strew toys all over the carpet"')).toEqual({
    meaning: 'spread by scattering',
    example: 'straw',
  })
})

it('stops accepting entries at exactly limit', () => {
  const freq = ['aaa', 'bbb', 'ccc']
  const defs = new Map([
    ['aaa', { pos: 'noun', meaning: 'first', example: '' }],
    ['bbb', { pos: 'noun', meaning: 'second', example: '' }],
    ['ccc', { pos: 'noun', meaning: 'third', example: '' }],
  ])
  const entries = buildEntries(freq, defs, new Set(), 2)
  expect(entries).toHaveLength(2)
  expect(entries[1]).toMatchObject({ word: 'bbb', rank: 1 })
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
