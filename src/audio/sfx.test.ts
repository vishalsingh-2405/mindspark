import { useAppStore } from '../state/store'
import { DEFAULT_SETTINGS } from '../storage/repos'
import { playBlip, playBuzz, playChime, playCombo, playComplete, playTap, playTick, _resetAudioForTests } from './sfx'

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
  createDynamicsCompressor() { return { connect: vi.fn() } }
}

let vibrate: ReturnType<typeof vi.fn>

beforeEach(() => {
  created = []
  _resetAudioForTests()
  vi.stubGlobal('AudioContext', FakeCtx)
  vibrate = vi.fn()
  Object.defineProperty(navigator, 'vibrate', { value: vibrate, configurable: true })
  useAppStore.setState({ settings: structuredClone(DEFAULT_SETTINGS) })
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

it('blip plays a two-note triangle micro-arpeggio', () => {
  playBlip()
  expect(created).toHaveLength(2)
  expect(created[0].type).toBe('triangle')
  expect(created[0].frequency.value).toBe(1318.5)
  expect(created[1].frequency.value).toBe(1975.5)
  expect(created[0].start).toHaveBeenCalled()
})

it('buzz plays a soft low sine dyad', () => {
  playBuzz()
  expect(created).toHaveLength(2)
  expect(created[0].type).toBe('sine')
  expect(created[0].frequency.value).toBe(110)
  expect(created[1].frequency.value).toBe(82.5)
})

it('is silent when soundOn is false', () => {
  useAppStore.setState({ settings: { ...structuredClone(DEFAULT_SETTINGS), soundOn: false } })
  playBlip(); playBuzz(); playChime()
  expect(created).toHaveLength(0)
})

it('haptics still fire when sound is off', () => {
  useAppStore.setState({ settings: { ...structuredClone(DEFAULT_SETTINGS), soundOn: false } })
  playBlip()
  expect(created).toHaveLength(0)
  expect(vibrate).toHaveBeenCalledWith(8)
})

it('sound still plays when haptics are off', () => {
  useAppStore.setState({ settings: { ...structuredClone(DEFAULT_SETTINGS), hapticsOn: false } })
  playBlip()
  expect(created).toHaveLength(2)
  expect(vibrate).not.toHaveBeenCalled()
})

it('chime plays a rising three-note arpeggio', () => {
  playChime()
  expect(created).toHaveLength(3)
  expect(created[1].frequency.value).toBeGreaterThan(created[0].frequency.value)
  expect(created[2].frequency.value).toBeGreaterThan(created[1].frequency.value)
})

it('combo rises a semitone per step and caps at +12', () => {
  playCombo(1)
  expect(created[0].frequency.value).toBeCloseTo(880 * 2 ** (1 / 12))
  expect(() => playCombo(99)).not.toThrow()
  expect(created[1].frequency.value).toBe(1760) // capped at +12 semitones
})

it('complete plays a four-note motif, five with newBest', () => {
  playComplete()
  expect(created).toHaveLength(4)
  created = []
  playComplete(true)
  expect(created).toHaveLength(5)
  expect(created[4].frequency.value).toBe(1568)
  expect(vibrate).toHaveBeenLastCalledWith([12, 30, 12, 30, 24])
})

it('new functions do not throw with sound off', () => {
  useAppStore.setState({ settings: { ...structuredClone(DEFAULT_SETTINGS), soundOn: false } })
  expect(() => { playCombo(3); playComplete(true); playTap(); playTick() }).not.toThrow()
  expect(created).toHaveLength(0)
})

it('tick, tap and combo have no haptic', () => {
  playTick(); playTap(); playCombo(1)
  expect(vibrate).not.toHaveBeenCalled()
})

it('does not throw when AudioContext is missing', () => {
  vi.unstubAllGlobals()
  vi.stubGlobal('AudioContext', undefined)
  _resetAudioForTests()
  expect(() => playBlip()).not.toThrow()
})
