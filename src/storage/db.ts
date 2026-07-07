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
  vocabTier: VocabTier
}

export type VocabTier = 'everyday' | 'intermediate' | 'advanced'

export interface VocabProgressRow {
  wordId: string
  step: number          // 0..4 index into the SRS ladder; -1 never graded
  ease: number          // 1.3..3.0, starts 2.5
  due: string           // 'YYYY-MM-DD'
  lapses: number
  lastResult: 'knew' | 'missed' | null
  seenAt: string        // day first seen
}

export interface DeckCard { wordId: string; isReview: boolean }

export interface VocabDeckRow {
  day: string           // 'YYYY-MM-DD' primary key
  cards: DeckCard[]
  index: number         // next card to show
  knownNew: number
  knownReviews: number
  completed: boolean
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
  vocabTier: 'everyday',
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
  vocabProgress!: Table<VocabProgressRow, string>
  vocabDeck!: Table<VocabDeckRow, string>

  constructor() {
    super('mindspark')
    this.version(1).stores({
      sessions: '++id, gameId, skill, playedAt',
      profile: 'id',
      settings: 'id',
      gameLevels: 'gameId',
    })
    this.version(2).stores({
      sessions: '++id, gameId, skill, playedAt',
      profile: 'id',
      settings: 'id',
      gameLevels: 'gameId',
      vocabProgress: 'wordId, due',
      vocabDeck: 'day',
    })
  }
}

export const db = new MindSparkDB()
