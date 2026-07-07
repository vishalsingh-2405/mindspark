import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
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
  useVocabStore.setState({ status: 'idle', deck: null, index: 0, entry: null, flipped: false, error: null, summary: null })
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
