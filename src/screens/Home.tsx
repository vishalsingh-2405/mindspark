import { useState } from 'react'
import { Link } from 'react-router-dom'
import { RadarChart } from '../components/RadarChart'
import { ScoreDial } from '../components/ScoreDial'
import { SettingsSheet } from '../components/SettingsSheet'
import { games } from '../games/registry'
import { useAppStore } from '../state/store'

export function Home() {
  const profile = useAppStore(s => s.profile)
  const freezes = profile?.freezesAvailable ?? 0
  const quick = games.slice(0, 4)
  const [settingsOpen, setSettingsOpen] = useState(false)

  return (
    <div className="screen">
      <h1 className="app-title">MINDSPARK</h1>
      <button type="button" className="home__gear" aria-label="Settings"
        onClick={() => setSettingsOpen(true)}>⚙</button>
      <ScoreDial score={profile?.brainScore ?? null} />
      <div className="home__streak">
        <span>🔥 {profile?.streak ?? 0}-day streak</span>
        {freezes > 0 && (
          <span
            className="home__freeze"
            aria-label={`${freezes} streak ${freezes === 1 ? 'freeze' : 'freezes'} available`}
          >
            ❄️ ×{freezes}
          </span>
        )}
      </div>
      <RadarChart skills={profile?.skillScores ?? {}} />
      <Link className="tile" to="/vocab" style={{ gridColumn: '1 / -1' }}>
        <span>📖 Today's Words</span>
        <small>10 new words + your reviews — keep the streak alive</small>
      </Link>
      <div className="home__tiles">
        {quick.map(g => (
          <Link className="tile" key={g.id} to={g.route ?? `/play/${g.id}`}>
            <span>{g.name}</span>
            <small>{g.skill}</small>
          </Link>
        ))}
      </div>
      <SettingsSheet open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  )
}
