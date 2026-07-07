import { db } from '../storage/db'
import { useAppStore } from './store'

beforeEach(async () => {
  await db.delete()
  await db.open()
  useAppStore.setState({ profile: null, settings: null, storageOk: true })
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
