import { advanceStreak, type StreakState } from './streak'

const base: StreakState = {
  streak: 0,
  bestStreak: 0,
  lastPlayedDate: null,
  freezesAvailable: 0,
  lastFreezeMilestone: 0,
  frozenDates: [],
}

it('first ever play starts the streak at 1', () => {
  const s = advanceStreak(base, '2026-07-07')
  expect(s.streak).toBe(1)
  expect(s.bestStreak).toBe(1)
  expect(s.lastPlayedDate).toBe('2026-07-07')
})

it('same-day repeat plays do not change anything', () => {
  const s1 = advanceStreak(base, '2026-07-07')
  const s2 = advanceStreak(s1, '2026-07-07')
  expect(s2).toEqual(s1)
})

it('consecutive days increment', () => {
  let s = advanceStreak(base, '2026-07-07')
  s = advanceStreak(s, '2026-07-08')
  expect(s.streak).toBe(2)
})

it('a missed day with a freeze available consumes it and survives', () => {
  let s: StreakState = { ...base, streak: 10, lastPlayedDate: '2026-07-07', freezesAvailable: 1 }
  s = advanceStreak(s, '2026-07-09') // missed the 8th
  expect(s.streak).toBe(11)
  expect(s.freezesAvailable).toBe(0)
  expect(s.frozenDates).toEqual(['2026-07-08'])
})

it('a missed day with no freeze resets to 1', () => {
  let s: StreakState = { ...base, streak: 10, bestStreak: 10, lastPlayedDate: '2026-07-07' }
  s = advanceStreak(s, '2026-07-09')
  expect(s.streak).toBe(1)
  expect(s.bestStreak).toBe(10)
  expect(s.lastFreezeMilestone).toBe(0)
})

it('two missed days need two freezes; one is not enough', () => {
  let s: StreakState = { ...base, streak: 60, lastPlayedDate: '2026-07-07', freezesAvailable: 1, lastFreezeMilestone: 50 }
  s = advanceStreak(s, '2026-07-10') // missed 8th and 9th
  expect(s.streak).toBe(1)
})

it('two missed days covered when two freezes are banked', () => {
  let s: StreakState = { ...base, streak: 100, lastPlayedDate: '2026-07-07', freezesAvailable: 2, lastFreezeMilestone: 100 }
  s = advanceStreak(s, '2026-07-10')
  expect(s.streak).toBe(101)
  expect(s.freezesAvailable).toBe(0)
  expect(s.frozenDates).toEqual(['2026-07-08', '2026-07-09'])
})

it('day 50 earns a freeze, capped at 2', () => {
  let s: StreakState = { ...base, streak: 49, lastPlayedDate: '2026-07-07', freezesAvailable: 0 }
  s = advanceStreak(s, '2026-07-08') // day 50
  expect(s.streak).toBe(50)
  expect(s.freezesAvailable).toBe(1)
  expect(s.lastFreezeMilestone).toBe(50)

  let capped: StreakState = { ...base, streak: 99, lastPlayedDate: '2026-07-07', freezesAvailable: 2, lastFreezeMilestone: 50 }
  capped = advanceStreak(capped, '2026-07-08') // day 100
  expect(capped.freezesAvailable).toBe(2) // cap holds
  expect(capped.lastFreezeMilestone).toBe(100)
})

it('milestone is not re-awarded for the same threshold', () => {
  let s: StreakState = { ...base, streak: 50, lastPlayedDate: '2026-07-07', freezesAvailable: 1, lastFreezeMilestone: 50 }
  s = advanceStreak(s, '2026-07-08') // day 51
  expect(s.freezesAvailable).toBe(1)
})
