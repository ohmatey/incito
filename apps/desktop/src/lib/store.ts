import Database from '@tauri-apps/plugin-sql'
import type { Tag, TranslationSettings, TranslationCacheEntry, LanguageCode, TranslationConfidence } from '../types/prompt'
import type {
  PromptRun,
  RunVariable,
  RunAnalyticsDaily,
  RunStatus,
  RunLauncher,
} from '../types/run'
import type { ChatSession, ChatMessage, ChatRole, ToolCallResult } from '../types/agent'
import type {
  Playbook,
  PlaybookRule,
  PlaybookRow,
  PlaybookRuleRow,
  CreatePlaybookData,
  UpdatePlaybookData,
  CreatePlaybookRuleData,
  UpdatePlaybookRuleData,
} from '../types/playbook'
import { rowToPlaybook, rowToPlaybookRule } from '../types/playbook'
import { isValidTagName } from './constants'

// Result type for operations that can fail
export type Result<T> = { ok: true; data: T } | { ok: false; error: string }

// ============================================================================
// Relative Path Utilities (Sync-Ready)
// ============================================================================
// Store paths as relative to enable syncing across machines with different base folders

let _baseFolderPath: string | null = null

/**
 * Set the base folder path for relative path conversions.
 * Must be called when the prompts folder is loaded.
 * Also triggers migration of absolute paths to relative paths.
 */
export async function setBaseFolderPath(path: string): Promise<void> {
  _baseFolderPath = path
  // Run the path migration after setting base folder
  await migrateToRelativePaths(path)
}

/**
 * Migrate absolute paths in path-based tables to relative paths.
 * This runs once per base folder path.
 */
async function migrateToRelativePaths(basePath: string): Promise<void> {
  try {
    const database = await getDb()

    // Check if we've already migrated for this base path
    const migrationKey = `path_migration_v1_${basePath}`
    const migrated = await database.select<{ value: string }[]>(
      'SELECT value FROM settings WHERE key = ?',
      [migrationKey]
    )

    if (migrated.length > 0 && migrated[0].value === 'done') {
      return // Already migrated
    }

    // Migrate prompt_tags
    await database.execute(
      `UPDATE prompt_tags SET prompt_path = REPLACE(prompt_path, ?, '')
       WHERE prompt_path LIKE ?`,
      [`${basePath}/`, `${basePath}/%`]
    )

    // Migrate prompt_versions
    await database.execute(
      `UPDATE prompt_versions SET prompt_path = REPLACE(prompt_path, ?, '')
       WHERE prompt_path LIKE ?`,
      [`${basePath}/`, `${basePath}/%`]
    )

    // Migrate prompt_runs
    await database.execute(
      `UPDATE prompt_runs SET prompt_path = REPLACE(prompt_path, ?, '')
       WHERE prompt_path LIKE ?`,
      [`${basePath}/`, `${basePath}/%`]
    )

    // Mark migration as done for this base path
    await database.execute(
      'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
      [migrationKey, 'done']
    )
  } catch (err) {
    console.error('Failed to migrate to relative paths:', err)
    // Don't throw - migration failure shouldn't break the app
  }
}

/**
 * Get the current base folder path.
 */
export function getBaseFolderPath(): string | null {
  return _baseFolderPath
}

/**
 * Convert an absolute path to a relative path (for storing in DB).
 * If already relative or base path not set, returns as-is.
 */
export function toRelativePath(absolutePath: string): string {
  if (!_baseFolderPath) return absolutePath
  if (!absolutePath.startsWith(_baseFolderPath)) return absolutePath
  // Remove base path and leading slash
  const relative = absolutePath.slice(_baseFolderPath.length)
  return relative.startsWith('/') ? relative.slice(1) : relative
}

/**
 * Convert a relative path to an absolute path (for use in app).
 * If already absolute or base path not set, returns as-is.
 */
export function toAbsolutePath(relativePath: string): string {
  if (!_baseFolderPath) return relativePath
  // Already absolute
  if (relativePath.startsWith('/')) return relativePath
  return `${_baseFolderPath}/${relativePath}`
}

// AI Provider types
export type AIProvider = 'openai' | 'anthropic' | 'google' | 'claude-code'

export interface AISettings {
  provider: AIProvider | null
  apiKey: string | null
  model: string | null
  claudeCodeExecutablePath: string | null
}

// Multi-provider configuration types
export interface ProviderConfig {
  id: string
  alias: string                        // User-friendly name, e.g., "Claude Production"
  provider: AIProvider
  apiKey: string | null                // null for claude-code
  model: string
  claudeCodeExecutablePath?: string | null
  isDefault: boolean
  createdAt: string
  updatedAt: string
}

export interface ProviderConfigsSettings {
  configs: ProviderConfig[]
  defaultConfigId: string | null
}

// Available models per provider
export const AI_MODELS: Record<AIProvider, { id: string; name: string }[]> = {
  openai: [
    { id: 'gpt-5.2', name: 'GPT-5.2' },
    { id: 'gpt-5.2-mini', name: 'GPT-5.2 Mini' },
    { id: 'gpt-5.2-nano', name: 'GPT-5.2 Nano' },
    { id: 'gpt-5.1', name: 'GPT-5.1' },
    { id: 'gpt-5', name: 'GPT-5' },
    { id: 'gpt-5-mini', name: 'GPT-5 Mini' },
    { id: 'gpt-4.1', name: 'GPT-4.1' },
    { id: 'gpt-4.1-mini', name: 'GPT-4.1 Mini' },
    { id: 'gpt-4.1-nano', name: 'GPT-4.1 Nano' },
    { id: 'gpt-4o', name: 'GPT-4o' },
    { id: 'gpt-4o-mini', name: 'GPT-4o Mini' },
  ],
  anthropic: [
    { id: 'claude-opus-4-5', name: 'Claude Opus 4.5' },
    { id: 'claude-sonnet-4-5', name: 'Claude Sonnet 4.5' },
    { id: 'claude-opus-4-1', name: 'Claude Opus 4.1' },
    { id: 'claude-opus-4-0', name: 'Claude Opus 4' },
    { id: 'claude-sonnet-4-0', name: 'Claude Sonnet 4' },
    { id: 'claude-haiku-4-5', name: 'Claude Haiku 4.5' },
  ],
  google: [
    { id: 'gemini-3-pro-preview', name: 'Gemini 3 Pro Preview' },
    { id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash Preview' },
    { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro' },
    { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash' },
  ],
  'claude-code': [
    { id: 'sonnet', name: 'Claude Sonnet (Recommended)' },
    { id: 'opus', name: 'Claude Opus' },
    { id: 'haiku', name: 'Claude Haiku' },
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
    await db.execute(`
      CREATE TABLE IF NOT EXISTS prompt_versions (
        id TEXT PRIMARY KEY,
        prompt_path TEXT NOT NULL,
        version_number INTEGER NOT NULL,
        content TEXT NOT NULL,
        created_at TEXT NOT NULL,
        description TEXT,
        UNIQUE(prompt_path, version_number)
      )
    `)
    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_prompt_versions_path ON prompt_versions(prompt_path)
    `)
    await db.execute(`
      CREATE TABLE IF NOT EXISTS prompt_drafts (
        prompt_id TEXT PRIMARY KEY,
        variable_values TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `)
    await db.execute(`
      CREATE TABLE IF NOT EXISTS recent_prompts (
        prompt_id TEXT PRIMARY KEY,
        last_used_at TEXT NOT NULL
      )
    `)
    await db.execute(`
      CREATE TABLE IF NOT EXISTS pinned_prompts (
        prompt_id TEXT PRIMARY KEY,
        pinned_at TEXT NOT NULL
      )
    `)
    // Translation cache table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS translation_cache (
        hash TEXT PRIMARY KEY,
        source_lang TEXT NOT NULL,
        target_lang TEXT NOT NULL,
        source_text TEXT NOT NULL,
        translated_text TEXT NOT NULL,
        confidence TEXT NOT NULL,
        created_at TEXT NOT NULL
      )
    `)
    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_translation_cache_created ON translation_cache(created_at)
    `)

    // Prompt runs table for tracking executions
    await db.execute(`
      CREATE TABLE IF NOT EXISTS prompt_runs (
        id TEXT PRIMARY KEY,
        prompt_id TEXT NOT NULL,
        prompt_path TEXT NOT NULL,
        prompt_name TEXT NOT NULL,
        launcher_id TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        error_message TEXT,
        started_at TEXT NOT NULL,
        completed_at TEXT,
        execution_time_ms INTEGER,
        run_file_path TEXT,
        created_at TEXT NOT NULL
      )
    `)
    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_prompt_runs_prompt_id ON prompt_runs(prompt_id)
    `)
    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_prompt_runs_created_at ON prompt_runs(created_at)
    `)

    // Run variables table for storing variable values per run
    await db.execute(`
      CREATE TABLE IF NOT EXISTS run_variables (
        id TEXT PRIMARY KEY,
        run_id TEXT NOT NULL,
        variable_key TEXT NOT NULL,
        variable_value TEXT NOT NULL,
        variable_type TEXT NOT NULL,
        FOREIGN KEY (run_id) REFERENCES prompt_runs(id) ON DELETE CASCADE
      )
    `)
    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_run_variables_run_id ON run_variables(run_id)
    `)

    // Run analytics daily aggregation table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS run_analytics_daily (
        id TEXT PRIMARY KEY,
        prompt_id TEXT NOT NULL,
        date TEXT NOT NULL,
        run_count INTEGER NOT NULL DEFAULT 0,
        success_count INTEGER NOT NULL DEFAULT 0,
        error_count INTEGER NOT NULL DEFAULT 0,
        total_execution_time_ms INTEGER NOT NULL DEFAULT 0,
        avg_execution_time_ms INTEGER NOT NULL DEFAULT 0,
        UNIQUE(prompt_id, date)
      )
    `)
    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_run_analytics_prompt_id ON run_analytics_daily(prompt_id)
    `)

    // Add token columns to prompt_runs (migration for existing DBs)
    // SQLite doesn't support IF NOT EXISTS for columns, so we use try/catch
    try {
      await db.execute(`ALTER TABLE prompt_runs ADD COLUMN input_tokens INTEGER`)
    } catch { /* Column may already exist */ }
    try {
      await db.execute(`ALTER TABLE prompt_runs ADD COLUMN output_tokens INTEGER`)
    } catch { /* Column may already exist */ }
    try {
      await db.execute(`ALTER TABLE prompt_runs ADD COLUMN total_tokens INTEGER`)
    } catch { /* Column may already exist */ }
    try {
      await db.execute(`ALTER TABLE prompt_runs ADD COLUMN model_id TEXT`)
    } catch { /* Column may already exist */ }
    try {
      await db.execute(`ALTER TABLE prompt_runs ADD COLUMN provider TEXT`)
    } catch { /* Column may already exist */ }
    try {
      await db.execute(`ALTER TABLE prompt_runs ADD COLUMN estimated_cost_usd REAL`)
    } catch { /* Column may already exist */ }

    // Add token columns to run_analytics_daily (migration for existing DBs)
    try {
      await db.execute(`ALTER TABLE run_analytics_daily ADD COLUMN total_input_tokens INTEGER NOT NULL DEFAULT 0`)
    } catch { /* Column may already exist */ }
    try {
      await db.execute(`ALTER TABLE run_analytics_daily ADD COLUMN total_output_tokens INTEGER NOT NULL DEFAULT 0`)
    } catch { /* Column may already exist */ }
    try {
      await db.execute(`ALTER TABLE run_analytics_daily ADD COLUMN total_estimated_cost_usd REAL NOT NULL DEFAULT 0`)
    } catch { /* Column may already exist */ }

    // Chat sessions table for agent conversations
    await db.execute(`
      CREATE TABLE IF NOT EXISTS chat_sessions (
        id TEXT PRIMARY KEY,
        agent_id TEXT NOT NULL,
        title TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `)
    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_chat_sessions_agent_id ON chat_sessions(agent_id)
    `)

    // Chat messages table for conversation history
    await db.execute(`
      CREATE TABLE IF NOT EXISTS chat_messages (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        tool_calls TEXT,
        FOREIGN KEY (session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE
      )
    `)
    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON chat_messages(session_id)
    `)

    // Pinned agents table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS pinned_agents (
        agent_id TEXT PRIMARY KEY,
        pinned_at TEXT NOT NULL
      )
    `)

    // Resources table for asset management
    await db.execute(`
      CREATE TABLE IF NOT EXISTS resources (
        id TEXT PRIMARY KEY,
        file_name TEXT NOT NULL,
        file_path TEXT NOT NULL UNIQUE,
        file_type TEXT NOT NULL,
        mime_type TEXT NOT NULL,
        file_size INTEGER NOT NULL,
        uploaded_at TEXT NOT NULL,
        indexed INTEGER NOT NULL DEFAULT 0,
        indexed_at TEXT,
        chunk_count INTEGER DEFAULT 0,
        thumbnail_base64 TEXT
      )
    `)
    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_resources_file_type ON resources(file_type)
    `)
    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_resources_uploaded_at ON resources(uploaded_at)
    `)

    // Resource chunks table for RAG indexing
    await db.execute(`
      CREATE TABLE IF NOT EXISTS resource_chunks (
        id TEXT PRIMARY KEY,
        resource_id TEXT NOT NULL,
        chunk_index INTEGER NOT NULL,
        content TEXT NOT NULL,
        embedding TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (resource_id) REFERENCES resources(id) ON DELETE CASCADE
      )
    `)
    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_resource_chunks_resource_id ON resource_chunks(resource_id)
    `)

    // Graders table (stores both Assertion and LLM Judge types)
    await db.execute(`
      CREATE TABLE IF NOT EXISTS graders (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        type TEXT NOT NULL CHECK (type IN ('assertion', 'llm_judge')),
        config TEXT NOT NULL,
        is_builtin INTEGER NOT NULL DEFAULT 0,
        enabled INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `)
    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_graders_type ON graders(type)
    `)

    // Prompt-Grader associations (which graders to run for each prompt)
    await db.execute(`
      CREATE TABLE IF NOT EXISTS prompt_graders (
        id TEXT PRIMARY KEY,
        prompt_id TEXT NOT NULL,
        grader_id TEXT NOT NULL,
        enabled INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL,
        UNIQUE(prompt_id, grader_id)
      )
    `)
    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_prompt_graders_prompt ON prompt_graders(prompt_id)
    `)

    // Grader results linked to runs
    await db.execute(`
      CREATE TABLE IF NOT EXISTS grader_results (
        id TEXT PRIMARY KEY,
        run_id TEXT NOT NULL,
        grader_id TEXT NOT NULL,
        score REAL NOT NULL,
        passed INTEGER NOT NULL,
        reason TEXT,
        raw_score REAL,
        execution_time_ms INTEGER NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY (run_id) REFERENCES prompt_runs(id) ON DELETE CASCADE,
        FOREIGN KEY (grader_id) REFERENCES graders(id) ON DELETE CASCADE
      )
    `)
    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_grader_results_run ON grader_results(run_id)
    `)
    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_grader_results_passed ON grader_results(passed)
    `)

    // Run feedback table for expert human feedback
    await db.execute(`
      CREATE TABLE IF NOT EXISTS run_feedback (
        id TEXT PRIMARY KEY,
        run_id TEXT NOT NULL UNIQUE,
        rating INTEGER,
        pass_fail TEXT CHECK (pass_fail IN ('pass', 'fail')),
        notes TEXT,
        tags TEXT,
        time_spent_ms INTEGER,
        reviewed_at TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (run_id) REFERENCES prompt_runs(id) ON DELETE CASCADE
      )
    `)
    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_run_feedback_run_id ON run_feedback(run_id)
    `)

    // Add run_config column to prompt_versions (migration for existing DBs)
    try {
      await db.execute(`ALTER TABLE prompt_versions ADD COLUMN run_config TEXT`)
    } catch { /* Column may already exist */ }

    // Playbooks table (stores behavior teaching containers)
    await db.execute(`
      CREATE TABLE IF NOT EXISTS playbooks (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        enabled INTEGER NOT NULL DEFAULT 1,
        rule_count INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `)
    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_playbooks_enabled ON playbooks(enabled)
    `)

    // Playbook rules table (teaching units with before/after examples)
    await db.execute(`
      CREATE TABLE IF NOT EXISTS playbook_rules (
        id TEXT PRIMARY KEY,
        playbook_id TEXT NOT NULL,
        trigger_context TEXT NOT NULL,
        instruction TEXT NOT NULL,
        bad_example_input TEXT,
        bad_example_output TEXT,
        golden_output TEXT,
        source_run_id TEXT,
        priority INTEGER NOT NULL DEFAULT 100,
        enabled INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (playbook_id) REFERENCES playbooks(id) ON DELETE CASCADE,
        FOREIGN KEY (source_run_id) REFERENCES prompt_runs(id) ON DELETE SET NULL
      )
    `)
    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_playbook_rules_playbook ON playbook_rules(playbook_id)
    `)
    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_playbook_rules_priority ON playbook_rules(priority)
    `)

    // Prompt-Playbook associations (which playbooks to apply for each prompt)
    await db.execute(`
      CREATE TABLE IF NOT EXISTS prompt_playbooks (
        id TEXT PRIMARY KEY,
        prompt_id TEXT NOT NULL,
        playbook_id TEXT NOT NULL,
        "order" INTEGER NOT NULL DEFAULT 0,
        enabled INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL,
        UNIQUE(prompt_id, playbook_id),
        FOREIGN KEY (playbook_id) REFERENCES playbooks(id) ON DELETE CASCADE
      )
    `)
    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_prompt_playbooks_prompt ON prompt_playbooks(prompt_id)
    `)

    // Tag timestamps migration (sync-ready)
    try {
      await db.execute(`ALTER TABLE tags ADD COLUMN created_at TEXT`)
    } catch { /* Column may already exist */ }
    try {
      await db.execute(`ALTER TABLE tags ADD COLUMN updated_at TEXT`)
    } catch { /* Column may already exist */ }
    // Backfill existing tags with current timestamp
    const now = new Date().toISOString()
    await db.execute(
      `UPDATE tags SET created_at = ?, updated_at = ? WHERE created_at IS NULL`,
      [now, now]
    )

    // SyncId migration (sync-ready) - add immutable UUID for future cloud sync
    // Tags
    try {
      await db.execute(`ALTER TABLE tags ADD COLUMN sync_id TEXT`)
    } catch { /* Column may already exist */ }
    // Graders
    try {
      await db.execute(`ALTER TABLE graders ADD COLUMN sync_id TEXT`)
    } catch { /* Column may already exist */ }
    // Playbooks
    try {
      await db.execute(`ALTER TABLE playbooks ADD COLUMN sync_id TEXT`)
    } catch { /* Column may already exist */ }
    // Playbook rules
    try {
      await db.execute(`ALTER TABLE playbook_rules ADD COLUMN sync_id TEXT`)
    } catch { /* Column may already exist */ }
    // Chat sessions
    try {
      await db.execute(`ALTER TABLE chat_sessions ADD COLUMN sync_id TEXT`)
    } catch { /* Column may already exist */ }
    // Prompt runs
    try {
      await db.execute(`ALTER TABLE prompt_runs ADD COLUMN sync_id TEXT`)
    } catch { /* Column may already exist */ }

    // Backfill syncId for existing rows
    const tables = ['tags', 'graders', 'playbooks', 'playbook_rules', 'chat_sessions', 'prompt_runs']
    for (const table of tables) {
      const rows = await db.select<{ id: string }[]>(
        `SELECT id FROM ${table} WHERE sync_id IS NULL`
      )
      for (const row of rows) {
        await db.execute(
          `UPDATE ${table} SET sync_id = ? WHERE id = ?`,
          [crypto.randomUUID(), row.id]
        )
      }
    }

    // Create unique indexes for syncId columns
    try {
      await db.execute(`CREATE UNIQUE INDEX IF NOT EXISTS idx_tags_sync_id ON tags(sync_id)`)
    } catch { /* Index may already exist */ }
    try {
      await db.execute(`CREATE UNIQUE INDEX IF NOT EXISTS idx_graders_sync_id ON graders(sync_id)`)
    } catch { /* Index may already exist */ }
    try {
      await db.execute(`CREATE UNIQUE INDEX IF NOT EXISTS idx_playbooks_sync_id ON playbooks(sync_id)`)
    } catch { /* Index may already exist */ }
    try {
      await db.execute(`CREATE UNIQUE INDEX IF NOT EXISTS idx_playbook_rules_sync_id ON playbook_rules(sync_id)`)
    } catch { /* Index may already exist */ }
    try {
      await db.execute(`CREATE UNIQUE INDEX IF NOT EXISTS idx_chat_sessions_sync_id ON chat_sessions(sync_id)`)
    } catch { /* Index may already exist */ }
    try {
      await db.execute(`CREATE UNIQUE INDEX IF NOT EXISTS idx_prompt_runs_sync_id ON prompt_runs(sync_id)`)
    } catch { /* Index may already exist */ }
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

interface TagRow {
  id: string
  sync_id: string
  name: string
  color: string
  created_at: string
  updated_at: string
}

function rowToTag(row: TagRow): Tag {
  return {
    id: row.id,
    syncId: row.sync_id,
    name: row.name,
    color: row.color,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export async function getAllTags(): Promise<Result<Tag[]>> {
  try {
    const database = await getDb()
    const result = await database.select<TagRow[]>(
      'SELECT id, sync_id, name, color, created_at, updated_at FROM tags ORDER BY name'
    )
    return { ok: true, data: result.map(rowToTag) }
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
    const syncId = crypto.randomUUID()
    const now = new Date().toISOString()
    await database.execute(
      'INSERT INTO tags (id, sync_id, name, color, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
      [id, syncId, trimmedName, color, now, now]
    )
    return { ok: true, data: { id, syncId, name: trimmedName, color, createdAt: now, updatedAt: now } }
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
    const now = new Date().toISOString()
    await database.execute(
      'UPDATE tags SET name = ?, color = ?, updated_at = ? WHERE id = ?',
      [trimmedName, color, now, id]
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
    const result = await database.select<TagRow[]>(
      'SELECT id, sync_id, name, color, created_at, updated_at FROM tags WHERE name = ?',
      [name]
    )
    return { ok: true, data: result.length > 0 ? rowToTag(result[0]) : null }
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
    const relativePath = toRelativePath(promptPath)
    // Clear existing prompt_tags for this prompt
    await database.execute('DELETE FROM prompt_tags WHERE prompt_path = ?', [relativePath])

    // Get or create each tag and link it
    for (const tagName of tagNames) {
      const tagResult = await getOrCreateTag(tagName)
      if (tagResult.ok) {
        await database.execute(
          'INSERT OR IGNORE INTO prompt_tags (prompt_path, tag_id) VALUES (?, ?)',
          [relativePath, tagResult.data.id]
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
    const relativePath = toRelativePath(promptPath)
    const result = await database.select<TagRow[]>(
      `SELECT t.id, t.sync_id, t.name, t.color, t.created_at, t.updated_at
       FROM tags t
       JOIN prompt_tags pt ON t.id = pt.tag_id
       WHERE pt.prompt_path = ?
       ORDER BY t.name`,
      [relativePath]
    )
    return { ok: true, data: result.map(rowToTag) }
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
    return { ok: true, data: result.map(r => toAbsolutePath(r.prompt_path)) }
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

// Store API key in SQLite settings table
// Note: For enhanced security, consider using Tauri's secure-store plugin in the future
const API_KEY_SETTING = 'secure_api_key'

async function getApiKey(): Promise<Result<string | null>> {
  try {
    const database = await getDb()
    const result = await database.select<{ value: string }[]>(
      'SELECT value FROM settings WHERE key = ?',
      [API_KEY_SETTING]
    )
    return { ok: true, data: result.length > 0 ? result[0].value : null }
  } catch (err) {
    return { ok: false, error: `Failed to get API key: ${err instanceof Error ? err.message : String(err)}` }
  }
}

async function saveApiKey(apiKey: string | null): Promise<Result<void>> {
  try {
    const database = await getDb()
    if (apiKey) {
      await database.execute(
        'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
        [API_KEY_SETTING, apiKey]
      )
    } else {
      await database.execute('DELETE FROM settings WHERE key = ?', [API_KEY_SETTING])
    }
    return { ok: true, data: undefined }
  } catch (err) {
    return { ok: false, error: `Failed to save API key: ${err instanceof Error ? err.message : String(err)}` }
  }
}

export async function getAISettings(): Promise<Result<AISettings>> {
  try {
    const database = await getDb()
    const providerResult = await database.select<{ value: string }[]>(
      'SELECT value FROM settings WHERE key = ?',
      ['ai_provider']
    )
    const modelResult = await database.select<{ value: string }[]>(
      'SELECT value FROM settings WHERE key = ?',
      ['ai_model']
    )
    const claudeCodePathResult = await database.select<{ value: string }[]>(
      'SELECT value FROM settings WHERE key = ?',
      ['claude_code_executable_path']
    )

    // Migrate from old 'ai_api_key' to new 'secure_api_key' if needed
    const oldApiKeyResult = await database.select<{ value: string }[]>(
      'SELECT value FROM settings WHERE key = ?',
      ['ai_api_key']
    )

    let apiKey = await getApiKey()

    if (apiKey.ok && !apiKey.data && oldApiKeyResult.length > 0) {
      const oldApiKey = oldApiKeyResult[0].value
      await saveApiKey(oldApiKey)
      await database.execute('DELETE FROM settings WHERE key = ?', ['ai_api_key'])
      apiKey = { ok: true, data: oldApiKey }
    }

    if (!apiKey.ok) return apiKey

    return {
      ok: true,
      data: {
        provider: providerResult.length > 0 ? (providerResult[0].value as AIProvider) : null,
        apiKey: apiKey.data,
        model: modelResult.length > 0 ? modelResult[0].value : null,
        claudeCodeExecutablePath: claudeCodePathResult.length > 0 ? claudeCodePathResult[0].value : null,
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
      const result = await saveApiKey(settings.apiKey)
      if (!result.ok) return result
      // Ensure old key is removed from DB
      await database.execute('DELETE FROM settings WHERE key = ?', ['ai_api_key'])
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

    if (settings.claudeCodeExecutablePath !== undefined) {
      if (settings.claudeCodeExecutablePath === null || settings.claudeCodeExecutablePath === '') {
        await database.execute('DELETE FROM settings WHERE key = ?', ['claude_code_executable_path'])
      } else {
        await database.execute(
          'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
          ['claude_code_executable_path', settings.claudeCodeExecutablePath]
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
    // Claude Code uses CLI authentication, so no API key is needed
    if (settings.data.provider === 'claude-code') {
      return { ok: true, data: true }
    }
    return {
      ok: true,
      data: settings.data.provider !== null && settings.data.apiKey !== null && settings.data.apiKey.length > 0,
    }
  } catch (err) {
    return { ok: false, error: `Failed to check AI configuration: ${err instanceof Error ? err.message : String(err)}` }
  }
}

// ============================================================================
// Multi-Provider Configuration Operations
// ============================================================================

const PROVIDER_CONFIGS_KEY = 'provider_configs'

const DEFAULT_PROVIDER_CONFIGS: ProviderConfigsSettings = {
  configs: [],
  defaultConfigId: null,
}

// Migration: Convert single-provider settings to multi-provider format
async function migrateToMultiProvider(): Promise<void> {
  const database = await getDb()

  // Check if migration already done
  const existingResult = await database.select<{ value: string }[]>(
    'SELECT value FROM settings WHERE key = ?',
    [PROVIDER_CONFIGS_KEY]
  )

  if (existingResult.length > 0) {
    // Already migrated
    return
  }

  // Read old single-provider settings
  const aiSettings = await getAISettings()
  if (!aiSettings.ok || !aiSettings.data.provider) {
    // No existing settings to migrate
    return
  }

  const { provider, apiKey, model, claudeCodeExecutablePath } = aiSettings.data

  // Create a single ProviderConfig from old settings
  const now = new Date().toISOString()
  const config: ProviderConfig = {
    id: crypto.randomUUID(),
    alias: getDefaultAliasForProvider(provider),
    provider,
    apiKey,
    model: model || getDefaultModelForProvider(provider),
    claudeCodeExecutablePath,
    isDefault: true,
    createdAt: now,
    updatedAt: now,
  }

  const settings: ProviderConfigsSettings = {
    configs: [config],
    defaultConfigId: config.id,
  }

  // Save to new format
  await database.execute(
    'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
    [PROVIDER_CONFIGS_KEY, JSON.stringify(settings)]
  )
}

function getDefaultAliasForProvider(provider: AIProvider): string {
  switch (provider) {
    case 'openai': return 'OpenAI'
    case 'anthropic': return 'Anthropic'
    case 'google': return 'Google AI'
    case 'claude-code': return 'Claude Code'
    default: return 'AI Provider'
  }
}

function getDefaultModelForProvider(provider: AIProvider): string {
  switch (provider) {
    case 'openai': return 'gpt-5.2'
    case 'anthropic': return 'claude-sonnet-4-5'
    case 'google': return 'gemini-2.5-flash'
    case 'claude-code': return 'sonnet'
    default: return ''
  }
}

export async function getProviderConfigs(): Promise<Result<ProviderConfigsSettings>> {
  try {
    // Run migration if needed
    await migrateToMultiProvider()

    const database = await getDb()
    const result = await database.select<{ value: string }[]>(
      'SELECT value FROM settings WHERE key = ?',
      [PROVIDER_CONFIGS_KEY]
    )

    if (result.length > 0) {
      const parsed = JSON.parse(result[0].value) as ProviderConfigsSettings
      return { ok: true, data: parsed }
    }

    return { ok: true, data: DEFAULT_PROVIDER_CONFIGS }
  } catch (err) {
    return { ok: false, error: `Failed to get provider configs: ${err instanceof Error ? err.message : String(err)}` }
  }
}

export async function getProviderConfig(id: string): Promise<Result<ProviderConfig | null>> {
  try {
    const configsResult = await getProviderConfigs()
    if (!configsResult.ok) return configsResult

    const config = configsResult.data.configs.find(c => c.id === id)
    return { ok: true, data: config || null }
  } catch (err) {
    return { ok: false, error: `Failed to get provider config: ${err instanceof Error ? err.message : String(err)}` }
  }
}

export async function getDefaultProviderConfig(): Promise<Result<ProviderConfig | null>> {
  try {
    const configsResult = await getProviderConfigs()
    if (!configsResult.ok) return configsResult

    const { configs, defaultConfigId } = configsResult.data

    if (defaultConfigId) {
      const config = configs.find(c => c.id === defaultConfigId)
      if (config) return { ok: true, data: config }
    }

    // Fall back to first config if no default set
    if (configs.length > 0) {
      return { ok: true, data: configs[0] }
    }

    return { ok: true, data: null }
  } catch (err) {
    return { ok: false, error: `Failed to get default provider config: ${err instanceof Error ? err.message : String(err)}` }
  }
}

export async function createProviderConfig(
  config: Omit<ProviderConfig, 'id' | 'createdAt' | 'updatedAt'>
): Promise<Result<ProviderConfig>> {
  try {
    const database = await getDb()
    const configsResult = await getProviderConfigs()
    if (!configsResult.ok) return configsResult

    const now = new Date().toISOString()
    const newConfig: ProviderConfig = {
      ...config,
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
    }

    const updatedConfigs = [...configsResult.data.configs, newConfig]

    // If this is the first config or marked as default, set it as default
    let defaultConfigId = configsResult.data.defaultConfigId
    if (config.isDefault || !defaultConfigId) {
      defaultConfigId = newConfig.id
      // Unset isDefault on other configs
      updatedConfigs.forEach(c => {
        if (c.id !== newConfig.id) {
          c.isDefault = false
        }
      })
    }

    const newSettings: ProviderConfigsSettings = {
      configs: updatedConfigs,
      defaultConfigId,
    }

    await database.execute(
      'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
      [PROVIDER_CONFIGS_KEY, JSON.stringify(newSettings)]
    )

    return { ok: true, data: newConfig }
  } catch (err) {
    return { ok: false, error: `Failed to create provider config: ${err instanceof Error ? err.message : String(err)}` }
  }
}

export async function updateProviderConfig(
  id: string,
  updates: Partial<Omit<ProviderConfig, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<Result<void>> {
  try {
    const database = await getDb()
    const configsResult = await getProviderConfigs()
    if (!configsResult.ok) return configsResult

    const configIndex = configsResult.data.configs.findIndex(c => c.id === id)
    if (configIndex === -1) {
      return { ok: false, error: 'Provider config not found' }
    }

    const updatedConfig = {
      ...configsResult.data.configs[configIndex],
      ...updates,
      updatedAt: new Date().toISOString(),
    }

    const updatedConfigs = [...configsResult.data.configs]
    updatedConfigs[configIndex] = updatedConfig

    // Handle isDefault changes
    let defaultConfigId = configsResult.data.defaultConfigId
    if (updates.isDefault) {
      defaultConfigId = id
      // Unset isDefault on other configs
      updatedConfigs.forEach(c => {
        if (c.id !== id) {
          c.isDefault = false
        }
      })
    }

    const newSettings: ProviderConfigsSettings = {
      configs: updatedConfigs,
      defaultConfigId,
    }

    await database.execute(
      'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
      [PROVIDER_CONFIGS_KEY, JSON.stringify(newSettings)]
    )

    return { ok: true, data: undefined }
  } catch (err) {
    return { ok: false, error: `Failed to update provider config: ${err instanceof Error ? err.message : String(err)}` }
  }
}

export async function deleteProviderConfig(id: string): Promise<Result<void>> {
  try {
    const database = await getDb()
    const configsResult = await getProviderConfigs()
    if (!configsResult.ok) return configsResult

    const updatedConfigs = configsResult.data.configs.filter(c => c.id !== id)

    // If we deleted the default, set a new default
    let defaultConfigId = configsResult.data.defaultConfigId
    if (defaultConfigId === id) {
      defaultConfigId = updatedConfigs.length > 0 ? updatedConfigs[0].id : null
      if (defaultConfigId) {
        const newDefault = updatedConfigs.find(c => c.id === defaultConfigId)
        if (newDefault) newDefault.isDefault = true
      }
    }

    const newSettings: ProviderConfigsSettings = {
      configs: updatedConfigs,
      defaultConfigId,
    }

    await database.execute(
      'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
      [PROVIDER_CONFIGS_KEY, JSON.stringify(newSettings)]
    )

    return { ok: true, data: undefined }
  } catch (err) {
    return { ok: false, error: `Failed to delete provider config: ${err instanceof Error ? err.message : String(err)}` }
  }
}

export async function setDefaultProviderConfig(id: string): Promise<Result<void>> {
  try {
    const database = await getDb()
    const configsResult = await getProviderConfigs()
    if (!configsResult.ok) return configsResult

    const config = configsResult.data.configs.find(c => c.id === id)
    if (!config) {
      return { ok: false, error: 'Provider config not found' }
    }

    // Update isDefault flags
    const updatedConfigs = configsResult.data.configs.map(c => ({
      ...c,
      isDefault: c.id === id,
      updatedAt: c.id === id ? new Date().toISOString() : c.updatedAt,
    }))

    const newSettings: ProviderConfigsSettings = {
      configs: updatedConfigs,
      defaultConfigId: id,
    }

    await database.execute(
      'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
      [PROVIDER_CONFIGS_KEY, JSON.stringify(newSettings)]
    )

    return { ok: true, data: undefined }
  } catch (err) {
    return { ok: false, error: `Failed to set default provider config: ${err instanceof Error ? err.message : String(err)}` }
  }
}

// Prompt Version operations

export interface PromptVersionRow {
  id: string
  prompt_path: string
  version_number: number
  content: string
  created_at: string
  description: string | null
  run_config: string | null
}

const MAX_VERSIONS_PER_PROMPT = 50

export async function createPromptVersion(
  promptPath: string,
  content: string,
  description?: string,
  runConfig?: import('../types/prompt-config').PromptRunConfig
): Promise<Result<void>> {
  try {
    const database = await getDb()
    const relativePath = toRelativePath(promptPath)

    // Get the next version number
    const maxVersionResult = await database.select<{ max_version: number | null }[]>(
      'SELECT MAX(version_number) as max_version FROM prompt_versions WHERE prompt_path = ?',
      [relativePath]
    )
    const nextVersion = (maxVersionResult[0]?.max_version ?? 0) + 1

    // Insert the new version
    const id = crypto.randomUUID()
    const runConfigJson = runConfig ? JSON.stringify(runConfig) : null
    await database.execute(
      'INSERT INTO prompt_versions (id, prompt_path, version_number, content, created_at, description, run_config) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, relativePath, nextVersion, content, new Date().toISOString(), description ?? null, runConfigJson]
    )

    // Clean up old versions (keep only last MAX_VERSIONS_PER_PROMPT)
    await database.execute(
      `DELETE FROM prompt_versions
       WHERE prompt_path = ? AND version_number <= (
         SELECT version_number FROM prompt_versions
         WHERE prompt_path = ?
         ORDER BY version_number DESC
         LIMIT 1 OFFSET ?
       )`,
      [relativePath, relativePath, MAX_VERSIONS_PER_PROMPT]
    )

    return { ok: true, data: undefined }
  } catch (err) {
    return { ok: false, error: `Failed to create version: ${err instanceof Error ? err.message : String(err)}` }
  }
}

export async function getPromptVersions(promptPath: string): Promise<Result<PromptVersionRow[]>> {
  try {
    const database = await getDb()
    const relativePath = toRelativePath(promptPath)
    const result = await database.select<PromptVersionRow[]>(
      'SELECT id, prompt_path, version_number, content, created_at, description, run_config FROM prompt_versions WHERE prompt_path = ? ORDER BY version_number DESC',
      [relativePath]
    )
    // Convert stored relative paths back to absolute for the app
    return { ok: true, data: result.map(r => ({ ...r, prompt_path: toAbsolutePath(r.prompt_path) })) }
  } catch (err) {
    return { ok: false, error: `Failed to get versions: ${err instanceof Error ? err.message : String(err)}` }
  }
}

export async function getPromptVersion(id: string): Promise<Result<PromptVersionRow | null>> {
  try {
    const database = await getDb()
    const result = await database.select<PromptVersionRow[]>(
      'SELECT id, prompt_path, version_number, content, created_at, description, run_config FROM prompt_versions WHERE id = ?',
      [id]
    )
    return { ok: true, data: result.length > 0 ? result[0] : null }
  } catch (err) {
    return { ok: false, error: `Failed to get version: ${err instanceof Error ? err.message : String(err)}` }
  }
}

export async function deletePromptVersions(promptPath: string): Promise<Result<void>> {
  try {
    const database = await getDb()
    const relativePath = toRelativePath(promptPath)
    await database.execute('DELETE FROM prompt_versions WHERE prompt_path = ?', [relativePath])
    return { ok: true, data: undefined }
  } catch (err) {
    return { ok: false, error: `Failed to delete versions: ${err instanceof Error ? err.message : String(err)}` }
  }
}

export async function getLatestPromptRunConfig(
  promptPath: string
): Promise<Result<import('../types/prompt-config').PromptRunConfig | null>> {
  try {
    const database = await getDb()
    const relativePath = toRelativePath(promptPath)
    const result = await database.select<{ run_config: string | null }[]>(
      'SELECT run_config FROM prompt_versions WHERE prompt_path = ? ORDER BY version_number DESC LIMIT 1',
      [relativePath]
    )
    if (result.length === 0 || !result[0].run_config) {
      return { ok: true, data: null }
    }
    return { ok: true, data: JSON.parse(result[0].run_config) }
  } catch (err) {
    return { ok: false, error: `Failed to get prompt run config: ${err instanceof Error ? err.message : String(err)}` }
  }
}

export async function updatePromptRunConfig(
  promptPath: string,
  runConfig: import('../types/prompt-config').PromptRunConfig
): Promise<Result<void>> {
  try {
    const database = await getDb()
    const relativePath = toRelativePath(promptPath)
    // Update the latest version with the new run config
    await database.execute(
      `UPDATE prompt_versions
       SET run_config = ?
       WHERE prompt_path = ? AND version_number = (
         SELECT MAX(version_number) FROM prompt_versions WHERE prompt_path = ?
       )`,
      [JSON.stringify(runConfig), relativePath, relativePath]
    )
    return { ok: true, data: undefined }
  } catch (err) {
    return { ok: false, error: `Failed to update prompt run config: ${err instanceof Error ? err.message : String(err)}` }
  }
}

// Recently used prompts operations

const MAX_RECENT_PROMPTS = 10

export async function getRecentPromptIds(): Promise<Result<string[]>> {
  try {
    const database = await getDb()
    const result = await database.select<{ prompt_id: string }[]>(
      'SELECT prompt_id FROM recent_prompts ORDER BY last_used_at DESC LIMIT ?',
      [MAX_RECENT_PROMPTS]
    )
    return { ok: true, data: result.map(r => r.prompt_id) }
  } catch (err) {
    return { ok: false, error: `Failed to get recent prompts: ${err instanceof Error ? err.message : String(err)}` }
  }
}

export async function addRecentPrompt(promptId: string): Promise<Result<void>> {
  try {
    const database = await getDb()
    await database.execute(
      'INSERT OR REPLACE INTO recent_prompts (prompt_id, last_used_at) VALUES (?, ?)',
      [promptId, new Date().toISOString()]
    )
    // Clean up old entries
    await database.execute(
      `DELETE FROM recent_prompts WHERE prompt_id NOT IN (
        SELECT prompt_id FROM recent_prompts ORDER BY last_used_at DESC LIMIT ?
      )`,
      [MAX_RECENT_PROMPTS]
    )
    return { ok: true, data: undefined }
  } catch (err) {
    return { ok: false, error: `Failed to add recent prompt: ${err instanceof Error ? err.message : String(err)}` }
  }
}

export async function removeRecentPrompt(promptId: string): Promise<Result<void>> {
  try {
    const database = await getDb()
    await database.execute('DELETE FROM recent_prompts WHERE prompt_id = ?', [promptId])
    return { ok: true, data: undefined }
  } catch (err) {
    return { ok: false, error: `Failed to remove recent prompt: ${err instanceof Error ? err.message : String(err)}` }
  }
}

// Prompt drafts operations (for tracking in-progress prompts)

export interface PromptDraft {
  prompt_id: string
  variable_values: Record<string, unknown>
  updated_at: string
}

interface PromptDraftRow {
  prompt_id: string
  variable_values: string
  updated_at: string
}

export async function getAllPromptDrafts(): Promise<Result<PromptDraft[]>> {
  try {
    const database = await getDb()
    const result = await database.select<PromptDraftRow[]>(
      'SELECT prompt_id, variable_values, updated_at FROM prompt_drafts ORDER BY updated_at DESC'
    )
    return {
      ok: true,
      data: result.map((row) => ({
        prompt_id: row.prompt_id,
        variable_values: JSON.parse(row.variable_values),
        updated_at: row.updated_at,
      })),
    }
  } catch (err) {
    return { ok: false, error: `Failed to get prompt drafts: ${err instanceof Error ? err.message : String(err)}` }
  }
}

export async function getPromptDraft(promptId: string): Promise<Result<PromptDraft | null>> {
  try {
    const database = await getDb()
    const result = await database.select<PromptDraftRow[]>(
      'SELECT prompt_id, variable_values, updated_at FROM prompt_drafts WHERE prompt_id = ?',
      [promptId]
    )
    if (result.length === 0) {
      return { ok: true, data: null }
    }
    return {
      ok: true,
      data: {
        prompt_id: result[0].prompt_id,
        variable_values: JSON.parse(result[0].variable_values),
        updated_at: result[0].updated_at,
      },
    }
  } catch (err) {
    return { ok: false, error: `Failed to get prompt draft: ${err instanceof Error ? err.message : String(err)}` }
  }
}

export async function savePromptDraft(
  promptId: string,
  variableValues: Record<string, unknown>
): Promise<Result<void>> {
  try {
    const database = await getDb()
    await database.execute(
      'INSERT OR REPLACE INTO prompt_drafts (prompt_id, variable_values, updated_at) VALUES (?, ?, ?)',
      [promptId, JSON.stringify(variableValues), new Date().toISOString()]
    )
    return { ok: true, data: undefined }
  } catch (err) {
    return { ok: false, error: `Failed to save prompt draft: ${err instanceof Error ? err.message : String(err)}` }
  }
}

export async function deletePromptDraft(promptId: string): Promise<Result<void>> {
  try {
    const database = await getDb()
    await database.execute('DELETE FROM prompt_drafts WHERE prompt_id = ?', [promptId])
    return { ok: true, data: undefined }
  } catch (err) {
    return { ok: false, error: `Failed to delete prompt draft: ${err instanceof Error ? err.message : String(err)}` }
  }
}

// Panel width settings

export interface PanelWidths {
  promptList: number
  rightPanel: number
}

const DEFAULT_PANEL_WIDTHS: PanelWidths = {
  promptList: 200,
  rightPanel: 300,
}

// List panel collapsed state

export async function getListPanelCollapsed(): Promise<Result<boolean>> {
  try {
    const database = await getDb()
    const result = await database.select<{ value: string }[]>(
      'SELECT value FROM settings WHERE key = ?',
      ['list_panel_collapsed']
    )
    return { ok: true, data: result.length > 0 ? result[0].value === 'true' : false }
  } catch (err) {
    return { ok: false, error: `Failed to get list panel collapsed: ${err instanceof Error ? err.message : String(err)}` }
  }
}

export async function saveListPanelCollapsed(collapsed: boolean): Promise<Result<void>> {
  try {
    const database = await getDb()
    await database.execute(
      'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
      ['list_panel_collapsed', collapsed ? 'true' : 'false']
    )
    return { ok: true, data: undefined }
  } catch (err) {
    return { ok: false, error: `Failed to save list panel collapsed: ${err instanceof Error ? err.message : String(err)}` }
  }
}

export async function getPanelWidths(): Promise<Result<PanelWidths>> {
  try {
    const database = await getDb()
    const result = await database.select<{ value: string }[]>(
      'SELECT value FROM settings WHERE key = ?',
      ['panel_widths']
    )
    if (result.length > 0) {
      const parsed = JSON.parse(result[0].value) as Partial<PanelWidths>
      return {
        ok: true,
        data: {
          promptList: parsed.promptList ?? DEFAULT_PANEL_WIDTHS.promptList,
          rightPanel: parsed.rightPanel ?? DEFAULT_PANEL_WIDTHS.rightPanel,
        },
      }
    }
    return { ok: true, data: DEFAULT_PANEL_WIDTHS }
  } catch (err) {
    return { ok: false, error: `Failed to get panel widths: ${err instanceof Error ? err.message : String(err)}` }
  }
}

export async function savePanelWidths(widths: PanelWidths): Promise<Result<void>> {
  try {
    const database = await getDb()
    await database.execute(
      'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
      ['panel_widths', JSON.stringify(widths)]
    )
    return { ok: true, data: undefined }
  } catch (err) {
    return { ok: false, error: `Failed to save panel widths: ${err instanceof Error ? err.message : String(err)}` }
  }
}

// Pinned prompts operations

export async function getPinnedPromptIds(): Promise<Result<string[]>> {
  try {
    const database = await getDb()
    const result = await database.select<{ prompt_id: string }[]>(
      'SELECT prompt_id FROM pinned_prompts ORDER BY pinned_at ASC'
    )
    return { ok: true, data: result.map(r => r.prompt_id) }
  } catch (err) {
    return { ok: false, error: `Failed to get pinned prompts: ${err instanceof Error ? err.message : String(err)}` }
  }
}

export async function addPinnedPrompt(promptId: string): Promise<Result<void>> {
  try {
    const database = await getDb()
    await database.execute(
      'INSERT OR REPLACE INTO pinned_prompts (prompt_id, pinned_at) VALUES (?, ?)',
      [promptId, new Date().toISOString()]
    )
    return { ok: true, data: undefined }
  } catch (err) {
    return { ok: false, error: `Failed to pin prompt: ${err instanceof Error ? err.message : String(err)}` }
  }
}

export async function removePinnedPrompt(promptId: string): Promise<Result<void>> {
  try {
    const database = await getDb()
    await database.execute('DELETE FROM pinned_prompts WHERE prompt_id = ?', [promptId])
    return { ok: true, data: undefined }
  } catch (err) {
    return { ok: false, error: `Failed to unpin prompt: ${err instanceof Error ? err.message : String(err)}` }
  }
}

// Generic setting operations

export async function getSetting(key: string): Promise<Result<string | null>> {
  try {
    const database = await getDb()
    const result = await database.select<{ value: string }[]>(
      'SELECT value FROM settings WHERE key = ?',
      [key]
    )
    return { ok: true, data: result.length > 0 ? result[0].value : null }
  } catch (err) {
    return { ok: false, error: `Failed to get setting: ${err instanceof Error ? err.message : String(err)}` }
  }
}

export async function saveSetting(key: string, value: string): Promise<Result<void>> {
  try {
    const database = await getDb()
    await database.execute(
      'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
      [key, value]
    )
    return { ok: true, data: undefined }
  } catch (err) {
    return { ok: false, error: `Failed to save setting: ${err instanceof Error ? err.message : String(err)}` }
  }
}

// Translation Settings operations

const DEFAULT_TRANSLATION_SETTINGS: TranslationSettings = {
  enabled: false,
  sourceLanguages: [],
  targetLanguage: 'en',
  autoDetect: true,
}

export async function getTranslationSettings(): Promise<Result<TranslationSettings>> {
  try {
    const database = await getDb()
    const result = await database.select<{ value: string }[]>(
      'SELECT value FROM settings WHERE key = ?',
      ['translation_settings']
    )
    if (result.length > 0) {
      const parsed = JSON.parse(result[0].value) as Partial<TranslationSettings>
      return {
        ok: true,
        data: {
          enabled: parsed.enabled ?? DEFAULT_TRANSLATION_SETTINGS.enabled,
          sourceLanguages: parsed.sourceLanguages ?? DEFAULT_TRANSLATION_SETTINGS.sourceLanguages,
          targetLanguage: parsed.targetLanguage ?? DEFAULT_TRANSLATION_SETTINGS.targetLanguage,
          autoDetect: parsed.autoDetect ?? DEFAULT_TRANSLATION_SETTINGS.autoDetect,
        },
      }
    }
    return { ok: true, data: DEFAULT_TRANSLATION_SETTINGS }
  } catch (err) {
    return { ok: false, error: `Failed to get translation settings: ${err instanceof Error ? err.message : String(err)}` }
  }
}

export async function saveTranslationSettings(settings: Partial<TranslationSettings>): Promise<Result<void>> {
  try {
    const database = await getDb()
    // Get current settings and merge
    const currentResult = await getTranslationSettings()
    if (!currentResult.ok) return currentResult

    const merged: TranslationSettings = {
      ...currentResult.data,
      ...settings,
    }

    await database.execute(
      'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
      ['translation_settings', JSON.stringify(merged)]
    )
    return { ok: true, data: undefined }
  } catch (err) {
    return { ok: false, error: `Failed to save translation settings: ${err instanceof Error ? err.message : String(err)}` }
  }
}

// Translation Cache operations

const CACHE_EXPIRY_DAYS = 7

// Simple hash function for cache key
async function hashText(text: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(text)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

export async function getCachedTranslation(
  sourceText: string,
  sourceLang: LanguageCode,
  targetLang: LanguageCode
): Promise<Result<TranslationCacheEntry | null>> {
  try {
    const database = await getDb()
    const hash = await hashText(`${sourceLang}:${targetLang}:${sourceText}`)

    const result = await database.select<{
      hash: string
      source_lang: string
      target_lang: string
      source_text: string
      translated_text: string
      confidence: string
      created_at: string
    }[]>(
      'SELECT * FROM translation_cache WHERE hash = ?',
      [hash]
    )

    if (result.length === 0) {
      return { ok: true, data: null }
    }

    const entry = result[0]
    const createdAt = new Date(entry.created_at)
    const now = new Date()
    const daysSinceCreation = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24)

    // Check if cache entry has expired
    if (daysSinceCreation > CACHE_EXPIRY_DAYS) {
      // Remove expired entry
      await database.execute('DELETE FROM translation_cache WHERE hash = ?', [hash])
      return { ok: true, data: null }
    }

    return {
      ok: true,
      data: {
        hash: entry.hash,
        sourceLang: entry.source_lang as LanguageCode,
        targetLang: entry.target_lang as LanguageCode,
        sourceText: entry.source_text,
        translatedText: entry.translated_text,
        confidence: entry.confidence as TranslationConfidence,
        createdAt: entry.created_at,
      },
    }
  } catch (err) {
    return { ok: false, error: `Failed to get cached translation: ${err instanceof Error ? err.message : String(err)}` }
  }
}

export async function cacheTranslation(
  sourceText: string,
  sourceLang: LanguageCode,
  targetLang: LanguageCode,
  translatedText: string,
  confidence: TranslationConfidence
): Promise<Result<void>> {
  try {
    const database = await getDb()
    const hash = await hashText(`${sourceLang}:${targetLang}:${sourceText}`)

    await database.execute(
      `INSERT OR REPLACE INTO translation_cache
       (hash, source_lang, target_lang, source_text, translated_text, confidence, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [hash, sourceLang, targetLang, sourceText, translatedText, confidence, new Date().toISOString()]
    )
    return { ok: true, data: undefined }
  } catch (err) {
    return { ok: false, error: `Failed to cache translation: ${err instanceof Error ? err.message : String(err)}` }
  }
}

export async function clearTranslationCache(): Promise<Result<number>> {
  try {
    const database = await getDb()
    const countResult = await database.select<{ count: number }[]>(
      'SELECT COUNT(*) as count FROM translation_cache'
    )
    const count = countResult[0]?.count ?? 0

    await database.execute('DELETE FROM translation_cache')
    return { ok: true, data: count }
  } catch (err) {
    return { ok: false, error: `Failed to clear translation cache: ${err instanceof Error ? err.message : String(err)}` }
  }
}

export async function getTranslationCacheStats(): Promise<Result<{ count: number; oldestEntry: string | null }>> {
  try {
    const database = await getDb()
    const countResult = await database.select<{ count: number }[]>(
      'SELECT COUNT(*) as count FROM translation_cache'
    )
    const oldestResult = await database.select<{ created_at: string }[]>(
      'SELECT created_at FROM translation_cache ORDER BY created_at ASC LIMIT 1'
    )

    return {
      ok: true,
      data: {
        count: countResult[0]?.count ?? 0,
        oldestEntry: oldestResult.length > 0 ? oldestResult[0].created_at : null,
      },
    }
  } catch (err) {
    return { ok: false, error: `Failed to get cache stats: ${err instanceof Error ? err.message : String(err)}` }
  }
}

export async function cleanupExpiredTranslationCache(): Promise<Result<number>> {
  try {
    const database = await getDb()
    const expiryDate = new Date()
    expiryDate.setDate(expiryDate.getDate() - CACHE_EXPIRY_DAYS)

    const countResult = await database.select<{ count: number }[]>(
      'SELECT COUNT(*) as count FROM translation_cache WHERE created_at < ?',
      [expiryDate.toISOString()]
    )
    const count = countResult[0]?.count ?? 0

    await database.execute(
      'DELETE FROM translation_cache WHERE created_at < ?',
      [expiryDate.toISOString()]
    )

    return { ok: true, data: count }
  } catch (err) {
    return { ok: false, error: `Failed to cleanup expired cache: ${err instanceof Error ? err.message : String(err)}` }
  }
}

// ============================================================================
// Prompt Run Operations
// ============================================================================

interface PromptRunRow {
  id: string
  sync_id: string
  prompt_id: string
  prompt_path: string
  prompt_name: string
  launcher_id: string
  status: string
  error_message: string | null
  started_at: string
  completed_at: string | null
  execution_time_ms: number | null
  run_file_path: string | null
  created_at: string
  // Token tracking columns
  input_tokens: number | null
  output_tokens: number | null
  total_tokens: number | null
  model_id: string | null
  provider: string | null
  estimated_cost_usd: number | null
}

function rowToPromptRun(row: PromptRunRow): PromptRun {
  return {
    id: row.id,
    syncId: row.sync_id,
    promptId: row.prompt_id,
    promptPath: toAbsolutePath(row.prompt_path), // Convert relative to absolute
    promptName: row.prompt_name,
    launcherId: row.launcher_id as RunLauncher,
    status: row.status as RunStatus,
    errorMessage: row.error_message ?? undefined,
    startedAt: row.started_at,
    completedAt: row.completed_at ?? undefined,
    executionTimeMs: row.execution_time_ms ?? undefined,
    runFilePath: row.run_file_path ?? undefined,
    createdAt: row.created_at,
    // Token tracking fields
    inputTokens: row.input_tokens ?? undefined,
    outputTokens: row.output_tokens ?? undefined,
    totalTokens: row.total_tokens ?? undefined,
    modelId: row.model_id ?? undefined,
    provider: row.provider ?? undefined,
    estimatedCostUsd: row.estimated_cost_usd ?? undefined,
  }
}

export async function createPromptRun(
  promptId: string,
  promptPath: string,
  promptName: string,
  launcherId: RunLauncher
): Promise<Result<PromptRun>> {
  try {
    const database = await getDb()
    const id = crypto.randomUUID()
    const syncId = crypto.randomUUID()
    const now = new Date().toISOString()
    const relativePath = toRelativePath(promptPath)

    await database.execute(
      `INSERT INTO prompt_runs
       (id, sync_id, prompt_id, prompt_path, prompt_name, launcher_id, status, started_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, syncId, promptId, relativePath, promptName, launcherId, 'pending', now, now]
    )

    return {
      ok: true,
      data: {
        id,
        syncId,
        promptId,
        promptPath, // Return the original absolute path to the caller
        promptName,
        launcherId,
        status: 'pending',
        startedAt: now,
        createdAt: now,
      },
    }
  } catch (err) {
    return { ok: false, error: `Failed to create run: ${err instanceof Error ? err.message : String(err)}` }
  }
}

export async function updatePromptRunStatus(
  runId: string,
  status: RunStatus,
  errorMessage?: string
): Promise<Result<void>> {
  try {
    const database = await getDb()
    const completedAt = status === 'completed' || status === 'error' || status === 'cancelled'
      ? new Date().toISOString()
      : null

    // Calculate execution time if completing
    let executionTimeMs: number | null = null
    if (completedAt) {
      const runResult = await database.select<{ started_at: string }[]>(
        'SELECT started_at FROM prompt_runs WHERE id = ?',
        [runId]
      )
      if (runResult.length > 0) {
        executionTimeMs = new Date(completedAt).getTime() - new Date(runResult[0].started_at).getTime()
      }
    }

    await database.execute(
      `UPDATE prompt_runs
       SET status = ?, error_message = ?, completed_at = ?, execution_time_ms = ?
       WHERE id = ?`,
      [status, errorMessage ?? null, completedAt, executionTimeMs, runId]
    )

    // Update daily analytics if completed
    if (completedAt) {
      await updateRunAnalytics(runId)
    }

    return { ok: true, data: undefined }
  } catch (err) {
    return { ok: false, error: `Failed to update run status: ${err instanceof Error ? err.message : String(err)}` }
  }
}

export interface TokenUsageInfo {
  inputTokens: number
  outputTokens: number
  modelId: string
  provider: string
}

export async function updatePromptRunTokens(
  runId: string,
  tokens: TokenUsageInfo,
  estimatedCostUsd?: number
): Promise<Result<void>> {
  try {
    const database = await getDb()
    const totalTokens = tokens.inputTokens + tokens.outputTokens

    await database.execute(
      `UPDATE prompt_runs
       SET input_tokens = ?, output_tokens = ?, total_tokens = ?, model_id = ?, provider = ?, estimated_cost_usd = ?
       WHERE id = ?`,
      [tokens.inputTokens, tokens.outputTokens, totalTokens, tokens.modelId, tokens.provider, estimatedCostUsd ?? null, runId]
    )

    // Update daily analytics with token info
    await updateRunAnalyticsTokens(runId, tokens.inputTokens, tokens.outputTokens, estimatedCostUsd)

    return { ok: true, data: undefined }
  } catch (err) {
    return { ok: false, error: `Failed to update run tokens: ${err instanceof Error ? err.message : String(err)}` }
  }
}

async function updateRunAnalyticsTokens(
  runId: string,
  inputTokens: number,
  outputTokens: number,
  estimatedCostUsd?: number
): Promise<void> {
  try {
    const database = await getDb()
    const runResult = await database.select<PromptRunRow[]>(
      'SELECT * FROM prompt_runs WHERE id = ?',
      [runId]
    )
    if (runResult.length === 0) return

    const run = runResult[0]
    const date = run.started_at.split('T')[0] // YYYY-MM-DD

    await database.execute(
      `UPDATE run_analytics_daily SET
       total_input_tokens = total_input_tokens + ?,
       total_output_tokens = total_output_tokens + ?,
       total_estimated_cost_usd = total_estimated_cost_usd + ?
       WHERE prompt_id = ? AND date = ?`,
      [inputTokens, outputTokens, estimatedCostUsd ?? 0, run.prompt_id, date]
    )
  } catch (err) {
    console.error('Failed to update run analytics tokens:', err)
  }
}

export async function getPromptRuns(
  promptId: string,
  limit: number = 50
): Promise<Result<PromptRun[]>> {
  try {
    const database = await getDb()
    const result = await database.select<PromptRunRow[]>(
      `SELECT * FROM prompt_runs
       WHERE prompt_id = ?
       ORDER BY created_at DESC
       LIMIT ?`,
      [promptId, limit]
    )
    return { ok: true, data: result.map(rowToPromptRun) }
  } catch (err) {
    return { ok: false, error: `Failed to get runs: ${err instanceof Error ? err.message : String(err)}` }
  }
}

export async function getRecentRuns(limit: number = 20): Promise<Result<PromptRun[]>> {
  try {
    const database = await getDb()
    const result = await database.select<PromptRunRow[]>(
      `SELECT * FROM prompt_runs
       ORDER BY created_at DESC
       LIMIT ?`,
      [limit]
    )
    return { ok: true, data: result.map(rowToPromptRun) }
  } catch (err) {
    return { ok: false, error: `Failed to get recent runs: ${err instanceof Error ? err.message : String(err)}` }
  }
}

export async function getPromptRun(runId: string): Promise<Result<PromptRun | null>> {
  try {
    const database = await getDb()
    const result = await database.select<PromptRunRow[]>(
      'SELECT * FROM prompt_runs WHERE id = ?',
      [runId]
    )
    return { ok: true, data: result.length > 0 ? rowToPromptRun(result[0]) : null }
  } catch (err) {
    return { ok: false, error: `Failed to get run: ${err instanceof Error ? err.message : String(err)}` }
  }
}

export async function deletePromptRun(runId: string): Promise<Result<void>> {
  try {
    const database = await getDb()
    await database.execute('DELETE FROM run_variables WHERE run_id = ?', [runId])
    await database.execute('DELETE FROM prompt_runs WHERE id = ?', [runId])
    return { ok: true, data: undefined }
  } catch (err) {
    return { ok: false, error: `Failed to delete run: ${err instanceof Error ? err.message : String(err)}` }
  }
}

// Run variables operations

export async function saveRunVariables(
  runId: string,
  variables: { key: string; value: unknown; type: string }[]
): Promise<Result<void>> {
  try {
    const database = await getDb()
    for (const variable of variables) {
      const id = crypto.randomUUID()
      const valueStr = typeof variable.value === 'string'
        ? variable.value
        : JSON.stringify(variable.value)
      await database.execute(
        `INSERT INTO run_variables (id, run_id, variable_key, variable_value, variable_type)
         VALUES (?, ?, ?, ?, ?)`,
        [id, runId, variable.key, valueStr, variable.type]
      )
    }
    return { ok: true, data: undefined }
  } catch (err) {
    return { ok: false, error: `Failed to save run variables: ${err instanceof Error ? err.message : String(err)}` }
  }
}

export async function getRunVariables(runId: string): Promise<Result<RunVariable[]>> {
  try {
    const database = await getDb()
    const result = await database.select<{
      id: string
      run_id: string
      variable_key: string
      variable_value: string
      variable_type: string
    }[]>(
      'SELECT * FROM run_variables WHERE run_id = ?',
      [runId]
    )
    return {
      ok: true,
      data: result.map((row) => ({
        id: row.id,
        runId: row.run_id,
        variableKey: row.variable_key,
        variableValue: row.variable_value,
        variableType: row.variable_type,
      })),
    }
  } catch (err) {
    return { ok: false, error: `Failed to get run variables: ${err instanceof Error ? err.message : String(err)}` }
  }
}

// Run analytics operations

async function updateRunAnalytics(runId: string): Promise<void> {
  try {
    const database = await getDb()
    const runResult = await database.select<PromptRunRow[]>(
      'SELECT * FROM prompt_runs WHERE id = ?',
      [runId]
    )
    if (runResult.length === 0) return

    const run = runResult[0]
    const date = run.started_at.split('T')[0] // YYYY-MM-DD
    const isSuccess = run.status === 'completed'
    const isError = run.status === 'error'
    const executionTime = run.execution_time_ms ?? 0

    // Check if analytics row exists for this prompt and date
    const existingResult = await database.select<{ id: string }[]>(
      'SELECT id FROM run_analytics_daily WHERE prompt_id = ? AND date = ?',
      [run.prompt_id, date]
    )

    if (existingResult.length > 0) {
      // Update existing row
      await database.execute(
        `UPDATE run_analytics_daily SET
         run_count = run_count + 1,
         success_count = success_count + ?,
         error_count = error_count + ?,
         total_execution_time_ms = total_execution_time_ms + ?,
         avg_execution_time_ms = (total_execution_time_ms + ?) / (run_count + 1)
         WHERE prompt_id = ? AND date = ?`,
        [isSuccess ? 1 : 0, isError ? 1 : 0, executionTime, executionTime, run.prompt_id, date]
      )
    } else {
      // Create new row
      const id = crypto.randomUUID()
      await database.execute(
        `INSERT INTO run_analytics_daily
         (id, prompt_id, date, run_count, success_count, error_count, total_execution_time_ms, avg_execution_time_ms)
         VALUES (?, ?, ?, 1, ?, ?, ?, ?)`,
        [id, run.prompt_id, date, isSuccess ? 1 : 0, isError ? 1 : 0, executionTime, executionTime]
      )
    }
  } catch (err) {
    console.error('Failed to update run analytics:', err)
  }
}

export async function getPromptAnalytics(
  promptId: string,
  days: number = 30
): Promise<Result<RunAnalyticsDaily[]>> {
  try {
    const database = await getDb()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    const result = await database.select<{
      id: string
      prompt_id: string
      date: string
      run_count: number
      success_count: number
      error_count: number
      total_execution_time_ms: number
      avg_execution_time_ms: number
      total_input_tokens: number
      total_output_tokens: number
      total_estimated_cost_usd: number
    }[]>(
      `SELECT * FROM run_analytics_daily
       WHERE prompt_id = ? AND date >= ?
       ORDER BY date DESC`,
      [promptId, startDate.toISOString().split('T')[0]]
    )

    return {
      ok: true,
      data: result.map((row) => ({
        id: row.id,
        promptId: row.prompt_id,
        date: row.date,
        runCount: row.run_count,
        successCount: row.success_count,
        errorCount: row.error_count,
        totalExecutionTimeMs: row.total_execution_time_ms,
        avgExecutionTimeMs: row.avg_execution_time_ms,
        totalInputTokens: row.total_input_tokens ?? 0,
        totalOutputTokens: row.total_output_tokens ?? 0,
        totalEstimatedCostUsd: row.total_estimated_cost_usd ?? 0,
      })),
    }
  } catch (err) {
    return { ok: false, error: `Failed to get analytics: ${err instanceof Error ? err.message : String(err)}` }
  }
}

// ============================================================================
// Run Feedback Operations
// ============================================================================

import type { RunFeedback, FeedbackFormData, FeedbackStats } from '../types/feedback'

interface RunFeedbackRow {
  id: string
  run_id: string
  rating: number | null
  pass_fail: string | null
  notes: string | null
  tags: string | null
  time_spent_ms: number | null
  reviewed_at: string
  created_at: string
  updated_at: string
}

function rowToRunFeedback(row: RunFeedbackRow): RunFeedback {
  return {
    id: row.id,
    runId: row.run_id,
    rating: row.rating ?? undefined,
    passFail: (row.pass_fail as 'pass' | 'fail') ?? undefined,
    notes: row.notes ?? undefined,
    tags: row.tags ? JSON.parse(row.tags) : undefined,
    timeSpentMs: row.time_spent_ms ?? undefined,
    reviewedAt: row.reviewed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export async function getRunFeedback(runId: string): Promise<Result<RunFeedback | null>> {
  try {
    const database = await getDb()
    const result = await database.select<RunFeedbackRow[]>(
      'SELECT * FROM run_feedback WHERE run_id = ?',
      [runId]
    )
    return { ok: true, data: result.length > 0 ? rowToRunFeedback(result[0]) : null }
  } catch (err) {
    return { ok: false, error: `Failed to get run feedback: ${err instanceof Error ? err.message : String(err)}` }
  }
}

export async function saveRunFeedback(
  runId: string,
  data: FeedbackFormData,
  timeSpentMs?: number
): Promise<Result<RunFeedback>> {
  try {
    const database = await getDb()
    const now = new Date().toISOString()

    // Check if feedback already exists for this run
    const existing = await database.select<{ id: string }[]>(
      'SELECT id FROM run_feedback WHERE run_id = ?',
      [runId]
    )

    const tagsJson = data.tags ? JSON.stringify(data.tags) : null

    if (existing.length > 0) {
      // Update existing feedback
      await database.execute(
        `UPDATE run_feedback SET
         rating = ?, pass_fail = ?, notes = ?, tags = ?,
         time_spent_ms = ?, reviewed_at = ?, updated_at = ?
         WHERE run_id = ?`,
        [
          data.rating ?? null,
          data.passFail ?? null,
          data.notes ?? null,
          tagsJson,
          timeSpentMs ?? null,
          now,
          now,
          runId,
        ]
      )

      return {
        ok: true,
        data: {
          id: existing[0].id,
          runId,
          rating: data.rating,
          passFail: data.passFail,
          notes: data.notes,
          tags: data.tags,
          timeSpentMs,
          reviewedAt: now,
          createdAt: now, // Will be overwritten by actual value
          updatedAt: now,
        },
      }
    } else {
      // Create new feedback
      const id = crypto.randomUUID()
      await database.execute(
        `INSERT INTO run_feedback
         (id, run_id, rating, pass_fail, notes, tags, time_spent_ms, reviewed_at, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          runId,
          data.rating ?? null,
          data.passFail ?? null,
          data.notes ?? null,
          tagsJson,
          timeSpentMs ?? null,
          now,
          now,
          now,
        ]
      )

      return {
        ok: true,
        data: {
          id,
          runId,
          rating: data.rating,
          passFail: data.passFail,
          notes: data.notes,
          tags: data.tags,
          timeSpentMs,
          reviewedAt: now,
          createdAt: now,
          updatedAt: now,
        },
      }
    }
  } catch (err) {
    return { ok: false, error: `Failed to save run feedback: ${err instanceof Error ? err.message : String(err)}` }
  }
}

export async function deleteRunFeedback(runId: string): Promise<Result<void>> {
  try {
    const database = await getDb()
    await database.execute('DELETE FROM run_feedback WHERE run_id = ?', [runId])
    return { ok: true, data: undefined }
  } catch (err) {
    return { ok: false, error: `Failed to delete run feedback: ${err instanceof Error ? err.message : String(err)}` }
  }
}

export async function getRunsWithFeedback(promptId?: string): Promise<Result<PromptRun[]>> {
  try {
    const database = await getDb()
    let query = `
      SELECT pr.* FROM prompt_runs pr
      INNER JOIN run_feedback rf ON pr.id = rf.run_id
    `
    const params: string[] = []

    if (promptId) {
      query += ' WHERE pr.prompt_id = ?'
      params.push(promptId)
    }

    query += ' ORDER BY rf.reviewed_at DESC'

    const result = await database.select<PromptRunRow[]>(query, params)
    return { ok: true, data: result.map(rowToPromptRun) }
  } catch (err) {
    return { ok: false, error: `Failed to get runs with feedback: ${err instanceof Error ? err.message : String(err)}` }
  }
}

export async function getRunsWithoutFeedback(promptId?: string): Promise<Result<PromptRun[]>> {
  try {
    const database = await getDb()
    let query = `
      SELECT pr.* FROM prompt_runs pr
      LEFT JOIN run_feedback rf ON pr.id = rf.run_id
      WHERE rf.id IS NULL AND pr.status = 'completed'
    `
    const params: string[] = []

    if (promptId) {
      query += ' AND pr.prompt_id = ?'
      params.push(promptId)
    }

    query += ' ORDER BY pr.completed_at DESC'

    const result = await database.select<PromptRunRow[]>(query, params)
    return { ok: true, data: result.map(rowToPromptRun) }
  } catch (err) {
    return { ok: false, error: `Failed to get runs without feedback: ${err instanceof Error ? err.message : String(err)}` }
  }
}

export async function getFeedbackStats(promptId?: string): Promise<Result<FeedbackStats>> {
  try {
    const database = await getDb()

    // Get total runs count
    let totalQuery = 'SELECT COUNT(*) as count FROM prompt_runs WHERE status = ?'
    const totalParams: string[] = ['completed']
    if (promptId) {
      totalQuery += ' AND prompt_id = ?'
      totalParams.push(promptId)
    }
    const totalResult = await database.select<{ count: number }[]>(totalQuery, totalParams)
    const totalRuns = totalResult[0]?.count ?? 0

    // Get reviewed runs count
    let reviewedQuery = `
      SELECT COUNT(*) as count FROM prompt_runs pr
      INNER JOIN run_feedback rf ON pr.id = rf.run_id
    `
    const reviewedParams: string[] = []
    if (promptId) {
      reviewedQuery += ' WHERE pr.prompt_id = ?'
      reviewedParams.push(promptId)
    }
    const reviewedResult = await database.select<{ count: number }[]>(reviewedQuery, reviewedParams)
    const reviewedRuns = reviewedResult[0]?.count ?? 0

    // Get pass/fail counts
    let passedQuery = `
      SELECT COUNT(*) as count FROM run_feedback rf
      INNER JOIN prompt_runs pr ON rf.run_id = pr.id
      WHERE rf.pass_fail = 'pass'
    `
    let failedQuery = `
      SELECT COUNT(*) as count FROM run_feedback rf
      INNER JOIN prompt_runs pr ON rf.run_id = pr.id
      WHERE rf.pass_fail = 'fail'
    `
    const passFailParams: string[] = []
    if (promptId) {
      passedQuery += ' AND pr.prompt_id = ?'
      failedQuery += ' AND pr.prompt_id = ?'
      passFailParams.push(promptId)
    }

    const [passedResult, failedResult] = await Promise.all([
      database.select<{ count: number }[]>(passedQuery, passFailParams),
      database.select<{ count: number }[]>(failedQuery, passFailParams),
    ])
    const passedRuns = passedResult[0]?.count ?? 0
    const failedRuns = failedResult[0]?.count ?? 0

    // Get average rating
    let avgQuery = `
      SELECT AVG(rating) as avg FROM run_feedback rf
      INNER JOIN prompt_runs pr ON rf.run_id = pr.id
      WHERE rf.rating IS NOT NULL
    `
    if (promptId) {
      avgQuery += ' AND pr.prompt_id = ?'
    }
    const avgResult = await database.select<{ avg: number | null }[]>(
      avgQuery,
      promptId ? [promptId] : []
    )
    const averageRating = avgResult[0]?.avg ?? undefined

    // Get top tags
    let tagsQuery = `
      SELECT rf.tags FROM run_feedback rf
      INNER JOIN prompt_runs pr ON rf.run_id = pr.id
      WHERE rf.tags IS NOT NULL
    `
    if (promptId) {
      tagsQuery += ' AND pr.prompt_id = ?'
    }
    const tagsResult = await database.select<{ tags: string }[]>(
      tagsQuery,
      promptId ? [promptId] : []
    )

    // Count tag occurrences
    const tagCounts = new Map<string, number>()
    for (const row of tagsResult) {
      const tags = JSON.parse(row.tags) as string[]
      for (const tag of tags) {
        tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1)
      }
    }

    // Sort by count and take top 5
    const topTags = Array.from(tagCounts.entries())
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)

    return {
      ok: true,
      data: {
        totalRuns,
        reviewedRuns,
        passedRuns,
        failedRuns,
        averageRating,
        topTags,
      },
    }
  } catch (err) {
    return { ok: false, error: `Failed to get feedback stats: ${err instanceof Error ? err.message : String(err)}` }
  }
}

// ============================================================================
// Chat Session Operations
// ============================================================================

interface ChatSessionRow {
  id: string
  sync_id: string
  agent_id: string
  title: string
  created_at: string
  updated_at: string
}

function rowToChatSession(row: ChatSessionRow): ChatSession {
  return {
    id: row.id,
    syncId: row.sync_id,
    agentId: row.agent_id,
    title: row.title,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export async function createChatSession(
  agentId: string,
  title: string = 'New Chat'
): Promise<Result<ChatSession>> {
  try {
    const database = await getDb()
    const id = crypto.randomUUID()
    const syncId = crypto.randomUUID()
    const now = new Date().toISOString()

    await database.execute(
      `INSERT INTO chat_sessions (id, sync_id, agent_id, title, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, syncId, agentId, title, now, now]
    )

    return {
      ok: true,
      data: { id, syncId, agentId, title, createdAt: now, updatedAt: now },
    }
  } catch (err) {
    return { ok: false, error: `Failed to create chat session: ${err instanceof Error ? err.message : String(err)}` }
  }
}

export async function getChatSessions(agentId: string): Promise<Result<ChatSession[]>> {
  try {
    const database = await getDb()
    const result = await database.select<ChatSessionRow[]>(
      `SELECT * FROM chat_sessions
       WHERE agent_id = ?
       ORDER BY updated_at DESC`,
      [agentId]
    )
    return { ok: true, data: result.map(rowToChatSession) }
  } catch (err) {
    return { ok: false, error: `Failed to get chat sessions: ${err instanceof Error ? err.message : String(err)}` }
  }
}

export async function getChatSession(sessionId: string): Promise<Result<ChatSession | null>> {
  try {
    const database = await getDb()
    const result = await database.select<ChatSessionRow[]>(
      'SELECT * FROM chat_sessions WHERE id = ?',
      [sessionId]
    )
    return { ok: true, data: result.length > 0 ? rowToChatSession(result[0]) : null }
  } catch (err) {
    return { ok: false, error: `Failed to get chat session: ${err instanceof Error ? err.message : String(err)}` }
  }
}

export async function updateChatSessionTitle(
  sessionId: string,
  title: string
): Promise<Result<void>> {
  try {
    const database = await getDb()
    await database.execute(
      `UPDATE chat_sessions SET title = ?, updated_at = ? WHERE id = ?`,
      [title, new Date().toISOString(), sessionId]
    )
    return { ok: true, data: undefined }
  } catch (err) {
    return { ok: false, error: `Failed to update chat session title: ${err instanceof Error ? err.message : String(err)}` }
  }
}

export async function deleteChatSession(sessionId: string): Promise<Result<void>> {
  try {
    const database = await getDb()
    await database.execute('DELETE FROM chat_messages WHERE session_id = ?', [sessionId])
    await database.execute('DELETE FROM chat_sessions WHERE id = ?', [sessionId])
    return { ok: true, data: undefined }
  } catch (err) {
    return { ok: false, error: `Failed to delete chat session: ${err instanceof Error ? err.message : String(err)}` }
  }
}

// Chat message operations

interface ChatMessageRow {
  id: string
  session_id: string
  role: string
  content: string
  timestamp: string
  tool_calls: string | null
}

function rowToChatMessage(row: ChatMessageRow): ChatMessage {
  return {
    id: row.id,
    sessionId: row.session_id,
    role: row.role as ChatRole,
    content: row.content,
    timestamp: row.timestamp,
    toolCalls: row.tool_calls ? JSON.parse(row.tool_calls) : undefined,
  }
}

export async function addChatMessage(
  sessionId: string,
  role: ChatRole,
  content: string,
  toolCalls?: ToolCallResult[]
): Promise<Result<ChatMessage>> {
  try {
    const database = await getDb()
    const id = crypto.randomUUID()
    const timestamp = new Date().toISOString()
    const toolCallsStr = toolCalls ? JSON.stringify(toolCalls) : null

    await database.execute(
      `INSERT INTO chat_messages (id, session_id, role, content, timestamp, tool_calls)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, sessionId, role, content, timestamp, toolCallsStr]
    )

    // Update session's updated_at
    await database.execute(
      `UPDATE chat_sessions SET updated_at = ? WHERE id = ?`,
      [timestamp, sessionId]
    )

    return {
      ok: true,
      data: { id, sessionId, role, content, timestamp, toolCalls },
    }
  } catch (err) {
    return { ok: false, error: `Failed to add chat message: ${err instanceof Error ? err.message : String(err)}` }
  }
}

export async function getChatMessages(sessionId: string): Promise<Result<ChatMessage[]>> {
  try {
    const database = await getDb()
    const result = await database.select<ChatMessageRow[]>(
      `SELECT * FROM chat_messages
       WHERE session_id = ?
       ORDER BY timestamp ASC`,
      [sessionId]
    )
    return { ok: true, data: result.map(rowToChatMessage) }
  } catch (err) {
    return { ok: false, error: `Failed to get chat messages: ${err instanceof Error ? err.message : String(err)}` }
  }
}

// ============================================================================
// Pinned Agents Operations
// ============================================================================

export async function getPinnedAgentIds(): Promise<Result<string[]>> {
  try {
    const database = await getDb()
    const result = await database.select<{ agent_id: string }[]>(
      'SELECT agent_id FROM pinned_agents ORDER BY pinned_at ASC'
    )
    return { ok: true, data: result.map((r) => r.agent_id) }
  } catch (err) {
    return { ok: false, error: `Failed to get pinned agents: ${err instanceof Error ? err.message : String(err)}` }
  }
}

export async function addPinnedAgent(agentId: string): Promise<Result<void>> {
  try {
    const database = await getDb()
    await database.execute(
      'INSERT OR REPLACE INTO pinned_agents (agent_id, pinned_at) VALUES (?, ?)',
      [agentId, new Date().toISOString()]
    )
    return { ok: true, data: undefined }
  } catch (err) {
    return { ok: false, error: `Failed to pin agent: ${err instanceof Error ? err.message : String(err)}` }
  }
}

export async function removePinnedAgent(agentId: string): Promise<Result<void>> {
  try {
    const database = await getDb()
    await database.execute('DELETE FROM pinned_agents WHERE agent_id = ?', [agentId])
    return { ok: true, data: undefined }
  } catch (err) {
    return { ok: false, error: `Failed to unpin agent: ${err instanceof Error ? err.message : String(err)}` }
  }
}

// ============================================================================
// Feature Flags Operations
// ============================================================================

export interface FeatureFlags {
  agentsEnabled: boolean      // Existing feature, now behind flag
  resourcesEnabled: boolean   // New feature
  translationsEnabled: boolean // AI-powered prompt translation
  mcpServerEnabled: boolean   // MCP integration configuration UI
  runsEnabled: boolean        // Run mode and run history
  gradersEnabled: boolean     // Graders for scoring prompt outputs (requires runsEnabled)
  playbooksEnabled: boolean   // Playbooks for teaching AI behavior (requires runsEnabled)
}

const DEFAULT_FEATURE_FLAGS: FeatureFlags = {
  agentsEnabled: false,       // Default off for new installs
  resourcesEnabled: false,
  translationsEnabled: false,
  mcpServerEnabled: false,
  runsEnabled: false,
  gradersEnabled: false,
  playbooksEnabled: false,
}

export async function getFeatureFlags(): Promise<Result<FeatureFlags>> {
  try {
    const database = await getDb()
    const result = await database.select<{ value: string }[]>(
      'SELECT value FROM settings WHERE key = ?',
      ['feature_flags']
    )
    if (result.length > 0) {
      const parsed = JSON.parse(result[0].value) as Partial<FeatureFlags>
      return {
        ok: true,
        data: {
          agentsEnabled: parsed.agentsEnabled ?? DEFAULT_FEATURE_FLAGS.agentsEnabled,
          resourcesEnabled: parsed.resourcesEnabled ?? DEFAULT_FEATURE_FLAGS.resourcesEnabled,
          translationsEnabled: parsed.translationsEnabled ?? DEFAULT_FEATURE_FLAGS.translationsEnabled,
          mcpServerEnabled: parsed.mcpServerEnabled ?? DEFAULT_FEATURE_FLAGS.mcpServerEnabled,
          runsEnabled: parsed.runsEnabled ?? DEFAULT_FEATURE_FLAGS.runsEnabled,
          gradersEnabled: parsed.gradersEnabled ?? DEFAULT_FEATURE_FLAGS.gradersEnabled,
          playbooksEnabled: parsed.playbooksEnabled ?? DEFAULT_FEATURE_FLAGS.playbooksEnabled,
        },
      }
    }
    return { ok: true, data: DEFAULT_FEATURE_FLAGS }
  } catch (err) {
    return { ok: false, error: `Failed to get feature flags: ${err instanceof Error ? err.message : String(err)}` }
  }
}

export async function saveFeatureFlags(flags: Partial<FeatureFlags>): Promise<Result<void>> {
  try {
    const database = await getDb()
    // Get current flags and merge
    const currentResult = await getFeatureFlags()
    if (!currentResult.ok) return currentResult

    const merged: FeatureFlags = {
      ...currentResult.data,
      ...flags,
    }

    await database.execute(
      'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
      ['feature_flags', JSON.stringify(merged)]
    )
    return { ok: true, data: undefined }
  } catch (err) {
    return { ok: false, error: `Failed to save feature flags: ${err instanceof Error ? err.message : String(err)}` }
  }
}

// ============================================================================
// Analytics Settings Operations
// ============================================================================

export interface AnalyticsSettings {
  enabled: boolean
  distinctId: string | null  // Anonymous ID, generated on first enable
}

const DEFAULT_ANALYTICS_SETTINGS: AnalyticsSettings = {
  enabled: true,
  distinctId: null,
}

export async function getAnalyticsSettings(): Promise<Result<AnalyticsSettings>> {
  try {
    const database = await getDb()
    const result = await database.select<{ value: string }[]>(
      'SELECT value FROM settings WHERE key = ?',
      ['analytics_settings']
    )
    if (result.length > 0) {
      const parsed = JSON.parse(result[0].value) as Partial<AnalyticsSettings>
      return {
        ok: true,
        data: {
          enabled: parsed.enabled ?? DEFAULT_ANALYTICS_SETTINGS.enabled,
          distinctId: parsed.distinctId ?? DEFAULT_ANALYTICS_SETTINGS.distinctId,
        },
      }
    }
    return { ok: true, data: DEFAULT_ANALYTICS_SETTINGS }
  } catch (err) {
    return { ok: false, error: `Failed to get analytics settings: ${err instanceof Error ? err.message : String(err)}` }
  }
}

export async function saveAnalyticsSettings(settings: Partial<AnalyticsSettings>): Promise<Result<void>> {
  try {
    const database = await getDb()
    const currentResult = await getAnalyticsSettings()
    if (!currentResult.ok) return currentResult

    const merged: AnalyticsSettings = {
      ...currentResult.data,
      ...settings,
    }

    await database.execute(
      'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
      ['analytics_settings', JSON.stringify(merged)]
    )
    return { ok: true, data: undefined }
  } catch (err) {
    return { ok: false, error: `Failed to save analytics settings: ${err instanceof Error ? err.message : String(err)}` }
  }
}

// ============================================================================
// Model Defaults Operations (Default Generator/Judge)
// ============================================================================

export interface ModelDefaults {
  defaultGeneratorConfigId: string | null  // Provider config ID for generation
  defaultJudgeConfigId: string | null      // Provider config ID for grading/judging
}

const DEFAULT_MODEL_DEFAULTS: ModelDefaults = {
  defaultGeneratorConfigId: null,
  defaultJudgeConfigId: null,
}

export async function getModelDefaults(): Promise<Result<ModelDefaults>> {
  try {
    const database = await getDb()
    const result = await database.select<{ value: string }[]>(
      'SELECT value FROM settings WHERE key = ?',
      ['model_defaults']
    )
    if (result.length > 0) {
      const parsed = JSON.parse(result[0].value) as Partial<ModelDefaults>
      return {
        ok: true,
        data: {
          defaultGeneratorConfigId: parsed.defaultGeneratorConfigId ?? DEFAULT_MODEL_DEFAULTS.defaultGeneratorConfigId,
          defaultJudgeConfigId: parsed.defaultJudgeConfigId ?? DEFAULT_MODEL_DEFAULTS.defaultJudgeConfigId,
        },
      }
    }
    return { ok: true, data: DEFAULT_MODEL_DEFAULTS }
  } catch (err) {
    return { ok: false, error: `Failed to get model defaults: ${err instanceof Error ? err.message : String(err)}` }
  }
}

export async function saveModelDefaults(defaults: Partial<ModelDefaults>): Promise<Result<void>> {
  try {
    const database = await getDb()
    const currentResult = await getModelDefaults()
    if (!currentResult.ok) return currentResult

    const merged: ModelDefaults = {
      ...currentResult.data,
      ...defaults,
    }

    await database.execute(
      'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
      ['model_defaults', JSON.stringify(merged)]
    )
    return { ok: true, data: undefined }
  } catch (err) {
    return { ok: false, error: `Failed to save model defaults: ${err instanceof Error ? err.message : String(err)}` }
  }
}

// ============================================================================
// Privacy Settings Operations (Context Limit)
// ============================================================================

export interface PrivacySettings {
  contextLimitTokens: number | null  // null = no limit
}

const DEFAULT_PRIVACY_SETTINGS: PrivacySettings = {
  contextLimitTokens: null,
}

export async function getPrivacySettings(): Promise<Result<PrivacySettings>> {
  try {
    const database = await getDb()
    const result = await database.select<{ value: string }[]>(
      'SELECT value FROM settings WHERE key = ?',
      ['privacy_settings']
    )
    if (result.length > 0) {
      const parsed = JSON.parse(result[0].value) as Partial<PrivacySettings>
      return {
        ok: true,
        data: {
          contextLimitTokens: parsed.contextLimitTokens ?? DEFAULT_PRIVACY_SETTINGS.contextLimitTokens,
        },
      }
    }
    return { ok: true, data: DEFAULT_PRIVACY_SETTINGS }
  } catch (err) {
    return { ok: false, error: `Failed to get privacy settings: ${err instanceof Error ? err.message : String(err)}` }
  }
}

export async function savePrivacySettings(settings: Partial<PrivacySettings>): Promise<Result<void>> {
  try {
    const database = await getDb()
    const currentResult = await getPrivacySettings()
    if (!currentResult.ok) return currentResult

    const merged: PrivacySettings = {
      ...currentResult.data,
      ...settings,
    }

    await database.execute(
      'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
      ['privacy_settings', JSON.stringify(merged)]
    )
    return { ok: true, data: undefined }
  } catch (err) {
    return { ok: false, error: `Failed to save privacy settings: ${err instanceof Error ? err.message : String(err)}` }
  }
}

// ============================================================================
// Grader Operations
// ============================================================================

import type {
  Grader,
  AssertionGrader,
  LLMJudgeGrader,
  GraderResult,
  GraderResultWithGrader,
} from '../types/grader'

interface GraderRow {
  id: string
  sync_id: string
  name: string
  description: string | null
  type: string
  config: string
  is_builtin: number
  enabled: number
  created_at: string
  updated_at: string
}

function rowToGrader(row: GraderRow): Grader {
  const config = JSON.parse(row.config)

  if (row.type === 'assertion') {
    return {
      id: row.id,
      syncId: row.sync_id,
      name: row.name,
      description: row.description ?? undefined,
      type: 'assertion',
      logic: config,
      isBuiltin: row.is_builtin === 1,
      enabled: row.enabled === 1,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    } as AssertionGrader
  } else {
    return {
      id: row.id,
      syncId: row.sync_id,
      name: row.name,
      description: row.description ?? undefined,
      type: 'llm_judge',
      config,
      isBuiltin: row.is_builtin === 1,
      enabled: row.enabled === 1,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    } as LLMJudgeGrader
  }
}

export async function getAllGraders(): Promise<Result<Grader[]>> {
  try {
    const database = await getDb()
    const result = await database.select<GraderRow[]>(
      'SELECT * FROM graders ORDER BY is_builtin DESC, name ASC'
    )
    return { ok: true, data: result.map(rowToGrader) }
  } catch (err) {
    return { ok: false, error: `Failed to get graders: ${err instanceof Error ? err.message : String(err)}` }
  }
}

export async function getGrader(id: string): Promise<Result<Grader | null>> {
  try {
    const database = await getDb()
    const result = await database.select<GraderRow[]>(
      'SELECT * FROM graders WHERE id = ?',
      [id]
    )
    return { ok: true, data: result.length > 0 ? rowToGrader(result[0]) : null }
  } catch (err) {
    return { ok: false, error: `Failed to get grader: ${err instanceof Error ? err.message : String(err)}` }
  }
}

export async function createGrader(
  grader: Omit<AssertionGrader, 'id' | 'syncId' | 'createdAt' | 'updatedAt'> | Omit<LLMJudgeGrader, 'id' | 'syncId' | 'createdAt' | 'updatedAt'>
): Promise<Result<Grader>> {
  try {
    const database = await getDb()
    const id = crypto.randomUUID()
    const syncId = crypto.randomUUID()
    const now = new Date().toISOString()

    const config = grader.type === 'assertion'
      ? JSON.stringify((grader as Omit<AssertionGrader, 'id' | 'syncId' | 'createdAt' | 'updatedAt'>).logic)
      : JSON.stringify((grader as Omit<LLMJudgeGrader, 'id' | 'syncId' | 'createdAt' | 'updatedAt'>).config)

    await database.execute(
      `INSERT INTO graders (id, sync_id, name, description, type, config, is_builtin, enabled, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        syncId,
        grader.name,
        grader.description ?? null,
        grader.type,
        config,
        grader.isBuiltin ? 1 : 0,
        grader.enabled ? 1 : 0,
        now,
        now,
      ]
    )

    const createdGrader: Grader = grader.type === 'assertion'
      ? {
          ...(grader as Omit<AssertionGrader, 'id' | 'syncId' | 'createdAt' | 'updatedAt'>),
          id,
          syncId,
          createdAt: now,
          updatedAt: now,
        } as AssertionGrader
      : {
          ...(grader as Omit<LLMJudgeGrader, 'id' | 'syncId' | 'createdAt' | 'updatedAt'>),
          id,
          syncId,
          createdAt: now,
          updatedAt: now,
        } as LLMJudgeGrader

    return { ok: true, data: createdGrader }
  } catch (err) {
    return { ok: false, error: `Failed to create grader: ${err instanceof Error ? err.message : String(err)}` }
  }
}

export async function updateGrader(
  id: string,
  updates: Partial<Omit<Grader, 'id' | 'type' | 'createdAt' | 'updatedAt'>>
): Promise<Result<void>> {
  try {
    const database = await getDb()
    const now = new Date().toISOString()

    // Get existing grader to merge
    const existingResult = await getGrader(id)
    if (!existingResult.ok) return existingResult
    if (!existingResult.data) return { ok: false, error: 'Grader not found' }

    const existing = existingResult.data

    // Build config based on type
    let config: string | undefined
    if (existing.type === 'assertion' && 'logic' in updates) {
      config = JSON.stringify(updates.logic)
    } else if (existing.type === 'llm_judge' && 'config' in updates) {
      config = JSON.stringify(updates.config)
    }

    // Build update query dynamically
    const setClauses: string[] = ['updated_at = ?']
    const params: (string | number | null)[] = [now]

    if (updates.name !== undefined) {
      setClauses.push('name = ?')
      params.push(updates.name)
    }
    if (updates.description !== undefined) {
      setClauses.push('description = ?')
      params.push(updates.description ?? null)
    }
    if (config !== undefined) {
      setClauses.push('config = ?')
      params.push(config)
    }
    if (updates.enabled !== undefined) {
      setClauses.push('enabled = ?')
      params.push(updates.enabled ? 1 : 0)
    }

    params.push(id)

    await database.execute(
      `UPDATE graders SET ${setClauses.join(', ')} WHERE id = ?`,
      params
    )

    return { ok: true, data: undefined }
  } catch (err) {
    return { ok: false, error: `Failed to update grader: ${err instanceof Error ? err.message : String(err)}` }
  }
}

export async function deleteGrader(id: string): Promise<Result<void>> {
  try {
    const database = await getDb()
    // Delete associated prompt_graders entries first
    await database.execute('DELETE FROM prompt_graders WHERE grader_id = ?', [id])
    // Delete grader results
    await database.execute('DELETE FROM grader_results WHERE grader_id = ?', [id])
    // Delete grader
    await database.execute('DELETE FROM graders WHERE id = ?', [id])
    return { ok: true, data: undefined }
  } catch (err) {
    return { ok: false, error: `Failed to delete grader: ${err instanceof Error ? err.message : String(err)}` }
  }
}

// Prompt-Grader association operations

export async function getPromptGraders(promptId: string): Promise<Result<Grader[]>> {
  try {
    const database = await getDb()
    const result = await database.select<GraderRow[]>(
      `SELECT g.* FROM graders g
       JOIN prompt_graders pg ON g.id = pg.grader_id
       WHERE pg.prompt_id = ? AND pg.enabled = 1
       ORDER BY g.is_builtin DESC, g.name ASC`,
      [promptId]
    )
    return { ok: true, data: result.map(rowToGrader) }
  } catch (err) {
    return { ok: false, error: `Failed to get prompt graders: ${err instanceof Error ? err.message : String(err)}` }
  }
}

export async function setPromptGraders(promptId: string, graderIds: string[]): Promise<Result<void>> {
  try {
    const database = await getDb()
    const now = new Date().toISOString()

    // Clear existing associations
    await database.execute('DELETE FROM prompt_graders WHERE prompt_id = ?', [promptId])

    // Add new associations
    for (const graderId of graderIds) {
      const id = crypto.randomUUID()
      await database.execute(
        `INSERT INTO prompt_graders (id, prompt_id, grader_id, enabled, created_at)
         VALUES (?, ?, ?, 1, ?)`,
        [id, promptId, graderId, now]
      )
    }

    return { ok: true, data: undefined }
  } catch (err) {
    return { ok: false, error: `Failed to set prompt graders: ${err instanceof Error ? err.message : String(err)}` }
  }
}

// Grader results operations

interface GraderResultRow {
  id: string
  run_id: string
  grader_id: string
  score: number
  passed: number
  reason: string | null
  raw_score: number | null
  execution_time_ms: number
  created_at: string
}

function rowToGraderResult(row: GraderResultRow): GraderResult {
  return {
    id: row.id,
    runId: row.run_id,
    graderId: row.grader_id,
    score: row.score,
    passed: row.passed === 1,
    reason: row.reason ?? undefined,
    rawScore: row.raw_score ?? undefined,
    executionTimeMs: row.execution_time_ms,
    createdAt: row.created_at,
  }
}

export async function saveGraderResults(
  results: Omit<GraderResult, 'id' | 'createdAt'>[]
): Promise<Result<void>> {
  try {
    const database = await getDb()
    const now = new Date().toISOString()

    for (const result of results) {
      const id = crypto.randomUUID()
      await database.execute(
        `INSERT INTO grader_results (id, run_id, grader_id, score, passed, reason, raw_score, execution_time_ms, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          result.runId,
          result.graderId,
          result.score,
          result.passed ? 1 : 0,
          result.reason ?? null,
          result.rawScore ?? null,
          result.executionTimeMs,
          now,
        ]
      )
    }

    return { ok: true, data: undefined }
  } catch (err) {
    return { ok: false, error: `Failed to save grader results: ${err instanceof Error ? err.message : String(err)}` }
  }
}

export async function getRunGraderResults(runId: string): Promise<Result<GraderResultWithGrader[]>> {
  try {
    const database = await getDb()

    // Get grader results
    const resultRows = await database.select<GraderResultRow[]>(
      'SELECT * FROM grader_results WHERE run_id = ?',
      [runId]
    )

    // Get associated graders
    const graderIds = [...new Set(resultRows.map(r => r.grader_id))]
    const graders: Map<string, Grader> = new Map()

    for (const graderId of graderIds) {
      const graderResult = await getGrader(graderId)
      if (graderResult.ok && graderResult.data) {
        graders.set(graderId, graderResult.data)
      }
    }

    // Combine results with graders
    const resultsWithGraders: GraderResultWithGrader[] = resultRows
      .filter(row => graders.has(row.grader_id))
      .map(row => ({
        ...rowToGraderResult(row),
        grader: graders.get(row.grader_id)!,
      }))

    return { ok: true, data: resultsWithGraders }
  } catch (err) {
    return { ok: false, error: `Failed to get run grader results: ${err instanceof Error ? err.message : String(err)}` }
  }
}

// Seed built-in graders

export async function seedBuiltinGraders(): Promise<Result<void>> {
  try {
    const database = await getDb()

    // Check if we already have built-in graders
    const existing = await database.select<{ count: number }[]>(
      'SELECT COUNT(*) as count FROM graders WHERE is_builtin = 1'
    )
    if (existing[0]?.count > 0) {
      return { ok: true, data: undefined }
    }

    // Built-in Assertion Graders
    const assertionGraders: Omit<AssertionGrader, 'id' | 'syncId' | 'createdAt' | 'updatedAt'>[] = [
      {
        name: 'Max Length (500)',
        description: 'Ensure output is at most 500 characters',
        type: 'assertion',
        logic: { operator: 'max_length', value: 500 },
        isBuiltin: true,
        enabled: true,
      },
      {
        name: 'Min Length (50)',
        description: 'Ensure output is at least 50 characters',
        type: 'assertion',
        logic: { operator: 'min_length', value: 50 },
        isBuiltin: true,
        enabled: true,
      },
      {
        name: 'Valid JSON',
        description: 'Ensure output is valid JSON',
        type: 'assertion',
        logic: { operator: 'json_valid', value: '' },
        isBuiltin: true,
        enabled: true,
      },
    ]

    // Built-in LLM Judge Graders
    const llmJudgeGraders: Omit<LLMJudgeGrader, 'id' | 'syncId' | 'createdAt' | 'updatedAt'>[] = [
      {
        name: 'Tone Consistency',
        description: 'Check if the output maintains a consistent and appropriate tone',
        type: 'llm_judge',
        config: {
          providerId: null, // Uses default provider
          promptTemplate: `Evaluate the tone of the following text on a scale of 1-5:
1 = Inconsistent or inappropriate tone
5 = Perfectly consistent and appropriate tone

Text to evaluate:
{{output}}

Rate the tone consistency and explain your reasoning.`,
          outputSchema: 'score_1_to_5',
          systemPrompt: 'You are a tone and style evaluator. Assess whether the text maintains an appropriate and consistent tone throughout.',
        },
        isBuiltin: true,
        enabled: true,
      },
      {
        name: 'Task Completion',
        description: 'Verify if the AI completed the requested task',
        type: 'llm_judge',
        config: {
          providerId: null, // Uses default provider
          promptTemplate: `Given the original prompt and the AI's response, determine if the task was completed satisfactorily.

Original prompt:
{{input}}

AI response:
{{output}}

Did the AI complete the task? Answer with PASS or FAIL and explain why.`,
          outputSchema: 'pass_fail_reason',
          systemPrompt: 'You are a task completion evaluator. Determine if the AI response adequately addresses what was asked in the original prompt.',
        },
        isBuiltin: true,
        enabled: true,
      },
      {
        name: 'Empathy Score',
        description: 'Assess the empathy and emotional intelligence in the response',
        type: 'llm_judge',
        config: {
          providerId: null, // Uses default provider
          promptTemplate: `Rate the empathy and emotional intelligence of the following response on a scale of 1-5:
1 = Cold, dismissive, or inappropriate
5 = Highly empathetic and emotionally intelligent

Response to evaluate:
{{output}}

Rate the empathy level and explain your reasoning.`,
          outputSchema: 'score_1_to_5',
          systemPrompt: 'You are an empathy evaluator. Assess how well the response demonstrates understanding, compassion, and emotional intelligence.',
        },
        isBuiltin: true,
        enabled: true,
      },
    ]

    // Create all built-in graders
    for (const grader of [...assertionGraders, ...llmJudgeGraders]) {
      await createGrader(grader)
    }

    return { ok: true, data: undefined }
  } catch (err) {
    return { ok: false, error: `Failed to seed built-in graders: ${err instanceof Error ? err.message : String(err)}` }
  }
}

// ============================================================================
// Analytics Aggregation Functions
// ============================================================================

export interface PromptHealthStats {
  passRate: number        // 0-100 percentage
  totalRuns: number       // Total runs in period
  passedRuns: number      // Runs where all graders passed
  trend: number           // Percentage change from previous period (-100 to +100)
  trendDirection: 'up' | 'down' | 'stable'
  avgGraderScore: number  // 0-100 average across all grader results
  runDates: string[]      // Last 7 days with runs for sparkline
}

export interface DailyPassRate {
  date: string            // YYYY-MM-DD
  passRate: number        // 0-100 percentage
  runCount: number
  passedCount: number
}

/**
 * Get prompt health statistics for the PromptHealthCard component.
 * Calculates pass rate based on grader results.
 */
export async function getPromptHealthStats(
  promptId: string,
  days: number = 7
): Promise<Result<PromptHealthStats>> {
  try {
    const database = await getDb()
    const now = new Date()
    const startDate = new Date(now)
    startDate.setDate(startDate.getDate() - days)
    const previousStartDate = new Date(startDate)
    previousStartDate.setDate(previousStartDate.getDate() - days)

    // Get runs from current period
    const currentRuns = await database.select<{ id: string; started_at: string }[]>(
      `SELECT id, started_at FROM prompt_runs
       WHERE prompt_id = ? AND started_at >= ? AND status = 'completed'
       ORDER BY started_at DESC`,
      [promptId, startDate.toISOString()]
    )

    // Get runs from previous period for trend comparison
    const previousRuns = await database.select<{ id: string }[]>(
      `SELECT id FROM prompt_runs
       WHERE prompt_id = ? AND started_at >= ? AND started_at < ? AND status = 'completed'`,
      [promptId, previousStartDate.toISOString(), startDate.toISOString()]
    )

    if (currentRuns.length === 0) {
      return {
        ok: true,
        data: {
          passRate: 0,
          totalRuns: 0,
          passedRuns: 0,
          trend: 0,
          trendDirection: 'stable',
          avgGraderScore: 0,
          runDates: [],
        },
      }
    }

    // Get grader results for current runs
    const runIds = currentRuns.map(r => r.id)
    const placeholders = runIds.map(() => '?').join(',')
    const graderResults = await database.select<{ run_id: string; passed: number; score: number }[]>(
      `SELECT run_id, passed, score FROM grader_results WHERE run_id IN (${placeholders})`,
      runIds
    )

    // Calculate pass rate: a run passes if ALL its graders pass
    const runPassStatus = new Map<string, boolean>()
    const runHasGraders = new Set<string>()

    for (const result of graderResults) {
      runHasGraders.add(result.run_id)
      const currentStatus = runPassStatus.get(result.run_id)
      // A run fails if any grader fails
      if (currentStatus === undefined) {
        runPassStatus.set(result.run_id, result.passed === 1)
      } else if (result.passed !== 1) {
        runPassStatus.set(result.run_id, false)
      }
    }

    // Only count runs that have grader results
    const runsWithGraders = currentRuns.filter(r => runHasGraders.has(r.id))
    const passedRuns = runsWithGraders.filter(r => runPassStatus.get(r.id) === true).length
    const passRate = runsWithGraders.length > 0 ? (passedRuns / runsWithGraders.length) * 100 : 0

    // Calculate previous period pass rate for trend
    let previousPassRate = 0
    if (previousRuns.length > 0) {
      const prevRunIds = previousRuns.map(r => r.id)
      const prevPlaceholders = prevRunIds.map(() => '?').join(',')
      const prevGraderResults = await database.select<{ run_id: string; passed: number }[]>(
        `SELECT run_id, passed FROM grader_results WHERE run_id IN (${prevPlaceholders})`,
        prevRunIds
      )

      const prevRunPassStatus = new Map<string, boolean>()
      const prevRunHasGraders = new Set<string>()

      for (const result of prevGraderResults) {
        prevRunHasGraders.add(result.run_id)
        const currentStatus = prevRunPassStatus.get(result.run_id)
        if (currentStatus === undefined) {
          prevRunPassStatus.set(result.run_id, result.passed === 1)
        } else if (result.passed !== 1) {
          prevRunPassStatus.set(result.run_id, false)
        }
      }

      const prevRunsWithGraders = previousRuns.filter(r => prevRunHasGraders.has(r.id))
      const prevPassedRuns = prevRunsWithGraders.filter(r => prevRunPassStatus.get(r.id) === true).length
      previousPassRate = prevRunsWithGraders.length > 0 ? (prevPassedRuns / prevRunsWithGraders.length) * 100 : 0
    }

    // Calculate trend
    const trend = passRate - previousPassRate
    const trendDirection: 'up' | 'down' | 'stable' =
      Math.abs(trend) < 1 ? 'stable' : trend > 0 ? 'up' : 'down'

    // Calculate average grader score
    const avgGraderScore = graderResults.length > 0
      ? (graderResults.reduce((sum, r) => sum + r.score, 0) / graderResults.length) * 100
      : 0

    // Get unique dates for sparkline
    const runDates = [...new Set(currentRuns.map(r => r.started_at.split('T')[0]))].sort()

    return {
      ok: true,
      data: {
        passRate: Math.round(passRate * 10) / 10,
        totalRuns: currentRuns.length,
        passedRuns,
        trend: Math.round(trend * 10) / 10,
        trendDirection,
        avgGraderScore: Math.round(avgGraderScore * 10) / 10,
        runDates,
      },
    }
  } catch (err) {
    return { ok: false, error: `Failed to get prompt health stats: ${err instanceof Error ? err.message : String(err)}` }
  }
}

/**
 * Get daily pass rates for sparkline visualization.
 * Returns last N days of pass rate data.
 */
export async function getPromptPassRateTrend(
  promptId: string,
  days: number = 7
): Promise<Result<DailyPassRate[]>> {
  try {
    const database = await getDb()
    const now = new Date()
    const startDate = new Date(now)
    startDate.setDate(startDate.getDate() - days)

    // Get all runs in the period
    const runs = await database.select<{ id: string; started_at: string }[]>(
      `SELECT id, started_at FROM prompt_runs
       WHERE prompt_id = ? AND started_at >= ? AND status = 'completed'
       ORDER BY started_at`,
      [promptId, startDate.toISOString()]
    )

    if (runs.length === 0) {
      return { ok: true, data: [] }
    }

    // Get grader results for all runs
    const runIds = runs.map(r => r.id)
    const placeholders = runIds.map(() => '?').join(',')
    const graderResults = await database.select<{ run_id: string; passed: number }[]>(
      `SELECT run_id, passed FROM grader_results WHERE run_id IN (${placeholders})`,
      runIds
    )

    // Build run pass status map
    const runPassStatus = new Map<string, boolean>()
    const runHasGraders = new Set<string>()

    for (const result of graderResults) {
      runHasGraders.add(result.run_id)
      const currentStatus = runPassStatus.get(result.run_id)
      if (currentStatus === undefined) {
        runPassStatus.set(result.run_id, result.passed === 1)
      } else if (result.passed !== 1) {
        runPassStatus.set(result.run_id, false)
      }
    }

    // Group runs by date
    const runsByDate = new Map<string, { total: number; passed: number }>()

    for (const run of runs) {
      const date = run.started_at.split('T')[0]
      const stats = runsByDate.get(date) || { total: 0, passed: 0 }

      if (runHasGraders.has(run.id)) {
        stats.total++
        if (runPassStatus.get(run.id)) {
          stats.passed++
        }
      }

      runsByDate.set(date, stats)
    }

    // Build daily pass rate array
    const dailyRates: DailyPassRate[] = []
    for (const [date, stats] of runsByDate.entries()) {
      if (stats.total > 0) {
        dailyRates.push({
          date,
          passRate: Math.round((stats.passed / stats.total) * 100 * 10) / 10,
          runCount: stats.total,
          passedCount: stats.passed,
        })
      }
    }

    // Sort by date
    dailyRates.sort((a, b) => a.date.localeCompare(b.date))

    return { ok: true, data: dailyRates }
  } catch (err) {
    return { ok: false, error: `Failed to get pass rate trend: ${err instanceof Error ? err.message : String(err)}` }
  }
}

/**
 * Get aggregate grader stats for runs (for RunsTab enhancement).
 */
export interface RunsAggregateStats {
  totalRuns: number
  runsWithGraders: number
  passedRuns: number
  passRate: number          // 0-100 percentage
  avgGraderScore: number    // 0-100 percentage
  totalCost: number
  costPerSuccessfulRun: number
}

export async function getRunsAggregateStats(
  promptId: string,
  limit: number = 50
): Promise<Result<RunsAggregateStats>> {
  try {
    const database = await getDb()

    // Get runs
    const runs = await database.select<{ id: string; estimated_cost_usd: number | null }[]>(
      `SELECT id, estimated_cost_usd FROM prompt_runs
       WHERE prompt_id = ? AND status = 'completed'
       ORDER BY created_at DESC
       LIMIT ?`,
      [promptId, limit]
    )

    if (runs.length === 0) {
      return {
        ok: true,
        data: {
          totalRuns: 0,
          runsWithGraders: 0,
          passedRuns: 0,
          passRate: 0,
          avgGraderScore: 0,
          totalCost: 0,
          costPerSuccessfulRun: 0,
        },
      }
    }

    // Get grader results
    const runIds = runs.map(r => r.id)
    const placeholders = runIds.map(() => '?').join(',')
    const graderResults = await database.select<{ run_id: string; passed: number; score: number }[]>(
      `SELECT run_id, passed, score FROM grader_results WHERE run_id IN (${placeholders})`,
      runIds
    )

    // Calculate run pass status
    const runPassStatus = new Map<string, boolean>()
    const runHasGraders = new Set<string>()

    for (const result of graderResults) {
      runHasGraders.add(result.run_id)
      const currentStatus = runPassStatus.get(result.run_id)
      if (currentStatus === undefined) {
        runPassStatus.set(result.run_id, result.passed === 1)
      } else if (result.passed !== 1) {
        runPassStatus.set(result.run_id, false)
      }
    }

    const runsWithGraders = runs.filter(r => runHasGraders.has(r.id)).length
    const passedRuns = runs.filter(r => runPassStatus.get(r.id) === true).length
    const passRate = runsWithGraders > 0 ? (passedRuns / runsWithGraders) * 100 : 0

    const avgGraderScore = graderResults.length > 0
      ? (graderResults.reduce((sum, r) => sum + r.score, 0) / graderResults.length) * 100
      : 0

    const totalCost = runs.reduce((sum, r) => sum + (r.estimated_cost_usd || 0), 0)
    const costPerSuccessfulRun = passedRuns > 0 ? totalCost / passedRuns : 0

    return {
      ok: true,
      data: {
        totalRuns: runs.length,
        runsWithGraders,
        passedRuns,
        passRate: Math.round(passRate * 10) / 10,
        avgGraderScore: Math.round(avgGraderScore * 10) / 10,
        totalCost: Math.round(totalCost * 10000) / 10000,
        costPerSuccessfulRun: Math.round(costPerSuccessfulRun * 10000) / 10000,
      },
    }
  } catch (err) {
    return { ok: false, error: `Failed to get runs aggregate stats: ${err instanceof Error ? err.message : String(err)}` }
  }
}

// ============================================================================
// Playbook Operations
// ============================================================================

export async function getAllPlaybooks(): Promise<Result<Playbook[]>> {
  try {
    const database = await getDb()
    const result = await database.select<PlaybookRow[]>(
      'SELECT * FROM playbooks ORDER BY name ASC'
    )
    return { ok: true, data: result.map(rowToPlaybook) }
  } catch (err) {
    return { ok: false, error: `Failed to get playbooks: ${err instanceof Error ? err.message : String(err)}` }
  }
}

export async function getPlaybook(id: string): Promise<Result<Playbook | null>> {
  try {
    const database = await getDb()
    const result = await database.select<PlaybookRow[]>(
      'SELECT * FROM playbooks WHERE id = ?',
      [id]
    )
    return { ok: true, data: result.length > 0 ? rowToPlaybook(result[0]) : null }
  } catch (err) {
    return { ok: false, error: `Failed to get playbook: ${err instanceof Error ? err.message : String(err)}` }
  }
}

export async function createPlaybook(data: CreatePlaybookData): Promise<Result<Playbook>> {
  try {
    const database = await getDb()
    const id = crypto.randomUUID()
    const syncId = crypto.randomUUID()
    const now = new Date().toISOString()

    await database.execute(
      `INSERT INTO playbooks (id, sync_id, name, description, enabled, rule_count, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 0, ?, ?)`,
      [
        id,
        syncId,
        data.name.trim(),
        data.description?.trim() ?? null,
        data.enabled !== false ? 1 : 0,
        now,
        now,
      ]
    )

    const playbook: Playbook = {
      id,
      syncId,
      name: data.name.trim(),
      description: data.description?.trim(),
      enabled: data.enabled !== false,
      ruleCount: 0,
      createdAt: now,
      updatedAt: now,
    }

    return { ok: true, data: playbook }
  } catch (err) {
    return { ok: false, error: `Failed to create playbook: ${err instanceof Error ? err.message : String(err)}` }
  }
}

export async function updatePlaybook(id: string, data: UpdatePlaybookData): Promise<Result<void>> {
  try {
    const database = await getDb()
    const now = new Date().toISOString()

    const setClauses: string[] = ['updated_at = ?']
    const params: (string | number | null)[] = [now]

    if (data.name !== undefined) {
      setClauses.push('name = ?')
      params.push(data.name.trim())
    }
    if (data.description !== undefined) {
      setClauses.push('description = ?')
      params.push(data.description?.trim() ?? null)
    }
    if (data.enabled !== undefined) {
      setClauses.push('enabled = ?')
      params.push(data.enabled ? 1 : 0)
    }

    params.push(id)

    await database.execute(
      `UPDATE playbooks SET ${setClauses.join(', ')} WHERE id = ?`,
      params
    )

    return { ok: true, data: undefined }
  } catch (err) {
    return { ok: false, error: `Failed to update playbook: ${err instanceof Error ? err.message : String(err)}` }
  }
}

export async function deletePlaybook(id: string): Promise<Result<void>> {
  try {
    const database = await getDb()
    // Cascade will handle playbook_rules and prompt_playbooks
    await database.execute('DELETE FROM playbooks WHERE id = ?', [id])
    return { ok: true, data: undefined }
  } catch (err) {
    return { ok: false, error: `Failed to delete playbook: ${err instanceof Error ? err.message : String(err)}` }
  }
}

// ============================================================================
// Playbook Rule Operations
// ============================================================================

export async function getPlaybookRules(playbookId: string): Promise<Result<PlaybookRule[]>> {
  try {
    const database = await getDb()
    const result = await database.select<PlaybookRuleRow[]>(
      'SELECT * FROM playbook_rules WHERE playbook_id = ? ORDER BY priority DESC, created_at ASC',
      [playbookId]
    )
    return { ok: true, data: result.map(rowToPlaybookRule) }
  } catch (err) {
    return { ok: false, error: `Failed to get playbook rules: ${err instanceof Error ? err.message : String(err)}` }
  }
}

export async function getPlaybookRule(id: string): Promise<Result<PlaybookRule | null>> {
  try {
    const database = await getDb()
    const result = await database.select<PlaybookRuleRow[]>(
      'SELECT * FROM playbook_rules WHERE id = ?',
      [id]
    )
    return { ok: true, data: result.length > 0 ? rowToPlaybookRule(result[0]) : null }
  } catch (err) {
    return { ok: false, error: `Failed to get playbook rule: ${err instanceof Error ? err.message : String(err)}` }
  }
}

export async function createPlaybookRule(data: CreatePlaybookRuleData): Promise<Result<PlaybookRule>> {
  try {
    const database = await getDb()
    const id = crypto.randomUUID()
    const syncId = crypto.randomUUID()
    const now = new Date().toISOString()

    await database.execute(
      `INSERT INTO playbook_rules (
        id, sync_id, playbook_id, trigger_context, instruction, bad_example_input,
        bad_example_output, golden_output, source_run_id, priority, enabled, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        syncId,
        data.playbookId,
        data.triggerContext.trim(),
        data.instruction.trim(),
        data.badExampleInput?.trim() ?? null,
        data.badExampleOutput?.trim() ?? null,
        data.goldenOutput?.trim() ?? null,
        data.sourceRunId ?? null,
        data.priority ?? 100,
        data.enabled !== false ? 1 : 0,
        now,
        now,
      ]
    )

    // Update rule count on playbook
    await database.execute(
      'UPDATE playbooks SET rule_count = rule_count + 1, updated_at = ? WHERE id = ?',
      [now, data.playbookId]
    )

    const rule: PlaybookRule = {
      id,
      syncId,
      playbookId: data.playbookId,
      triggerContext: data.triggerContext.trim(),
      instruction: data.instruction.trim(),
      badExampleInput: data.badExampleInput?.trim(),
      badExampleOutput: data.badExampleOutput?.trim(),
      goldenOutput: data.goldenOutput?.trim(),
      sourceRunId: data.sourceRunId,
      priority: data.priority ?? 100,
      enabled: data.enabled !== false,
      createdAt: now,
      updatedAt: now,
    }

    return { ok: true, data: rule }
  } catch (err) {
    return { ok: false, error: `Failed to create playbook rule: ${err instanceof Error ? err.message : String(err)}` }
  }
}

export async function updatePlaybookRule(id: string, data: UpdatePlaybookRuleData): Promise<Result<void>> {
  try {
    const database = await getDb()
    const now = new Date().toISOString()

    const setClauses: string[] = ['updated_at = ?']
    const params: (string | number | null)[] = [now]

    if (data.triggerContext !== undefined) {
      setClauses.push('trigger_context = ?')
      params.push(data.triggerContext.trim())
    }
    if (data.instruction !== undefined) {
      setClauses.push('instruction = ?')
      params.push(data.instruction.trim())
    }
    if (data.badExampleInput !== undefined) {
      setClauses.push('bad_example_input = ?')
      params.push(data.badExampleInput?.trim() ?? null)
    }
    if (data.badExampleOutput !== undefined) {
      setClauses.push('bad_example_output = ?')
      params.push(data.badExampleOutput?.trim() ?? null)
    }
    if (data.goldenOutput !== undefined) {
      setClauses.push('golden_output = ?')
      params.push(data.goldenOutput?.trim() ?? null)
    }
    if (data.priority !== undefined) {
      setClauses.push('priority = ?')
      params.push(data.priority)
    }
    if (data.enabled !== undefined) {
      setClauses.push('enabled = ?')
      params.push(data.enabled ? 1 : 0)
    }

    params.push(id)

    await database.execute(
      `UPDATE playbook_rules SET ${setClauses.join(', ')} WHERE id = ?`,
      params
    )

    return { ok: true, data: undefined }
  } catch (err) {
    return { ok: false, error: `Failed to update playbook rule: ${err instanceof Error ? err.message : String(err)}` }
  }
}

export async function deletePlaybookRule(id: string): Promise<Result<void>> {
  try {
    const database = await getDb()

    // Get the rule to find its playbook
    const ruleResult = await database.select<PlaybookRuleRow[]>(
      'SELECT playbook_id FROM playbook_rules WHERE id = ?',
      [id]
    )

    if (ruleResult.length === 0) {
      return { ok: false, error: 'Rule not found' }
    }

    const playbookId = ruleResult[0].playbook_id
    const now = new Date().toISOString()

    // Delete the rule
    await database.execute('DELETE FROM playbook_rules WHERE id = ?', [id])

    // Update rule count on playbook
    await database.execute(
      'UPDATE playbooks SET rule_count = rule_count - 1, updated_at = ? WHERE id = ?',
      [now, playbookId]
    )

    return { ok: true, data: undefined }
  } catch (err) {
    return { ok: false, error: `Failed to delete playbook rule: ${err instanceof Error ? err.message : String(err)}` }
  }
}

// ============================================================================
// Prompt-Playbook Association Operations
// ============================================================================

export async function getPromptPlaybooks(promptId: string): Promise<Result<Playbook[]>> {
  try {
    const database = await getDb()
    const result = await database.select<PlaybookRow[]>(
      `SELECT p.* FROM playbooks p
       JOIN prompt_playbooks pp ON p.id = pp.playbook_id
       WHERE pp.prompt_id = ? AND pp.enabled = 1
       ORDER BY pp."order" ASC, p.name ASC`,
      [promptId]
    )
    return { ok: true, data: result.map(rowToPlaybook) }
  } catch (err) {
    return { ok: false, error: `Failed to get prompt playbooks: ${err instanceof Error ? err.message : String(err)}` }
  }
}

export async function setPromptPlaybooks(promptId: string, playbookIds: string[]): Promise<Result<void>> {
  try {
    const database = await getDb()
    const now = new Date().toISOString()

    // Clear existing associations
    await database.execute('DELETE FROM prompt_playbooks WHERE prompt_id = ?', [promptId])

    // Add new associations with order
    for (let i = 0; i < playbookIds.length; i++) {
      const id = crypto.randomUUID()
      await database.execute(
        `INSERT INTO prompt_playbooks (id, prompt_id, playbook_id, "order", enabled, created_at)
         VALUES (?, ?, ?, ?, 1, ?)`,
        [id, promptId, playbookIds[i], i, now]
      )
    }

    return { ok: true, data: undefined }
  } catch (err) {
    return { ok: false, error: `Failed to set prompt playbooks: ${err instanceof Error ? err.message : String(err)}` }
  }
}

/**
 * Get all enabled rules for a prompt (from all attached enabled playbooks)
 * Rules are ordered by playbook order, then by priority (desc), then by creation date
 */
export async function getActiveRulesForPrompt(promptId: string): Promise<Result<PlaybookRule[]>> {
  try {
    const database = await getDb()
    const result = await database.select<PlaybookRuleRow[]>(
      `SELECT pr.* FROM playbook_rules pr
       JOIN playbooks p ON pr.playbook_id = p.id
       JOIN prompt_playbooks pp ON p.id = pp.playbook_id
       WHERE pp.prompt_id = ?
         AND pp.enabled = 1
         AND p.enabled = 1
         AND pr.enabled = 1
       ORDER BY pp."order" ASC, pr.priority DESC, pr.created_at ASC`,
      [promptId]
    )
    return { ok: true, data: result.map(rowToPlaybookRule) }
  } catch (err) {
    return { ok: false, error: `Failed to get active rules for prompt: ${err instanceof Error ? err.message : String(err)}` }
  }
}
