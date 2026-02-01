// Run Mode System Prompt Builder
// Generates the system prompt for guiding users through prompt variables

import type { PromptFile, Variable } from '@/types/prompt'
import type { PlaybookRule } from '@/types/playbook'
import { formatRulesAsContext, limitRules } from './playbook-injection'

/**
 * Build a description of a variable for the AI
 */
function describeVariable(variable: Variable): string {
  const parts: string[] = []

  parts.push(`- **${variable.key}** (${variable.label})`)
  parts.push(`  Type: ${variable.type}`)

  if (variable.required) {
    parts.push(`  Required: Yes`)
  }

  if (variable.description) {
    parts.push(`  Description: ${variable.description}`)
  }

  if (variable.placeholder) {
    parts.push(`  Hint: ${variable.placeholder}`)
  }

  if (variable.options && variable.options.length > 0) {
    const optionLabels = variable.options.map((o) => o.label).join(', ')
    parts.push(`  Options: ${optionLabels}`)
  }

  if (variable.min !== undefined || variable.max !== undefined) {
    parts.push(`  Range: ${variable.min ?? 'any'} - ${variable.max ?? 'any'}`)
  }

  if (variable.default !== undefined) {
    parts.push(`  Default: ${JSON.stringify(variable.default)}`)
  }

  return parts.join('\n')
}

interface BuildRunModeSystemPromptOptions {
  customInstructions?: string
  agentSystemPrompt?: string
  agentName?: string
  /** Playbook rules to inject as behavior guidelines */
  playbookRules?: PlaybookRule[]
  /** Maximum number of rules to inject (token budget control) */
  maxPlaybookRules?: number
}

/**
 * Build the system prompt for run mode
 */
export function buildRunModeSystemPrompt(
  prompt: PromptFile,
  optionsOrCustomInstructions?: string | BuildRunModeSystemPromptOptions
): string {
  // Handle legacy string argument for backward compatibility
  const options: BuildRunModeSystemPromptOptions = typeof optionsOrCustomInstructions === 'string'
    ? { customInstructions: optionsOrCustomInstructions }
    : optionsOrCustomInstructions ?? {}

  const { customInstructions, agentSystemPrompt, agentName, playbookRules, maxPlaybookRules } = options

  const requiredVars = prompt.variables.filter((v) => v.required)
  const optionalVars = prompt.variables.filter((v) => !v.required)

  const sections: string[] = []

  // If agent is selected, prepend its persona
  if (agentSystemPrompt) {
    sections.push(`## Agent Persona: ${agentName || 'Selected Agent'}`)
    sections.push(agentSystemPrompt)
    sections.push('')
    sections.push('---')
    sections.push('')
  }

  // Inject playbook rules if provided
  if (playbookRules && playbookRules.length > 0) {
    const rulesToInject = limitRules(playbookRules, maxPlaybookRules)
    const rulesContext = formatRulesAsContext(rulesToInject)
    if (rulesContext) {
      sections.push(rulesContext)
      sections.push('---')
      sections.push('')
    }
  }

  // Core identity
  sections.push(`You are a helpful assistant guiding a user through filling out a prompt template called "${prompt.name}".`)

  // Prompt context
  if (prompt.description) {
    sections.push(`\n## About This Prompt\n${prompt.description}`)
  }

  // Variables section
  sections.push(`\n## Variables to Fill\n`)

  if (requiredVars.length > 0) {
    sections.push(`### Required Fields (${requiredVars.length})`)
    sections.push(requiredVars.map(describeVariable).join('\n\n'))
  }

  if (optionalVars.length > 0) {
    sections.push(`\n### Optional Fields (${optionalVars.length})`)
    sections.push(optionalVars.map(describeVariable).join('\n\n'))
  }

  // Template preview (truncated for context)
  const templatePreview =
    prompt.template.length > 500
      ? prompt.template.slice(0, 500) + '...'
      : prompt.template
  sections.push(`\n## Template Preview\n\`\`\`\n${templatePreview}\n\`\`\``)

  // Instructions
  sections.push(`
## Your Task

Guide the user through filling each variable conversationally. Follow these principles:

1. **Be conversational**: Don't just list fields. Have a natural conversation that gathers information.

2. **Infer when possible**: If the user mentions something relevant to a field, use \`completeField\` to capture it without asking redundantly.

3. **One thing at a time**: Focus on one field or related group of fields. Don't overwhelm with all fields at once.

4. **Provide context**: When displaying a field, explain why it matters for the prompt.

5. **Suggest when helpful**: If you can reasonably guess a value based on context, offer it as a suggestion.

6. **Required first**: Prioritize required fields, but naturally weave in optional ones if they come up.

7. **Validate appropriately**: For select/multi-select fields, guide users to valid options. For numbers, respect min/max ranges.

## Tool Usage

- Use \`displayField\` to show a field input to the user - ALWAYS use this when asking for a field value
- Use \`completeField\` when you have a value for a field (from user input or inference)
- Use \`askFollowUp\` when you need clarification before filling a field
- Use \`finishRun\` when all required fields are complete

## Important: Start Immediately

When the conversation starts, you MUST:
1. Briefly greet the user (1 sentence max)
2. Immediately call \`displayField\` for the first required field
3. Provide context about what this field is for

Do NOT just describe the field - you MUST call the \`displayField\` tool so the user sees the input form.`)

  // Custom instructions
  if (customInstructions) {
    sections.push(`\n## Additional Instructions\n${customInstructions}`)
  }

  return sections.join('\n')
}

/**
 * Build a progress summary for the AI
 */
export function buildProgressContext(
  variables: Variable[],
  completedFields: string[],
  fieldValues: Record<string, unknown>
): string {
  const required = variables.filter((v) => v.required)
  const completedRequired = required.filter((v) => completedFields.includes(v.key))

  const lines: string[] = []
  lines.push(`## Current Progress`)
  lines.push(`Required: ${completedRequired.length}/${required.length} complete`)
  lines.push(`Total: ${completedFields.length}/${variables.length} fields filled`)
  lines.push('')
  lines.push(`### Completed Fields:`)

  for (const key of completedFields) {
    const value = fieldValues[key]
    const displayValue =
      typeof value === 'string' && value.length > 50
        ? value.slice(0, 50) + '...'
        : JSON.stringify(value)
    lines.push(`- ${key}: ${displayValue}`)
  }

  const remaining = variables.filter((v) => !completedFields.includes(v.key))
  if (remaining.length > 0) {
    lines.push('')
    lines.push(`### Remaining Fields:`)
    for (const v of remaining) {
      lines.push(`- ${v.key}${v.required ? ' (required)' : ''}`)
    }
  }

  return lines.join('\n')
}
