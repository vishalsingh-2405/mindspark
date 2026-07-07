import {
  db, DEFAULT_PROFILE, DEFAULT_SETTINGS,
  type ProfileRow, type SessionRow, type SettingsRow,
} from './db'

export { DEFAULT_PROFILE, DEFAULT_SETTINGS }

export async function loadProfile(): Promise<ProfileRow> {
  const row = await db.profile.get('profile')
  if (row) return row
  await db.profile.put(DEFAULT_PROFILE)
  return structuredClone(DEFAULT_PROFILE)
}

export async function saveProfile(p: ProfileRow): Promise<void> {
  await db.profile.put(p)
}

export async function loadSettings(): Promise<SettingsRow> {
  const row = await db.settings.get('settings')
  if (row) return row
  await db.settings.put(DEFAULT_SETTINGS)
  return structuredClone(DEFAULT_SETTINGS)
}

export async function saveSettings(s: SettingsRow): Promise<void> {
  await db.settings.put(s)
}

export async function addSession(row: Omit<SessionRow, 'id'>): Promise<void> {
  await db.sessions.add(row)
}

export async function lastSessionFor(gameId: string): Promise<SessionRow | undefined> {
  return db.sessions.where('gameId').equals(gameId).last()
}

export async function bestScoreFor(gameId: string): Promise<number | undefined> {
  const rows = await db.sessions.where('gameId').equals(gameId).toArray()
  return rows.length ? Math.max(...rows.map(r => r.score)) : undefined
}

export async function getGameLevel(gameId: string): Promise<number> {
  return (await db.gameLevels.get(gameId))?.lastPeak ?? 1
}

export async function setGameLevel(gameId: string, lastPeak: number): Promise<void> {
  await db.gameLevels.put({ gameId, lastPeak })
}
