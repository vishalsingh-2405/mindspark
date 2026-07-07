import { quickMathGame } from './quick-math'
import { wordVaultGame } from './word-vault'
import type { GameDefinition } from './types'

export const games: GameDefinition[] = [quickMathGame, wordVaultGame]

export function getGame(id: string): GameDefinition | undefined {
  return games.find(g => g.id === id)
}
