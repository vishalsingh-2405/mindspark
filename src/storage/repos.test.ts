import { db } from './db'
import {
  loadProfile, saveProfile, loadSettings, saveSettings, addSession,
  lastSessionFor, bestScoreFor, getGameLevel, setGameLevel,
} from './repos'

beforeEach(async () => {
  await db.delete()
  await db.open()
})

it('creates a default profile on first load', async () => {
  const p = await loadProfile()
  expect(p.streak).toBe(0)
  expect(p.brainScore).toBeNull()
  expect(p.freezesAvailable).toBe(0)
})

it('round-trips profile updates', async () => {
  const p = await loadProfile()
  await saveProfile({ ...p, streak: 5 })
  expect((await loadProfile()).streak).toBe(5)
})

it('creates default settings on first load', async () => {
  const s = await loadSettings()
  expect(s.soundOn).toBe(true)
  expect(s.wordsPerDay).toBe(10)
})

it('stores sessions and finds last and best per game', async () => {
  await addSession({ gameId: 'quick-math', skill: 'math', score: 50, difficultyReached: 3, accuracy: 0.8, avgMs: 1200, playedAt: '2026-07-07T10:00:00Z' })
  await addSession({ gameId: 'quick-math', skill: 'math', score: 70, difficultyReached: 4, accuracy: 0.9, avgMs: 1100, playedAt: '2026-07-07T11:00:00Z' })
  expect((await lastSessionFor('quick-math'))?.score).toBe(70)
  expect(await bestScoreFor('quick-math')).toBe(70)
  expect(await lastSessionFor('echo')).toBeUndefined()
  expect(await bestScoreFor('echo')).toBeUndefined()
})

it('game level defaults to 1 and round-trips', async () => {
  expect(await getGameLevel('echo')).toBe(1)
  await setGameLevel('echo', 5)
  expect(await getGameLevel('echo')).toBe(5)
})

it('persists across a database reopen', async () => {
  await setGameLevel('quick-math', 7)
  await db.close()
  await db.open()
  expect(await getGameLevel('quick-math')).toBe(7)
})

it('backfills hapticsOn on legacy settings rows and persists it', async () => {
  // Legacy row written before the hapticsOn field existed.
  await db.settings.put({
    id: 'settings', soundOn: false, wordsPerDay: 15,
    vocabMode: 'meaning-to-word', reducedMotion: true,
  } as never)
  const s = await loadSettings()
  expect(s.hapticsOn).toBe(true)
  expect(s.soundOn).toBe(false) // existing values untouched
  expect((await db.settings.get('settings'))?.hapticsOn).toBe(true) // persisted
})

it('saveSettings round-trips', async () => {
  const s = await loadSettings()
  await saveSettings({ ...s, soundOn: false, wordsPerDay: 15 })
  const reloaded = await loadSettings()
  expect(reloaded.soundOn).toBe(false)
  expect(reloaded.wordsPerDay).toBe(15)
})
