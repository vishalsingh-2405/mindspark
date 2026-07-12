import type { GameDefinition } from '../types'
import { EquationSprint } from './Component'

export const equationSprintGame: GameDefinition = {
  id: 'equation-sprint',
  name: 'Equation Sprint',
  skill: 'math',
  blurb: 'True or false? Decide in a blink.',
  Component: EquationSprint,
}
