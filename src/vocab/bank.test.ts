import { loadTier, clearBankCache } from './bank'

const SHARD = [{ id: 'ephemeral', word: 'ephemeral', pos: 'adjective', meaning: 'lasting a very short time', example: 'x' }]

beforeEach(() => {
  clearBankCache()
  vi.restoreAllMocks()
})

it('fetches a tier shard and indexes it by id', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(SHARD))))
  const bank = await loadTier('everyday')
  expect(fetch).toHaveBeenCalledWith('/data/vocab/everyday.json')
  expect(bank.entries).toHaveLength(1)
  expect(bank.byId.get('ephemeral')?.pos).toBe('adjective')
})

it('caches per tier (single fetch)', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(SHARD))))
  await loadTier('everyday')
  await loadTier('everyday')
  expect(fetch).toHaveBeenCalledTimes(1)
})

it('throws on HTTP failure so the UI can show retry', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => new Response('nope', { status: 500 })))
  await expect(loadTier('advanced')).rejects.toThrow()
})
