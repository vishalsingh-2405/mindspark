import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Link, MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { AppShell } from './AppShell'
import { ErrorBoundary } from './components/ErrorBoundary'

it('renders Home with the app title and bottom nav', async () => {
  render(<MemoryRouter><AppShell /></MemoryRouter>)
  expect(await screen.findByText('MINDSPARK')).toBeInTheDocument()
  for (const tab of ['Home', 'Games', 'Vocab', 'Stats']) {
    expect(screen.getByRole('link', { name: tab })).toBeInTheDocument()
  }
})

it('renders the Stats screen', async () => {
  render(<MemoryRouter initialEntries={['/stats']}><AppShell /></MemoryRouter>)
  expect(await screen.findByText('STATS')).toBeInTheDocument()
  expect(await screen.findByText(/words learned/i)).toBeInTheDocument()
})

it('error fallback clears when the route changes (remount via key)', async () => {
  const Boom = () => { throw new Error('kaboom') }
  // Mirrors AppShell's structure: ErrorBoundary keyed by pathname wraps the
  // Routes, while the nav link lives OUTSIDE the boundary (like BottomNav)
  // so it stays clickable when a screen crashes.
  function Harness() {
    const { pathname } = useLocation()
    return (
      <>
        <ErrorBoundary key={pathname}>
          <Routes>
            <Route path="/boom" element={<Boom />} />
            <Route path="/safe" element={<div>SAFE SCREEN</div>} />
          </Routes>
        </ErrorBoundary>
        <Link to="/safe">go safe</Link>
      </>
    )
  }
  // silence expected noise from the thrown error: React logs via console.error,
  // and jsdom reports the dev-mode rethrow through the window 'error' event
  const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
  const onWindowError = (e: ErrorEvent) => e.preventDefault()
  window.addEventListener('error', onWindowError)
  try {
    render(<MemoryRouter initialEntries={['/boom']}><Harness /></MemoryRouter>)
    expect(screen.getByText(/something glitched/i)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('link', { name: 'go safe' }))
    expect(screen.getByText('SAFE SCREEN')).toBeInTheDocument()
    expect(screen.queryByText(/something glitched/i)).not.toBeInTheDocument()
  } finally {
    window.removeEventListener('error', onWindowError)
    spy.mockRestore()
  }
})
