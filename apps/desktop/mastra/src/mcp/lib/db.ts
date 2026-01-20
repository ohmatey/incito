import Database from 'better-sqlite3'
import { homedir, platform } from 'os'
import { join } from 'path'
import { existsSync } from 'fs'

/**
 * Get the path to the Incito SQLite database based on OS
 * - macOS: ~/Library/Application Support/com.incito.app/incito.db
 * - Windows: %APPDATA%/com.incito.app/incito.db
 * - Linux: ~/.local/share/com.incito.app/incito.db
 */
export function getDatabasePath(): string {
  const home = homedir()
  const os = platform()

  switch (os) {
    case 'darwin':
      return join(home, 'Library', 'Application Support', 'com.incito.app', 'incito.db')
    case 'win32':
      return join(process.env.APPDATA || join(home, 'AppData', 'Roaming'), 'com.incito.app', 'incito.db')
    case 'linux':
      return join(home, '.local', 'share', 'com.incito.app', 'incito.db')
    default:
      throw new Error(`Unsupported platform: ${os}`)
  }
}

/**
 * Get the configured prompts folder path from the database
 */
export function getFolderPath(): string | null {
  const dbPath = getDatabasePath()

  if (!existsSync(dbPath)) {
    return null
  }

  try {
    const db = new Database(dbPath, { readonly: true })
    const stmt = db.prepare("SELECT value FROM settings WHERE key = 'folder_path'")
    const row = stmt.get() as { value: string } | undefined
    db.close()

    return row?.value || null
  } catch (error) {
    console.error('Error reading database:', error)
    return null
  }
}
