import { quickMathGame } from './quick-math'
import type { GameDefinition } from './types'

export const games: GameDefinition[] = [quickMathGame]

export function getGame(id: string): GameDefinition | undefined {
  return games.find(g => g.id === id)
}
