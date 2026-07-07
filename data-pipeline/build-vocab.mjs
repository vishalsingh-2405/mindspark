import { createReadStream, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createInterface } from 'node:readline'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildEntries, isCleanWord, parseGloss } from './lib.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const CACHE = join(here, 'cache')
const OUT = join(here, '..', 'public', 'data', 'vocab')
const FREQ_URL = 'https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/content/2018/en/en_full.txt'
const LIMIT = 15_000

// 1. Frequency list (download once, cache)
async function loadFrequencyList() {
  mkdirSync(CACHE, { recursive: true })
  const cached = join(CACHE, 'en_full.txt')
  if (!existsSync(cached)) {
    console.log('downloading frequency list…')
    const res = await fetch(FREQ_URL)
    if (!res.ok) throw new Error(`frequency download failed: ${res.status}`)
    writeFileSync(cached, await res.text())
  }
  const words = []
  const seen = new Set()
  for (const line of readFileSync(cached, 'utf8').split('\n')) {
    const word = line.split(' ')[0]?.toLowerCase()
    if (word && !seen.has(word)) { seen.add(word); words.push(word) }
  }
  return words
}

// 2. WordNet definitions from the wordnet-db package's data files
async function loadDefinitions() {
  const { path: wnPath } = await import('wordnet-db').then(m => m.default ?? m)
  const posFiles = [
    ['data.noun', 'noun'],
    ['data.verb', 'verb'],
    ['data.adj', 'adjective'],
    ['data.adv', 'adverb'],
  ]
  const defs = new Map()
  for (const [file, pos] of posFiles) {
    const rl = createInterface({ input: createReadStream(join(wnPath, file)) })
    for await (const line of rl) {
      if (line.startsWith(' ')) continue // license header
      const bar = line.indexOf('|')
      if (bar === -1) continue
      const gloss = line.slice(bar + 1).trim()
      const fields = line.slice(0, bar).trim().split(' ')
      const wordCount = parseInt(fields[3], 16)
      for (let i = 0; i < wordCount; i++) {
        // Filter on the RAW lemma: WordNet capitalizes proper nouns (Paris, John),
        // and isCleanWord rejects uppercase — lowercasing first would let city/person
        // glosses masquerade as common-word definitions.
        const word = fields[4 + i * 2]
        if (!word || !isCleanWord(word) || defs.has(word)) continue
        const { meaning, example } = parseGloss(gloss)
        if (meaning) defs.set(word, { pos, meaning, example })
      }
    }
  }
  return defs
}

// 3. Blocklist
async function loadBlocklist() {
  const naughty = await import('naughty-words').then(m => m.default ?? m)
  return new Set(naughty.en)
}

const [freq, defs, blocklist] = await Promise.all([loadFrequencyList(), loadDefinitions(), loadBlocklist()])
const entries = buildEntries(freq, defs, blocklist, LIMIT)

mkdirSync(OUT, { recursive: true })
for (const tier of ['everyday', 'intermediate', 'advanced']) {
  const shard = entries.filter(e => e.tier === tier).map(({ tier: _t, rank: _r, ...e }) => e)
  writeFileSync(join(OUT, `${tier}.json`), JSON.stringify(shard))
  console.log(`${tier}: ${shard.length} words`)
}
console.log(`total: ${entries.length}`)
