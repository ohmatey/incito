// Agent file format types - for .agent.md files

export type AgentIcon =
  | 'bot'
  | 'brain'
  | 'sparkles'
  | 'wand'
  | 'search'
  | 'pencil'
  | 'code'
  | 'file-text'
  | 'message-circle'
  | 'zap'
  | 'lightbulb'
  | 'target'
  | 'clipboard'
  | 'book'
  | 'globe'

export interface AgentTool {
  id: string
  name: string
  enabled: boolean
  description?: string
}

export interface AgentSettings {
  providerId?: string | null // null = use default provider
  model?: string
  temperature?: number
  maxTokens?: number
  language?: string
}

export interface AgentFile {
  id: string
  fileName: string
  path: string
  name: string
  description: string
  tags: string[]
  icon: AgentIcon
  systemPrompt: string
  settings: AgentSettings
  tools: AgentTool[]
  documentation?: string // Optional markdown content after frontmatter
  rawContent: string
  isValid: boolean
  errors: AgentParseError[]
  createdAt?: string
  updatedAt?: string
}

export interface AgentParseError {
  field: string
  message: string
}

// Chat types for agent conversations

export type ChatRole = 'user' | 'assistant' | 'system'

export type AttachmentType = 'image' | 'pdf' | 'text' | 'document'

export interface ChatAttachment {
  id: string
  fileName: string
  mimeType: string
  base64Data: string
  previewUrl?: string
  type: AttachmentType
  size: number
}

export interface ToolCallResult {
  toolCallId: string
  toolName: string
  args: Record<string, unknown>
  result?: unknown
}

export interface ChatMessage {
  id: string
  sessionId: string
  role: ChatRole
  content: string
  timestamp: string
  toolCalls?: ToolCallResult[]
  attachments?: ChatAttachment[]
}

export interface ChatSession {
  id: string
  agentId: string
  title: string
  createdAt: string
  updatedAt: string
}

// Pinned agents
export interface PinnedAgent {
  agentId: string
  pinnedAt: string
}
