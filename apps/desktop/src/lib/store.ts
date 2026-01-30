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
import { isValidTagName } from './constants'

// Result type for operations that can fail
export type Result<T> = { ok: true; data: T } | { ok: false; error: string }

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
}

const MAX_VERSIONS_PER_PROMPT = 50

export async function createPromptVersion(
  promptPath: string,
  content: string,
  description?: string
): Promise<Result<void>> {
  try {
    const database = await getDb()

    // Get the next version number
    const maxVersionResult = await database.select<{ max_version: number | null }[]>(
      'SELECT MAX(version_number) as max_version FROM prompt_versions WHERE prompt_path = ?',
      [promptPath]
    )
    const nextVersion = (maxVersionResult[0]?.max_version ?? 0) + 1

    // Insert the new version
    const id = crypto.randomUUID()
    await database.execute(
      'INSERT INTO prompt_versions (id, prompt_path, version_number, content, created_at, description) VALUES (?, ?, ?, ?, ?, ?)',
      [id, promptPath, nextVersion, content, new Date().toISOString(), description ?? null]
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
      [promptPath, promptPath, MAX_VERSIONS_PER_PROMPT]
    )

    return { ok: true, data: undefined }
  } catch (err) {
    return { ok: false, error: `Failed to create version: ${err instanceof Error ? err.message : String(err)}` }
  }
}

export async function getPromptVersions(promptPath: string): Promise<Result<PromptVersionRow[]>> {
  try {
    const database = await getDb()
    const result = await database.select<PromptVersionRow[]>(
      'SELECT id, prompt_path, version_number, content, created_at, description FROM prompt_versions WHERE prompt_path = ? ORDER BY version_number DESC',
      [promptPath]
    )
    return { ok: true, data: result }
  } catch (err) {
    return { ok: false, error: `Failed to get versions: ${err instanceof Error ? err.message : String(err)}` }
  }
}

export async function getPromptVersion(id: string): Promise<Result<PromptVersionRow | null>> {
  try {
    const database = await getDb()
    const result = await database.select<PromptVersionRow[]>(
      'SELECT id, prompt_path, version_number, content, created_at, description FROM prompt_versions WHERE id = ?',
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
    await database.execute('DELETE FROM prompt_versions WHERE prompt_path = ?', [promptPath])
    return { ok: true, data: undefined }
  } catch (err) {
    return { ok: false, error: `Failed to delete versions: ${err instanceof Error ? err.message : String(err)}` }
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
    promptId: row.prompt_id,
    promptPath: row.prompt_path,
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
    const now = new Date().toISOString()

    await database.execute(
      `INSERT INTO prompt_runs
       (id, prompt_id, prompt_path, prompt_name, launcher_id, status, started_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, promptId, promptPath, promptName, launcherId, 'pending', now, now]
    )

    return {
      ok: true,
      data: {
        id,
        promptId,
        promptPath,
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
      })),
    }
  } catch (err) {
    return { ok: false, error: `Failed to get analytics: ${err instanceof Error ? err.message : String(err)}` }
  }
}

// ============================================================================
// Chat Session Operations
// ============================================================================

interface ChatSessionRow {
  id: string
  agent_id: string
  title: string
  created_at: string
  updated_at: string
}

function rowToChatSession(row: ChatSessionRow): ChatSession {
  return {
    id: row.id,
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
    const now = new Date().toISOString()

    await database.execute(
      `INSERT INTO chat_sessions (id, agent_id, title, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?)`,
      [id, agentId, title, now, now]
    )

    return {
      ok: true,
      data: { id, agentId, title, createdAt: now, updatedAt: now },
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
}

const DEFAULT_FEATURE_FLAGS: FeatureFlags = {
  agentsEnabled: false,       // Default off for new installs
  resourcesEnabled: false,
  translationsEnabled: false,
  mcpServerEnabled: false,
  runsEnabled: false,
  gradersEnabled: false,
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
// Grader Operations
// ============================================================================

import type {
  Grader,
  AssertionGrader,
  LLMJudgeGrader,
  GraderResult,
  GraderResultWithGrader,
  PromptGrader,
  GraderType,
} from '../types/grader'

interface GraderRow {
  id: string
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
  grader: Omit<AssertionGrader, 'id' | 'createdAt' | 'updatedAt'> | Omit<LLMJudgeGrader, 'id' | 'createdAt' | 'updatedAt'>
): Promise<Result<Grader>> {
  try {
    const database = await getDb()
    const id = crypto.randomUUID()
    const now = new Date().toISOString()

    const config = grader.type === 'assertion'
      ? JSON.stringify((grader as Omit<AssertionGrader, 'id' | 'createdAt' | 'updatedAt'>).logic)
      : JSON.stringify((grader as Omit<LLMJudgeGrader, 'id' | 'createdAt' | 'updatedAt'>).config)

    await database.execute(
      `INSERT INTO graders (id, name, description, type, config, is_builtin, enabled, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
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
          ...(grader as Omit<AssertionGrader, 'id' | 'createdAt' | 'updatedAt'>),
          id,
          createdAt: now,
          updatedAt: now,
        } as AssertionGrader
      : {
          ...(grader as Omit<LLMJudgeGrader, 'id' | 'createdAt' | 'updatedAt'>),
          id,
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
    const assertionGraders: Omit<AssertionGrader, 'id' | 'createdAt' | 'updatedAt'>[] = [
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
    const llmJudgeGraders: Omit<LLMJudgeGrader, 'id' | 'createdAt' | 'updatedAt'>[] = [
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
