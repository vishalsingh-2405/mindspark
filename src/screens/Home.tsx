import { Link } from 'react-router-dom'
import { RadarChart } from '../components/RadarChart'
import { ScoreDial } from '../components/ScoreDial'
import { games } from '../games/registry'
import { useAppStore } from '../state/store'

export function Home() {
  const profile = useAppStore(s => s.profile)
  const quick = games.slice(0, 4)

  return (
    <div className="screen">
      <h1 className="app-title">MINDSPARK</h1>
      <ScoreDial score={profile?.brainScore ?? null} />
      <div className="home__streak">
        <span>🔥 {profile?.streak ?? 0}-day streak</span>
        {(profile?.freezesAvailable ?? 0) > 0 && (
          <span className="home__freeze">❄️ ×{profile!.freezesAvailable}</span>
        )}
      </div>
      <RadarChart skills={profile?.skillScores ?? {}} />
      <div className="home__tiles">
        {quick.map(g => (
          <Link className="tile" key={g.id} to={`/play/${g.id}`}>
            <span>{g.name}</span>
            <small>{g.skill}</small>
          </Link>
        ))}
      </div>
    </div>
  )
}
