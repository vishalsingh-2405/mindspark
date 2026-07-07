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

/** Parse a WordNet index.<pos> line → { lemma, tagCnt, firstOffset }, or null for header/blank lines. */
export function parseIndexLine(line) {
  if (!line || line.startsWith(' ')) return null
  const f = line.trim().split(/\s+/)
  const pCnt = parseInt(f[3], 10)
  if (!Number.isFinite(pCnt)) return null
  const tagCnt = parseInt(f[5 + pCnt], 10)
  const firstOffset = f[6 + pCnt]
  if (!firstOffset) return null
  return { lemma: f[0], tagCnt, firstOffset }
}

const OBJECTIONABLE = /obscene|vulgar|ethnic slur|offensive term|disparaging|derogatory term|expletive/i

/** Family-safety gate: does this raw WordNet gloss mark the sense as obscene/slur? */
export function isObjectionableGloss(gloss) {
  return OBJECTIONABLE.test(gloss)
}

function trimMeaning(s) {
  return s.trim().replace(/[;:,(]\s*$/, '').trim()
}

/** WordNet gloss: definition, optionally followed by quoted example sentences. */
export function parseGloss(gloss) {
  const quote = gloss.indexOf('"')
  if (quote === -1) return { meaning: trimMeaning(gloss), example: '' }
  const meaning = trimMeaning(gloss.slice(0, quote))
  const example = (gloss.slice(quote).match(/"([^"]+)"/)?.[1] ?? '').trim()
  return { meaning, example }
}

/**
 * freqWords: array of words in descending frequency order (already deduped).
 * defs: Map word → { pos, meaning, example }.
 * blocklist: Set of excluded words.
 * Returns entries with tier + rank, capped at `limit` accepted words.
 * Callers must keep limit <= 15000 or tier becomes null (tierForRank ceiling).
 */
export function buildEntries(freqWords, defs, blocklist, limit) {
  const entries = []
  for (const word of freqWords) {
    if (entries.length >= limit) break
    if (!isCleanWord(word) || blocklist.has(word)) continue
    const def = defs.get(word)
    if (!def || !def.meaning) continue
    const rank = entries.length
    entries.push({ id: word, word, pos: def.pos, meaning: def.meaning, example: def.example ?? '', tier: tierForRank(rank), rank })
  }
  return entries
}
