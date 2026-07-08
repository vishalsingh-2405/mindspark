import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { db } from '../storage/db'
import { DEFAULT_SETTINGS } from '../storage/repos'
import { useAppStore } from '../state/store'
import { SettingsSheet } from './SettingsSheet'

beforeEach(async () => {
  await db.delete()
  await db.open()
  useAppStore.setState({ profile: null, settings: structuredClone(DEFAULT_SETTINGS), storageOk: true })
})

it('toggles sound off through the store', async () => {
  render(<SettingsSheet open onClose={() => {}} />)
  await userEvent.click(screen.getByRole('checkbox', { name: /sound/i }))
  expect(useAppStore.getState().settings?.soundOn).toBe(false)
})

it('renders nothing when closed', () => {
  const { container } = render(<SettingsSheet open={false} onClose={() => {}} />)
  expect(container).toBeEmptyDOMElement()
})

it('reset requires a second confirming tap', async () => {
  render(<SettingsSheet open onClose={() => {}} />)
  await userEvent.click(screen.getByRole('button', { name: /reset all data/i }))
  // first tap arms — data still there, button now asks to confirm
  expect(screen.getByRole('button', { name: /tap again/i })).toBeInTheDocument()
})
