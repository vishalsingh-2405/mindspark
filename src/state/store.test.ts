import { db } from '../storage/db'
import { DEFAULT_PROFILE } from '../storage/repos'
import { useAppStore } from './store'

beforeEach(async () => {
  await db.delete()
  await db.open()
  useAppStore.setState({ profile: null, settings: null, storageOk: true })
})

afterEach(() => {
  vi.restoreAllMocks()
})

it('init loads default profile and settings', async () => {
  await useAppStore.getState().init()
  expect(useAppStore.getState().profile?.streak).toBe(0)
  expect(useAppStore.getState().settings?.wordsPerDay).toBe(10)
})

it('recordSession updates skill score, brain score, streak, and persists', async () => {
  await useAppStore.getState().init()
  await useAppStore.getState().recordSession({
    gameId: 'quick-math', skill: 'math', score: 80,
    difficultyReached: 5, accuracy: 0.9, avgMs: 1500,
  })
  const p = useAppStore.getState().profile!
  expect(p.skillScores.math).toBe(80)
  expect(p.brainScore).toBe(80)
  expect(p.streak).toBe(1)
  expect(await db.sessions.count()).toBe(1)
  expect((await db.profile.get('profile'))?.brainScore).toBe(80)
})

it('second session in the same skill applies the EWMA', async () => {
  await useAppStore.getState().init()
  const result = { gameId: 'quick-math', skill: 'math' as const, difficultyReached: 5, accuracy: 0.9, avgMs: 1500 }
  await useAppStore.getState().recordSession({ ...result, score: 60 })
  await useAppStore.getState().recordSession({ ...result, score: 100 })
  expect(useAppStore.getState().profile?.skillScores.math).toBe(70)
})

it('updateSettings merges and persists', async () => {
  await useAppStore.getState().init()
  await useAppStore.getState().updateSettings({ soundOn: false })
  expect(useAppStore.getState().settings?.soundOn).toBe(false)
  expect((await db.settings.get('settings'))?.soundOn).toBe(false)
})

it('init falls back to in-memory defaults when storage fails', async () => {
  vi.spyOn(db.profile, 'get').mockRejectedValueOnce(new Error('idb unavailable'))
  await useAppStore.getState().init()
  expect(useAppStore.getState().storageOk).toBe(false)
  expect(useAppStore.getState().profile?.streak).toBe(0)
})

it('recordSession skips persistence when storage is down', async () => {
  useAppStore.setState({ profile: structuredClone(DEFAULT_PROFILE), settings: null, storageOk: false })
  await useAppStore.getState().recordSession({ gameId: 'quick-math', skill: 'math', score: 80, difficultyReached: 5, accuracy: 0.9, avgMs: 1500 })
  expect(useAppStore.getState().profile?.skillScores.math).toBe(80)
  expect(await db.sessions.count()).toBe(0)
})

it('a mid-run write failure resolves gracefully and flips storageOk', async () => {
  await useAppStore.getState().init()
  vi.spyOn(db.sessions, 'add').mockRejectedValueOnce(new Error('quota exceeded'))
  await expect(useAppStore.getState().recordSession({ gameId: 'quick-math', skill: 'math', score: 80, difficultyReached: 5, accuracy: 0.9, avgMs: 1500 })).resolves.toBeUndefined()
  expect(useAppStore.getState().storageOk).toBe(false)
  expect(useAppStore.getState().profile?.skillScores.math).toBe(80) // optimistic state kept
})
