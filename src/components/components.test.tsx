import { render, screen } from '@testing-library/react'
import { NeonButton } from './NeonButton'
import { ScoreDial } from './ScoreDial'
import { RadarChart } from './RadarChart'

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
