import { createClaudeCode } from 'ai-sdk-provider-claude-code'
import { generateText, streamText } from 'ai'
import { handleListPrompts, handleGetPrompt, handleCompilePrompt } from './prompts-handler'
import { handleRunLLMJudge, handleTestGrader } from './graders-handler'
import { openApiSpec } from './openapi'

const PORT = parseInt(process.env.CLAUDE_CODE_PORT || '3457', 10)

// Allowed origins for CORS (localhost only for security)
const ALLOWED_ORIGINS = new Set([
  'http://localhost:1420',      // Tauri dev
  'http://localhost:5173',      // Vite dev
  'http://127.0.0.1:1420',
  'http://127.0.0.1:5173',
  'tauri://localhost',          // Tauri production
  'https://tauri.localhost',    // Tauri production (macOS)
])

// Rate limiting: track requests per IP
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()
const RATE_LIMIT_WINDOW_MS = 60_000  // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 100  // 100 requests per minute

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const record = rateLimitMap.get(ip)

  if (!record || now > record.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS })
    return true
  }

  if (record.count >= RATE_LIMIT_MAX_REQUESTS) {
    return false
  }

  record.count++
  return true
}

// Cleanup stale rate limit entries every 5 minutes
setInterval(() => {
  const now = Date.now()
  for (const [ip, record] of rateLimitMap.entries()) {
    if (now > record.resetTime) {
      rateLimitMap.delete(ip)
    }
  }
}, 300_000)

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

// Get custom executable path from command line args first, then environment
const claudeCodePath = getClaudePathFromArgs() || process.env.CLAUDE_CODE_EXECUTABLE_PATH || undefined

// Create provider
const claudeCodeProvider = createClaudeCode()

// Helper to get model with settings
function getModel(modelName: 'opus' | 'sonnet' | 'haiku') {
  // When running as Bun-compiled binary, we must provide a valid executable path
  // Otherwise the SDK falls back to an internal default that doesn't work in bundled binaries
  if (!claudeCodePath) {
    throw new Error(
      'Claude Code executable path not configured. ' +
      'Please set the executable path in Settings > AI Provider > Claude Code > Executable Path.'
    )
  }

  return claudeCodeProvider(modelName, {
    pathToClaudeCodeExecutable: claudeCodePath,
  })
}

interface GenerateRequest {
  model?: 'opus' | 'sonnet' | 'haiku'
  system?: string
  prompt: string
}

interface StreamRequest {
  model?: 'opus' | 'sonnet' | 'haiku'
  system?: string
  messages: Array<{
    role: 'user' | 'assistant' | 'system'
    content: string
  }>
}

function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('Origin')

  // Check if origin is allowed, default to first allowed origin for non-browser requests
  const allowedOrigin = origin && ALLOWED_ORIGINS.has(origin)
    ? origin
    : 'http://localhost:1420'

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Vary': 'Origin',
  }
}

async function handleRequest(req: Request): Promise<Response> {
  const url = new URL(req.url)
  const corsHeaders = getCorsHeaders(req)

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  // Rate limiting (use forwarded IP or connection IP)
  const clientIp = req.headers.get('X-Forwarded-For')?.split(',')[0]?.trim()
    || req.headers.get('X-Real-IP')
    || 'unknown'

  if (!checkRateLimit(clientIp)) {
    return Response.json(
      { error: 'Too many requests', code: 'RATE_LIMITED' },
      { status: 429, headers: { ...corsHeaders, 'Retry-After': '60' } }
    )
  }

  // OpenAPI specification endpoint
  if (url.pathname === '/openapi.json') {
    return Response.json(openApiSpec, { headers: corsHeaders })
  }

  // Health check endpoint
  if (url.pathname === '/health') {
    return Response.json(
      {
        status: 'ok',
        provider: 'claude-code',
        timestamp: new Date().toISOString(),
        executablePath: claudeCodePath || 'default (system PATH)',
      },
      { headers: corsHeaders }
    )
  }

  // Check Claude CLI authentication
  if (url.pathname === '/auth-status') {
    try {
      // Try a minimal request to check if authenticated
      // The provider will throw if not authenticated
      const model = getModel('haiku')
      return Response.json(
        { authenticated: true, model: model.modelId },
        { headers: corsHeaders }
      )
    } catch (error) {
      return Response.json(
        {
          authenticated: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          hint: 'Run "claude login" to authenticate',
        },
        { headers: corsHeaders }
      )
    }
  }

  // Generate text (non-streaming)
  if (url.pathname === '/generate' && req.method === 'POST') {
    try {
      const body = await req.json() as GenerateRequest
      const { model = 'sonnet', system, prompt } = body

      if (!prompt) {
        return Response.json(
          { error: 'prompt is required' },
          { status: 400, headers: corsHeaders }
        )
      }

      const result = await generateText({
        model: getModel(model),
        system,
        prompt,
      })

      return Response.json(
        {
          text: result.text,
          usage: result.usage,
          finishReason: result.finishReason,
        },
        { headers: corsHeaders }
      )
    } catch (error) {
      console.error('Generate error:', error)
      return Response.json(
        {
          error: error instanceof Error ? error.message : 'Generation failed',
          code: 'GENERATION_FAILED',
        },
        { status: 500, headers: corsHeaders }
      )
    }
  }

  // Stream text
  if (url.pathname === '/stream' && req.method === 'POST') {
    try {
      const body = await req.json() as StreamRequest
      const { model = 'sonnet', system, messages } = body

      if (!messages || messages.length === 0) {
        return Response.json(
          { error: 'messages array is required' },
          { status: 400, headers: corsHeaders }
        )
      }

      const result = streamText({
        model: getModel(model),
        system,
        messages,
      })

      // Return as Server-Sent Events stream
      const encoder = new TextEncoder()
      const stream = new ReadableStream({
        async start(controller) {
          try {
            for await (const chunk of result.textStream) {
              // Send as SSE format
              const data = JSON.stringify({ type: 'text', content: chunk })
              controller.enqueue(encoder.encode(`data: ${data}\n\n`))
            }
            // Send completion message
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`))
            controller.close()
          } catch (error) {
            const errorData = JSON.stringify({
              type: 'error',
              error: error instanceof Error ? error.message : 'Stream failed'
            })
            controller.enqueue(encoder.encode(`data: ${errorData}\n\n`))
            controller.close()
          }
        },
      })

      return new Response(stream, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      })
    } catch (error) {
      console.error('Stream error:', error)
      return Response.json(
        {
          error: error instanceof Error ? error.message : 'Streaming failed',
          code: 'STREAM_FAILED',
        },
        { status: 500, headers: corsHeaders }
      )
    }
  }

  // Prompts API routes
  // POST /prompts/compile - Compile prompt with variables (must be before /prompts/:id)
  if (url.pathname === '/prompts/compile' && req.method === 'POST') {
    return handleCompilePrompt(req, corsHeaders)
  }

  // GET /prompts - List all prompts
  if (url.pathname === '/prompts' && req.method === 'GET') {
    return handleListPrompts(req, corsHeaders)
  }

  // GET /prompts/:id - Get single prompt by ID
  const promptMatch = url.pathname.match(/^\/prompts\/([^/]+)$/)
  if (promptMatch && req.method === 'GET') {
    const promptId = promptMatch[1]
    return handleGetPrompt(req, promptId, corsHeaders)
  }

  // Graders API routes
  // POST /graders/run-llm-judge - Execute an LLM judge grader
  if (url.pathname === '/graders/run-llm-judge' && req.method === 'POST') {
    return handleRunLLMJudge(req, corsHeaders)
  }

  // POST /graders/test - Test a grader with sample input/output
  if (url.pathname === '/graders/test' && req.method === 'POST') {
    return handleTestGrader(req, corsHeaders)
  }

  // 404 for unknown routes
  return Response.json(
    {
      error: 'Not found',
      availableEndpoints: [
        '/openapi.json',
        '/health',
        '/auth-status',
        '/generate',
        '/stream',
        '/prompts',
        '/prompts/:id',
        '/prompts/compile',
        '/graders/run-llm-judge',
        '/graders/test',
      ],
    },
    { status: 404, headers: corsHeaders }
  )
}

// Start the server
const server = Bun.serve({
  port: PORT,
  fetch: handleRequest,
})

console.log(`Claude Code server running on http://localhost:${server.port}`)
console.log('Endpoints:')
console.log('  GET  /openapi.json        - OpenAPI 3.0 specification')
console.log('  GET  /health              - Health check')
console.log('  GET  /auth-status         - Check Claude CLI authentication')
console.log('  POST /generate            - Generate text (non-streaming)')
console.log('  POST /stream              - Stream text (SSE)')
console.log('  GET  /prompts             - List prompts (?tag=, ?search=)')
console.log('  GET  /prompts/:id         - Get prompt by ID')
console.log('  POST /prompts/compile     - Compile prompt with variables')
console.log('  POST /graders/run-llm-judge - Execute LLM judge grader')
console.log('  POST /graders/test        - Test a grader')
