import { act, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { useAppStore } from '../state/store'
import { NeonButton } from './NeonButton'
import { ScoreDial } from './ScoreDial'
import { RadarChart } from './RadarChart'
import { ResultsCard } from './ResultsCard'
import { LineChart } from './LineChart'

vi.mock('../audio/sfx', () => ({ playComplete: vi.fn(), playTap: vi.fn() }))
import { playComplete } from '../audio/sfx'

beforeEach(() => vi.clearAllMocks())
afterEach(() => vi.useRealTimers())

function renderResults(props: Partial<Parameters<typeof ResultsCard>[0]> = {}) {
  return render(
    <MemoryRouter>
      <ResultsCard score={50} delta={null} onReplay={() => {}} {...props} />
    </MemoryRouter>,
  )
}

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
  renderResults()
  expect(screen.getByText(/storage off/i)).toBeInTheDocument()
  expect(screen.queryByText(/first run/i)).not.toBeInTheDocument()
  useAppStore.setState({ storageOk: true })
})

it('ResultsCard counts the score up to its final value and sweeps the ring', () => {
  vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'performance'] })
  const { container } = renderResults({ score: 80 })
  expect(screen.getByText('0')).toBeInTheDocument()
  act(() => { vi.advanceTimersByTime(1000) })
  expect(screen.getByText('80')).toBeInTheDocument()
  const ring = container.querySelector('.results__ring')!
  const C = 2 * Math.PI * 56
  expect(Number(ring.getAttribute('stroke-dashoffset'))).toBeCloseTo(C * 0.2, 5)
})

it('ResultsCard shows the NEW BEST ribbon and plays the newBest motif exactly once', () => {
  renderResults({ score: 90, delta: 12, newBest: true })
  expect(screen.getByText('NEW BEST')).toBeInTheDocument()
  expect(playComplete).toHaveBeenCalledTimes(1)
  expect(playComplete).toHaveBeenCalledWith(true)
})

it('ResultsCard hides the ribbon on an ordinary run and still plays the motif once', () => {
  renderResults({ score: 40, delta: -3 })
  expect(screen.queryByText('NEW BEST')).not.toBeInTheDocument()
  expect(playComplete).toHaveBeenCalledTimes(1)
  expect(playComplete).toHaveBeenCalledWith(undefined)
})

it('LineChart renders a path through the points and a dot on the last one', () => {
  const { container } = render(<LineChart points={[0, 50, 100]} />)
  expect(container.querySelector('path')).toBeInTheDocument()
  expect(container.querySelector('circle')).toBeInTheDocument()
})

it('LineChart renders nothing for fewer than 2 points', () => {
  const { container } = render(<LineChart points={[42]} />)
  expect(container).toBeEmptyDOMElement()
})
