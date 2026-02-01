import { readDir, readTextFile, writeTextFile, remove } from '@tauri-apps/plugin-fs'
import { join, resolve } from '@tauri-apps/api/path'
import { parsePromptFile, serializePrompt } from './parser'
import { syncPromptTags, createPromptVersion, deletePromptVersions, hasAIConfigured, setBaseFolderPath } from './store'
import { summarizePromptChanges } from './mastra-client'
import type { PromptFile, Variable } from '../types/prompt'

export interface InitialPromptContent {
  name?: string
  description?: string
  template?: string
  variables?: Variable[]
  tags?: string[]
}

async function isPathInFolder(filePath: string, folderPath: string): Promise<boolean> {
  const resolvedFile = await resolve(filePath)
  const resolvedFolder = await resolve(folderPath)
  return resolvedFile.startsWith(resolvedFolder)
}

export async function loadPrompts(folderPath: string): Promise<PromptFile[]> {
  // Set base folder path for relative path conversions (sync-ready)
  await setBaseFolderPath(folderPath)

  const entries = await readDir(folderPath)
  // Exclude agent files (.agent.md) - they're loaded separately
  const mdFiles = entries.filter((e) => e.name?.endsWith('.md') && !e.name?.endsWith('.agent.md'))

  const prompts = await Promise.all(
    mdFiles.map(async (file) => {
      const path = await join(folderPath, file.name!)
      const content = await readTextFile(path)
      return parsePromptFile(content, file.name!, path)
    })
  )

  // Sync all tags to SQLite
  await Promise.all(prompts.map(p => syncPromptTags(p.path, p.tags || [])))

  return prompts.sort((a, b) => a.name.localeCompare(b.name))
}

export async function savePrompt(prompt: PromptFile, folderPath: string, skipVersion = false): Promise<void> {
  // Security: Validate path is within the allowed folder
  if (!await isPathInFolder(prompt.path, folderPath)) {
    throw new Error('Path traversal detected: cannot save prompt outside of prompts folder')
  }

  const content = serializePrompt(prompt)

  // Create a version before saving (unless skipping, e.g., for restores)
  if (!skipVersion) {
    // Read the current content first to save as the "before" state
    try {
      const currentContent = await readTextFile(prompt.path)
      // Only create a version if content actually changed
      if (currentContent !== content) {
        // Try to generate AI description if AI is configured
        let description: string | undefined
        const aiConfigured = await hasAIConfigured()
        if (aiConfigured.ok && aiConfigured.data) {
          const summaryResult = await summarizePromptChanges(currentContent, content)
          if (summaryResult.ok) {
            description = summaryResult.data
          }
        }
        await createPromptVersion(prompt.path, currentContent, description)
      }
    } catch {
      // File might not exist yet (new prompt), skip version creation
    }
  }

  await writeTextFile(prompt.path, content)
  // Sync tags to SQLite
  await syncPromptTags(prompt.path, prompt.tags || [])
}

export async function createPrompt(
  folderPath: string,
  existingFileNames: string[],
  existingDisplayNames: string[],
  initialContent?: InitialPromptContent
): Promise<PromptFile> {
  const baseName = initialContent?.name
    ? toKebabCase(initialContent.name)
    : 'new-prompt'
  const fileName = generateUniqueFileName(baseName, existingFileNames)
  const displayName = generateUniqueDisplayName(
    initialContent?.name || 'New Prompt',
    existingDisplayNames
  )
  const path = await join(folderPath, fileName)

  if (!await isPathInFolder(path, folderPath)) {
    throw new Error('Path traversal detected')
  }

  const id = crypto.randomUUID()
  let template: string
  if (initialContent) {
    template = getPromptTemplateFromContent(displayName, id, initialContent)
  } else {
    template = getNewPromptTemplate(displayName, id)
  }

  await writeTextFile(path, template)

  // Read back to ensure consistency
  const written = await readTextFile(path)
  return parsePromptFile(written, fileName, path)
}

export async function duplicatePrompt(
  original: PromptFile,
  folderPath: string,
  existingFileNames: string[],
  existingDisplayNames: string[]
): Promise<PromptFile> {
  const baseName = original.fileName.replace('.md', '')
  const newFileName = generateUniqueFileName(`${baseName} copy`, existingFileNames)
  const newDisplayName = generateUniqueDisplayName(`${original.name} copy`, existingDisplayNames)
  const newPath = await join(folderPath, newFileName)

  if (!await isPathInFolder(newPath, folderPath)) {
    throw new Error('Path traversal detected')
  }

  const newPrompt: PromptFile = {
    ...original,
    id: crypto.randomUUID(),
    fileName: newFileName,
    path: newPath,
    name: newDisplayName,
    tags: [...(original.tags || [])],
    notes: [...(original.notes || [])],
  }

  await savePrompt(newPrompt, folderPath)
  return newPrompt
}

export async function deletePrompt(prompt: PromptFile, folderPath: string): Promise<void> {
  // Security: Validate path is within the allowed folder
  if (!await isPathInFolder(prompt.path, folderPath)) {
    throw new Error('Path traversal detected: cannot delete prompt outside of prompts folder')
  }

  await remove(prompt.path)
  // Clean up versions when prompt is deleted
  await deletePromptVersions(prompt.path)
}

/**
 * Create a variant of an existing prompt.
 * Creates a new file with `--{label}` suffix and links it to the parent.
 */
export async function createVariant(
  parent: PromptFile,
  variantLabel: string,
  template: string,
  folderPath: string,
  existingFileNames: string[]
): Promise<{ variant: PromptFile; updatedParent: PromptFile }> {
  // Generate variant filename: {parent-base}--{label}.md
  const parentBaseName = parent.fileName.replace('.md', '')
  const variantSlug = toKebabCase(variantLabel) || 'variant'
  const baseVariantName = `${parentBaseName}--${variantSlug}`
  const variantFileName = generateUniqueFileName(baseVariantName, existingFileNames)
  const variantPath = await join(folderPath, variantFileName)

  if (!await isPathInFolder(variantPath, folderPath)) {
    throw new Error('Path traversal detected')
  }

  // Create variant prompt
  const variantId = crypto.randomUUID()
  const variantName = `${parent.name} (${variantLabel})`

  const variant: PromptFile = {
    id: variantId,
    fileName: variantFileName,
    path: variantPath,
    name: variantName,
    description: parent.description,
    tags: [...(parent.tags || [])],
    variables: JSON.parse(JSON.stringify(parent.variables)), // Deep copy variables
    notes: [],
    defaultLaunchers: parent.defaultLaunchers ? [...parent.defaultLaunchers] : undefined,
    template: template,
    rawContent: '',
    isValid: true,
    errors: [],
    variantOf: parent.fileName, // Link to parent
  }

  // Save the variant
  await savePrompt(variant, folderPath)

  // Update parent's variants array
  const updatedParent: PromptFile = {
    ...parent,
    variants: [...(parent.variants || []), variantFileName],
  }
  await savePrompt(updatedParent, folderPath)

  // Read back the variant to ensure consistency
  const written = await readTextFile(variantPath)
  const parsedVariant = parsePromptFile(written, variantFileName, variantPath)

  return { variant: parsedVariant, updatedParent }
}

/**
 * Remove a variant from its parent's variants array.
 * Call this when deleting a variant prompt.
 */
export async function removeVariantFromParent(
  variant: PromptFile,
  allPrompts: PromptFile[],
  folderPath: string
): Promise<PromptFile | null> {
  if (!variant.variantOf) return null

  const parent = allPrompts.find(p => p.fileName === variant.variantOf)
  if (!parent || !parent.variants) return null

  const updatedParent: PromptFile = {
    ...parent,
    variants: parent.variants.filter(v => v !== variant.fileName),
  }

  await savePrompt(updatedParent, folderPath)
  return updatedParent
}

/**
 * Get the parent prompt of a variant.
 */
export function getParentPrompt(
  variant: PromptFile,
  allPrompts: PromptFile[]
): PromptFile | undefined {
  if (!variant.variantOf) return undefined
  return allPrompts.find(p => p.fileName === variant.variantOf)
}

/**
 * Get all variants of a prompt.
 */
export function getVariants(
  parent: PromptFile,
  allPrompts: PromptFile[]
): PromptFile[] {
  if (!parent.variants || parent.variants.length === 0) return []
  return allPrompts.filter(p => parent.variants?.includes(p.fileName))
}

/**
 * Get the full variant family (parent + all variants).
 * Returns prompts in order: parent first, then variants.
 */
export function getVariantFamily(
  prompt: PromptFile,
  allPrompts: PromptFile[]
): PromptFile[] {
  // If this is a variant, find the parent first
  if (prompt.variantOf) {
    const parent = getParentPrompt(prompt, allPrompts)
    if (parent) {
      return [parent, ...getVariants(parent, allPrompts)]
    }
    // Parent not found, return just this prompt (orphaned variant)
    return [prompt]
  }

  // This is the parent
  return [prompt, ...getVariants(prompt, allPrompts)]
}

function generateUniqueFileName(baseName: string, existingNames: string[]): string {
  let fileName = `${baseName}.md`
  let counter = 1

  while (existingNames.includes(fileName)) {
    fileName = `${baseName} ${counter}.md`
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

export function isDisplayNameUnique(name: string, existingNames: string[], currentPath?: string, prompts?: { name: string; path: string }[]): boolean {
  if (prompts && currentPath) {
    // Exclude current prompt from check
    return !prompts.some(p => p.name === name && p.path !== currentPath)
  }
  return !existingNames.includes(name)
}

function getNewPromptTemplate(displayName: string, id: string): string {
  return `---
id: "${id}"
name: "${displayName}"
description: "Describe your prompt here"
tags: []
variables:
  - key: topic
    label: "Topic"
    type: text
    required: true
    placeholder: "Enter your topic"
---

Write your prompt template here.

Use {{topic}} to insert variable values.
`
}

function getPromptTemplateFromContent(displayName: string, id: string, content: InitialPromptContent): string {
  const yamlVariables = (content.variables || []).map((v) => {
    const lines = [`  - key: ${v.key}`, `    label: "${v.label}"`, `    type: ${v.type}`]
    if (v.required !== undefined) lines.push(`    required: ${v.required}`)
    if (v.placeholder) lines.push(`    placeholder: "${escapeYamlString(v.placeholder)}"`)
    if (v.preview) lines.push(`    preview: "${escapeYamlString(String(v.preview))}"`)
    if (v.default !== undefined) {
      if (typeof v.default === 'string') {
        lines.push(`    default: "${escapeYamlString(v.default)}"`)
      } else if (Array.isArray(v.default)) {
        lines.push(`    default:`)
        v.default.forEach((item) => lines.push(`      - "${escapeYamlString(String(item))}"`))
      } else {
        lines.push(`    default: ${v.default}`)
      }
    }
    // Slider properties
    if (v.min !== undefined) lines.push(`    min: ${v.min}`)
    if (v.max !== undefined) lines.push(`    max: ${v.max}`)
    if (v.step !== undefined) lines.push(`    step: ${v.step}`)
    // Array/multi-select format
    if (v.format) lines.push(`    format: ${v.format}`)
    if (v.options && v.options.length > 0) {
      lines.push(`    options:`)
      v.options.forEach((opt) => {
        // Support both SelectOption objects and legacy string format
        if (typeof opt === 'string') {
          lines.push(`      - "${escapeYamlString(opt)}"`)
        } else {
          lines.push(`      - label: "${escapeYamlString(opt.label)}"`)
          lines.push(`        value: "${escapeYamlString(opt.value)}"`)
        }
      })
    }
    return lines.join('\n')
  })

  const tags = content.tags || []
  const tagsYaml = tags.length > 0 ? `tags:\n${tags.map((t) => `  - "${escapeYamlString(t)}"`).join('\n')}` : 'tags: []'

  return `---
id: "${id}"
name: "${escapeYamlString(displayName)}"
description: "${escapeYamlString(content.description || '')}"
${tagsYaml}
variables:
${yamlVariables.length > 0 ? yamlVariables.join('\n') : '  []'}
---

${content.template || ''}
`
}

function toKebabCase(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

function escapeYamlString(str: string): string {
  return str.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
}
