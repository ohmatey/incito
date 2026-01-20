import { z } from 'zod'
import { getFolderPath } from '../lib/db'
import { loadPrompt, interpolatePrompt } from '../lib/prompts'

export const usePromptSchema = z
  .object({
    id: z.string().optional().describe('The unique ID of the prompt'),
    name: z.string().optional().describe('The name of the prompt (case-insensitive, partial match supported)'),
    variables: z
      .record(z.unknown())
      .describe('Variable values to fill in the template'),
  })
  .refine((data) => data.id || data.name, {
    message: 'Either id or name must be provided',
  })

export type UsePromptInput = z.infer<typeof usePromptSchema>

export interface UsePromptResult {
  promptName: string
  interpolatedPrompt: string
}

export async function usePrompt(input: UsePromptInput): Promise<UsePromptResult> {
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

  const interpolatedPrompt = interpolatePrompt(prompt, input.variables)

  return {
    promptName: prompt.name,
    interpolatedPrompt,
  }
}
