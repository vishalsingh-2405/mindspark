import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { db } from '../storage/db'
import { DEFAULT_PROFILE } from '../storage/repos'
import { useAppStore } from '../state/store'
import { Stats } from './Stats'

beforeEach(async () => {
  await db.delete()
  await db.open()
  useAppStore.setState({
    profile: { ...structuredClone(DEFAULT_PROFILE), streak: 3, bestStreak: 7, freezesAvailable: 0 },
    settings: null,
    storageOk: true,
  })
})

it('renders all four stat sections with seeded data', async () => {
  await db.sessions.add({ gameId: 'quick-math', skill: 'math', score: 80, difficultyReached: 3, accuracy: 1, avgMs: 900, playedAt: '2026-07-01T10:00:00.000Z' })
  await db.sessions.add({ gameId: 'quick-math', skill: 'math', score: 60, difficultyReached: 3, accuracy: 1, avgMs: 900, playedAt: '2026-07-02T10:00:00.000Z' })
  // two learned words, exactly one mastered → counts are distinct (2 and 1), so getByText stays unambiguous
  await db.vocabProgress.put({ wordId: 'w1', step: 4, ease: 2.5, due: '2099-01-01', lapses: 0, lastResult: 'knew', seenAt: '2026-07-01' })
  await db.vocabProgress.put({ wordId: 'w2', step: 0, ease: 2.5, due: '2099-01-01', lapses: 0, lastResult: 'knew', seenAt: '2026-07-01' })
  render(<MemoryRouter><Stats /></MemoryRouter>)
  expect(await screen.findByText(/words learned/i)).toBeInTheDocument()
  expect(screen.getByText(/3 days/)).toBeInTheDocument()   // current streak
  expect(screen.getByText(/7 days/)).toBeInTheDocument()   // best streak
  expect(await screen.findByText('2')).toBeInTheDocument() // words learned
  expect(screen.getByText('1')).toBeInTheDocument()        // words mastered
  expect(screen.getByRole('img', { name: /score trend/i })).toBeInTheDocument() // brain chart (2 points)
})

it('renders the empty state when no sessions exist yet', async () => {
  render(<MemoryRouter><Stats /></MemoryRouter>)
  expect(await screen.findByText(/play a few sessions/i)).toBeInTheDocument()
})
