// Run Mode AI Tool Definitions
// These tools allow the AI to guide users through filling prompt variables

import type { Variable } from '@/types/prompt'

// Tool type definitions for OpenAI-compatible function calling
export interface ToolDefinition {
  type: 'function'
  function: {
    name: string
    description: string
    parameters: {
      type: 'object'
      properties: Record<string, unknown>
      required: string[]
    }
  }
}

/**
 * Creates the displayField tool definition
 * AI uses this to show a field to the user with optional guidance
 */
export function createDisplayFieldTool(variables: Variable[]): ToolDefinition {
  const variableKeys = variables.map((v) => v.key)

  return {
    type: 'function',
    function: {
      name: 'displayField',
      description:
        'Display a form field to the user for input. Use this when you want the user to fill in a specific variable. Only show one field at a time unless fields are closely related.',
      parameters: {
        type: 'object',
        properties: {
          variableKey: {
            type: 'string',
            enum: variableKeys,
            description: 'The key of the variable to display',
          },
          guidance: {
            type: 'string',
            description:
              'Optional helpful guidance for the user about what to enter. Be conversational and helpful.',
          },
          suggestedValue: {
            type: 'string',
            description:
              'Optional suggested value based on context from the conversation',
          },
        },
        required: ['variableKey'],
      },
    },
  }
}

/**
 * Creates the completeField tool definition
 * AI uses this to mark a field as complete with a value extracted from conversation
 */
export function createCompleteFieldTool(variables: Variable[]): ToolDefinition {
  const variableKeys = variables.map((v) => v.key)

  return {
    type: 'function',
    function: {
      name: 'completeField',
      description:
        'Mark a field as completed with a value. Use this when the user has provided information that can fill a variable, either directly or inferred from context.',
      parameters: {
        type: 'object',
        properties: {
          variableKey: {
            type: 'string',
            enum: variableKeys,
            description: 'The key of the variable being completed',
          },
          value: {
            type: ['string', 'number', 'array'],
            description: 'The value to set for this variable',
          },
          reasoning: {
            type: 'string',
            description:
              'Brief explanation of why this value was chosen, especially if inferred',
          },
        },
        required: ['variableKey', 'value'],
      },
    },
  }
}

/**
 * Creates the askFollowUp tool definition
 * AI uses this to ask clarifying questions about a field
 */
export function createAskFollowUpTool(variables: Variable[]): ToolDefinition {
  const variableKeys = variables.map((v) => v.key)

  return {
    type: 'function',
    function: {
      name: 'askFollowUp',
      description:
        'Ask a follow-up question to gather more information before filling a field. Use when you need clarification or more context.',
      parameters: {
        type: 'object',
        properties: {
          question: {
            type: 'string',
            description: 'The follow-up question to ask the user',
          },
          relatedField: {
            type: 'string',
            enum: variableKeys,
            description: 'The variable this question is related to',
          },
        },
        required: ['question', 'relatedField'],
      },
    },
  }
}

/**
 * Creates the finishRun tool definition
 * AI uses this when all fields are complete
 */
export function createFinishRunTool(): ToolDefinition {
  return {
    type: 'function',
    function: {
      name: 'finishRun',
      description:
        'Signal that all required fields have been completed and the prompt is ready to use. Only call this when all required variables have values.',
      parameters: {
        type: 'object',
        properties: {
          summary: {
            type: 'string',
            description: 'Brief summary of the completed prompt configuration',
          },
        },
        required: ['summary'],
      },
    },
  }
}

/**
 * Get all run mode tools for a given set of variables
 */
export function getRunModeTools(variables: Variable[]): ToolDefinition[] {
  return [
    createDisplayFieldTool(variables),
    createCompleteFieldTool(variables),
    createAskFollowUpTool(variables),
    createFinishRunTool(),
  ]
}

/**
 * Parse tool call arguments safely
 */
export function parseToolCallArgs<T>(args: string): T | null {
  try {
    return JSON.parse(args) as T
  } catch {
    console.error('Failed to parse tool call arguments:', args)
    return null
  }
}
