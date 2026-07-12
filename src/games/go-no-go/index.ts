import type { GameDefinition } from '../types'
import { GoNoGo } from './Component'

export const goNoGoGame: GameDefinition = {
  id: 'go-no-go',
  name: 'Go / No-Go',
  skill: 'reaction',
  blurb: 'Green: tap. Red: hold everything.',
  Component: GoNoGo,
}
