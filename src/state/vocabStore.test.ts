import { db } from '../storage/db'
import { useAppStore } from './store'
import { useVocabStore } from './vocabStore'
import { clearBankCache } from '../vocab/bank'

const SHARD = Array.from({ length: 20 }, (_, i) => ({
  id: `word${i}`, word: `word${i}`, pos: 'noun', meaning: `meaning ${i}`, example: '',
}))

beforeEach(async () => {
  await db.delete()
  await db.open()
  clearBankCache()
  useAppStore.setState({ profile: null, settings: null, storageOk: true })
  useVocabStore.setState({ status: 'idle', deck: null, index: 0, entry: null, flipped: false, error: null, summary: null })
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(SHARD))))
})

afterEach(() => vi.unstubAllGlobals())

it('initToday builds a deck of wordsPerDay new words for a fresh user', async () => {
  await useVocabStore.getState().initToday()
  const s = useVocabStore.getState()
  expect(s.status).toBe('ready')
  expect(s.deck).toHaveLength(10) // default wordsPerDay
  expect(s.entry?.word).toMatch(/^word\d+$/)
  expect((await db.vocabDeck.toArray())).toHaveLength(1) // persisted
})

it('grading walks the deck, persists progress, and completing records a session', async () => {
  await useVocabStore.getState().initToday()
  const total = useVocabStore.getState().deck!.length
  for (let i = 0; i < total; i++) {
    useVocabStore.getState().flip()
    await useVocabStore.getState().grade(true)
  }
  const s = useVocabStore.getState()
  expect(s.status).toBe('complete')
  expect(s.summary?.score).toBe(100) // all known, no reviews → 70·1 + 30·1
  expect(await db.vocabProgress.count()).toBe(total)
  expect(await db.sessions.count()).toBe(1)
  const session = (await db.sessions.toArray())[0]
  expect(session.gameId).toBe('word-vault')
  expect(session.skill).toBe('vocab')
  expect(useAppStore.getState().profile?.streak).toBe(1)
})

it('a refresh mid-deck resumes where it left off', async () => {
  await useVocabStore.getState().initToday()
  useVocabStore.getState().flip()
  await useVocabStore.getState().grade(false)
  // simulate reload
  useVocabStore.setState({ status: 'idle', deck: null, index: 0, entry: null, flipped: false, error: null, summary: null })
  clearBankCache()
  await useVocabStore.getState().initToday()
  expect(useVocabStore.getState().index).toBe(1)
})

it('bank failure surfaces an error state for retry UI', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => new Response('x', { status: 500 })))
  await useVocabStore.getState().initToday()
  expect(useVocabStore.getState().status).toBe('error')
})
