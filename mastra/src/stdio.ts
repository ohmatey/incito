// MCP entry point for future integration
// This file will be used to expose the prompt generator as an MCP server

export { generatePrompt } from './api'
export type { AIConfig, GeneratePromptInput, GeneratePromptResult, GeneratedPrompt } from './types'

// TODO: Implement MCP server when ready
// import { MCPServer } from '@mastra/core/mcp'
// export function createMCPServer() { ... }
