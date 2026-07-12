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
  // a first-ever run is a baseline, never a NEW BEST
  expect(screen.queryByText('NEW BEST')).not.toBeInTheDocument()

  fireEvent.click(screen.getByRole('button', { name: 'Play again' }))
  await screen.findByText(/Lv \d/)
  await act(async () => { await vi.advanceTimersByTimeAsync(31_000) })
  expect(await screen.findByText('Session complete')).toBeInTheDocument()
  // both idle runs score 0 → delta 0 → tie copy
  expect(screen.getByText('— same as last time')).toBeInTheDocument()
  // tying the previous best (0 vs 0) is not a NEW BEST — strictly greater only
  expect(screen.queryByText('NEW BEST')).not.toBeInTheDocument()

  expect(await db.sessions.count()).toBe(2)
})

/** Parse a quick-math question's display text (−, ×, ÷ glyphs; + before × precedence form). */
function solve(text: string): number {
  const two = text.match(/^(\d+) \+ (\d+) × (\d+)$/)
  if (two) return Number(two[1]) + Number(two[2]) * Number(two[3])
  const one = text.match(/^(\d+) ([+−×÷]) (\d+)$/)
  if (!one) throw new Error(`unparsed question: ${text}`)
  const a = Number(one[1])
  const b = Number(one[3])
  switch (one[2]) {
    case '+': return a + b
    case '−': return a - b
    case '×': return a * b
    default: return a / b
  }
}

it('beating a prior best shows the NEW BEST ribbon', async () => {
  vi.useFakeTimers({ shouldAdvanceTime: true })
  // prior best of 1 — any run with a correct answer beats it
  await db.sessions.add({
    gameId: 'quick-math', skill: 'math', score: 1,
    difficultyReached: 1, accuracy: 0, avgMs: 0, playedAt: new Date().toISOString(),
  })
  const { container } = renderAt('/play/quick-math')
  await screen.findByText(/Lv \d/)

  for (let i = 0; i < 2; i++) {
    const answer = solve(container.querySelector('.quick-math__q')!.textContent!)
    fireEvent.click(screen.getAllByRole('button').find(b => Number(b.textContent) === answer)!)
  }
  await act(async () => { await vi.advanceTimersByTimeAsync(61_000) })
  expect(await screen.findByText('Session complete')).toBeInTheDocument()
  expect(screen.getByText('NEW BEST')).toBeInTheDocument()
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
