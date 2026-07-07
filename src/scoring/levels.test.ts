import { levelFor } from './levels'

it('maps scores to the five level bands', () => {
  expect(levelFor(0)).toBe('Novice')
  expect(levelFor(19)).toBe('Novice')
  expect(levelFor(20)).toBe('Sharp')
  expect(levelFor(39)).toBe('Sharp')
  expect(levelFor(40)).toBe('Quick')
  expect(levelFor(59)).toBe('Quick')
  expect(levelFor(60)).toBe('Elite')
  expect(levelFor(79)).toBe('Elite')
  expect(levelFor(80)).toBe('Prodigy')
  expect(levelFor(100)).toBe('Prodigy')
})
