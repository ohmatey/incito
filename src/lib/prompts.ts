import { readDir, readTextFile, writeTextFile, remove } from '@tauri-apps/plugin-fs'
import { join } from '@tauri-apps/api/path'
import { parsePromptFile, serializePrompt } from './parser'
import { syncPromptTags, createPromptVersion, deletePromptVersions } from './store'
import type { PromptFile, Variable } from '../types/prompt'

export interface InitialPromptContent {
  name?: string
  description?: string
  template?: string
  variables?: Variable[]
  tags?: string[]
}

export async function loadPrompts(folderPath: string): Promise<PromptFile[]> {
  const entries = await readDir(folderPath)
  const mdFiles = entries.filter((e) => e.name?.endsWith('.md'))

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

export async function savePrompt(prompt: PromptFile, skipVersion = false): Promise<void> {
  const content = serializePrompt(prompt)

  // Create a version before saving (unless skipping, e.g., for restores)
  if (!skipVersion) {
    // Read the current content first to save as the "before" state
    try {
      const currentContent = await readTextFile(prompt.path)
      // Only create a version if content actually changed
      if (currentContent !== content) {
        await createPromptVersion(prompt.path, currentContent)
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

  let template: string
  if (initialContent) {
    template = getPromptTemplateFromContent(displayName, initialContent)
  } else {
    template = getNewPromptTemplate(displayName)
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

  const newPrompt: PromptFile = {
    ...original,
    fileName: newFileName,
    path: newPath,
    name: newDisplayName,
    tags: [...(original.tags || [])],
    notes: [...(original.notes || [])],
  }

  await savePrompt(newPrompt)
  return newPrompt
}

export async function deletePrompt(prompt: PromptFile): Promise<void> {
  await remove(prompt.path)
  // Clean up versions when prompt is deleted
  await deletePromptVersions(prompt.path)
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

function getNewPromptTemplate(displayName: string): string {
  return `---
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

function getPromptTemplateFromContent(displayName: string, content: InitialPromptContent): string {
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
