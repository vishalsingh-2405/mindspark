import { useEffect } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import { BottomNav } from './components/BottomNav'
import { ErrorBoundary } from './components/ErrorBoundary'
import { ComingSoon } from './screens/ComingSoon'
import { Games } from './screens/Games'
import { Home } from './screens/Home'
import { useAppStore } from './state/store'

export function AppShell() {
  const init = useAppStore(s => s.init)
  const storageOk = useAppStore(s => s.storageOk)
  const { pathname } = useLocation()
  const inGame = pathname === '/play' || pathname.startsWith('/play/')

  useEffect(() => { void init() }, [init])

  return (
    <div className="app">
      {!storageOk && <div className="banner" role="status">Storage unavailable — progress won't be saved</div>}
      <main className="app__main">
        {/* key: remount on navigation so a crashed screen's fallback clears when the user switches tabs */}
        <ErrorBoundary key={pathname}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/games" element={<Games />} />
            <Route path="/vocab" element={<ComingSoon title="WORD VAULT" />} />
            <Route path="/stats" element={<ComingSoon title="STATS" />} />
          </Routes>
        </ErrorBoundary>
      </main>
      {!inGame && <BottomNav />}
    </div>
  )
}
