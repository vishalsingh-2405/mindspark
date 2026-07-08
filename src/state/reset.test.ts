import { db } from '../storage/db'
import { DEFAULT_PROFILE } from '../storage/repos'
import { useAppStore } from './store'
import { useVocabStore } from './vocabStore'
import { resetAllData } from './reset'

beforeEach(async () => {
  await db.delete()
  await db.open()
})

it('wipes the database and returns both stores to first-run state', async () => {
  await db.open()
  await db.sessions.add({ gameId: 'quick-math', skill: 'math', score: 80, difficultyReached: 3, accuracy: 1, avgMs: 900, playedAt: new Date().toISOString() })
  useAppStore.setState({ profile: { ...structuredClone(DEFAULT_PROFILE), streak: 9 } })
  useVocabStore.setState({ status: 'complete', index: 5 })

  await resetAllData()

  expect(await db.sessions.count()).toBe(0)
  expect(useAppStore.getState().profile?.streak).toBe(0)
  expect(useAppStore.getState().profile?.brainScore).toBeNull()
  expect(useVocabStore.getState().status).toBe('idle')
  expect(useVocabStore.getState().index).toBe(0)
})
