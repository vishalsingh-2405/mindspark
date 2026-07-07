import { act, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { db } from '../storage/db'
import { GamePlay } from './GamePlay'

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/play/:gameId" element={<GamePlay />} />
        <Route path="/games" element={<div>GAMES SCREEN</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

afterEach(() => {
  vi.restoreAllMocks()
  vi.useRealTimers()
})

it('redirects to /games for an unknown game id', () => {
  renderAt('/play/not-a-game')
  expect(screen.getByText('GAMES SCREEN')).toBeInTheDocument()
})

it('loads the game component for a valid id', async () => {
  renderAt('/play/quick-math')
  expect(await screen.findByText(/Lv \d/)).toBeInTheDocument()
})

it('records the run and shows results with delta on replay', async () => {
  vi.useFakeTimers({ shouldAdvanceTime: true })
  renderAt('/play/quick-math')
  await screen.findByText(/Lv \d/)

  await act(async () => { await vi.advanceTimersByTimeAsync(31_000) })
  expect(await screen.findByText('Session complete')).toBeInTheDocument()
  expect(screen.getByText('First run — baseline set')).toBeInTheDocument()

  fireEvent.click(screen.getByRole('button', { name: 'Play again' }))
  await screen.findByText(/Lv \d/)
  await act(async () => { await vi.advanceTimersByTimeAsync(31_000) })
  expect(await screen.findByText('Session complete')).toBeInTheDocument()
  // both idle runs score 0 → delta 0 → tie copy
  expect(screen.getByText('— same as last time')).toBeInTheDocument()

  expect(await db.sessions.count()).toBe(2)
})

it('still shows results when storage dies mid-run', async () => {
  vi.useFakeTimers({ shouldAdvanceTime: true })
  // level lookup fails → falls back to level 1 instead of loading forever
  vi.spyOn(db.gameLevels, 'get').mockRejectedValue(new Error('idb gone'))
  vi.spyOn(db.gameLevels, 'put').mockRejectedValue(new Error('idb gone'))
  // lastSessionFor uses db.sessions.where — throwing exercises its catch path
  vi.spyOn(db.sessions, 'where').mockImplementation(() => { throw new Error('idb gone') })

  renderAt('/play/quick-math')
  expect(await screen.findByText(/Lv 1/)).toBeInTheDocument()

  await act(async () => { await vi.advanceTimersByTimeAsync(31_000) })
  expect(await screen.findByText('Session complete')).toBeInTheDocument()
})
