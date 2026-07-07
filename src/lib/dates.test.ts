import { toDayString, daysBetween, addDays } from './dates'

it('formats a local date as YYYY-MM-DD', () => {
  expect(toDayString(new Date(2026, 6, 7))).toBe('2026-07-07')
})

it('computes day gaps', () => {
  expect(daysBetween('2026-07-01', '2026-07-07')).toBe(6)
  expect(daysBetween('2026-07-07', '2026-07-07')).toBe(0)
})

it('adds days across month boundaries', () => {
  expect(addDays('2026-07-30', 3)).toBe('2026-08-02')
})
