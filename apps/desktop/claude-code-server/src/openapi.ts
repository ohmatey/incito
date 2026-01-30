/**
 * OpenAPI 3.0 Specification for Claude Code Server API
 * Serves prompts and grader execution for Incito desktop app
 */

export const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'Incito Claude Code Server API',
    description: `REST API for managing prompts and executing LLM graders.

This server provides access to Incito prompt templates and enables LLM-based evaluation via Claude Code.

## Authentication
Authentication is optional and controlled via the \`INCITO_HTTP_TOKEN\` environment variable.
When set, requests must include an \`Authorization: Bearer <token>\` header.

## Rate Limiting
Requests are rate-limited to 100 requests per minute per IP address.`,
    version: '1.0.0',
    contact: {
      name: 'Incito',
    },
    license: {
      name: 'MIT',
    },
  },
  servers: [
    {
      url: 'http://localhost:3457',
      description: 'Local development server',
    },
  ],
  tags: [
    {
      name: 'Health',
      description: 'Server health and status endpoints',
    },
    {
      name: 'Prompts',
      description: 'Prompt template management and compilation',
    },
    {
      name: 'Graders',
      description: 'LLM judge grader execution',
    },
    {
      name: 'Generation',
      description: 'Text generation via Claude Code',
    },
  ],
  paths: {
    '/health': {
      get: {
        tags: ['Health'],
        summary: 'Health check',
        description: 'Returns server status and configuration information',
        operationId: 'getHealth',
        responses: {
          '200': {
            description: 'Server is healthy',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/HealthResponse',
                },
                example: {
                  status: 'ok',
                  provider: 'claude-code',
                  timestamp: '2024-01-15T10:30:00.000Z',
                  executablePath: '/usr/local/bin/claude',
                },
              },
            },
          },
        },
      },
    },
    '/auth-status': {
      get: {
        tags: ['Health'],
        summary: 'Check Claude CLI authentication',
        description: 'Verifies if the Claude CLI is properly authenticated',
        operationId: 'getAuthStatus',
        responses: {
          '200': {
            description: 'Authentication status',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/AuthStatusResponse',
                },
                examples: {
                  authenticated: {
                    summary: 'Authenticated',
                    value: {
                      authenticated: true,
                      model: 'claude-sonnet-4-20250514',
                    },
                  },
                  notAuthenticated: {
                    summary: 'Not authenticated',
                    value: {
                      authenticated: false,
                      error: 'Claude CLI not authenticated',
                      hint: 'Run "claude login" to authenticate',
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/openapi.json': {
      get: {
        tags: ['Health'],
        summary: 'OpenAPI specification',
        description: 'Returns the OpenAPI 3.0 specification for this API',
        operationId: 'getOpenApiSpec',
        responses: {
          '200': {
            description: 'OpenAPI specification',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  description: 'OpenAPI 3.0 specification document',
                },
              },
            },
          },
        },
      },
    },
    '/prompts': {
      get: {
        tags: ['Prompts'],
        summary: 'List all prompts',
        description: 'Returns a list of all available prompts with optional filtering by tag or search term',
        operationId: 'listPrompts',
        security: [{ bearerAuth: [] }, {}],
        parameters: [
          {
            name: 'tag',
            in: 'query',
            description: 'Filter prompts by tag (case-insensitive)',
            required: false,
            schema: {
              type: 'string',
            },
            example: 'writing',
          },
          {
            name: 'search',
            in: 'query',
            description: 'Search prompts by name or description',
            required: false,
            schema: {
              type: 'string',
            },
            example: 'blog post',
          },
        ],
        responses: {
          '200': {
            description: 'List of prompts',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/PromptListResponse',
                },
              },
            },
          },
          '401': {
            $ref: '#/components/responses/Unauthorized',
          },
          '503': {
            $ref: '#/components/responses/FolderNotConfigured',
          },
        },
      },
    },
    '/prompts/{id}': {
      get: {
        tags: ['Prompts'],
        summary: 'Get prompt by ID',
        description: 'Returns full details of a specific prompt including template and variables',
        operationId: 'getPrompt',
        security: [{ bearerAuth: [] }, {}],
        parameters: [
          {
            name: 'id',
            in: 'path',
            description: 'Unique prompt ID',
            required: true,
            schema: {
              type: 'string',
            },
          },
        ],
        responses: {
          '200': {
            description: 'Prompt details',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/PromptDetails',
                },
              },
            },
          },
          '401': {
            $ref: '#/components/responses/Unauthorized',
          },
          '404': {
            $ref: '#/components/responses/PromptNotFound',
          },
          '503': {
            $ref: '#/components/responses/FolderNotConfigured',
          },
        },
      },
    },
    '/prompts/compile': {
      post: {
        tags: ['Prompts'],
        summary: 'Compile prompt with variables',
        description: 'Interpolates a prompt template with the provided variable values',
        operationId: 'compilePrompt',
        security: [{ bearerAuth: [] }, {}],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/CompilePromptRequest',
              },
              example: {
                id: 'blog-post-generator',
                variables: {
                  topic: 'AI in healthcare',
                  tone: 'professional',
                  wordCount: 500,
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Compiled prompt',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/CompilePromptResponse',
                },
              },
            },
          },
          '400': {
            description: 'Invalid request or missing required variables',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ValidationError',
                },
                examples: {
                  missingId: {
                    summary: 'Missing ID',
                    value: {
                      error: 'id is required',
                      code: 'INVALID_REQUEST',
                    },
                  },
                  missingVariables: {
                    summary: 'Missing required variables',
                    value: {
                      error: 'Missing required variables: topic, tone',
                      code: 'MISSING_VARIABLES',
                      missingVariables: ['topic', 'tone'],
                    },
                  },
                },
              },
            },
          },
          '401': {
            $ref: '#/components/responses/Unauthorized',
          },
          '404': {
            $ref: '#/components/responses/PromptNotFound',
          },
          '503': {
            $ref: '#/components/responses/FolderNotConfigured',
          },
        },
      },
    },
    '/generate': {
      post: {
        tags: ['Generation'],
        summary: 'Generate text (non-streaming)',
        description: 'Generates text using Claude Code. Returns the complete response once generation is finished.',
        operationId: 'generateText',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/GenerateRequest',
              },
              example: {
                model: 'sonnet',
                system: 'You are a helpful assistant.',
                prompt: 'Explain quantum computing in simple terms.',
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Generated text',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/GenerateResponse',
                },
              },
            },
          },
          '400': {
            description: 'Invalid request',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Error',
                },
                example: {
                  error: 'prompt is required',
                },
              },
            },
          },
          '500': {
            description: 'Generation failed',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Error',
                },
                example: {
                  error: 'Claude Code executable path not configured',
                  code: 'GENERATION_FAILED',
                },
              },
            },
          },
        },
      },
    },
    '/stream': {
      post: {
        tags: ['Generation'],
        summary: 'Stream text generation',
        description: 'Streams text generation using Server-Sent Events (SSE). Each chunk is sent as a JSON event.',
        operationId: 'streamText',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/StreamRequest',
              },
              example: {
                model: 'sonnet',
                system: 'You are a helpful assistant.',
                messages: [
                  { role: 'user', content: 'Write a haiku about programming.' },
                ],
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Server-Sent Events stream',
            content: {
              'text/event-stream': {
                schema: {
                  type: 'string',
                  description: 'SSE stream with JSON events: {type: "text", content: string} or {type: "done"} or {type: "error", error: string}',
                },
                example: 'data: {"type":"text","content":"Lines"}\n\ndata: {"type":"text","content":" of"}\n\ndata: {"type":"text","content":" code"}\n\ndata: {"type":"done"}\n\n',
              },
            },
          },
          '400': {
            description: 'Invalid request',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Error',
                },
              },
            },
          },
          '500': {
            description: 'Streaming failed',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Error',
                },
              },
            },
          },
        },
      },
    },
    '/graders/run-llm-judge': {
      post: {
        tags: ['Graders'],
        summary: 'Execute LLM judge grader',
        description: 'Runs an LLM judge grader to evaluate input/output pairs. Returns a normalized score (0-1) with reasoning.',
        operationId: 'runLLMJudge',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/RunLLMJudgeRequest',
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Grader result',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/LLMJudgeResult',
                },
                example: {
                  score: 0.75,
                  rawScore: 4,
                  passed: true,
                  reason: 'The response is accurate and well-structured, though could be more concise.',
                  executionTimeMs: 1523,
                },
              },
            },
          },
          '400': {
            description: 'Invalid request',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Error',
                },
              },
            },
          },
          '500': {
            description: 'Execution failed',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Error',
                },
              },
            },
          },
        },
      },
    },
    '/graders/test': {
      post: {
        tags: ['Graders'],
        summary: 'Test a grader',
        description: 'Tests an LLM judge grader with sample input/output. Useful for validating grader configuration before use.',
        operationId: 'testGrader',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/TestGraderRequest',
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Test result',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/LLMJudgeResult',
                },
              },
            },
          },
          '400': {
            description: 'Invalid request (only LLM judge graders supported)',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Error',
                },
                example: {
                  error: 'Only LLM judge graders can be tested via backend. Assertions run in the frontend.',
                },
              },
            },
          },
          '500': {
            description: 'Test failed',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Error',
                },
              },
            },
          },
        },
      },
    },
  },
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        description: 'Optional Bearer token authentication. Set INCITO_HTTP_TOKEN environment variable to enable.',
      },
    },
    schemas: {
      HealthResponse: {
        type: 'object',
        required: ['status', 'provider', 'timestamp'],
        properties: {
          status: {
            type: 'string',
            enum: ['ok'],
            description: 'Server status',
          },
          provider: {
            type: 'string',
            example: 'claude-code',
            description: 'AI provider name',
          },
          timestamp: {
            type: 'string',
            format: 'date-time',
            description: 'Current server time',
          },
          executablePath: {
            type: 'string',
            description: 'Path to Claude Code executable',
          },
        },
      },
      AuthStatusResponse: {
        type: 'object',
        required: ['authenticated'],
        properties: {
          authenticated: {
            type: 'boolean',
            description: 'Whether Claude CLI is authenticated',
          },
          model: {
            type: 'string',
            description: 'Model ID when authenticated',
          },
          error: {
            type: 'string',
            description: 'Error message when not authenticated',
          },
          hint: {
            type: 'string',
            description: 'Help text for authentication',
          },
        },
      },
      PromptSummary: {
        type: 'object',
        required: ['id', 'name', 'description', 'tags', 'variableCount'],
        properties: {
          id: {
            type: 'string',
            description: 'Unique prompt identifier',
          },
          name: {
            type: 'string',
            description: 'Human-readable prompt name',
          },
          description: {
            type: 'string',
            description: 'Brief description of the prompt',
          },
          tags: {
            type: 'array',
            items: { type: 'string' },
            description: 'Categorization tags',
          },
          variableCount: {
            type: 'integer',
            description: 'Number of variables in the prompt',
          },
        },
      },
      PromptListResponse: {
        type: 'object',
        required: ['prompts'],
        properties: {
          prompts: {
            type: 'array',
            items: { $ref: '#/components/schemas/PromptSummary' },
          },
        },
      },
      Variable: {
        type: 'object',
        required: ['key', 'label', 'type'],
        properties: {
          key: {
            type: 'string',
            description: 'Variable key used in template (e.g., {{key}})',
          },
          label: {
            type: 'string',
            description: 'Human-readable label',
          },
          type: {
            type: 'string',
            enum: ['text', 'textarea', 'select', 'number', 'checkbox', 'date', 'multiselect', 'image'],
            description: 'Input field type',
          },
          required: {
            type: 'boolean',
            default: false,
            description: 'Whether the variable is required',
          },
          default: {
            oneOf: [
              { type: 'string' },
              { type: 'number' },
              { type: 'array', items: { type: 'string' } },
            ],
            description: 'Default value',
          },
          placeholder: {
            type: 'string',
            description: 'Placeholder text for input',
          },
          description: {
            type: 'string',
            description: 'Help text for the variable',
          },
          options: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                label: { type: 'string' },
                value: { type: 'string' },
              },
            },
            description: 'Options for select/multiselect types',
          },
          min: {
            type: 'number',
            description: 'Minimum value for number type',
          },
          max: {
            type: 'number',
            description: 'Maximum value for number type',
          },
          step: {
            type: 'number',
            description: 'Step increment for number type',
          },
          format: {
            type: 'string',
            enum: ['comma', 'newline', 'numbered', 'bullet'],
            description: 'Serialization format for arrays',
          },
        },
      },
      PromptDetails: {
        type: 'object',
        required: ['id', 'name', 'description', 'tags', 'template', 'variables'],
        properties: {
          id: {
            type: 'string',
            description: 'Unique prompt identifier',
          },
          name: {
            type: 'string',
            description: 'Human-readable prompt name',
          },
          description: {
            type: 'string',
            description: 'Brief description of the prompt',
          },
          tags: {
            type: 'array',
            items: { type: 'string' },
            description: 'Categorization tags',
          },
          template: {
            type: 'string',
            description: 'Prompt template with {{variable}} placeholders',
          },
          variables: {
            type: 'array',
            items: { $ref: '#/components/schemas/Variable' },
            description: 'Variable definitions',
          },
        },
      },
      CompilePromptRequest: {
        type: 'object',
        required: ['id', 'variables'],
        properties: {
          id: {
            type: 'string',
            description: 'Prompt ID to compile',
          },
          variables: {
            type: 'object',
            additionalProperties: true,
            description: 'Variable values to interpolate',
          },
        },
      },
      CompilePromptResponse: {
        type: 'object',
        required: ['promptName', 'compiledPrompt'],
        properties: {
          promptName: {
            type: 'string',
            description: 'Name of the compiled prompt',
          },
          compiledPrompt: {
            type: 'string',
            description: 'Fully interpolated prompt text',
          },
        },
      },
      GenerateRequest: {
        type: 'object',
        required: ['prompt'],
        properties: {
          model: {
            type: 'string',
            enum: ['opus', 'sonnet', 'haiku'],
            default: 'sonnet',
            description: 'Claude model to use',
          },
          system: {
            type: 'string',
            description: 'System prompt',
          },
          prompt: {
            type: 'string',
            description: 'User prompt',
          },
        },
      },
      GenerateResponse: {
        type: 'object',
        required: ['text'],
        properties: {
          text: {
            type: 'string',
            description: 'Generated text',
          },
          usage: {
            type: 'object',
            properties: {
              promptTokens: { type: 'integer' },
              completionTokens: { type: 'integer' },
              totalTokens: { type: 'integer' },
            },
            description: 'Token usage statistics',
          },
          finishReason: {
            type: 'string',
            description: 'Reason generation stopped',
          },
        },
      },
      StreamRequest: {
        type: 'object',
        required: ['messages'],
        properties: {
          model: {
            type: 'string',
            enum: ['opus', 'sonnet', 'haiku'],
            default: 'sonnet',
            description: 'Claude model to use',
          },
          system: {
            type: 'string',
            description: 'System prompt',
          },
          messages: {
            type: 'array',
            items: {
              type: 'object',
              required: ['role', 'content'],
              properties: {
                role: {
                  type: 'string',
                  enum: ['user', 'assistant', 'system'],
                },
                content: {
                  type: 'string',
                },
              },
            },
            description: 'Conversation messages',
          },
        },
      },
      LLMJudgeGrader: {
        type: 'object',
        required: ['id', 'name', 'type', 'config', 'isBuiltin', 'enabled', 'createdAt', 'updatedAt'],
        properties: {
          id: {
            type: 'string',
            description: 'Unique grader identifier',
          },
          name: {
            type: 'string',
            description: 'Grader name',
          },
          description: {
            type: 'string',
            description: 'Grader description',
          },
          type: {
            type: 'string',
            enum: ['llm_judge'],
            description: 'Grader type',
          },
          config: {
            type: 'object',
            required: ['model', 'promptTemplate', 'outputSchema'],
            properties: {
              model: {
                type: 'string',
                enum: ['gpt-4o', 'gpt-4o-mini', 'claude-sonnet-4-5', 'claude-haiku-4-5'],
                description: 'Judge model',
              },
              promptTemplate: {
                type: 'string',
                description: 'Evaluation prompt template with {{input}} and {{output}} placeholders',
              },
              outputSchema: {
                type: 'string',
                enum: ['score_1_to_5', 'score_1_to_10', 'boolean', 'pass_fail_reason'],
                description: 'Expected output format',
              },
              systemPrompt: {
                type: 'string',
                description: 'Optional custom system prompt',
              },
            },
          },
          isBuiltin: {
            type: 'boolean',
            description: 'Whether this is a built-in grader',
          },
          enabled: {
            type: 'boolean',
            description: 'Whether the grader is enabled',
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
          },
          updatedAt: {
            type: 'string',
            format: 'date-time',
          },
        },
      },
      RunLLMJudgeRequest: {
        type: 'object',
        required: ['grader', 'input', 'output'],
        properties: {
          grader: {
            $ref: '#/components/schemas/LLMJudgeGrader',
          },
          input: {
            type: 'string',
            description: 'The input/prompt that was given',
          },
          output: {
            type: 'string',
            description: 'The output/response to evaluate',
          },
          claudeCodePath: {
            type: 'string',
            description: 'Optional custom path to Claude Code executable',
          },
        },
      },
      TestGraderRequest: {
        type: 'object',
        required: ['grader', 'input', 'output'],
        properties: {
          grader: {
            $ref: '#/components/schemas/LLMJudgeGrader',
          },
          input: {
            type: 'string',
            description: 'Sample input for testing',
          },
          output: {
            type: 'string',
            description: 'Sample output for testing',
          },
          claudeCodePath: {
            type: 'string',
            description: 'Optional custom path to Claude Code executable',
          },
        },
      },
      LLMJudgeResult: {
        type: 'object',
        required: ['score', 'passed', 'reason', 'executionTimeMs'],
        properties: {
          score: {
            type: 'number',
            minimum: 0,
            maximum: 1,
            description: 'Normalized score (0-1)',
          },
          rawScore: {
            type: 'number',
            description: 'Original score before normalization (e.g., 4 for 4/5)',
          },
          passed: {
            type: 'boolean',
            description: 'Whether the evaluation passed',
          },
          reason: {
            type: 'string',
            description: 'Explanation of the evaluation',
          },
          executionTimeMs: {
            type: 'integer',
            description: 'Time taken to execute in milliseconds',
          },
        },
      },
      Error: {
        type: 'object',
        required: ['error'],
        properties: {
          error: {
            type: 'string',
            description: 'Error message',
          },
          code: {
            type: 'string',
            description: 'Error code for programmatic handling',
          },
        },
      },
      ValidationError: {
        allOf: [
          { $ref: '#/components/schemas/Error' },
          {
            type: 'object',
            properties: {
              missingVariables: {
                type: 'array',
                items: { type: 'string' },
                description: 'List of missing required variable keys',
              },
            },
          },
        ],
      },
    },
    responses: {
      Unauthorized: {
        description: 'Authentication required',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error',
            },
            example: {
              error: 'Unauthorized',
              code: 'UNAUTHORIZED',
            },
          },
        },
      },
      PromptNotFound: {
        description: 'Prompt not found',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error',
            },
            example: {
              error: 'Prompt not found',
              code: 'NOT_FOUND',
            },
          },
        },
      },
      FolderNotConfigured: {
        description: 'Prompts folder not configured',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error',
            },
            example: {
              error: 'Prompts folder not configured',
              code: 'FOLDER_NOT_CONFIGURED',
            },
          },
        },
      },
      RateLimited: {
        description: 'Too many requests',
        headers: {
          'Retry-After': {
            schema: { type: 'integer' },
            description: 'Seconds to wait before retrying',
          },
        },
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error',
            },
            example: {
              error: 'Too many requests',
              code: 'RATE_LIMITED',
            },
          },
        },
      },
    },
  },
} as const
