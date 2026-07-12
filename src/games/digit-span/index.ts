import type { GameDefinition } from '../types'
import { DigitSpan } from './Component'

export const digitSpanGame: GameDefinition = {
  id: 'digit-span',
  name: 'Digit Span',
  skill: 'memory',
  blurb: 'Hold the digits. Type them back.',
  Component: DigitSpan,
}
