import { readdir, readFile } from 'fs/promises'
import { join } from 'path'
import { parsePromptFile } from '../../../../src/lib/parser'
import { interpolate } from '../../../../src/lib/interpolate'
import type { PromptFile, Variable } from '../../../../src/types/prompt'

export type { PromptFile, Variable }

/**
 * Load all prompt files from a directory
 */
export async function loadPrompts(folderPath: string): Promise<PromptFile[]> {
  try {
    const entries = await readdir(folderPath, { withFileTypes: true })
    const mdFiles = entries.filter(
      (entry) => entry.isFile() && entry.name.endsWith('.md')
    )

    const prompts: PromptFile[] = []

    for (const file of mdFiles) {
      const filePath = join(folderPath, file.name)
      const content = await readFile(filePath, 'utf-8')
      const prompt = parsePromptFile(content, file.name, filePath)
      prompts.push(prompt)
    }

    return prompts
  } catch (error) {
    console.error('Error loading prompts:', error)
    return []
  }
}

/**
 * Load a single prompt by ID or name
 */
export async function loadPrompt(
  folderPath: string,
  options: { id?: string; name?: string }
): Promise<PromptFile | null> {
  const prompts = await loadPrompts(folderPath)

  if (options.id) {
    return prompts.find((p) => p.id === options.id) || null
  }

  if (options.name) {
    // Try exact match first
    const exact = prompts.find(
      (p) => p.name.toLowerCase() === options.name!.toLowerCase()
    )
    if (exact) return exact

    // Try partial match
    const partial = prompts.find((p) =>
      p.name.toLowerCase().includes(options.name!.toLowerCase())
    )
    return partial || null
  }

  return null
}

/**
 * Interpolate a prompt template with variable values
 */
export function interpolatePrompt(
  prompt: PromptFile,
  values: Record<string, unknown>
): string {
  return interpolate(prompt.template, values, prompt.variables)
}
