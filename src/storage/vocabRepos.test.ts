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
