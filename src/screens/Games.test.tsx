import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { Games } from './Games'

it('renders the games heading and grid container', () => {
  render(<MemoryRouter><Games /></MemoryRouter>)
  expect(screen.getByText('GAMES')).toBeInTheDocument()
  expect(screen.getByTestId('games-grid')).toBeInTheDocument()
})

it('Word Vault tile links to /vocab, not /play', () => {
  render(<MemoryRouter><Games /></MemoryRouter>)
  const tile = screen.getByRole('link', { name: /word vault/i })
  expect(tile).toHaveAttribute('href', '/vocab')
})
