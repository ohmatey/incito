import { z } from 'zod'
import { getFolderPath } from '../lib/db'
import { loadPrompts } from '../lib/prompts'

export const listPromptsSchema = z.object({
  tag: z.string().optional().describe('Filter prompts by tag'),
  search: z.string().optional().describe('Search prompts by name or description'),
})

export type ListPromptsInput = z.infer<typeof listPromptsSchema>

export interface PromptSummary {
  id: string
  name: string
  description: string
  tags: string[]
  variableCount: number
}

export async function listPrompts(input: ListPromptsInput): Promise<PromptSummary[]> {
  const folderPath = getFolderPath()

  if (!folderPath) {
    throw new Error(
      'Incito prompts folder not configured. Please open Incito and select a prompts folder first.'
    )
  }

  let prompts = await loadPrompts(folderPath)

  // Filter by tag
  if (input.tag) {
    const tagLower = input.tag.toLowerCase()
    prompts = prompts.filter((p) =>
      p.tags.some((t) => t.toLowerCase() === tagLower)
    )
  }

  // Filter by search
  if (input.search) {
    const searchLower = input.search.toLowerCase()
    prompts = prompts.filter(
      (p) =>
        p.name.toLowerCase().includes(searchLower) ||
        p.description.toLowerCase().includes(searchLower)
    )
  }

  // Return summaries
  return prompts.map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    tags: p.tags,
    variableCount: p.variables.length,
  }))
}
