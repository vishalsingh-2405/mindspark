import type { ComponentType } from 'react'

export type Skill = 'math' | 'logic' | 'memory' | 'reaction' | 'vocab'

export interface GameResult {
  gameId: string
  skill: Skill
  score: number // 0–100
  difficultyReached: number
  accuracy: number // 0–1
  avgMs: number
}

export interface GameProps {
  /** Starting difficulty level for this run (1–10). */
  difficulty: number
  /** Called at most once per run, when the run ends. Games must guard against double-fire (doneRef pattern). */
  onFinish: (result: GameResult) => void
}

export interface GameDefinition {
  id: string
  name: string
  skill: Skill
  blurb: string
  Component: ComponentType<GameProps>
}
