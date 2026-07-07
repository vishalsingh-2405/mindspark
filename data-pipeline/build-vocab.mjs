import { createReadStream, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createInterface } from 'node:readline'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildEntries, isCleanWord, isObjectionableGloss, parseGloss, parseIndexLine } from './lib.mjs'

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

// 2. WordNet primary-sense definitions from the wordnet-db package.
// Index files list a lemma's senses in frequency order (semantic concordance),
// so the FIRST offset is the primary sense. POS is chosen by highest
// tagsense_cnt; ties (including 0-vs-0) keep the earlier POS in
// noun → verb → adjective → adverb priority order.
async function loadDefinitions() {
  const { path: wnPath } = await import('wordnet-db').then(m => m.default ?? m)
  const POS = [
    ['noun', 'index.noun', 'data.noun'],
    ['verb', 'index.verb', 'data.verb'],
    ['adjective', 'index.adj', 'data.adj'],
    ['adverb', 'index.adv', 'data.adv'],
  ]

  // 2a. Per lemma: pick the POS with the highest tagsense_cnt (ties → earlier POS).
  const candidates = new Map() // lemma → { pos, tagCnt, firstOffset }
  for (const [pos, indexFile] of POS) {
    const rl = createInterface({ input: createReadStream(join(wnPath, indexFile)) })
    for await (const line of rl) {
      const parsed = parseIndexLine(line)
      if (!parsed || !isCleanWord(parsed.lemma)) continue
      const prev = candidates.get(parsed.lemma)
      if (prev && prev.tagCnt >= parsed.tagCnt) continue
      candidates.set(parsed.lemma, { pos, tagCnt: parsed.tagCnt, firstOffset: parsed.firstOffset })
    }
  }

  // 2b. Collect only the data lines the candidates point at.
  const needed = new Map(POS.map(([pos]) => [pos, new Set()]))
  for (const c of candidates.values()) needed.get(c.pos).add(c.firstOffset)
  const dataLines = new Map(POS.map(([pos]) => [pos, new Map()]))
  for (const [pos, , dataFile] of POS) {
    const want = needed.get(pos)
    const keep = dataLines.get(pos)
    const rl = createInterface({ input: createReadStream(join(wnPath, dataFile)) })
    for await (const line of rl) {
      if (line.startsWith(' ')) continue // license header
      const offset = line.slice(0, line.indexOf(' '))
      if (want.has(offset)) keep.set(offset, line)
    }
  }

  // 2c. Resolve each candidate to its primary-sense gloss.
  const defs = new Map()
  for (const [lemma, { pos, firstOffset }] of candidates) {
    const line = dataLines.get(pos).get(firstOffset)
    if (!line) continue
    const bar = line.indexOf('|')
    if (bar === -1) continue
    // Index lemmas are LOWERCASED by WordNet; require the lemma verbatim
    // (case-sensitive) among the raw synset words so proper-noun senses
    // (Paris, John) never supply definitions. No fallback to sense 2 —
    // dropped words are backfilled from further down the frequency list.
    const fields = line.slice(0, bar).trim().split(' ')
    const wordCount = parseInt(fields[3], 16)
    let verbatim = false
    for (let i = 0; i < wordCount; i++) {
      if (fields[4 + i * 2] === lemma) { verbatim = true; break }
    }
    if (!verbatim) continue
    const gloss = line.slice(bar + 1).trim()
    if (isObjectionableGloss(gloss)) continue // family-safety gate: drop the word
    const { meaning, example } = parseGloss(gloss)
    if (meaning) defs.set(lemma, { pos, meaning, example })
  }
  return defs
}

// Words whose primary sense slipped past LDNOOBW in the audited build, plus
// cheap preventive insurance. Known-innocent homographs (censor, curse, tart,
// fairy, …) deliberately stay OFF this list — the gloss gate handles senses.
const SUPPLEMENTAL_BLOCKLIST = [
  // leaked past LDNOOBW in the audited build
  'aphrodisiac','arse','arsehole','beaver','booby','broad','brothel','bugger','cocksucker','condom',
  'crap','crapper','crappy','cripple','crotch','cuss','dickhead','dumbass','dyke','erection',
  'fanny','fart','farting','floozy','fucker','genitalia','gimp','goddam','goddamn','goddamned',
  'gook','gringo','harlot','homo','honky','horseshit','hump','hussy','hymie','knob',
  'midget','molest','molester','muff','nance','pansy','pecker','pervert','perverted','piss',
  'pissed','poop','pornographic','prostitute','prostitution','putz','queer','randy','raped','retard',
  'retarded','schmuck','screw','screwing','scrotum','shag','shite','sissy','skank','slag',
  'sperm','squaw','stripper','striptease','testicle','turd','wanker','wop',
  // preventive (not currently shipped, cheap insurance)
  'boner','dago','dildo','gyp','gypped','heeb','hooker','horny','incest','injun',
  'jigaboo','mick','mongoloid','mulatto','paedophile','pedophile','pickaninny','rape','rapist','raping',
  'redskin','sambo','slut','spaz','spic','strumpet','tit','trollop','twat','whore','whorish','yid',
]

// 3. Blocklist: LDNOOBW + supplemental
async function loadBlocklist() {
  const naughty = await import('naughty-words').then(m => m.default ?? m)
  return new Set([...naughty.en, ...SUPPLEMENTAL_BLOCKLIST])
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
