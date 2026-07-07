import type { GameDefinition } from './types'

export const games: GameDefinition[] = []

export function getGame(id: string): GameDefinition | undefined {
  return games.find(g => g.id === id)
}
