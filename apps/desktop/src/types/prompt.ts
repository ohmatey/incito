export interface SelectOption {
  label: string
  value: string
}

export type SerializationFormat = 'newline' | 'comma' | 'numbered' | 'bullet'

export interface Variable {
  key: string
  label: string
  type: 'text' | 'textarea' | 'select' | 'number' | 'slider' | 'array' | 'multi-select' | 'image'
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

// Translation-related types (v0.10.0: English and Thai only)
export type LanguageCode = 'en' | 'th'

export type TranslationConfidence = 'high' | 'medium' | 'low'

export interface TranslationResult {
  text: string
  timestamp: string
  confidence: TranslationConfidence
  targetLanguage: LanguageCode
  preservedTerms?: string[]  // Technical terms kept as-is
}

export interface TranslationSettings {
  enabled: boolean                       // Master toggle
  sourceLanguages: LanguageCode[]        // Languages user writes in
  targetLanguage: LanguageCode           // Language to translate to
  autoDetect: boolean                    // Auto-detect source language
}

export interface TranslationCacheEntry {
  hash: string                           // SHA256 of source text
  sourceLang: LanguageCode
  targetLang: LanguageCode
  sourceText: string
  translatedText: string
  confidence: TranslationConfidence
  createdAt: string
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
  // Variant fields
  variants?: string[]      // Filenames of variant files (on parent prompt)
  variantOf?: string       // Filename of parent prompt (on variant prompts)
  // Translation fields
  sourceLanguage?: LanguageCode          // Auto-detected or manually set
  translationEnabled?: boolean           // Per-prompt override
  lastTranslation?: TranslationResult    // Most recent translation result
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

// Addon field types - custom fields added by users (not from prompt template)
export type AddonFieldType = 'image'

export interface AddonField {
  id: string
  type: AddonFieldType
  label: string
  description?: string
}

export interface ImageAddonValue {
  fileName: string
  filePath: string
  mimeType: string
  base64Data?: string  // For AI attachment
  previewUrl?: string  // For UI display (data URL)
}

export type AddonFieldValue = ImageAddonValue | null
