import type { GameDefinition } from '../types'
import { OddOneOut } from './Component'

export const oddOneOutGame: GameDefinition = {
  id: 'odd-one-out',
  name: 'Odd One Out',
  skill: 'logic',
  blurb: 'One of these things is not like the others.',
  Component: OddOneOut,
}
