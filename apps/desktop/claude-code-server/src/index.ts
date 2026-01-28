import { createClaudeCode } from 'ai-sdk-provider-claude-code'
import { generateText, streamText } from 'ai'

const PORT = parseInt(process.env.CLAUDE_CODE_PORT || '3457', 10)

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

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

async function handleRequest(req: Request): Promise<Response> {
  const url = new URL(req.url)

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
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

  // 404 for unknown routes
  return Response.json(
    { error: 'Not found', availableEndpoints: ['/health', '/auth-status', '/generate', '/stream'] },
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
console.log('  GET  /health      - Health check')
console.log('  GET  /auth-status - Check Claude CLI authentication')
console.log('  POST /generate    - Generate text (non-streaming)')
console.log('  POST /stream      - Stream text (SSE)')
