import Database from '@tauri-apps/plugin-sql'
import { readFile, writeFile, remove, mkdir, exists } from '@tauri-apps/plugin-fs'
import { join } from '@tauri-apps/api/path'
import type { Resource, ResourceType, ResourceChunk } from '@/types/resource'
import { getResourceTypeFromExtension, isSupportedExtension } from '@/types/resource'
import type { Result } from './store'

// Database singleton - reuse from store
let db: Database | null = null

async function getDb(): Promise<Database> {
  if (!db) {
    db = await Database.load('sqlite:incito.db')
  }
  return db
}

// Generate a unique ID
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
}

// Get the resources folder path (creates if needed)
export async function getResourcesDir(promptsFolder: string): Promise<string> {
  const resourcesPath = await join(promptsFolder, 'resources')

  // Check if directory exists, create if not
  const dirExists = await exists(resourcesPath)
  if (!dirExists) {
    await mkdir(resourcesPath, { recursive: true })
  }

  return resourcesPath
}

// Get MIME type from file extension
function getMimeType(fileName: string): string {
  const ext = fileName.toLowerCase().split('.').pop() || ''
  const mimeTypes: Record<string, string> = {
    txt: 'text/plain',
    md: 'text/markdown',
    markdown: 'text/markdown',
    json: 'application/json',
    csv: 'text/csv',
    xml: 'application/xml',
    yaml: 'application/x-yaml',
    yml: 'application/x-yaml',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    webp: 'image/webp',
    svg: 'image/svg+xml',
    pdf: 'application/pdf',
  }
  return mimeTypes[ext] || 'application/octet-stream'
}

// ============================================================================
// Resource CRUD Operations
// ============================================================================

export async function getAllResources(): Promise<Result<Resource[]>> {
  try {
    const database = await getDb()
    const rows = await database.select<Array<{
      id: string
      file_name: string
      file_path: string
      file_type: string
      mime_type: string
      file_size: number
      uploaded_at: string
      indexed: number
      indexed_at: string | null
      chunk_count: number | null
      thumbnail_base64: string | null
    }>>('SELECT * FROM resources ORDER BY uploaded_at DESC')

    const resources: Resource[] = rows.map(row => ({
      id: row.id,
      fileName: row.file_name,
      filePath: row.file_path,
      fileType: row.file_type as ResourceType,
      mimeType: row.mime_type,
      fileSize: row.file_size,
      uploadedAt: row.uploaded_at,
      indexed: row.indexed === 1,
      indexedAt: row.indexed_at || undefined,
      chunkCount: row.chunk_count || undefined,
      thumbnailBase64: row.thumbnail_base64 || undefined,
    }))

    return { ok: true, data: resources }
  } catch (err) {
    return { ok: false, error: `Failed to get resources: ${err instanceof Error ? err.message : String(err)}` }
  }
}

export async function getResource(id: string): Promise<Result<Resource | null>> {
  try {
    const database = await getDb()
    const rows = await database.select<Array<{
      id: string
      file_name: string
      file_path: string
      file_type: string
      mime_type: string
      file_size: number
      uploaded_at: string
      indexed: number
      indexed_at: string | null
      chunk_count: number | null
      thumbnail_base64: string | null
    }>>('SELECT * FROM resources WHERE id = ?', [id])

    if (rows.length === 0) {
      return { ok: true, data: null }
    }

    const row = rows[0]
    const resource: Resource = {
      id: row.id,
      fileName: row.file_name,
      filePath: row.file_path,
      fileType: row.file_type as ResourceType,
      mimeType: row.mime_type,
      fileSize: row.file_size,
      uploadedAt: row.uploaded_at,
      indexed: row.indexed === 1,
      indexedAt: row.indexed_at || undefined,
      chunkCount: row.chunk_count || undefined,
      thumbnailBase64: row.thumbnail_base64 || undefined,
    }

    return { ok: true, data: resource }
  } catch (err) {
    return { ok: false, error: `Failed to get resource: ${err instanceof Error ? err.message : String(err)}` }
  }
}

export async function createResource(
  sourcePath: string,
  fileName: string,
  promptsFolder: string
): Promise<Result<Resource>> {
  try {
    // Validate file extension
    if (!isSupportedExtension(fileName)) {
      return { ok: false, error: 'Unsupported file type' }
    }

    // Get resource type
    const fileType = getResourceTypeFromExtension(fileName)
    if (!fileType) {
      return { ok: false, error: 'Could not determine file type' }
    }

    // Read the source file
    const content = await readFile(sourcePath)

    // Ensure resources directory exists
    const resourcesDir = await getResourcesDir(promptsFolder)

    // Generate unique filename if file already exists
    let targetFileName = fileName
    let targetPath = await join(resourcesDir, targetFileName)
    let counter = 1

    while (await exists(targetPath)) {
      const ext = fileName.lastIndexOf('.')
      if (ext === -1) {
        targetFileName = `${fileName}_${counter}`
      } else {
        targetFileName = `${fileName.slice(0, ext)}_${counter}${fileName.slice(ext)}`
      }
      targetPath = await join(resourcesDir, targetFileName)
      counter++
    }

    // Write file to resources folder
    await writeFile(targetPath, content)

    // Create database entry
    const id = generateId()
    const mimeType = getMimeType(targetFileName)
    const now = new Date().toISOString()

    const database = await getDb()
    await database.execute(
      `INSERT INTO resources (id, file_name, file_path, file_type, mime_type, file_size, uploaded_at, indexed)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0)`,
      [id, targetFileName, targetFileName, fileType, mimeType, content.length, now]
    )

    const resource: Resource = {
      id,
      fileName: targetFileName,
      filePath: targetFileName,
      fileType,
      mimeType,
      fileSize: content.length,
      uploadedAt: now,
      indexed: false,
    }

    return { ok: true, data: resource }
  } catch (err) {
    return { ok: false, error: `Failed to create resource: ${err instanceof Error ? err.message : String(err)}` }
  }
}

export async function deleteResource(id: string, promptsFolder: string): Promise<Result<void>> {
  try {
    const database = await getDb()

    // Get the resource to find the file path
    const resourceResult = await getResource(id)
    if (!resourceResult.ok) {
      return resourceResult
    }

    if (!resourceResult.data) {
      return { ok: false, error: 'Resource not found' }
    }

    // Delete the file
    const resourcesDir = await getResourcesDir(promptsFolder)
    const filePath = await join(resourcesDir, resourceResult.data.filePath)

    try {
      await remove(filePath)
    } catch {
      // File might not exist, continue with DB deletion
    }

    // Delete from database (chunks will be deleted via CASCADE)
    await database.execute('DELETE FROM resources WHERE id = ?', [id])

    return { ok: true, data: undefined }
  } catch (err) {
    return { ok: false, error: `Failed to delete resource: ${err instanceof Error ? err.message : String(err)}` }
  }
}

// ============================================================================
// File Operations
// ============================================================================

export async function getResourceFileContent(
  resource: Resource,
  promptsFolder: string
): Promise<Result<Uint8Array>> {
  try {
    const resourcesDir = await getResourcesDir(promptsFolder)
    const filePath = await join(resourcesDir, resource.filePath)
    const content = await readFile(filePath)
    return { ok: true, data: content }
  } catch (err) {
    return { ok: false, error: `Failed to read resource file: ${err instanceof Error ? err.message : String(err)}` }
  }
}

export async function getResourceTextContent(
  resource: Resource,
  promptsFolder: string
): Promise<Result<string>> {
  const contentResult = await getResourceFileContent(resource, promptsFolder)
  if (!contentResult.ok) {
    return contentResult
  }

  try {
    const decoder = new TextDecoder('utf-8')
    const text = decoder.decode(contentResult.data)
    return { ok: true, data: text }
  } catch (err) {
    return { ok: false, error: `Failed to decode resource as text: ${err instanceof Error ? err.message : String(err)}` }
  }
}

// ============================================================================
// Search Operations
// ============================================================================

export async function searchResources(
  query: string,
  fileType?: ResourceType
): Promise<Result<Resource[]>> {
  try {
    const database = await getDb()
    let sql = 'SELECT * FROM resources WHERE file_name LIKE ?'
    const params: (string | null)[] = [`%${query}%`]

    if (fileType) {
      sql += ' AND file_type = ?'
      params.push(fileType)
    }

    sql += ' ORDER BY uploaded_at DESC'

    const rows = await database.select<Array<{
      id: string
      file_name: string
      file_path: string
      file_type: string
      mime_type: string
      file_size: number
      uploaded_at: string
      indexed: number
      indexed_at: string | null
      chunk_count: number | null
      thumbnail_base64: string | null
    }>>(sql, params)

    const resources: Resource[] = rows.map(row => ({
      id: row.id,
      fileName: row.file_name,
      filePath: row.file_path,
      fileType: row.file_type as ResourceType,
      mimeType: row.mime_type,
      fileSize: row.file_size,
      uploadedAt: row.uploaded_at,
      indexed: row.indexed === 1,
      indexedAt: row.indexed_at || undefined,
      chunkCount: row.chunk_count || undefined,
      thumbnailBase64: row.thumbnail_base64 || undefined,
    }))

    return { ok: true, data: resources }
  } catch (err) {
    return { ok: false, error: `Failed to search resources: ${err instanceof Error ? err.message : String(err)}` }
  }
}

// ============================================================================
// Chunk Operations (for RAG)
// ============================================================================

export async function saveResourceChunks(
  resourceId: string,
  chunks: Array<{ content: string; embedding?: number[] }>
): Promise<Result<void>> {
  try {
    const database = await getDb()

    // Delete existing chunks
    await database.execute('DELETE FROM resource_chunks WHERE resource_id = ?', [resourceId])

    // Insert new chunks
    const now = new Date().toISOString()
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i]
      const id = generateId()
      const embeddingJson = chunk.embedding ? JSON.stringify(chunk.embedding) : null

      await database.execute(
        `INSERT INTO resource_chunks (id, resource_id, chunk_index, content, embedding, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [id, resourceId, i, chunk.content, embeddingJson, now]
      )
    }

    // Update resource with chunk count and indexed status
    await database.execute(
      `UPDATE resources SET indexed = 1, indexed_at = ?, chunk_count = ? WHERE id = ?`,
      [now, chunks.length, resourceId]
    )

    return { ok: true, data: undefined }
  } catch (err) {
    return { ok: false, error: `Failed to save resource chunks: ${err instanceof Error ? err.message : String(err)}` }
  }
}

export async function getResourceChunks(resourceId: string): Promise<Result<ResourceChunk[]>> {
  try {
    const database = await getDb()
    const rows = await database.select<Array<{
      id: string
      resource_id: string
      chunk_index: number
      content: string
      embedding: string | null
      created_at: string
    }>>('SELECT * FROM resource_chunks WHERE resource_id = ? ORDER BY chunk_index', [resourceId])

    const chunks: ResourceChunk[] = rows.map(row => ({
      id: row.id,
      resourceId: row.resource_id,
      chunkIndex: row.chunk_index,
      content: row.content,
      embedding: row.embedding ? JSON.parse(row.embedding) : undefined,
      createdAt: row.created_at,
    }))

    return { ok: true, data: chunks }
  } catch (err) {
    return { ok: false, error: `Failed to get resource chunks: ${err instanceof Error ? err.message : String(err)}` }
  }
}

// Update resource thumbnail (for images)
export async function updateResourceThumbnail(
  resourceId: string,
  thumbnailBase64: string
): Promise<Result<void>> {
  try {
    const database = await getDb()
    await database.execute(
      'UPDATE resources SET thumbnail_base64 = ? WHERE id = ?',
      [thumbnailBase64, resourceId]
    )
    return { ok: true, data: undefined }
  } catch (err) {
    return { ok: false, error: `Failed to update thumbnail: ${err instanceof Error ? err.message : String(err)}` }
  }
}

// Sync resources with file system (detect deleted files)
export async function syncResourcesWithFileSystem(promptsFolder: string): Promise<Result<number>> {
  try {
    const database = await getDb()
    const resourcesDir = await getResourcesDir(promptsFolder)

    // Get all resources from DB
    const resourcesResult = await getAllResources()
    if (!resourcesResult.ok) {
      return resourcesResult
    }

    let deletedCount = 0

    // Check each resource file exists
    for (const resource of resourcesResult.data) {
      const filePath = await join(resourcesDir, resource.filePath)
      const fileExists = await exists(filePath)

      if (!fileExists) {
        // File was deleted externally, remove from DB
        await database.execute('DELETE FROM resources WHERE id = ?', [resource.id])
        deletedCount++
      }
    }

    return { ok: true, data: deletedCount }
  } catch (err) {
    return { ok: false, error: `Failed to sync resources: ${err instanceof Error ? err.message : String(err)}` }
  }
}
