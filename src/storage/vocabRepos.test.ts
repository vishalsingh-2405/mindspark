import { db } from './db'
import {
  loadProfile, saveVocabProgress, getVocabProgress, dueReviews,
  seenWordIds, getDeckRow, saveDeckRow,
} from './repos'

beforeEach(async () => {
  await db.delete()
  await db.open()
})

it('profile gains vocabTier defaulting to everyday (including legacy rows)', async () => {
  const p = await loadProfile()
  expect(p.vocabTier).toBe('everyday')
  // simulate a legacy v1 profile row missing the field
  await db.profile.put({ ...p, vocabTier: undefined as never })
  expect((await loadProfile()).vocabTier).toBe('everyday')
})

it('round-trips word progress and queries due reviews', async () => {
  await saveVocabProgress({ wordId: 'ephemeral', step: 1, ease: 2.5, due: '2026-07-08', lapses: 0, lastResult: 'knew', seenAt: '2026-07-07' })
  await saveVocabProgress({ wordId: 'serendipity', step: 0, ease: 2.3, due: '2026-07-10', lapses: 1, lastResult: 'missed', seenAt: '2026-07-07' })
  expect((await getVocabProgress('ephemeral'))?.step).toBe(1)
  expect((await dueReviews('2026-07-08')).map(p => p.wordId)).toEqual(['ephemeral'])
  expect((await dueReviews('2026-07-10')).map(p => p.wordId).sort()).toEqual(['ephemeral', 'serendipity'])
  expect((await seenWordIds()).sort()).toEqual(['ephemeral', 'serendipity'])
})

it('round-trips the daily deck row', async () => {
  expect(await getDeckRow('2026-07-07')).toBeUndefined()
  await saveDeckRow({ day: '2026-07-07', cards: [{ wordId: 'a', isReview: false }], index: 1, knownNew: 1, knownReviews: 0, completed: true })
  expect((await getDeckRow('2026-07-07'))?.completed).toBe(true)
})

it('upgrades a genuine v1 database preserving all rows', async () => {
  await db.delete()
  // build a real v1 database with a plain Dexie instance
  const { default: Dexie } = await import('dexie')
  const v1 = new Dexie('mindspark')
  v1.version(1).stores({
    sessions: '++id, gameId, skill, playedAt',
    profile: 'id',
    settings: 'id',
    gameLevels: 'gameId',
  })
  await v1.open()
  await v1.table('sessions').add({ gameId: 'quick-math', skill: 'math', score: 70, difficultyReached: 4, accuracy: 0.9, avgMs: 1200, playedAt: '2026-07-07T10:00:00Z' })
  await v1.table('profile').put({ id: 'profile', brainScore: 70, skillScores: { math: 70 }, streak: 3, bestStreak: 3, lastPlayedDate: '2026-07-07', freezesAvailable: 0, lastFreezeMilestone: 0, frozenDates: [] })
  v1.close()
  // reopen with the v2 class
  await db.open()
  expect(db.verno).toBe(2)
  expect(await db.sessions.count()).toBe(1)
  expect((await loadProfile()).vocabTier).toBe('everyday') // backfill on legacy row
  await saveVocabProgress({ wordId: 'x', step: 0, ease: 2.5, due: '2026-07-08', lapses: 0, lastResult: 'knew', seenAt: '2026-07-07' })
  expect((await dueReviews('2026-07-08'))).toHaveLength(1)
})
