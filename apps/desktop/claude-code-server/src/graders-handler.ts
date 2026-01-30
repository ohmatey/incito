// Backend handler for grader execution
// Assertion graders run in the frontend (see lib/grader-executor.ts)
// LLM Judge graders require the backend for model access

import { generateText } from 'ai'
import { createClaudeCode } from 'ai-sdk-provider-claude-code'

// Types mirroring frontend types/grader.ts
type JudgeModel = 'gpt-4o' | 'gpt-4o-mini' | 'claude-sonnet-4-5' | 'claude-haiku-4-5'
type OutputSchema = 'score_1_to_5' | 'score_1_to_10' | 'boolean' | 'pass_fail_reason'

interface LLMJudgeGrader {
  id: string
  name: string
  description?: string
  type: 'llm_judge'
  config: {
    model: JudgeModel
    promptTemplate: string
    outputSchema: OutputSchema
    systemPrompt?: string
  }
  isBuiltin: boolean
  enabled: boolean
  createdAt: string
  updatedAt: string
}

interface LLMJudgeResult {
  score: number        // Normalized 0-1
  rawScore?: number    // Original score (e.g., 4/5)
  passed: boolean
  reason: string
  executionTimeMs: number
}

interface RunLLMJudgeRequest {
  grader: LLMJudgeGrader
  input: string
  output: string
  claudeCodePath?: string
}

interface TestGraderRequest {
  grader: LLMJudgeGrader
  input: string
  output: string
  claudeCodePath?: string
}

// Parse command line arguments for --claude-path
function getClaudePathFromArgs(): string | undefined {
  // @ts-ignore - Bun global
  const bunArgs = typeof Bun !== 'undefined' ? Bun.argv : []
  const processArgs = process.argv

  for (const args of [bunArgs, processArgs]) {
    const pathIndex = args.indexOf('--claude-path')
    if (pathIndex !== -1 && args[pathIndex + 1]) {
      return args[pathIndex + 1]
    }
  }
  return undefined
}

// Get model for LLM judge execution
function getJudgeModel(modelName: JudgeModel, customPath?: string) {
  const claudeCodePath = customPath || getClaudePathFromArgs() || process.env.CLAUDE_CODE_EXECUTABLE_PATH

  if (!claudeCodePath) {
    throw new Error(
      'Claude Code executable path not configured. ' +
      'Please set the executable path in Settings > AI Provider > Claude Code > Executable Path.'
    )
  }

  // Map judge models to Claude Code models
  // For now, we use Claude models via Claude Code provider
  // In the future, we could support OpenAI models via separate provider
  const claudeModel = modelName.startsWith('claude') ? 'sonnet' : 'sonnet'

  const provider = createClaudeCode()
  return provider(claudeModel as 'opus' | 'sonnet' | 'haiku', {
    pathToClaudeCodeExecutable: claudeCodePath,
  })
}

// Build the judge prompt from template
function buildJudgePrompt(
  template: string,
  input: string,
  output: string
): string {
  return template
    .replace(/\{\{input\}\}/g, input)
    .replace(/\{\{output\}\}/g, output)
    .replace(/\{\{prompt\}\}/g, input) // Alias for input
    .replace(/\{\{response\}\}/g, output) // Alias for output
}

// Build system prompt for structured output
function buildSystemPrompt(
  schema: OutputSchema,
  customSystemPrompt?: string
): string {
  const schemaInstructions = {
    score_1_to_5: `You must respond with a JSON object in this exact format:
{"score": <number 1-5>, "reason": "<brief explanation>"}
Where score is an integer from 1 (worst) to 5 (best).`,
    score_1_to_10: `You must respond with a JSON object in this exact format:
{"score": <number 1-10>, "reason": "<brief explanation>"}
Where score is an integer from 1 (worst) to 10 (best).`,
    boolean: `You must respond with a JSON object in this exact format:
{"pass": <true or false>, "reason": "<brief explanation>"}`,
    pass_fail_reason: `You must respond with a JSON object in this exact format:
{"pass": <true or false>, "reason": "<detailed explanation>"}`,
  }

  const baseInstructions = schemaInstructions[schema]
  if (customSystemPrompt) {
    return `${customSystemPrompt}\n\n${baseInstructions}`
  }
  return `You are a precise evaluator. ${baseInstructions}`
}

// Parse LLM response to extract score
function parseJudgeResponse(
  response: string,
  schema: OutputSchema
): { score: number; rawScore?: number; passed: boolean; reason: string } {
  try {
    // Try to extract JSON from response
    const jsonMatch = response.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('No JSON found in response')
    }

    const parsed = JSON.parse(jsonMatch[0])

    switch (schema) {
      case 'score_1_to_5': {
        const rawScore = Math.min(5, Math.max(1, Number(parsed.score) || 1))
        return {
          score: (rawScore - 1) / 4, // Normalize 1-5 to 0-1
          rawScore,
          passed: rawScore >= 3,
          reason: parsed.reason || 'No reason provided',
        }
      }
      case 'score_1_to_10': {
        const rawScore = Math.min(10, Math.max(1, Number(parsed.score) || 1))
        return {
          score: (rawScore - 1) / 9, // Normalize 1-10 to 0-1
          rawScore,
          passed: rawScore >= 6,
          reason: parsed.reason || 'No reason provided',
        }
      }
      case 'boolean':
      case 'pass_fail_reason': {
        const passed = Boolean(parsed.pass)
        return {
          score: passed ? 1.0 : 0.0,
          passed,
          reason: parsed.reason || 'No reason provided',
        }
      }
      default:
        throw new Error(`Unknown output schema: ${schema}`)
    }
  } catch (error) {
    // If parsing fails, try to infer from text
    const lowerResponse = response.toLowerCase()
    const passed = lowerResponse.includes('pass') || lowerResponse.includes('good') || lowerResponse.includes('yes')

    return {
      score: passed ? 0.7 : 0.3,
      passed,
      reason: `Failed to parse structured response. Raw: ${response.substring(0, 200)}`,
    }
  }
}

// Execute a single LLM judge grader
async function executeLLMJudge(
  grader: LLMJudgeGrader,
  input: string,
  output: string,
  claudeCodePath?: string
): Promise<LLMJudgeResult> {
  const startTime = performance.now()

  try {
    const model = getJudgeModel(grader.config.model, claudeCodePath)
    const prompt = buildJudgePrompt(grader.config.promptTemplate, input, output)
    const system = buildSystemPrompt(grader.config.outputSchema, grader.config.systemPrompt)

    const result = await generateText({
      model,
      system,
      prompt,
      maxTokens: 500, // Keep responses concise
    })

    const parsed = parseJudgeResponse(result.text, grader.config.outputSchema)
    const executionTimeMs = Math.round(performance.now() - startTime)

    return {
      ...parsed,
      executionTimeMs,
    }
  } catch (error) {
    const executionTimeMs = Math.round(performance.now() - startTime)
    return {
      score: 0,
      passed: false,
      reason: `Execution error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      executionTimeMs,
    }
  }
}

// Handler for POST /graders/run-llm-judge
export async function handleRunLLMJudge(
  req: Request,
  corsHeaders: Record<string, string>
): Promise<Response> {
  try {
    const body = await req.json() as RunLLMJudgeRequest
    const { grader, input, output, claudeCodePath } = body

    if (!grader || grader.type !== 'llm_judge') {
      return Response.json(
        { error: 'Valid LLM judge grader is required' },
        { status: 400, headers: corsHeaders }
      )
    }

    if (typeof input !== 'string' || typeof output !== 'string') {
      return Response.json(
        { error: 'Both input and output strings are required' },
        { status: 400, headers: corsHeaders }
      )
    }

    const result = await executeLLMJudge(grader, input, output, claudeCodePath)

    return Response.json(result, { headers: corsHeaders })
  } catch (error) {
    console.error('LLM Judge error:', error)
    return Response.json(
      {
        error: error instanceof Error ? error.message : 'LLM Judge execution failed',
        code: 'LLM_JUDGE_FAILED',
      },
      { status: 500, headers: corsHeaders }
    )
  }
}

// Handler for POST /graders/test - Test a grader with sample input/output
export async function handleTestGrader(
  req: Request,
  corsHeaders: Record<string, string>
): Promise<Response> {
  try {
    const body = await req.json() as TestGraderRequest
    const { grader, input, output, claudeCodePath } = body

    if (!grader) {
      return Response.json(
        { error: 'Grader is required' },
        { status: 400, headers: corsHeaders }
      )
    }

    if (typeof input !== 'string' || typeof output !== 'string') {
      return Response.json(
        { error: 'Both input and output strings are required' },
        { status: 400, headers: corsHeaders }
      )
    }

    // Only handle LLM judges here - assertions run in frontend
    if (grader.type !== 'llm_judge') {
      return Response.json(
        { error: 'Only LLM judge graders can be tested via backend. Assertions run in the frontend.' },
        { status: 400, headers: corsHeaders }
      )
    }

    const result = await executeLLMJudge(grader, input, output, claudeCodePath)

    return Response.json(result, { headers: corsHeaders })
  } catch (error) {
    console.error('Test grader error:', error)
    return Response.json(
      {
        error: error instanceof Error ? error.message : 'Grader test failed',
        code: 'GRADER_TEST_FAILED',
      },
      { status: 500, headers: corsHeaders }
    )
  }
}
