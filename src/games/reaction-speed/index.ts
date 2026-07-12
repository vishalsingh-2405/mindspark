import type { GameDefinition } from '../types'
import { ReactionSpeed } from './Component'

export const reactionSpeedGame: GameDefinition = {
  id: 'reaction-speed',
  name: 'Reaction Speed',
  skill: 'reaction',
  blurb: 'Green means go. How fast are you?',
  Component: ReactionSpeed,
}
