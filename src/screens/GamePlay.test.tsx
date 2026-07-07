import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { GamePlay } from './GamePlay'

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/play/:gameId" element={<GamePlay />} />
        <Route path="/games" element={<div>GAMES SCREEN</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

it('redirects to /games for an unknown game id', () => {
  renderAt('/play/not-a-game')
  expect(screen.getByText('GAMES SCREEN')).toBeInTheDocument()
})

it('loads the game component for a valid id', async () => {
  renderAt('/play/quick-math')
  expect(await screen.findByText(/Lv \d/)).toBeInTheDocument()
})
