import Dexie, { type Table } from 'dexie'
import type { Skill } from '../games/types'

export interface SessionRow {
  id?: number
  gameId: string
  skill: Skill
  score: number
  difficultyReached: number
  accuracy: number
  avgMs: number
  playedAt: string // ISO timestamp
}

export interface ProfileRow {
  id: 'profile'
  brainScore: number | null
  skillScores: Partial<Record<Skill, number>>
  streak: number
  bestStreak: number
  lastPlayedDate: string | null
  freezesAvailable: number
  lastFreezeMilestone: number
  frozenDates: readonly string[]
}

export interface SettingsRow {
  id: 'settings'
  soundOn: boolean
  wordsPerDay: number
  vocabMode: 'word-to-meaning' | 'meaning-to-word'
  reducedMotion: boolean
}

export interface GameLevelRow {
  gameId: string
  lastPeak: number
}

export const DEFAULT_PROFILE: ProfileRow = Object.freeze({
  id: 'profile',
  brainScore: null,
  skillScores: {},
  streak: 0,
  bestStreak: 0,
  lastPlayedDate: null,
  freezesAvailable: 0,
  lastFreezeMilestone: 0,
  frozenDates: [],
})

export const DEFAULT_SETTINGS: SettingsRow = Object.freeze({
  id: 'settings',
  soundOn: true,
  wordsPerDay: 10,
  vocabMode: 'word-to-meaning',
  reducedMotion: false,
})

export class MindSparkDB extends Dexie {
  sessions!: Table<SessionRow, number>
  profile!: Table<ProfileRow, string>
  settings!: Table<SettingsRow, string>
  gameLevels!: Table<GameLevelRow, string>

  constructor() {
    super('mindspark')
    this.version(1).stores({
      sessions: '++id, gameId, skill, playedAt',
      profile: 'id',
      settings: 'id',
      gameLevels: 'gameId',
    })
  }
}

export const db = new MindSparkDB()
