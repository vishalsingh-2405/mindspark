import type { GameDefinition } from '../types'
import { Echo } from './Component'

export const echoGame: GameDefinition = {
  id: 'echo',
  name: 'Echo',
  skill: 'memory',
  blurb: 'Watch the tiles sing. Echo them back.',
  Component: Echo,
}
