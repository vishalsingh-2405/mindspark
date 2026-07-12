import { randInt } from '../../lib/rng'

export interface Puzzle {
  items: string[]
  oddIndex: number
}

/** Grid size (item count) per difficulty band: L1–3 → 4, L4–6 → 6, L7–10 → 9. */
export function gridFor(level: number): 4 | 6 | 9 {
  if (level <= 3) return 4
  if (level <= 6) return 6
  return 9
}

/** Disjoint semantic emoji pools for L1–3: base category + one intruder from another pool. */
export const EMOJI_POOLS: readonly (readonly string[])[] = [
  ['🍎', '🍌', '🍇', '🍓', '🍊', '🍉', '🍒', '🍍'], // fruits
  ['🐶', '🐱', '🦁', '🐯', '🐮', '🐷', '🐘', '🦊'], // land animals
  ['🚗', '🚌', '🚒', '🚜', '🚂', '🚁', '🛵', '🚲'], // vehicles
  ['⚽', '🏀', '🏈', '⚾', '🎾', '🏐', '🏉', '🎱'], // sports balls
  ['☀️', '🌧️', '⛈️', '🌨️', '🌪️', '🌈', '⛅', '🌫️'], // weather
  ['🌹', '🌻', '🌷', '🌸', '🌵', '🌴', '🍀', '🌾'], // flowers & plants
  ['🐟', '🐙', '🦀', '🐬', '🦈', '🐳', '🦑', '🐚'], // sea creatures
  ['🎸', '🎹', '🎻', '🥁', '🎺', '🎷'], // musical instruments
  ['🐝', '🐞', '🦋', '🐜', '🦗', '🐌'], // bugs
]

/** Uppercase words grouped by first letter for the L4–6 same-start variant. */
const WORD_SETS: readonly (readonly string[])[] = [
  ['SUN', 'STAR', 'SAND', 'SONG', 'SILK', 'SNOW'],
  ['BAT', 'BALL', 'BEAR', 'BOAT', 'BELL', 'BIRD'],
  ['CAT', 'CAKE', 'COIN', 'CORN', 'CAVE', 'CLAM'],
  ['MAP', 'MOON', 'MILK', 'MINT', 'MASK', 'MOSS'],
  ['TREE', 'TIDE', 'TENT', 'TOAD', 'TILE', 'TUSK'],
  ['RAIN', 'ROCK', 'ROSE', 'RING', 'REEF', 'RUST'],
]

const PRIMES = [11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67, 71, 73, 79, 83, 89, 97, 101, 103, 107, 109, 113]
/** Composites with no obvious small factor — they "look prime" (91 = 7×13, 121 = 11², …). */
const PRIME_TRAPS = [51, 57, 87, 91, 111, 119, 121, 133, 143]

const ANAGRAM_LETTERS = [...'ABDEGKLMNORSTUW']

function shuffle<T>(arr: T[], rng: () => number): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

function pick<T>(pool: readonly T[], rng: () => number): T {
  return pool[randInt(rng, 0, pool.length - 1)]
}

/** Pick an index in [0, count) that differs from `not`. */
function pickOtherIndex(count: number, not: number, rng: () => number): number {
  const i = randInt(rng, 0, count - 2)
  return i >= not ? i + 1 : i
}

function digitSum(n: number): number {
  let s = 0
  for (let v = n; v > 0; v = Math.floor(v / 10)) s += v % 10
  return s
}

function assemble(base: string[], odd: string, rng: () => number): Puzzle {
  const items = shuffle([...base, odd], rng)
  return { items, oddIndex: items.indexOf(odd) }
}

/** L1–3: three emoji from one semantic pool + one intruder from a different pool. */
function emojiPuzzle(rng: () => number): Puzzle {
  const baseAt = randInt(rng, 0, EMOJI_POOLS.length - 1)
  const intruderAt = pickOtherIndex(EMOJI_POOLS.length, baseAt, rng)
  const base = shuffle([...EMOJI_POOLS[baseAt]], rng).slice(0, 3)
  return assemble(base, pick(EMOJI_POOLS[intruderAt], rng), rng)
}

/** L4–6: five text items obeying a subtle shared rule + one breaker. */
function textPuzzle(rng: () => number): Puzzle {
  const variant = randInt(rng, 0, 3)
  if (variant === 0) {
    // even 2-digit numbers + one odd 2-digit number
    const base = new Set<number>()
    while (base.size < 5) base.add(randInt(rng, 5, 49) * 2)
    return assemble([...base].map(String), String(randInt(rng, 5, 49) * 2 + 1), rng)
  }
  if (variant === 1) {
    // all five vowels + one consonant
    return assemble(['A', 'E', 'I', 'O', 'U'], pick([...'BCDFGHKLMNPRSTVWZ'], rng), rng)
  }
  if (variant === 2) {
    // uppercase words sharing a first letter + one starting differently
    const baseAt = randInt(rng, 0, WORD_SETS.length - 1)
    const otherAt = pickOtherIndex(WORD_SETS.length, baseAt, rng)
    const base = shuffle([...WORD_SETS[baseAt]], rng).slice(0, 5)
    return assemble(base, pick(WORD_SETS[otherAt], rng), rng)
  }
  // 2-digit multiples of 5 + one non-multiple
  const base = new Set<number>()
  while (base.size < 5) base.add(randInt(rng, 2, 19) * 5)
  let odd = randInt(rng, 11, 99)
  while (odd % 5 === 0) odd = randInt(rng, 11, 99)
  return assemble([...base].map(String), String(odd), rng)
}

/** L7–8: eight numbers sharing a math property + one that lacks it. */
function mathPuzzle(rng: () => number): Puzzle {
  const variant = randInt(rng, 0, 2)
  if (variant === 0) {
    // multiples of k + one nearby non-multiple (|delta| ≤ 3 < k, so never a multiple)
    const k = randInt(rng, 6, 9)
    const base = new Set<number>()
    while (base.size < 8) base.add(k * randInt(rng, 2, 15))
    const sign = rng() < 0.5 ? 1 : -1
    const near = k * randInt(rng, 2, 15) + sign * randInt(rng, 1, 3)
    return assemble([...base].map(String), String(near), rng)
  }
  if (variant === 1) {
    // perfect squares + one non-square (n² + 1..3 is never a square for n ≥ 2, since the next square is n² + 2n + 1 ≥ n² + 5)
    const base = new Set<number>()
    while (base.size < 8) base.add(randInt(rng, 2, 15) ** 2)
    const near = randInt(rng, 2, 15) ** 2 + randInt(rng, 1, 3)
    return assemble([...base].map(String), String(near), rng)
  }
  // 2-digit numbers sharing a digit sum + one whose digits sum differently
  const target = randInt(rng, 9, 10)
  const candidates: number[] = []
  for (let n = 10; n <= 99; n++) if (digitSum(n) === target) candidates.push(n)
  const base = shuffle(candidates, rng).slice(0, 8)
  let odd = randInt(rng, 10, 98) // 99 excluded: digit sum 18 yet still a multiple of 9, which would muddy target 9
  while (digitSum(odd) === target) odd = randInt(rng, 10, 98)
  return assemble(base.map(String), String(odd), rng)
}

/** L9–10: subtle traps — primes + a prime-looking composite, anagram sets, arithmetic progressions. */
function trapPuzzle(rng: () => number): Puzzle {
  const variant = randInt(rng, 0, 2)
  if (variant === 0) {
    const base = shuffle([...PRIMES], rng).slice(0, 8)
    return assemble(base.map(String), String(pick(PRIME_TRAPS, rng)), rng)
  }
  if (variant === 1) {
    // eight permutations of the same four letters + one near-anagram (one letter swapped)
    const letters = shuffle([...ANAGRAM_LETTERS], rng).slice(0, 4)
    const base = new Set<string>()
    while (base.size < 8) base.add(shuffle([...letters], rng).join(''))
    const near = [...letters]
    near[randInt(rng, 0, 3)] = pick(ANAGRAM_LETTERS.filter(c => !letters.includes(c)), rng)
    return assemble([...base], shuffle(near, rng).join(''), rng)
  }
  // arithmetic progression + one member nudged off by one (±1 is never ≡ 0 mod step, step ≥ 3)
  const start = randInt(rng, 5, 40)
  const step = randInt(rng, 3, 9)
  const base = Array.from({ length: 8 }, (_, i) => start + i * step)
  const odd = start + randInt(rng, 1, 6) * step + (rng() < 0.5 ? 1 : -1)
  return assemble(base.map(String), String(odd), rng)
}

/** Difficulty 1–10 → puzzle; item count follows gridFor(level), odd item never satisfies the base rule. */
export function generatePuzzle(level: number, rng: () => number): Puzzle {
  if (level <= 3) return emojiPuzzle(rng)
  if (level <= 6) return textPuzzle(rng)
  if (level <= 8) return mathPuzzle(rng)
  return trapPuzzle(rng)
}

/**
 * Session score 0–100: 60% difficulty, 25% accuracy, 15% speed (≤2.5s full, ≥8s none).
 * avgMs = 0 is the zero-answers sentinel — no speed credit for idle runs.
 */
export function toScore(r: { difficultyReached: number; accuracy: number; avgMs: number }): number {
  const difficulty = Math.min(10, r.difficultyReached) / 10
  const speed = r.avgMs > 0 ? Math.max(0, Math.min(1, (8000 - r.avgMs) / 5500)) : 0
  const raw = difficulty * 60 + r.accuracy * 25 + speed * 15
  return Math.round(Math.max(0, Math.min(100, raw)))
}
