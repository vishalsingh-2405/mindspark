import { hapticTap, hapticMiss, hapticLevelUp, hapticComplete } from './haptics'
import { useAppStore } from '../state/store'

function setHaptics(on: boolean | undefined) {
  useAppStore.setState({ settings: { ...(useAppStore.getState().settings ?? {}), hapticsOn: on } as never })
}

describe('haptics', () => {
  let vibrate: ReturnType<typeof vi.fn>
  beforeEach(() => {
    vibrate = vi.fn()
    Object.defineProperty(navigator, 'vibrate', { value: vibrate, configurable: true })
  })

  it('fires patterns when enabled', () => {
    setHaptics(true)
    hapticTap(); expect(vibrate).toHaveBeenLastCalledWith(8)
    hapticMiss(); expect(vibrate).toHaveBeenLastCalledWith(25)
    hapticLevelUp(); expect(vibrate).toHaveBeenLastCalledWith([10, 40, 10])
    hapticComplete(); expect(vibrate).toHaveBeenLastCalledWith([12, 30, 12, 30, 24])
  })
  it('defaults ON for legacy settings rows missing the field', () => {
    setHaptics(undefined)
    hapticTap(); expect(vibrate).toHaveBeenCalled()
  })
  it('silent when setting off', () => {
    setHaptics(false)
    hapticTap(); expect(vibrate).not.toHaveBeenCalled()
  })
  it('no-ops without the API', () => {
    setHaptics(true)
    Object.defineProperty(navigator, 'vibrate', { value: undefined, configurable: true })
    expect(() => hapticTap()).not.toThrow()
  })
})
