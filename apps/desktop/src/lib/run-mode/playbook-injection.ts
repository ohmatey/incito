import type { PlaybookRule } from '@/types/playbook'

/**
 * Formats playbook rules into a context string for injection into the system prompt.
 * Rules are formatted with clear structure to help the AI understand behavioral guidelines.
 */
export function formatRulesAsContext(rules: PlaybookRule[]): string {
  if (rules.length === 0) {
    return ''
  }

  const sections: string[] = ['## Behavior Guidelines', '']

  for (const rule of rules) {
    // Add trigger context as a heading
    sections.push(`### ${rule.triggerContext}`)
    sections.push(rule.instruction)
    sections.push('')

    // Add golden output example if available
    if (rule.goldenOutput) {
      sections.push('**Example of correct response:**')
      sections.push('```')
      sections.push(rule.goldenOutput)
      sections.push('```')
      sections.push('')
    }

    // Add bad example to avoid if available
    if (rule.badExampleOutput) {
      sections.push('**Avoid responses like:**')
      sections.push('```')
      sections.push(rule.badExampleOutput)
      sections.push('```')
      sections.push('')
    }
  }

  return sections.join('\n')
}

/**
 * Limits the number of rules to inject based on maxRules setting.
 * Rules are sorted by priority (higher first), then by creation date (older first).
 */
export function limitRules(rules: PlaybookRule[], maxRules?: number): PlaybookRule[] {
  if (!maxRules || maxRules <= 0) {
    return rules
  }
  return rules.slice(0, maxRules)
}
