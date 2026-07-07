import { computeBrainScore } from './brainScore'

it('is null until any skill has been played', () => {
  expect(computeBrainScore({})).toBeNull()
})

it('averages only the played skills', () => {
  expect(computeBrainScore({ math: 80 })).toBe(80)
  expect(computeBrainScore({ math: 80, memory: 60 })).toBe(70)
  expect(computeBrainScore({ math: 80, memory: 60, vocab: 10 })).toBe(50)
})
