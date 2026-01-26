import { MCPServer } from '@mastra/mcp'
import { createTool } from '@mastra/core/tools'
import {
  listPrompts,
  listPromptsSchema,
  getPrompt,
  getPromptSchema,
  usePrompt,
  usePromptSchema,
} from './tools'

const listPromptsTool = createTool({
  id: 'list_prompts',
  description:
    'List all available prompt templates from the Incito library. Optionally filter by tag or search query.',
  inputSchema: listPromptsSchema,
  execute: async ({ context }) => {
    const results = await listPrompts(context)
    return JSON.stringify(results, null, 2)
  },
})

const getPromptTool = createTool({
  id: 'get_prompt',
  description:
    'Get the full details of a prompt template including its template text and variable definitions. Provide either the prompt ID or name.',
  inputSchema: getPromptSchema,
  execute: async ({ context }) => {
    const result = await getPrompt(context)
    return JSON.stringify(result, null, 2)
  },
})

const usePromptTool = createTool({
  id: 'use_prompt',
  description:
    'Fill a prompt template with variable values and return the interpolated result. Provide either the prompt ID or name, along with the variable values.',
  inputSchema: usePromptSchema,
  execute: async ({ context }) => {
    const result = await usePrompt(context)
    return JSON.stringify(result, null, 2)
  },
})

export const server = new MCPServer({
  name: 'incito',
  version: '1.0.0',
  tools: {
    list_prompts: listPromptsTool,
    get_prompt: getPromptTool,
    use_prompt: usePromptTool,
  },
})

server.use(async (context, next) => {
  const authToken = process.env.INCITO_MCP_TOKEN
  if (!authToken) {
    throw new Error('MCP token is not configured on the server.')
  }
  const providedToken = context.headers?.['x-auth-token']
  if (providedToken !== authToken) {
    throw new Error('Unauthorized')
  }
  return next()
})
