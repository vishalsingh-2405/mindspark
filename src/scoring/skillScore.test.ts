import { updateSkillScore } from './skillScore'

it('first session becomes the skill score', () => {
  expect(updateSkillScore(null, 72)).toBe(72)
})

it('EWMA weights the new session at 25%', () => {
  expect(updateSkillScore(60, 100)).toBe(70) // 0.25*100 + 0.75*60
  expect(updateSkillScore(80, 40)).toBe(70)
})

it('rounds to one decimal', () => {
  expect(updateSkillScore(70, 71)).toBe(70.3) // 70.25 → 70.3
})

it('clamps the session input to 0-100', () => {
  expect(updateSkillScore(null, 250)).toBe(100)
  expect(updateSkillScore(80, -50)).toBe(60) // 0.25*0 + 0.75*80
})

it('one bad run cannot tank an established score, and it recovers', () => {
  let score: number = 80
  score = updateSkillScore(score, 15) // disaster run
  expect(score).toBeGreaterThan(60)   // bounded fall
  for (let i = 0; i < 6; i++) score = updateSkillScore(score, 80)
  expect(score).toBeGreaterThan(75)   // recovered
})
