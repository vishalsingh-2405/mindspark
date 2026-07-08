import { create } from 'zustand'
import type { GameResult } from '../games/types'
import { toDayString } from '../lib/dates'
import { computeBrainScore } from '../scoring/brainScore'
import { updateSkillScore } from '../scoring/skillScore'
import { advanceStreak } from '../scoring/streak'
import type { ProfileRow, SettingsRow } from '../storage/db'
import * as repo from '../storage/repos'

interface AppState {
  profile: ProfileRow | null
  settings: SettingsRow | null
  /** false when IndexedDB is unavailable — app runs in-memory with a warning banner. */
  storageOk: boolean
  init: () => Promise<void>
  recordSession: (result: GameResult) => Promise<void>
  updateSettings: (patch: Partial<Omit<SettingsRow, 'id'>>) => Promise<void>
}

export const useAppStore = create<AppState>((set, get) => ({
  profile: null,
  settings: null,
  storageOk: true,

  async init() {
    try {
      const [profile, settings] = await Promise.all([repo.loadProfile(), repo.loadSettings()])
      set({ profile, settings, storageOk: true })
    } catch (e) {
      console.warn('mindspark: storage unavailable — starting with in-memory defaults', e)
      set({ profile: structuredClone(repo.DEFAULT_PROFILE), settings: structuredClone(repo.DEFAULT_SETTINGS), storageOk: false })
    }
  },

  async recordSession(result) {
    if (!get().profile) await get().init() // init guarantees a non-null profile afterward
    const prev = get().profile!
    const now = new Date()
    const skillScores = {
      ...prev.skillScores,
      [result.skill]: updateSkillScore(prev.skillScores[result.skill] ?? null, result.score),
    }
    const streaked = advanceStreak(prev, toDayString(now))
    // skillScores/brainScore must stay AFTER ...streaked — streaked structurally carries stale copies.
    const profile: ProfileRow = {
      ...prev,
      ...streaked,
      skillScores,
      brainScore: computeBrainScore(skillScores),
    }
    set({ profile })
    if (get().storageOk) {
      try {
        await repo.addSession({ ...result, playedAt: now.toISOString() })
        await repo.saveProfile(profile)
      } catch (e) {
        console.warn('mindspark: session persist failed — storage marked unavailable', e)
        set({ storageOk: false })
      }
    }
  },

  async updateSettings(patch) {
    if (!get().settings) await get().init() // init guarantees non-null settings afterward
    const clamped = { ...patch }
    if (clamped.wordsPerDay != null) {
      clamped.wordsPerDay = Math.min(25, Math.max(5, Math.round(clamped.wordsPerDay)))
    }
    const settings: SettingsRow = { ...get().settings!, ...clamped }
    set({ settings })
    if (get().storageOk) {
      try {
        await repo.saveSettings(settings)
      } catch (e) {
        console.warn('mindspark: settings persist failed — running in-memory', e)
        set({ storageOk: false })
      }
    }
  },
}))
