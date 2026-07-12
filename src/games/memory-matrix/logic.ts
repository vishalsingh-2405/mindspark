export interface MatrixConfig {
  grid: number
  count: number
  flashMs: number
}

/** Difficulty 1–10 → board size, flashed-cell count, and flash duration. */
export function matrixConfig(level: number): MatrixConfig {
  let grid: number
  let count: number
  if (level <= 3) {
    grid = 3
    count = level === 1 ? 3 : 4
  } else if (level <= 7) {
    grid = 4
    count = level === 4 ? 4 : level === 5 ? 5 : 6
  } else {
    grid = 5
    count = level === 8 ? 6 : level === 9 ? 7 : 8
  }
  return { grid, count, flashMs: 1000 - level * 40 }
}

/** `count` distinct cell indices in [0, grid²) — Fisher–Yates over the full board, take the head. */
export function pickCells(grid: number, count: number, rng: () => number): number[] {
  const cells = Array.from({ length: grid * grid }, (_, i) => i)
  for (let i = cells.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[cells[i], cells[j]] = [cells[j], cells[i]]
  }
  return cells.slice(0, count)
}

/** Round is perfect iff the pick set equals the flashed set (any wrong cell = miss). */
export function isPerfect(target: number[], picks: number[]): boolean {
  if (picks.length !== target.length) return false
  const t = new Set(target)
  return picks.every(p => t.has(p))
}

/**
 * Session score 0–100: 65% difficulty, 25% accuracy, 10% speed (input phase ≤3s full, ≥8s none).
 * avgMs = 0 is the zero-perfect-rounds sentinel — no speed credit for idle runs.
 */
export function toScore(r: { difficultyReached: number; accuracy: number; avgMs: number }): number {
  const difficulty = Math.min(10, r.difficultyReached) / 10
  const speed = r.avgMs > 0 ? Math.max(0, Math.min(1, (8000 - r.avgMs) / 5000)) : 0
  const raw = difficulty * 65 + r.accuracy * 25 + speed * 10
  return Math.round(Math.max(0, Math.min(100, raw)))
}
