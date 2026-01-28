import { readDir, readTextFile, writeTextFile, remove } from '@tauri-apps/plugin-fs'
import { join, resolve } from '@tauri-apps/api/path'
import { parseAgentFile, serializeAgent } from './agent-parser'
import type { AgentFile, AgentIcon, AgentSettings, AgentTool } from '../types/agent'

export interface InitialAgentContent {
  name?: string
  description?: string
  systemPrompt?: string
  icon?: AgentIcon
  tags?: string[]
  settings?: AgentSettings
  tools?: AgentTool[]
}

const AGENT_FILE_EXTENSION = '.agent.md'

async function isPathInFolder(filePath: string, folderPath: string): Promise<boolean> {
  const resolvedFile = await resolve(filePath)
  const resolvedFolder = await resolve(folderPath)
  return resolvedFile.startsWith(resolvedFolder)
}

export async function loadAgents(folderPath: string): Promise<AgentFile[]> {
  try {
    const entries = await readDir(folderPath)
    const agentFiles = entries.filter((e) => e.name?.endsWith(AGENT_FILE_EXTENSION))

    const agents = await Promise.all(
      agentFiles.map(async (file) => {
        const path = await join(folderPath, file.name!)
        const content = await readTextFile(path)
        return parseAgentFile(content, file.name!, path)
      })
    )

    return agents.sort((a, b) => a.name.localeCompare(b.name))
  } catch (error) {
    // Folder might not exist or have no agent files
    console.warn('Failed to load agents:', error)
    return []
  }
}

export async function saveAgent(agent: AgentFile): Promise<void> {
  const now = new Date().toISOString()
  const agentWithTimestamp: AgentFile = {
    ...agent,
    updatedAt: now,
    createdAt: agent.createdAt || now,
  }
  const content = serializeAgent(agentWithTimestamp)
  await writeTextFile(agent.path, content)
}

export async function createAgent(
  folderPath: string,
  existingFileNames: string[],
  existingDisplayNames: string[],
  initialContent?: InitialAgentContent
): Promise<AgentFile> {
  const baseName = initialContent?.name
    ? toKebabCase(initialContent.name)
    : 'new-agent'
  const fileName = generateUniqueFileName(baseName, existingFileNames)
  const displayName = generateUniqueDisplayName(
    initialContent?.name || 'New Agent',
    existingDisplayNames
  )
  const path = await join(folderPath, fileName)

  if (!await isPathInFolder(path, folderPath)) {
    throw new Error('Path traversal detected')
  }

  const id = crypto.randomUUID()
  const now = new Date().toISOString()

  const agent: AgentFile = {
    id,
    fileName,
    path,
    name: displayName,
    description: initialContent?.description || '',
    tags: initialContent?.tags || [],
    icon: initialContent?.icon || 'bot',
    systemPrompt: initialContent?.systemPrompt || getDefaultSystemPrompt(),
    settings: initialContent?.settings || {},
    tools: initialContent?.tools || [],
    rawContent: '',
    isValid: true,
    errors: [],
    createdAt: now,
    updatedAt: now,
  }

  await saveAgent(agent)

  // Read back to ensure consistency
  const written = await readTextFile(path)
  return parseAgentFile(written, fileName, path)
}

export async function duplicateAgent(
  original: AgentFile,
  folderPath: string,
  existingFileNames: string[],
  existingDisplayNames: string[]
): Promise<AgentFile> {
  const baseName = original.fileName.replace(AGENT_FILE_EXTENSION, '')
  const newFileName = generateUniqueFileName(`${baseName} copy`, existingFileNames)
  const newDisplayName = generateUniqueDisplayName(`${original.name} copy`, existingDisplayNames)
  const newPath = await join(folderPath, newFileName)

  if (!await isPathInFolder(newPath, folderPath)) {
    throw new Error('Path traversal detected')
  }

  const now = new Date().toISOString()
  const newAgent: AgentFile = {
    ...original,
    id: crypto.randomUUID(),
    fileName: newFileName,
    path: newPath,
    name: newDisplayName,
    tags: [...(original.tags || [])],
    tools: JSON.parse(JSON.stringify(original.tools || [])),
    createdAt: now,
    updatedAt: now,
  }

  await saveAgent(newAgent)
  return newAgent
}

export async function deleteAgent(agent: AgentFile): Promise<void> {
  await remove(agent.path)
}

function generateUniqueFileName(baseName: string, existingNames: string[]): string {
  let fileName = `${baseName}${AGENT_FILE_EXTENSION}`
  let counter = 1

  while (existingNames.includes(fileName)) {
    fileName = `${baseName} ${counter}${AGENT_FILE_EXTENSION}`
    counter++
  }

  return fileName
}

export function generateUniqueDisplayName(baseName: string, existingNames: string[]): string {
  let displayName = baseName
  let counter = 1

  while (existingNames.includes(displayName)) {
    displayName = `${baseName} ${counter}`
    counter++
  }

  return displayName
}

export function isDisplayNameUnique(
  name: string,
  existingNames: string[],
  currentPath?: string,
  agents?: { name: string; path: string }[]
): boolean {
  if (agents && currentPath) {
    return !agents.some((a) => a.name === name && a.path !== currentPath)
  }
  return !existingNames.includes(name)
}

function toKebabCase(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

function getDefaultSystemPrompt(): string {
  return `You are a helpful AI assistant. Your role is to assist users with their tasks by providing accurate, helpful, and thoughtful responses.

Key guidelines:
- Be clear and concise in your responses
- Ask clarifying questions when the user's request is ambiguous
- Provide step-by-step guidance when appropriate
- Be honest about limitations and uncertainties`
}
