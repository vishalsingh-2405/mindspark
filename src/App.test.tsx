import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AppShell } from './AppShell'

it('renders Home with the app title and bottom nav', async () => {
  render(<MemoryRouter><AppShell /></MemoryRouter>)
  expect(await screen.findByText('MINDSPARK')).toBeInTheDocument()
  for (const tab of ['Home', 'Games', 'Vocab', 'Stats']) {
    expect(screen.getByRole('link', { name: tab })).toBeInTheDocument()
  }
})

it('shows placeholder screens for Vocab and Stats', async () => {
  render(<MemoryRouter initialEntries={['/vocab']}><AppShell /></MemoryRouter>)
  expect(await screen.findByText(/coming soon/i)).toBeInTheDocument()
})
