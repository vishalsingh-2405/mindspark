import type { GameDefinition } from '../types'
import { PatternBreak } from './Component'

export const patternBreakGame: GameDefinition = {
  id: 'pattern-break',
  name: 'Pattern Break',
  skill: 'logic',
  blurb: 'Crack the rule, name what comes next.',
  Component: PatternBreak,
}
