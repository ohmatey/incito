export type ResourceType = 'image' | 'document' | 'text' | 'pdf' | 'markdown'

export interface Resource {
  id: string
  fileName: string
  filePath: string          // Relative to resources folder
  fileType: ResourceType
  mimeType: string
  fileSize: number
  uploadedAt: string
  indexed: boolean
  indexedAt?: string
  chunkCount?: number
  thumbnailBase64?: string  // For image previews
}

export interface ResourceChunk {
  id: string
  resourceId: string
  chunkIndex: number
  content: string
  embedding?: number[]      // JSON-serialized in DB
  createdAt: string
}

export interface ResourceSearchResult {
  resource: Resource
  chunk: ResourceChunk
  score: number
}

// Helper to determine resource type from MIME type
export function getResourceTypeFromMime(mimeType: string): ResourceType {
  if (mimeType.startsWith('image/')) {
    return 'image'
  }
  if (mimeType === 'application/pdf') {
    return 'pdf'
  }
  if (mimeType === 'text/markdown' || mimeType === 'text/x-markdown') {
    return 'markdown'
  }
  if (mimeType.startsWith('text/') || mimeType === 'application/json') {
    return 'text'
  }
  return 'document'
}

// Supported file extensions
export const SUPPORTED_EXTENSIONS = {
  text: ['.txt', '.json', '.csv', '.xml', '.yaml', '.yml'],
  markdown: ['.md', '.markdown'],
  image: ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg'],
  pdf: ['.pdf'],
} as const

// Get extension from filename
export function getExtension(fileName: string): string {
  const lastDot = fileName.lastIndexOf('.')
  return lastDot === -1 ? '' : fileName.slice(lastDot).toLowerCase()
}

// Check if file extension is supported
export function isSupportedExtension(fileName: string): boolean {
  const ext = getExtension(fileName)
  return Object.values(SUPPORTED_EXTENSIONS).some(exts =>
    (exts as readonly string[]).includes(ext)
  )
}

// Get resource type from file extension
export function getResourceTypeFromExtension(fileName: string): ResourceType | null {
  const ext = getExtension(fileName)

  for (const [type, extensions] of Object.entries(SUPPORTED_EXTENSIONS)) {
    if ((extensions as readonly string[]).includes(ext)) {
      return type as ResourceType
    }
  }

  return null
}

// Format file size for display
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
}
