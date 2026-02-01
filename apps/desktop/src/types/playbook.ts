// ============================================================================
// Playbook Types - Teaching AI Behavior Through Curated Corrections
// ============================================================================

/**
 * Playbook - Container for rules ("Golden Dataset")
 * A playbook is a collection of teaching units that guide AI behavior
 */
export interface Playbook {
  id: string
  syncId: string  // Immutable UUID for sync
  name: string
  description?: string
  enabled: boolean
  ruleCount: number
  createdAt: string
  updatedAt: string
}

/**
 * PlaybookRule - Teaching unit with before/after examples
 * Rules define what the AI should do in specific contexts
 */
export interface PlaybookRule {
  id: string
  syncId: string  // Immutable UUID for sync
  playbookId: string
  /** When does this rule apply? (context/trigger description) */
  triggerContext: string
  /** What should the AI do? (the instruction) */
  instruction: string
  /** Input that caused bad output (for reference) */
  badExampleInput?: string
  /** The bad AI response (what to avoid) */
  badExampleOutput?: string
  /** The correct response (golden output) */
  goldenOutput?: string
  /** Link to original run (for Time Machine) */
  sourceRunId?: string
  /** Higher priority rules are injected first */
  priority: number
  enabled: boolean
  createdAt: string
  updatedAt: string
}

/**
 * PromptPlaybook - Junction table for attaching playbooks to prompts
 */
export interface PromptPlaybook {
  id: string
  promptId: string
  playbookId: string
  order: number
  enabled: boolean
  createdAt: string
}

// ----------------------------------------------------------------------------
// Create/Update Data Types
// ----------------------------------------------------------------------------

export interface CreatePlaybookData {
  name: string
  description?: string
  enabled?: boolean
}

export interface UpdatePlaybookData {
  name?: string
  description?: string
  enabled?: boolean
}

export interface CreatePlaybookRuleData {
  playbookId: string
  triggerContext: string
  instruction: string
  badExampleInput?: string
  badExampleOutput?: string
  goldenOutput?: string
  sourceRunId?: string
  priority?: number
  enabled?: boolean
}

export interface UpdatePlaybookRuleData {
  triggerContext?: string
  instruction?: string
  badExampleInput?: string
  badExampleOutput?: string
  goldenOutput?: string
  priority?: number
  enabled?: boolean
}

// ----------------------------------------------------------------------------
// Row Types (for database conversion)
// ----------------------------------------------------------------------------

export interface PlaybookRow {
  id: string
  sync_id: string
  name: string
  description: string | null
  enabled: number
  rule_count: number
  created_at: string
  updated_at: string
}

export interface PlaybookRuleRow {
  id: string
  sync_id: string
  playbook_id: string
  trigger_context: string
  instruction: string
  bad_example_input: string | null
  bad_example_output: string | null
  golden_output: string | null
  source_run_id: string | null
  priority: number
  enabled: number
  created_at: string
  updated_at: string
}

export interface PromptPlaybookRow {
  id: string
  prompt_id: string
  playbook_id: string
  order: number
  enabled: number
  created_at: string
}

// ----------------------------------------------------------------------------
// Row Conversion Functions
// ----------------------------------------------------------------------------

export function rowToPlaybook(row: PlaybookRow): Playbook {
  return {
    id: row.id,
    syncId: row.sync_id,
    name: row.name,
    description: row.description ?? undefined,
    enabled: Boolean(row.enabled),
    ruleCount: row.rule_count,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function rowToPlaybookRule(row: PlaybookRuleRow): PlaybookRule {
  return {
    id: row.id,
    syncId: row.sync_id,
    playbookId: row.playbook_id,
    triggerContext: row.trigger_context,
    instruction: row.instruction,
    badExampleInput: row.bad_example_input ?? undefined,
    badExampleOutput: row.bad_example_output ?? undefined,
    goldenOutput: row.golden_output ?? undefined,
    sourceRunId: row.source_run_id ?? undefined,
    priority: row.priority,
    enabled: Boolean(row.enabled),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function rowToPromptPlaybook(row: PromptPlaybookRow): PromptPlaybook {
  return {
    id: row.id,
    promptId: row.prompt_id,
    playbookId: row.playbook_id,
    order: row.order,
    enabled: Boolean(row.enabled),
    createdAt: row.created_at,
  }
}

// ----------------------------------------------------------------------------
// Playbook with Rules (for detail views)
// ----------------------------------------------------------------------------

export interface PlaybookWithRules extends Playbook {
  rules: PlaybookRule[]
}
