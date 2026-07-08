import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { useAppStore } from '../state/store'
import { NeonButton } from './NeonButton'
import { ScoreDial } from './ScoreDial'
import { RadarChart } from './RadarChart'
import { ResultsCard } from './ResultsCard'

it('NeonButton renders children and variant class', () => {
  render(<NeonButton variant="lime">Play</NeonButton>)
  const btn = screen.getByRole('button', { name: 'Play' })
  expect(btn.className).toContain('neon-btn--lime')
})

it('ScoreDial shows the score and its level', () => {
  render(<ScoreDial score={68} />)
  expect(screen.getByText('68')).toBeInTheDocument()
  expect(screen.getByText('Elite')).toBeInTheDocument()
})

it('ScoreDial shows a placeholder before any play', () => {
  render(<ScoreDial score={null} />)
  expect(screen.getByText('—')).toBeInTheDocument()
  expect(screen.getByText('Play to rate')).toBeInTheDocument()
})

it('RadarChart renders all five skill axes', () => {
  render(<RadarChart skills={{ math: 50 }} />)
  for (const label of ['Math', 'Logic', 'Memory', 'Reaction', 'Vocab']) {
    expect(screen.getByText(label)).toBeInTheDocument()
  }
})

it('NeonButton merges className and fires onClick', async () => {
  const onClick = vi.fn()
  render(<NeonButton className="extra" onClick={onClick}>Go</NeonButton>)
  const btn = screen.getByRole('button', { name: 'Go' })
  expect(btn.className).toContain('extra')
  btn.click()
  expect(onClick).toHaveBeenCalledOnce()
})

it('ScoreDial at zero renders no progress stroke (no glow dot)', () => {
  const { container } = render(<ScoreDial score={0} />)
  expect(container.querySelectorAll('circle')).toHaveLength(1) // background only
})

it('ResultsCard shows a storage warning instead of a bogus baseline when storage is down', () => {
  useAppStore.setState({ storageOk: false })
  render(<MemoryRouter><ResultsCard score={50} delta={null} onReplay={() => {}} /></MemoryRouter>)
  expect(screen.getByText(/storage off/i)).toBeInTheDocument()
  expect(screen.queryByText(/first run/i)).not.toBeInTheDocument()
  useAppStore.setState({ storageOk: true })
})
