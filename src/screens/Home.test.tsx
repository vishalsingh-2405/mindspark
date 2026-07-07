import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { useAppStore } from '../state/store'
import { DEFAULT_PROFILE } from '../storage/repos'
import { Home } from './Home'

it('shows streak, freezes, and the score dial', () => {
  useAppStore.setState({
    profile: {
      ...structuredClone(DEFAULT_PROFILE),
      brainScore: 68,
      skillScores: { math: 68 },
      streak: 12,
      freezesAvailable: 1,
    },
  })
  render(<MemoryRouter><Home /></MemoryRouter>)
  expect(screen.getByText('68')).toBeInTheDocument()
  expect(screen.getByText('Elite')).toBeInTheDocument()
  expect(screen.getByText(/12-day streak/)).toBeInTheDocument()
  expect(screen.getByText(/×1/)).toBeInTheDocument()
  expect(screen.getByText('Quick Math')).toBeInTheDocument()
})

it('renders sanely with no profile yet', () => {
  useAppStore.setState({ profile: null })
  render(<MemoryRouter><Home /></MemoryRouter>)
  expect(screen.getByText('—')).toBeInTheDocument()
  expect(screen.getByText(/0-day streak/)).toBeInTheDocument()
})

it('hides the freeze badge when no freezes are banked', () => {
  useAppStore.setState({ profile: structuredClone(DEFAULT_PROFILE) })
  render(<MemoryRouter><Home /></MemoryRouter>)
  expect(screen.queryByText(/×/)).not.toBeInTheDocument()
})

it('shows the Today\'s Words card linking to /vocab', () => {
  useAppStore.setState({ profile: structuredClone(DEFAULT_PROFILE) })
  render(<MemoryRouter><Home /></MemoryRouter>)
  const card = screen.getByRole('link', { name: /today's words/i })
  expect(card).toHaveAttribute('href', '/vocab')
})
