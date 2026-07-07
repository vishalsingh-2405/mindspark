import { Navigate } from 'react-router-dom'
import type { GameDefinition } from '../types'

export const wordVaultGame: GameDefinition = {
  id: 'word-vault',
  name: 'Word Vault',
  skill: 'vocab',
  blurb: 'Daily flashcards with spaced repetition.',
  route: '/vocab',
  // Deep links to /play/word-vault land on the real experience:
  Component: () => <Navigate to="/vocab" replace />,
}
