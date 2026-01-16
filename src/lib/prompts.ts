import { readDir, readTextFile, writeTextFile, remove } from '@tauri-apps/plugin-fs'
import { join } from '@tauri-apps/api/path'
import { parsePromptFile, serializePrompt } from './parser'
import { syncPromptTags } from './store'
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

export async function savePrompt(prompt: PromptFile): Promise<void> {
  const content = serializePrompt(prompt)
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
  }

  await savePrompt(newPrompt)
  return newPrompt
}

export async function deletePrompt(prompt: PromptFile): Promise<void> {
  await remove(prompt.path)
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
      } else {
        lines.push(`    default: ${v.default}`)
      }
    }
    if (v.options && v.options.length > 0) {
      lines.push(`    options:`)
      v.options.forEach((opt) => lines.push(`      - "${escapeYamlString(opt)}"`))
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
