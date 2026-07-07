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
