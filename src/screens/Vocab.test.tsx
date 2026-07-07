import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { toDayString } from '../lib/dates'
import { db } from '../storage/db'
import { useAppStore } from '../state/store'
import { useVocabStore } from '../state/vocabStore'
import { clearBankCache } from '../vocab/bank'
import { Vocab } from './Vocab'

const SHARD = Array.from({ length: 12 }, (_, i) => ({
  id: `word${i}`, word: `word${i}`, pos: 'noun', meaning: `meaning ${i}`, example: '',
}))

beforeEach(async () => {
  await db.delete()
  await db.open()
  clearBankCache()
  useAppStore.setState({ profile: null, settings: null, storageOk: true })
  useVocabStore.setState({ status: 'idle', deck: null, index: 0, entry: null, flipped: false, error: null, summary: null, day: null })
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(SHARD))))
})

afterEach(() => vi.unstubAllGlobals())

it('loads the daily deck and walks a card: flip → grade → next card', async () => {
  render(<MemoryRouter><Vocab /></MemoryRouter>)
  expect(await screen.findByText(/card 1 of 10/i)).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: /knew it/i })).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: /reveal/i }))
  const knew = await screen.findByRole('button', { name: /knew it/i })
  fireEvent.click(knew)
  expect(await screen.findByText(/card 2 of 10/i)).toBeInTheDocument()
})

it('completing the deck shows the summary panel', async () => {
  render(<MemoryRouter><Vocab /></MemoryRouter>)
  await screen.findByText(/card 1 of 10/i)
  for (let i = 0; i < 10; i++) {
    fireEvent.click(screen.getByRole('button', { name: /reveal/i }))
    fireEvent.click(await screen.findByRole('button', { name: /knew it/i }))
  }
  expect(await screen.findByText(/deck complete/i)).toBeInTheDocument()
  expect(screen.getByText('100')).toBeInTheDocument()
})

it('shows retry on bank failure', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => new Response('x', { status: 500 })))
  render(<MemoryRouter><Vocab /></MemoryRouter>)
  expect(await screen.findByRole('button', { name: /retry/i })).toBeInTheDocument()
})

it('ghost card shows skip; double-click skips only the ghost', async () => {
  const today = toDayString(new Date())
  await db.vocabDeck.put({
    day: today,
    cards: [{ wordId: 'ghost', isReview: true }, { wordId: 'word0', isReview: false }],
    index: 0, knownNew: 0, knownReviews: 0, completed: false,
  })
  render(<MemoryRouter><Vocab /></MemoryRouter>)
  const skip = await screen.findByRole('button', { name: /skip/i })
  // Dispatch both clicks as raw native events with no `act()` flush between them —
  // this is deliberate, not equivalent to fireEvent.click(skip) twice. RTL's
  // fireEvent wraps each call in a synchronous act(), which flushes the re-render
  // (and unmounts the ghost's Skip button) before the second click is ever
  // dispatched, so it can't land on the wrong card and the race never manifests.
  // A real fast double-click delivers both native events before React commits the
  // first click's update, which is exactly what raw dispatchEvent reproduces here.
  skip.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
  skip.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true })) // must be a no-op on the next (real) card
  expect(await screen.findByText(/card 2 of 2/i)).toBeInTheDocument()
  expect(screen.getByText('word0')).toBeInTheDocument()
})

it('re-inits when the loaded deck is from a previous day', async () => {
  useVocabStore.setState({ status: 'complete', day: '2020-01-01', deck: [], index: 0, summary: { score: 0, known: 0, total: 0, reviews: 0 } })
  render(<MemoryRouter><Vocab /></MemoryRouter>)
  expect(await screen.findByText(/card 1 of 10/i)).toBeInTheDocument()
})
