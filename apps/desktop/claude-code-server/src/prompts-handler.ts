import { timingSafeEqual } from 'crypto'
import { getFolderPath } from '../../mastra/src/mcp/lib/db'
import { loadPrompts, loadPrompt, interpolatePrompt } from '../../mastra/src/mcp/lib/prompts'
import type { PromptFile } from '../../mastra/src/mcp/lib/prompts'

// Optional token-based auth via environment variable
const AUTH_TOKEN = process.env.INCITO_HTTP_TOKEN

/**
 * Timing-safe string comparison to prevent timing attacks
 */
function safeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    // Compare against self to maintain constant time
    const dummy = Buffer.from(a)
    timingSafeEqual(dummy, dummy)
    return false
  }
  return timingSafeEqual(Buffer.from(a), Buffer.from(b))
}

/**
 * Verify authorization header if token is configured
 */
function checkAuth(req: Request): boolean {
  if (!AUTH_TOKEN) {
    return true // No auth required if token not set (local app)
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return false
  }

  // Support both "Bearer <token>" and raw token
  const token = authHeader.startsWith('Bearer ')
    ? authHeader.slice(7)
    : authHeader

  return safeCompare(token, AUTH_TOKEN)
}

/**
 * Create unauthorized response
 */
function unauthorizedResponse(corsHeaders: Record<string, string>): Response {
  return Response.json(
    { error: 'Unauthorized', code: 'UNAUTHORIZED' },
    { status: 401, headers: corsHeaders }
  )
}

/**
 * Handle GET /prompts - List all prompts with optional filtering
 */
export async function handleListPrompts(
  req: Request,
  corsHeaders: Record<string, string>
): Promise<Response> {
  if (!checkAuth(req)) {
    return unauthorizedResponse(corsHeaders)
  }

  const url = new URL(req.url)
  const tagFilter = url.searchParams.get('tag')
  const searchFilter = url.searchParams.get('search')

  const folderPath = getFolderPath()
  if (!folderPath) {
    return Response.json(
      { error: 'Prompts folder not configured', code: 'FOLDER_NOT_CONFIGURED' },
      { status: 503, headers: corsHeaders }
    )
  }

  try {
    let prompts = await loadPrompts(folderPath)

    // Apply tag filter
    if (tagFilter) {
      const tagLower = tagFilter.toLowerCase()
      prompts = prompts.filter((p) =>
        p.tags.some((t) => t.toLowerCase() === tagLower)
      )
    }

    // Apply search filter
    if (searchFilter) {
      const searchLower = searchFilter.toLowerCase()
      prompts = prompts.filter(
        (p) =>
          p.name.toLowerCase().includes(searchLower) ||
          p.description.toLowerCase().includes(searchLower)
      )
    }

    // Return simplified list format
    const promptList = prompts.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      tags: p.tags,
      variableCount: p.variables.length,
    }))

    return Response.json({ prompts: promptList }, { headers: corsHeaders })
  } catch (error) {
    console.error('Error listing prompts:', error)
    return Response.json(
      { error: 'Failed to list prompts', code: 'LIST_FAILED' },
      { status: 500, headers: corsHeaders }
    )
  }
}

/**
 * Handle GET /prompts/:id - Get single prompt details
 */
export async function handleGetPrompt(
  req: Request,
  promptId: string,
  corsHeaders: Record<string, string>
): Promise<Response> {
  if (!checkAuth(req)) {
    return unauthorizedResponse(corsHeaders)
  }

  const folderPath = getFolderPath()
  if (!folderPath) {
    return Response.json(
      { error: 'Prompts folder not configured', code: 'FOLDER_NOT_CONFIGURED' },
      { status: 503, headers: corsHeaders }
    )
  }

  try {
    const prompt = await loadPrompt(folderPath, { id: promptId })

    if (!prompt) {
      return Response.json(
        { error: 'Prompt not found', code: 'NOT_FOUND' },
        { status: 404, headers: corsHeaders }
      )
    }

    // Return full prompt details (excluding internal fields)
    return Response.json(
      {
        id: prompt.id,
        name: prompt.name,
        description: prompt.description,
        tags: prompt.tags,
        template: prompt.template,
        variables: prompt.variables.map((v) => ({
          key: v.key,
          label: v.label,
          type: v.type,
          required: v.required ?? false,
          default: v.default,
          placeholder: v.placeholder,
          description: v.description,
          options: v.options,
          min: v.min,
          max: v.max,
          step: v.step,
          format: v.format,
        })),
      },
      { headers: corsHeaders }
    )
  } catch (error) {
    console.error('Error getting prompt:', error)
    return Response.json(
      { error: 'Failed to get prompt', code: 'GET_FAILED' },
      { status: 500, headers: corsHeaders }
    )
  }
}

interface CompileRequest {
  id: string
  variables: Record<string, unknown>
}

/**
 * Handle POST /prompts/compile - Compile prompt with variables
 */
export async function handleCompilePrompt(
  req: Request,
  corsHeaders: Record<string, string>
): Promise<Response> {
  if (!checkAuth(req)) {
    return unauthorizedResponse(corsHeaders)
  }

  const folderPath = getFolderPath()
  if (!folderPath) {
    return Response.json(
      { error: 'Prompts folder not configured', code: 'FOLDER_NOT_CONFIGURED' },
      { status: 503, headers: corsHeaders }
    )
  }

  try {
    const body = (await req.json()) as CompileRequest

    if (!body.id) {
      return Response.json(
        { error: 'id is required', code: 'INVALID_REQUEST' },
        { status: 400, headers: corsHeaders }
      )
    }

    if (!body.variables || typeof body.variables !== 'object') {
      return Response.json(
        { error: 'variables object is required', code: 'INVALID_REQUEST' },
        { status: 400, headers: corsHeaders }
      )
    }

    const prompt = await loadPrompt(folderPath, { id: body.id })

    if (!prompt) {
      return Response.json(
        { error: 'Prompt not found', code: 'NOT_FOUND' },
        { status: 404, headers: corsHeaders }
      )
    }

    // Check required variables
    const missingVars = prompt.variables
      .filter((v) => v.required && !(v.key in body.variables))
      .map((v) => v.key)

    if (missingVars.length > 0) {
      return Response.json(
        {
          error: `Missing required variables: ${missingVars.join(', ')}`,
          code: 'MISSING_VARIABLES',
          missingVariables: missingVars,
        },
        { status: 400, headers: corsHeaders }
      )
    }

    const compiledPrompt = interpolatePrompt(prompt, body.variables)

    return Response.json(
      {
        promptName: prompt.name,
        compiledPrompt,
      },
      { headers: corsHeaders }
    )
  } catch (error) {
    console.error('Error compiling prompt:', error)
    return Response.json(
      { error: 'Failed to compile prompt', code: 'COMPILE_FAILED' },
      { status: 500, headers: corsHeaders }
    )
  }
}
