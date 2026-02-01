// ============================================================================
// Prompt Run Configuration (saved with prompt versions)
// ============================================================================

/**
 * Complete run configuration for a prompt, saved with each version
 */
export interface PromptRunConfig {
  // Provider settings
  provider?: ProviderRunSettings

  // AI behavior settings
  aiPrompt?: AIPromptSettings

  // Human feedback settings
  humanFeedback?: HumanFeedbackConfig

  // Automated evaluation settings
  evals?: EvalConfig

  // Playbook settings (behavior teaching)
  playbooks?: PlaybookConfig
}

// --- Provider Settings ---
export interface ProviderRunSettings {
  /** Which provider config to use by default */
  defaultProviderId?: string
  /** Can user change provider at runtime? */
  allowOverride?: boolean
}

// --- AI Prompt Settings ---
export interface AIPromptSettings {
  /** Agent ID to use (if using an agent's system prompt) */
  agentId?: string
  /** Custom system prompt for AI (used when no agent is selected) */
  systemPrompt?: string
  /** Temperature (0-2) */
  temperature?: number
  /** Max tokens to generate */
  maxTokens?: number
}

// --- Human Feedback Settings ---
export interface HumanFeedbackConfig {
  /** Whether human feedback is enabled */
  enabled: boolean
  /** Which feedback types to collect */
  feedbackTypes: FeedbackTypeConfig[]
  /** Instructions shown to reviewers */
  instructions?: string
}

export type FeedbackTypeConfig =
  | RatingFeedbackConfig
  | PassFailFeedbackConfig
  | NotesFeedbackConfig
  | TagsFeedbackConfig

export interface RatingFeedbackConfig {
  type: 'rating'
  /** Rating scale: 5 or 10 */
  scale: 5 | 10
  /** Label for minimum rating */
  minLabel?: string
  /** Label for maximum rating */
  maxLabel?: string
}

export interface PassFailFeedbackConfig {
  type: 'passFail'
  /** Label for pass option */
  passLabel?: string
  /** Label for fail option */
  failLabel?: string
}

export interface NotesFeedbackConfig {
  type: 'notes'
  /** Whether notes are required */
  required?: boolean
  /** Placeholder text */
  placeholder?: string
}

export interface TagsFeedbackConfig {
  type: 'tags'
  /** Available tag options */
  options: string[]
}

// --- Eval/Grader Settings ---
export interface EvalConfig {
  /** Which graders to run automatically */
  graderIds: string[]
  /** Auto-run graders when run completes */
  runOnComplete?: boolean
}

// --- Playbook Settings ---
export type PlaybookInjectionMode = 'system_prompt_prepend' | 'system_prompt_append'

export interface PlaybookConfig {
  /** Which playbooks to apply to this prompt */
  playbookIds: string[]
  /** Where to inject playbook rules in the system prompt */
  injectionMode: PlaybookInjectionMode
  /** Maximum number of rules to inject (token budget control) */
  maxRulesToInject?: number
}

/**
 * Get default playbook config
 */
export function getDefaultPlaybookConfig(): PlaybookConfig {
  return {
    playbookIds: [],
    injectionMode: 'system_prompt_prepend',
    maxRulesToInject: undefined,
  }
}

// --- Helper Functions ---

/**
 * Get default human feedback config
 */
export function getDefaultHumanFeedbackConfig(): HumanFeedbackConfig {
  return {
    enabled: false,
    feedbackTypes: [],
    instructions: undefined,
  }
}

/**
 * Get default rating feedback config
 */
export function getDefaultRatingConfig(): RatingFeedbackConfig {
  return {
    type: 'rating',
    scale: 5,
    minLabel: 'Poor',
    maxLabel: 'Excellent',
  }
}

/**
 * Get default pass/fail feedback config
 */
export function getDefaultPassFailConfig(): PassFailFeedbackConfig {
  return {
    type: 'passFail',
    passLabel: 'Pass',
    failLabel: 'Fail',
  }
}

/**
 * Get default notes feedback config
 */
export function getDefaultNotesConfig(): NotesFeedbackConfig {
  return {
    type: 'notes',
    required: false,
    placeholder: 'Add observations...',
  }
}

/**
 * Get default tags feedback config
 */
export function getDefaultTagsConfig(): TagsFeedbackConfig {
  return {
    type: 'tags',
    options: ['Good quality', 'Needs improvement', 'Factual error', 'Tone issue'],
  }
}

/**
 * Check if a feedback type is enabled
 */
export function hasFeedbackType(config: HumanFeedbackConfig | undefined, type: FeedbackTypeConfig['type']): boolean {
  if (!config?.enabled) return false
  return config.feedbackTypes.some((ft) => ft.type === type)
}

/**
 * Get a specific feedback type config
 */
export function getFeedbackTypeConfig<T extends FeedbackTypeConfig>(
  config: HumanFeedbackConfig | undefined,
  type: T['type']
): T | undefined {
  if (!config?.enabled) return undefined
  return config.feedbackTypes.find((ft) => ft.type === type) as T | undefined
}
