import { useAppStore } from '../state/store'
import { DEFAULT_SETTINGS } from '../storage/repos'
import { playBlip, playBuzz, playChime, _resetAudioForTests } from './sfx'

class FakeParam {
  setValueAtTime = vi.fn()
  exponentialRampToValueAtTime = vi.fn()
}
class FakeOsc {
  type = 'sine'
  frequency = { value: 0 }
  connect = vi.fn()
  start = vi.fn()
  stop = vi.fn()
}
let created: FakeOsc[] = []
class FakeCtx {
  state = 'running'
  currentTime = 0
  destination = {}
  resume = vi.fn()
  createOscillator() { const o = new FakeOsc(); created.push(o); return o }
  createGain() { return { gain: new FakeParam(), connect: vi.fn() } }
}

beforeEach(() => {
  created = []
  _resetAudioForTests()
  vi.stubGlobal('AudioContext', FakeCtx)
  useAppStore.setState({ settings: structuredClone(DEFAULT_SETTINGS) })
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

it('blip plays a triangle tone at 880Hz', () => {
  playBlip()
  expect(created).toHaveLength(1)
  expect(created[0].type).toBe('triangle')
  expect(created[0].frequency.value).toBe(880)
  expect(created[0].start).toHaveBeenCalled()
})

it('buzz plays a low sawtooth', () => {
  playBuzz()
  expect(created[0].type).toBe('sawtooth')
  expect(created[0].frequency.value).toBe(140)
})

it('is silent when soundOn is false', () => {
  useAppStore.setState({ settings: { ...structuredClone(DEFAULT_SETTINGS), soundOn: false } })
  playBlip(); playBuzz(); playChime()
  expect(created).toHaveLength(0)
})

it('chime plays a rising two-note sequence', () => {
  vi.useFakeTimers()
  playChime()
  expect(created).toHaveLength(1)
  vi.advanceTimersByTime(150)
  expect(created).toHaveLength(2)
  expect(created[1].frequency.value).toBeGreaterThan(created[0].frequency.value)
})

it('does not throw when AudioContext is missing', () => {
  vi.unstubAllGlobals()
  vi.stubGlobal('AudioContext', undefined)
  _resetAudioForTests()
  expect(() => playBlip()).not.toThrow()
})
