import { db } from '../storage/db'
import { DEFAULT_PROFILE, DEFAULT_SETTINGS } from '../storage/repos'
import { clearBankCache } from '../vocab/bank'
import { useAppStore } from './store'
import { useVocabStore } from './vocabStore'

/** Full wipe: IndexedDB, in-memory stores, bank cache. The app returns to first-run state. */
export async function resetAllData(): Promise<void> {
  try {
    await db.delete()
    await db.open()
  } catch (e) {
    console.warn('mindspark: reset could not recreate storage', e)
  }
  clearBankCache()
  useVocabStore.setState({
    status: 'idle', deck: null, index: 0, entry: null,
    flipped: false, error: null, summary: null, day: null,
  })
  useAppStore.setState({
    profile: structuredClone(DEFAULT_PROFILE),
    settings: structuredClone(DEFAULT_SETTINGS),
    storageOk: true,
  })
}
