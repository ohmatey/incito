import Database from '@tauri-apps/plugin-sql'
import type { Tag } from '../types/prompt'
import { isValidTagName } from './constants'

// Result type for operations that can fail
export type Result<T> = { ok: true; data: T } | { ok: false; error: string }

// AI Provider types
export type AIProvider = 'openai' | 'anthropic' | 'google'

export interface AISettings {
  provider: AIProvider | null
  apiKey: string | null
  model: string | null
}

// Available models per provider
export const AI_MODELS: Record<AIProvider, { id: string; name: string }[]> = {
  openai: [
    { id: 'gpt-4o', name: 'GPT-4o' },
    { id: 'gpt-4o-mini', name: 'GPT-4o Mini' },
    { id: 'gpt-4-turbo', name: 'GPT-4 Turbo' },
  ],
  anthropic: [
    { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4' },
    { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku' },
  ],
  google: [
    { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash' },
    { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro' },
  ],
}

let db: Database | null = null

async function getDb(): Promise<Database> {
  if (!db) {
    db = await Database.load('sqlite:incito.db')
    await db.execute(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT
      )
    `)
    await db.execute(`
      CREATE TABLE IF NOT EXISTS tags (
        id TEXT PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        color TEXT DEFAULT '#6b7280'
      )
    `)
    await db.execute(`
      CREATE TABLE IF NOT EXISTS prompt_tags (
        prompt_path TEXT NOT NULL,
        tag_id TEXT NOT NULL,
        PRIMARY KEY (prompt_path, tag_id),
        FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
      )
    `)
  }
  return db
}

export async function getSavedFolderPath(): Promise<Result<string | null>> {
  try {
    const database = await getDb()
    const result = await database.select<{ value: string }[]>(
      'SELECT value FROM settings WHERE key = ?',
      ['folder_path']
    )
    return { ok: true, data: result.length > 0 ? result[0].value : null }
  } catch (err) {
    return { ok: false, error: `Failed to get folder path: ${err instanceof Error ? err.message : String(err)}` }
  }
}

export async function saveFolderPath(path: string): Promise<Result<void>> {
  try {
    const database = await getDb()
    await database.execute(
      'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
      ['folder_path', path]
    )
    return { ok: true, data: undefined }
  } catch (err) {
    return { ok: false, error: `Failed to save folder path: ${err instanceof Error ? err.message : String(err)}` }
  }
}

export async function clearFolderPath(): Promise<Result<void>> {
  try {
    const database = await getDb()
    await database.execute('DELETE FROM settings WHERE key = ?', ['folder_path'])
    return { ok: true, data: undefined }
  } catch (err) {
    return { ok: false, error: `Failed to clear folder path: ${err instanceof Error ? err.message : String(err)}` }
  }
}

// Tag operations

export async function getAllTags(): Promise<Result<Tag[]>> {
  try {
    const database = await getDb()
    const result = await database.select<Tag[]>('SELECT id, name, color FROM tags ORDER BY name')
    return { ok: true, data: result }
  } catch (err) {
    return { ok: false, error: `Failed to get tags: ${err instanceof Error ? err.message : String(err)}` }
  }
}

export async function createTag(name: string, color: string = '#6b7280'): Promise<Result<Tag>> {
  // Validate tag name
  const trimmedName = name.trim()
  if (!isValidTagName(trimmedName)) {
    return { ok: false, error: 'Tag name must be 1-30 characters' }
  }

  try {
    const database = await getDb()
    const id = crypto.randomUUID()
    await database.execute(
      'INSERT INTO tags (id, name, color) VALUES (?, ?, ?)',
      [id, trimmedName, color]
    )
    return { ok: true, data: { id, name: trimmedName, color } }
  } catch (err) {
    return { ok: false, error: `Failed to create tag: ${err instanceof Error ? err.message : String(err)}` }
  }
}

export async function updateTag(id: string, name: string, color: string): Promise<Result<void>> {
  // Validate tag name
  const trimmedName = name.trim()
  if (!isValidTagName(trimmedName)) {
    return { ok: false, error: 'Tag name must be 1-30 characters' }
  }

  try {
    const database = await getDb()
    await database.execute(
      'UPDATE tags SET name = ?, color = ? WHERE id = ?',
      [trimmedName, color, id]
    )
    return { ok: true, data: undefined }
  } catch (err) {
    return { ok: false, error: `Failed to update tag: ${err instanceof Error ? err.message : String(err)}` }
  }
}

export async function deleteTag(id: string): Promise<Result<void>> {
  try {
    const database = await getDb()
    await database.execute('DELETE FROM prompt_tags WHERE tag_id = ?', [id])
    await database.execute('DELETE FROM tags WHERE id = ?', [id])
    return { ok: true, data: undefined }
  } catch (err) {
    return { ok: false, error: `Failed to delete tag: ${err instanceof Error ? err.message : String(err)}` }
  }
}

export async function getTagByName(name: string): Promise<Result<Tag | null>> {
  try {
    const database = await getDb()
    const result = await database.select<Tag[]>(
      'SELECT id, name, color FROM tags WHERE name = ?',
      [name]
    )
    return { ok: true, data: result.length > 0 ? result[0] : null }
  } catch (err) {
    return { ok: false, error: `Failed to get tag: ${err instanceof Error ? err.message : String(err)}` }
  }
}

export async function getOrCreateTag(name: string): Promise<Result<Tag>> {
  const existingResult = await getTagByName(name)
  if (!existingResult.ok) return existingResult
  if (existingResult.data) return { ok: true, data: existingResult.data }
  return createTag(name)
}

export async function syncPromptTags(promptPath: string, tagNames: string[]): Promise<Result<void>> {
  try {
    const database = await getDb()
    // Clear existing prompt_tags for this prompt
    await database.execute('DELETE FROM prompt_tags WHERE prompt_path = ?', [promptPath])

    // Get or create each tag and link it
    for (const tagName of tagNames) {
      const tagResult = await getOrCreateTag(tagName)
      if (tagResult.ok) {
        await database.execute(
          'INSERT OR IGNORE INTO prompt_tags (prompt_path, tag_id) VALUES (?, ?)',
          [promptPath, tagResult.data.id]
        )
      }
    }
    return { ok: true, data: undefined }
  } catch (err) {
    return { ok: false, error: `Failed to sync tags: ${err instanceof Error ? err.message : String(err)}` }
  }
}

export async function getTagsForPrompt(promptPath: string): Promise<Result<Tag[]>> {
  try {
    const database = await getDb()
    const result = await database.select<Tag[]>(
      `SELECT t.id, t.name, t.color
       FROM tags t
       JOIN prompt_tags pt ON t.id = pt.tag_id
       WHERE pt.prompt_path = ?
       ORDER BY t.name`,
      [promptPath]
    )
    return { ok: true, data: result }
  } catch (err) {
    return { ok: false, error: `Failed to get tags for prompt: ${err instanceof Error ? err.message : String(err)}` }
  }
}

export async function getPromptsWithTag(tagId: string): Promise<Result<string[]>> {
  try {
    const database = await getDb()
    const result = await database.select<{ prompt_path: string }[]>(
      'SELECT prompt_path FROM prompt_tags WHERE tag_id = ?',
      [tagId]
    )
    return { ok: true, data: result.map(r => r.prompt_path) }
  } catch (err) {
    return { ok: false, error: `Failed to get prompts with tag: ${err instanceof Error ? err.message : String(err)}` }
  }
}

export async function getTagUsageCounts(): Promise<Result<Map<string, number>>> {
  try {
    const database = await getDb()
    const result = await database.select<{ tag_id: string; count: number }[]>(
      'SELECT tag_id, COUNT(*) as count FROM prompt_tags GROUP BY tag_id'
    )
    return { ok: true, data: new Map(result.map(r => [r.tag_id, r.count])) }
  } catch (err) {
    return { ok: false, error: `Failed to get tag counts: ${err instanceof Error ? err.message : String(err)}` }
  }
}

// AI Settings operations

export async function getAISettings(): Promise<Result<AISettings>> {
  try {
    const database = await getDb()
    const providerResult = await database.select<{ value: string }[]>(
      'SELECT value FROM settings WHERE key = ?',
      ['ai_provider']
    )
    const apiKeyResult = await database.select<{ value: string }[]>(
      'SELECT value FROM settings WHERE key = ?',
      ['ai_api_key']
    )
    const modelResult = await database.select<{ value: string }[]>(
      'SELECT value FROM settings WHERE key = ?',
      ['ai_model']
    )

    return {
      ok: true,
      data: {
        provider: providerResult.length > 0 ? (providerResult[0].value as AIProvider) : null,
        apiKey: apiKeyResult.length > 0 ? apiKeyResult[0].value : null,
        model: modelResult.length > 0 ? modelResult[0].value : null,
      },
    }
  } catch (err) {
    return { ok: false, error: `Failed to get AI settings: ${err instanceof Error ? err.message : String(err)}` }
  }
}

export async function saveAISettings(settings: Partial<AISettings>): Promise<Result<void>> {
  try {
    const database = await getDb()

    if (settings.provider !== undefined) {
      if (settings.provider === null) {
        await database.execute('DELETE FROM settings WHERE key = ?', ['ai_provider'])
      } else {
        await database.execute(
          'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
          ['ai_provider', settings.provider]
        )
      }
    }

    if (settings.apiKey !== undefined) {
      if (settings.apiKey === null) {
        await database.execute('DELETE FROM settings WHERE key = ?', ['ai_api_key'])
      } else {
        await database.execute(
          'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
          ['ai_api_key', settings.apiKey]
        )
      }
    }

    if (settings.model !== undefined) {
      if (settings.model === null) {
        await database.execute('DELETE FROM settings WHERE key = ?', ['ai_model'])
      } else {
        await database.execute(
          'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
          ['ai_model', settings.model]
        )
      }
    }

    return { ok: true, data: undefined }
  } catch (err) {
    return { ok: false, error: `Failed to save AI settings: ${err instanceof Error ? err.message : String(err)}` }
  }
}

export async function hasAIConfigured(): Promise<Result<boolean>> {
  try {
    const settings = await getAISettings()
    if (!settings.ok) return settings
    return {
      ok: true,
      data: settings.data.provider !== null && settings.data.apiKey !== null && settings.data.apiKey.length > 0,
    }
  } catch (err) {
    return { ok: false, error: `Failed to check AI configuration: ${err instanceof Error ? err.message : String(err)}` }
  }
}
