/**
 * Claude Code Sidecar Client
 *
 * This module provides a client for communicating with the Claude Code sidecar server.
 * The sidecar is a Bun-based server that handles Claude Code SDK operations,
 * which require Node.js-compatible runtime and CLI authentication.
 */

import { invoke } from '@tauri-apps/api/core'

const CLAUDE_CODE_URL = 'http://localhost:3457'

// Track the executable path the server was started with
// undefined = unknown (server might be running from previous session)
// null = started with default PATH
// string = started with custom path
let currentServerPath: string | null | undefined = undefined

/**
 * Result of finding or checking Claude Code path
 */
export interface ClaudeCodePathResult {
  found: boolean
  path?: string
  version?: string
  error?: string
}

/**
 * Health check response from the Claude Code server
 */
interface HealthResponse {
  status: 'ok'
  provider: 'claude-code'
  timestamp: string
}

/**
 * Auth status response from the Claude Code server
 */
interface AuthStatusResponse {
  authenticated: boolean
  model?: string
  error?: string
  hint?: string
}

/**
 * Generate response from the Claude Code server
 */
interface GenerateResponse {
  text: string
  usage?: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
  finishReason?: string
}

/**
 * Error response from the Claude Code server
 */
interface ErrorResponse {
  error: string
  code?: string
}

/**
 * Start the Claude Code sidecar server via Tauri
 * @param executablePath - Optional custom path to the Claude Code executable
 */
export async function startClaudeCodeServer(executablePath?: string | null): Promise<number> {
  const pid = await invoke<number>('start_claude_code_server', {
    executablePath: executablePath || null,
  })
  // Track what path we started with
  currentServerPath = executablePath
  return pid
}

/**
 * Find Claude Code executable path on the system
 * Uses 'which' on Unix or 'where' on Windows
 */
export async function findClaudeCodePath(): Promise<ClaudeCodePathResult> {
  return invoke<ClaudeCodePathResult>('find_claude_code_path')
}

/**
 * Check if a given path is a valid Claude Code executable
 * @param path - Path to check
 */
export async function checkClaudeCodePath(path: string): Promise<ClaudeCodePathResult> {
  return invoke<ClaudeCodePathResult>('check_claude_code_path', { path })
}

/**
 * Stop the Claude Code sidecar server via Tauri
 */
export async function stopClaudeCodeServer(): Promise<void> {
  await invoke('stop_claude_code_server')
  currentServerPath = undefined
}

/**
 * Check if the Claude Code server process is running (via Tauri state)
 */
export async function isClaudeCodeServerRunning(): Promise<boolean> {
  return invoke<boolean>('get_claude_code_server_status')
}

/**
 * Check if the Claude Code server is healthy and responding
 */
export async function checkClaudeCodeHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${CLAUDE_CODE_URL}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(2000),
    })
    if (!response.ok) return false
    const data = (await response.json()) as HealthResponse
    return data.status === 'ok'
  } catch {
    return false
  }
}

/**
 * Check the Claude CLI authentication status
 */
export async function checkClaudeCodeAuth(): Promise<AuthStatusResponse> {
  try {
    const response = await fetch(`${CLAUDE_CODE_URL}/auth-status`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000),
    })
    return (await response.json()) as AuthStatusResponse
  } catch (error) {
    return {
      authenticated: false,
      error: error instanceof Error ? error.message : 'Failed to check auth status',
      hint: 'Make sure the Claude Code server is running',
    }
  }
}

/**
 * Ensure the Claude Code server is running and healthy
 * Will start the server if not running and wait for it to be ready
 * Will restart if the executable path has changed
 * @param executablePath - Optional custom path to the Claude Code executable
 */
export async function ensureClaudeCodeServer(executablePath?: string | null): Promise<boolean> {
  // Normalize paths for comparison (treat empty string as null)
  const normalizedPath = executablePath || null

  // Check if server is already healthy
  const healthy = await checkClaudeCodeHealth()

  if (healthy) {
    // If we don't know what path the server was started with (undefined)
    // and a custom path is now requested, restart to be safe
    const needsRestart =
      currentServerPath === undefined
        ? normalizedPath !== null // Restart if custom path provided but we don't know current state
        : normalizedPath !== (currentServerPath || null) // Restart if path changed

    if (needsRestart) {
      await stopClaudeCodeServer()
    } else {
      return true
    }
  }

  // Check if process is running but not responding
  const running = await isClaudeCodeServerRunning()
  if (running) {
    // Process exists but not responding, stop and restart
    await stopClaudeCodeServer()
    currentServerPath = undefined
  }

  // Start the server
  try {
    await startClaudeCodeServer(executablePath)
  } catch {
    return false
  }

  // Wait for server to be ready (up to 10 seconds)
  for (let i = 0; i < 20; i++) {
    await new Promise((r) => setTimeout(r, 500))
    const healthy = await checkClaudeCodeHealth()
    if (healthy) return true
  }

  return false
}

/**
 * Generate text using Claude Code (non-streaming)
 */
export async function generateWithClaudeCode(
  prompt: string,
  options: {
    model?: 'opus' | 'sonnet' | 'haiku'
    system?: string
  } = {}
): Promise<GenerateResponse> {
  const response = await fetch(`${CLAUDE_CODE_URL}/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt,
      model: options.model || 'sonnet',
      system: options.system,
    }),
  })

  if (!response.ok) {
    const error = (await response.json()) as ErrorResponse
    throw new Error(error.error || 'Generation failed')
  }

  return (await response.json()) as GenerateResponse
}

/**
 * Stream text using Claude Code with Server-Sent Events
 */
export async function streamWithClaudeCode(
  messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>,
  options: {
    model?: 'opus' | 'sonnet' | 'haiku'
    system?: string
  },
  callbacks: {
    onChunk: (text: string) => void
    onComplete: () => void
    onError: (error: Error) => void
  },
  signal?: AbortSignal
): Promise<void> {
  const { onChunk, onComplete, onError } = callbacks

  try {
    const response = await fetch(`${CLAUDE_CODE_URL}/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages,
        model: options.model || 'sonnet',
        system: options.system,
      }),
      signal,
    })

    if (!response.ok) {
      const error = (await response.json()) as ErrorResponse
      throw new Error(error.error || 'Stream request failed')
    }

    const reader = response.body?.getReader()
    if (!reader) {
      throw new Error('No response body')
    }

    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })

      // Process complete SSE messages
      const lines = buffer.split('\n')
      buffer = lines.pop() || '' // Keep incomplete line in buffer

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6)
          try {
            const parsed = JSON.parse(data) as {
              type: 'text' | 'done' | 'error'
              content?: string
              error?: string
            }

            if (parsed.type === 'text' && parsed.content) {
              onChunk(parsed.content)
            } else if (parsed.type === 'done') {
              onComplete()
              return
            } else if (parsed.type === 'error') {
              throw new Error(parsed.error || 'Stream error')
            }
          } catch (parseError) {
            // Ignore JSON parse errors for incomplete data
            if (parseError instanceof SyntaxError) continue
            throw parseError
          }
        }
      }
    }

    onComplete()
  } catch (error) {
    if ((error as Error).name !== 'AbortError') {
      onError(error instanceof Error ? error : new Error(String(error)))
    }
  }
}
