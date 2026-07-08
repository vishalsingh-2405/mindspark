import { useState } from 'react'
import { resetAllData } from '../state/reset'
import { useAppStore } from '../state/store'
import { NeonButton } from './NeonButton'

interface Props {
  open: boolean
  onClose: () => void
}

export function SettingsSheet({ open, onClose }: Props) {
  const settings = useAppStore(s => s.settings)
  const updateSettings = useAppStore(s => s.updateSettings)
  const [armReset, setArmReset] = useState(false)
  if (!open || !settings) return null

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" role="dialog" aria-label="Settings" onClick={e => e.stopPropagation()}>
        <h2 className="sheet__title">SETTINGS</h2>

        <label className="sheet__row">
          <span>Sound</span>
          <input type="checkbox" checked={settings.soundOn}
            onChange={e => void updateSettings({ soundOn: e.target.checked })} />
        </label>

        <label className="sheet__row sheet__row--stack">
          <span>Words per day: {settings.wordsPerDay}</span>
          <input type="range" min={5} max={25} value={settings.wordsPerDay}
            onChange={e => void updateSettings({ wordsPerDay: Number(e.target.value) })} />
        </label>

        <div className="sheet__row sheet__row--stack">
          <span>Vocab mode</span>
          <div className="vocab__mode">
            <button type="button" className={settings.vocabMode === 'word-to-meaning' ? 'is-on' : ''}
              onClick={() => void updateSettings({ vocabMode: 'word-to-meaning' })}>Word → Meaning</button>
            <button type="button" className={settings.vocabMode === 'meaning-to-word' ? 'is-on' : ''}
              onClick={() => void updateSettings({ vocabMode: 'meaning-to-word' })}>Meaning → Word</button>
          </div>
        </div>

        <label className="sheet__row">
          <span>Reduced motion</span>
          <input type="checkbox" checked={settings.reducedMotion}
            onChange={e => void updateSettings({ reducedMotion: e.target.checked })} />
        </label>

        {armReset ? (
          <NeonButton variant="magenta" onClick={() => { void resetAllData(); setArmReset(false); onClose() }}>
            ⚠ Tap again to erase everything
          </NeonButton>
        ) : (
          <NeonButton variant="magenta" onClick={() => setArmReset(true)}>Reset all data</NeonButton>
        )}

        <NeonButton onClick={onClose}>Done</NeonButton>
      </div>
    </div>
  )
}
