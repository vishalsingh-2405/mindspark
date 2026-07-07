import type { GameDefinition } from '../types'
import { QuickMath } from './Component'

export const quickMathGame: GameDefinition = {
  id: 'quick-math',
  name: 'Quick Math',
  skill: 'math',
  blurb: 'Solve fast, build combos, beat the clock.',
  Component: QuickMath,
}
