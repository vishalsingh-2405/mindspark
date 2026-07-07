import type { VocabTier } from '../storage/db'

export interface VocabEntry {
  id: string
  word: string
  pos: string
  meaning: string
  example: string
}

export interface TierBank {
  entries: VocabEntry[]        // frequency order
  byId: Map<string, VocabEntry>
}

const cache = new Map<VocabTier, TierBank>()

export async function loadTier(tier: VocabTier): Promise<TierBank> {
  const hit = cache.get(tier)
  if (hit) return hit
  const res = await fetch(`/data/vocab/${tier}.json`)
  if (!res.ok) throw new Error(`vocab shard ${tier} failed: ${res.status}`)
  const entries = (await res.json()) as VocabEntry[]
  const bank: TierBank = { entries, byId: new Map(entries.map(e => [e.id, e])) }
  cache.set(tier, bank)
  return bank
}

/** Test hook. */
export function clearBankCache(): void {
  cache.clear()
}
