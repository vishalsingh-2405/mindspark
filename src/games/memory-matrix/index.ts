import type { GameDefinition } from '../types'
import { MemoryMatrix } from './Component'

export const memoryMatrixGame: GameDefinition = {
  id: 'memory-matrix',
  name: 'Memory Matrix',
  skill: 'memory',
  blurb: 'Watch the flash. Redraw it from memory.',
  Component: MemoryMatrix,
}
