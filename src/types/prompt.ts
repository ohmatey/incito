export interface SelectOption {
  label: string
  value: string
}

export type SerializationFormat = 'newline' | 'comma' | 'numbered' | 'bullet'

export interface Variable {
  key: string
  label: string
  type: 'text' | 'textarea' | 'select' | 'number' | 'slider' | 'array' | 'multi-select'
  required?: boolean
  default?: string | number | string[]
  placeholder?: string
  preview?: string | number | string[]
  description?: string

  // Select/Multi-select options
  options?: SelectOption[]

  // Slider
  min?: number
  max?: number
  step?: number

  // Array/Multi-select output format
  format?: SerializationFormat
}

export interface Tag {
  id: string
  name: string
  color: string
}

export interface Note {
  id: string
  content: string
  createdAt: string
}

export interface PromptVersion {
  id: string
  promptPath: string
  versionNumber: number
  content: string
  createdAt: string
  description?: string
}

export interface ParseError {
  field: string
  message: string
}

export interface PromptFile {
  id: string
  fileName: string
  path: string
  name: string
  description: string
  tags: string[]
  variables: Variable[]
  notes: Note[]
  defaultLaunchers?: string[]
  template: string
  rawContent: string
  isValid: boolean
  errors: ParseError[]
}

export interface AppState {
  folderPath: string | null
  prompts: PromptFile[]
  selectedPrompt: PromptFile | null
  variableValues: Record<string, unknown>
  isLoading: boolean
  searchQuery: string
  editorMode: 'editor' | 'preview'
  showPreviewValues: boolean
  currentView: 'prompts' | 'tags'
  tags: Tag[]
  selectedTagFilter: string | null
}
