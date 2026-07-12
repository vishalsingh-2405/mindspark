import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FlipCard } from './FlipCard'

vi.mock('../audio/sfx', () => ({ playTap: vi.fn() }))
import { playTap } from '../audio/sfx'

const ENTRY = { id: 'ephemeral', word: 'ephemeral', pos: 'adjective', meaning: 'lasting a very short time', example: 'the ephemeral joys of childhood' }

it('word→meaning: shows the word up front, meaning after flip', async () => {
  const onFlip = vi.fn()
  const { rerender } = render(<FlipCard entry={ENTRY} mode="word-to-meaning" flipped={false} onFlip={onFlip} />)
  expect(screen.getByText('ephemeral')).toBeInTheDocument()
  expect(screen.getByText(/tap to reveal/i)).toBeInTheDocument()
  await userEvent.click(screen.getByRole('button', { name: /reveal/i }))
  expect(onFlip).toHaveBeenCalledOnce()
  expect(playTap).toHaveBeenCalledOnce()
  rerender(<FlipCard entry={ENTRY} mode="word-to-meaning" flipped={true} onFlip={onFlip} />)
  expect(screen.getByText('lasting a very short time')).toBeInTheDocument()
  expect(screen.getByText(/ephemeral joys/)).toBeInTheDocument()
})

it('meaning→word: shows the meaning + first-letter hint up front, word after flip', () => {
  const { rerender } = render(<FlipCard entry={ENTRY} mode="meaning-to-word" flipped={false} onFlip={() => {}} />)
  expect(screen.getByText('lasting a very short time')).toBeInTheDocument()
  expect(screen.getByText(/starts with "e"/i)).toBeInTheDocument()
  expect(screen.queryByText('ephemeral')).not.toBeInTheDocument()
  rerender(<FlipCard entry={ENTRY} mode="meaning-to-word" flipped={true} onFlip={() => {}} />)
  expect(screen.getByText('ephemeral')).toBeInTheDocument()
})
