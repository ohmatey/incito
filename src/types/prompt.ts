export interface Variable {
  key: string
  label: string
  type: 'text' | 'textarea' | 'select' | 'number' | 'checkbox'
  required?: boolean
  default?: string | number | boolean
  placeholder?: string
  preview?: string | number | boolean
  options?: string[]
  description?: string
}

export interface Tag {
  id: string
  name: string
  color: string
}

export interface ParseError {
  field: string
  message: string
}

export interface PromptFile {
  fileName: string
  path: string
  name: string
  description: string
  tags: string[]
  variables: Variable[]
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
