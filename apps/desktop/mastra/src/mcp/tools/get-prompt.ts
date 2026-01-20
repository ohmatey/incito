import { z } from 'zod'
import { getFolderPath } from '../lib/db'
import { loadPrompt } from '../lib/prompts'

export const getPromptSchema = z
  .object({
    id: z.string().optional().describe('The unique ID of the prompt'),
    name: z.string().optional().describe('The name of the prompt (case-insensitive, partial match supported)'),
  })
  .refine((data) => data.id || data.name, {
    message: 'Either id or name must be provided',
  })

export type GetPromptInput = z.infer<typeof getPromptSchema>

export interface PromptDetails {
  id: string
  name: string
  description: string
  tags: string[]
  template: string
  variables: Array<{
    key: string
    label: string
    type: string
    required?: boolean
    default?: string | number | string[]
    placeholder?: string
    description?: string
    options?: Array<{ label: string; value: string }>
  }>
}

export async function getPrompt(input: GetPromptInput): Promise<PromptDetails> {
  const folderPath = getFolderPath()

  if (!folderPath) {
    throw new Error(
      'Incito prompts folder not configured. Please open Incito and select a prompts folder first.'
    )
  }

  const prompt = await loadPrompt(folderPath, {
    id: input.id,
    name: input.name,
  })

  if (!prompt) {
    const identifier = input.id ? `ID "${input.id}"` : `name "${input.name}"`
    throw new Error(`Prompt with ${identifier} not found`)
  }

  return {
    id: prompt.id,
    name: prompt.name,
    description: prompt.description,
    tags: prompt.tags,
    template: prompt.template,
    variables: prompt.variables.map((v) => ({
      key: v.key,
      label: v.label,
      type: v.type,
      required: v.required,
      default: v.default,
      placeholder: v.placeholder,
      description: v.description,
      options: v.options,
    })),
  }
}
