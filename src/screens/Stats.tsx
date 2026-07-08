import { useEffect, useState } from 'react'
import { LineChart } from '../components/LineChart'
import type { Skill } from '../games/types'
import { toDayString } from '../lib/dates'
import { useAppStore } from '../state/store'
import { activityDays, brainScoreHistory, skillTrend } from '../stats/history'
import type { SessionRow } from '../storage/db'
import { allSessions, allVocabProgress } from '../storage/repos'
import { isMastered } from '../vocab/srs'

const SKILLS: Skill[] = ['math', 'logic', 'memory', 'reaction', 'vocab']

export function Stats() {
  const profile = useAppStore(s => s.profile)
  const [sessions, setSessions] = useState<SessionRow[]>([])
  const [vocab, setVocab] = useState({ learned: 0, mastered: 0 })

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const [s, v] = await Promise.all([allSessions(), allVocabProgress()])
        if (cancelled) return
        setSessions(s)
        setVocab({ learned: v.length, mastered: v.filter(isMastered).length })
      } catch {
        // storage down — sections render their empty states
      }
    })()
    return () => { cancelled = true }
  }, [])

  const history = brainScoreHistory(sessions)
  const days = activityDays(sessions, toDayString(new Date()))

  return (
    <div className="screen">
      <h1 className="app-title">STATS</h1>

      <div className="panel">
        <h2 className="stats__h">Brain Score</h2>
        {history.length >= 2
          ? <LineChart points={history.map(p => p.brainScore)} />
          : <p className="stats__empty">Play a few sessions on different days to see your trend.</p>}
      </div>

      <div className="panel">
        <h2 className="stats__h">Skills</h2>
        {SKILLS.map(skill => {
          const trend = skillTrend(sessions, skill)
          const current = profile?.skillScores[skill]
          return (
            <div className="stats__skill" key={skill}>
              <span className="stats__skill-name">{skill}</span>
              {trend.length >= 2 ? <span className="stats__spark"><LineChart points={trend} width={120} height={28} label={`${skill} skill trend`} /></span> : <span />}
              <span className="stats__skill-score">{current != null ? Math.round(current) : '—'}</span>
            </div>
          )
        })}
      </div>

      <div className="panel">
        <h2 className="stats__h">Word Vault</h2>
        <div className="stats__pair"><span>Words learned</span><span>{vocab.learned}</span></div>
        <div className="stats__pair"><span>Words mastered</span><span>{vocab.mastered}</span></div>
      </div>

      <div className="panel">
        <h2 className="stats__h">Streak</h2>
        <div className="stats__pair"><span>🔥 Current</span><span>{profile?.streak ?? 0} days</span></div>
        <div className="stats__pair"><span>🏆 Best</span><span>{profile?.bestStreak ?? 0} days</span></div>
        <div className="stats__pair"><span>❄️ Freezes banked</span><span>{profile?.freezesAvailable ?? 0}</span></div>
        <div className="stats__strip" aria-label="Last 14 days of activity">
          {days.map((played, i) => <span key={i} className={`stats__day${played ? ' is-played' : ''}`} />)}
        </div>
      </div>
    </div>
  )
}
