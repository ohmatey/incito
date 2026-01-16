import { readDir, readTextFile, writeTextFile, remove } from '@tauri-apps/plugin-fs'
import { join } from '@tauri-apps/api/path'
import { parsePromptFile, serializePrompt } from './parser'
import { syncPromptTags } from './store'
import type { PromptFile } from '../types/prompt'

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
  existingDisplayNames: string[]
): Promise<PromptFile> {
  const fileName = generateUniqueFileName('new-prompt', existingFileNames)
  const displayName = generateUniqueDisplayName('New Prompt', existingDisplayNames)
  const path = await join(folderPath, fileName)
  const template = getNewPromptTemplate(displayName)
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
