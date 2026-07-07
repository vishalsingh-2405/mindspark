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
    } catch {
      set({ profile: structuredClone(repo.DEFAULT_PROFILE), settings: structuredClone(repo.DEFAULT_SETTINGS), storageOk: false })
    }
  },

  async recordSession(result) {
    const prev = get().profile ?? structuredClone(repo.DEFAULT_PROFILE)
    const skillScores = {
      ...prev.skillScores,
      [result.skill]: updateSkillScore(prev.skillScores[result.skill] ?? null, result.score),
    }
    const streaked = advanceStreak(prev, toDayString(new Date()))
    const profile: ProfileRow = {
      ...prev,
      ...streaked,
      skillScores,
      brainScore: computeBrainScore(skillScores),
    }
    set({ profile })
    if (get().storageOk) {
      await repo.addSession({ ...result, playedAt: new Date().toISOString() })
      await repo.saveProfile(profile)
    }
  },

  async updateSettings(patch) {
    const settings: SettingsRow = { ...(get().settings ?? structuredClone(repo.DEFAULT_SETTINGS)), ...patch }
    set({ settings })
    if (get().storageOk) await repo.saveSettings(settings)
  },
}))
