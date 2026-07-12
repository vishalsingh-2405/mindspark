import { useEffect, useState, type CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { games } from '../games/registry'
import { bestScoreFor, lastSessionFor } from '../storage/repos'

interface GameStats { best?: number; last?: number }

export function Games() {
  const [stats, setStats] = useState<Record<string, GameStats> | null>(null)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const entries = await Promise.all(
          games.map(async g => {
            const [best, last] = await Promise.all([bestScoreFor(g.id), lastSessionFor(g.id)])
            return [g.id, { best, last: last?.score }] as const
          }),
        )
        if (!cancelled) setStats(Object.fromEntries(entries))
      } catch {
        // storage down — tiles fall back to "Not played yet"
        if (!cancelled) setStats({})
      }
    })()
    return () => { cancelled = true }
  }, [])

  return (
    <div className="screen">
      <h1 className="app-title">GAMES</h1>
      <div className="home__tiles" data-testid="games-grid">
        {games.map((g, i) => (
          <Link className="tile" key={g.id} to={g.route ?? `/play/${g.id}`}
            style={{ '--i': i } as CSSProperties}>
            <span>{g.name}</span>
            <small>{g.skill}</small>
            <small>
              {stats === null
                ? '…'
                : stats[g.id]?.best != null
                  ? `Best ${stats[g.id].best} · Last ${stats[g.id].last ?? '—'}`
                  : 'Not played yet'}
            </small>
          </Link>
        ))}
      </div>
    </div>
  )
}
