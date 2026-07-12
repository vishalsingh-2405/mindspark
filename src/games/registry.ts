import { quickMathGame } from './quick-math'
import { equationSprintGame } from './equation-sprint'
import { patternBreakGame } from './pattern-break'
import { oddOneOutGame } from './odd-one-out'
import { memoryMatrixGame } from './memory-matrix'
import { digitSpanGame } from './digit-span'
import { echoGame } from './echo'
import { reactionSpeedGame } from './reaction-speed'
import { goNoGoGame } from './go-no-go'
import { wordVaultGame } from './word-vault'
import type { GameDefinition } from './types'

// Order = design-spec numbering; the Games screen and Home quick-launch render in this order.
export const games: GameDefinition[] = [
  quickMathGame,
  equationSprintGame,
  patternBreakGame,
  oddOneOutGame,
  memoryMatrixGame,
  digitSpanGame,
  echoGame,
  reactionSpeedGame,
  goNoGoGame,
  wordVaultGame,
]

export function getGame(id: string): GameDefinition | undefined {
  return games.find(g => g.id === id)
}
