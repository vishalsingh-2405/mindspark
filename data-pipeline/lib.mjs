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

/** WordNet gloss: definition, optionally followed by quoted example sentences. */
export function parseGloss(gloss) {
  const quote = gloss.indexOf('"')
  if (quote === -1) return { meaning: gloss.trim().replace(/;\s*$/, ''), example: '' }
  const meaning = gloss.slice(0, quote).trim().replace(/;\s*$/, '')
  const example = (gloss.slice(quote).match(/"([^"]+)"/)?.[1] ?? '').trim()
  return { meaning, example }
}

/**
 * freqWords: array of words in descending frequency order (already deduped).
 * defs: Map word → { pos, meaning, example }.
 * blocklist: Set of excluded words.
 * Returns entries with tier + rank, capped at `limit` accepted words.
 */
export function buildEntries(freqWords, defs, blocklist, limit) {
  const entries = []
  for (const word of freqWords) {
    if (entries.length >= limit) break
    if (!isCleanWord(word) || blocklist.has(word)) continue
    const def = defs.get(word)
    if (!def || !def.meaning) continue
    const rank = entries.length
    entries.push({ id: word, word, pos: def.pos, meaning: def.meaning, example: def.example, tier: tierForRank(rank), rank })
  }
  return entries
}
