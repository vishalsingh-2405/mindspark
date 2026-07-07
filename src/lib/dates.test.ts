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

it('adds negative days across month and leap boundaries', () => {
  expect(addDays('2028-03-01', -1)).toBe('2028-02-29')
  expect(addDays('2027-01-01', -1)).toBe('2026-12-31')
})

it('daysBetween is exact across DST transitions', () => {
  // 2026 US spring-forward (Mar 8) and fall-back (Nov 1)
  expect(daysBetween('2026-03-07', '2026-03-09')).toBe(2)
  expect(daysBetween('2026-10-31', '2026-11-02')).toBe(2)
})
