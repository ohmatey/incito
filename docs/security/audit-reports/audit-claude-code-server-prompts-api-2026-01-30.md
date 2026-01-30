# Security Audit Report: Claude Code Server Prompts API

**Date:** 2026-01-30
**Scope:** Prompts API endpoints in `claude-code-server`
**Methodology:** Static code analysis, threat modeling, OWASP Top 10 assessment
**Severity Summary:** 1 CRITICAL, 3 HIGH, 4 MEDIUM, 2 LOW

---

## TLDR

- **CRITICAL**: Wildcard CORS (`Access-Control-Allow-Origin: *`) allows any website to access the API, enabling credential theft and cross-site request forgery from malicious web pages
- **HIGH**: Optional authentication is disabled by default - without `INCITO_HTTP_TOKEN` set, the API is completely unauthenticated
- **HIGH**: Missing rate limiting exposes the server to denial-of-service attacks and resource exhaustion
- **HIGH**: Handlebars template compilation with `noEscape: true` combined with arbitrary user input enables template injection attacks
- **MEDIUM**: Error messages leak implementation details (stack traces, file paths) that aid attackers

---

## Executive Summary

The Claude Code Server's prompts API (`/prompts`, `/prompts/:id`, `/prompts/compile`) introduces significant security risks to the Incito application. While there are some positive security measures in place (path traversal protection in `loadPrompts`, input validation patterns), several critical vulnerabilities undermine the overall security posture.

The most severe issue is the combination of wildcard CORS with optional authentication. When the `INCITO_HTTP_TOKEN` environment variable is not set (the default state), any website can make authenticated requests to the local server, accessing and compiling user prompts. This effectively exposes the entire prompts library to malicious web pages.

**Key Findings:**
- The server binds to all interfaces by default (port 3457)
- Authentication is entirely opt-in via environment variable
- No request body size limits could enable DoS via large payloads
- Handlebars template processing with `noEscape: true` introduces injection risks

---

## Audit Scope & Methodology

### Files Reviewed

| File | Purpose |
|------|---------|
| `/apps/desktop/claude-code-server/src/prompts-handler.ts` | Prompts API endpoint handlers |
| `/apps/desktop/claude-code-server/src/index.ts` | HTTP server configuration and routing |
| `/apps/desktop/mastra/src/mcp/lib/db.ts` | Database access for folder path |
| `/apps/desktop/mastra/src/mcp/lib/prompts.ts` | Prompt file loading and interpolation |
| `/apps/desktop/src/lib/interpolate.ts` | Handlebars template interpolation |
| `/apps/desktop/src/lib/parser.ts` | YAML frontmatter parsing |

### Methodology

1. **Static Analysis**: Manual code review of all endpoint handlers, input processing, and data flow
2. **Threat Modeling**: STRIDE analysis for each endpoint
3. **OWASP Assessment**: Evaluation against OWASP Top 10 2021
4. **Dependency Analysis**: Review of third-party package security

---

## Security Findings

### CRITICAL Severity

#### SEC-PROMPT-001: Wildcard CORS Enables Cross-Origin Attacks

**Severity:** CRITICAL
**CWE:** CWE-942 (Permissive Cross-domain Policy with Untrusted Domains)
**OWASP:** A01:2021 - Broken Access Control

**Description:**
The server configures CORS with `Access-Control-Allow-Origin: *`, allowing any website to make requests to the API.

**Location:** `/apps/desktop/claude-code-server/src/index.ts`, lines 59-63

```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}
```

**Attack Scenario:**
1. Attacker creates a malicious website at `https://evil-site.com`
2. User visits the malicious site while Incito desktop app is running
3. JavaScript on the malicious site makes requests to `http://localhost:3457/prompts`
4. All user prompts (potentially containing sensitive data, business logic, API keys in templates) are exfiltrated
5. Attacker can also compile prompts with arbitrary variables, potentially revealing sensitive interpolated content

**Impact:**
- Complete exposure of all prompt templates to any website
- Potential leakage of sensitive information embedded in prompts
- Enables reconnaissance for further attacks

**Remediation:**
```typescript
// Restrict to localhost origins only
function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('Origin')
  const allowedOrigins = [
    'http://localhost',
    'http://127.0.0.1',
    'tauri://localhost',
    'https://tauri.localhost',
  ]

  // Match origin prefix (port-agnostic for development)
  const isAllowed = allowedOrigins.some(allowed =>
    origin?.startsWith(allowed)
  )

  return {
    'Access-Control-Allow-Origin': isAllowed ? origin! : '',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Vary': 'Origin',
  }
}
```

**References:**
- [CWE-942](https://cwe.mitre.org/data/definitions/942.html)
- [OWASP CORS Misconfiguration](https://owasp.org/www-community/attacks/CORS_OriginHeaderScrutiny)

---

### HIGH Severity

#### SEC-PROMPT-002: Authentication Disabled by Default

**Severity:** HIGH
**CWE:** CWE-306 (Missing Authentication for Critical Function)
**OWASP:** A07:2021 - Identification and Authentication Failures

**Description:**
The authentication mechanism is optional and disabled unless the `INCITO_HTTP_TOKEN` environment variable is explicitly set. Most users will not configure this, leaving the API completely open.

**Location:** `/apps/desktop/claude-code-server/src/prompts-handler.ts`, lines 6-27

```typescript
const AUTH_TOKEN = process.env.INCITO_HTTP_TOKEN

function checkAuth(req: Request): boolean {
  if (!AUTH_TOKEN) {
    return true // No auth required if token not set
  }
  // ...
}
```

**Attack Scenario:**
1. User runs Incito with default configuration
2. Any local process or website (via CORS issue above) can access the API
3. Malicious browser extensions, other apps, or websites can read all prompts
4. No audit trail of who accessed the data

**Impact:**
- Complete unauthorized access to prompt data
- No authentication audit trail
- Violates principle of secure defaults

**Remediation:**
1. **Require authentication by default** - generate a random token on first launch
2. Store the token securely in the system keychain
3. Automatically configure the client to use the token
4. Log authentication failures

```typescript
// Generate secure random token if not configured
import { randomBytes } from 'crypto'

function getOrCreateAuthToken(): string {
  let token = process.env.INCITO_HTTP_TOKEN

  if (!token) {
    // In production: retrieve from or generate into system keychain
    token = randomBytes(32).toString('hex')
    console.warn('Security: Generated ephemeral auth token. Configure INCITO_HTTP_TOKEN for persistence.')
  }

  return token
}

const AUTH_TOKEN = getOrCreateAuthToken()

function checkAuth(req: Request): boolean {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return false

  const token = authHeader.startsWith('Bearer ')
    ? authHeader.slice(7)
    : authHeader

  // Timing-safe comparison
  return timingSafeEqual(Buffer.from(token), Buffer.from(AUTH_TOKEN))
}
```

**References:**
- [CWE-306](https://cwe.mitre.org/data/definitions/306.html)

---

#### SEC-PROMPT-003: No Rate Limiting - Denial of Service Risk

**Severity:** HIGH
**CWE:** CWE-770 (Allocation of Resources Without Limits)
**OWASP:** A04:2021 - Insecure Design

**Description:**
The server has no rate limiting on any endpoint. An attacker can flood the server with requests, causing:
- CPU exhaustion via template compilation
- File system overload via repeated prompt loading
- Memory exhaustion via large request payloads

**Location:** `/apps/desktop/claude-code-server/src/index.ts` - `handleRequest` function has no rate limiting

**Attack Scenario:**
1. Attacker sends thousands of `/prompts/compile` requests
2. Each request triggers Handlebars compilation
3. Server becomes unresponsive, affecting the desktop application
4. If no payload size limits exist, memory can be exhausted

**Impact:**
- Application denial of service
- System resource exhaustion
- Potential crash affecting user's work

**Remediation:**
```typescript
// Simple in-memory rate limiter
const requestCounts = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT = 100 // requests
const RATE_WINDOW = 60000 // 1 minute

function checkRateLimit(clientIp: string): boolean {
  const now = Date.now()
  const entry = requestCounts.get(clientIp)

  if (!entry || entry.resetAt < now) {
    requestCounts.set(clientIp, { count: 1, resetAt: now + RATE_WINDOW })
    return true
  }

  if (entry.count >= RATE_LIMIT) {
    return false
  }

  entry.count++
  return true
}

// Also add request body size limits
const MAX_BODY_SIZE = 1024 * 1024 // 1MB

async function parseJsonBody(req: Request): Promise<unknown> {
  const contentLength = parseInt(req.headers.get('Content-Length') || '0')
  if (contentLength > MAX_BODY_SIZE) {
    throw new Error('Request body too large')
  }
  return req.json()
}
```

**References:**
- [CWE-770](https://cwe.mitre.org/data/definitions/770.html)

---

#### SEC-PROMPT-004: Handlebars Template Injection via User Variables

**Severity:** HIGH
**CWE:** CWE-94 (Improper Control of Generation of Code)
**OWASP:** A03:2021 - Injection

**Description:**
The `interpolate` function compiles user-provided variable values into Handlebars templates with `noEscape: true`. While there is a `sanitizeValue` function that escapes `{{` and `}}`, this protection can be bypassed in certain scenarios, and the fundamental risk of code generation from user input remains.

**Location:** `/apps/desktop/src/lib/interpolate.ts`, lines 59-67, 132-135

```typescript
function sanitizeValue(value: unknown): unknown {
  if (typeof value === 'string') {
    return value.replace(/\{\{/g, '\\{{').replace(/\}\}/g, '\\}}')
  }
  // ...
}

// Later:
const compiled = Handlebars.compile(template, { noEscape: true, strict: false })
return compiled(context)
```

**Attack Scenario:**
1. Attacker calls `/prompts/compile` with crafted variable values
2. If a template uses `{{#each}}` or other helpers that iterate over arrays, the sanitization may not be applied correctly
3. The `noEscape: true` option means any HTML/JS in the output is not escaped
4. While this is intentional for prompt generation, it creates risks if prompts are displayed in webviews

**Impact:**
- Potential for unexpected template behavior
- XSS risk if compiled prompts are rendered in HTML contexts
- Information disclosure via helper abuse

**Remediation:**
1. Apply stricter input validation on variable values
2. Consider sandboxing Handlebars execution
3. Implement output validation for sensitive contexts

```typescript
// Add variable value validation
const MAX_VARIABLE_LENGTH = 50000 // 50KB per variable
const MAX_TOTAL_VARIABLES_SIZE = 500000 // 500KB total

function validateVariables(
  variables: Record<string, unknown>,
  schema: Variable[]
): { valid: boolean; error?: string } {
  let totalSize = 0

  for (const [key, value] of Object.entries(variables)) {
    const def = schema.find(v => v.key === key)

    // Type validation
    if (def?.type === 'number' && typeof value !== 'number') {
      return { valid: false, error: `Variable ${key} must be a number` }
    }

    // Size validation
    const valueSize = JSON.stringify(value).length
    if (valueSize > MAX_VARIABLE_LENGTH) {
      return { valid: false, error: `Variable ${key} exceeds maximum size` }
    }
    totalSize += valueSize
  }

  if (totalSize > MAX_TOTAL_VARIABLES_SIZE) {
    return { valid: false, error: 'Total variable size exceeds maximum' }
  }

  return { valid: true }
}
```

**References:**
- [CWE-94](https://cwe.mitre.org/data/definitions/94.html)
- [Handlebars Security](https://handlebarsjs.com/guide/#security)

---

### MEDIUM Severity

#### SEC-PROMPT-005: Error Messages Leak Implementation Details

**Severity:** MEDIUM
**CWE:** CWE-209 (Generation of Error Message Containing Sensitive Information)
**OWASP:** A04:2021 - Insecure Design

**Description:**
Error handlers return the full error message to clients, potentially exposing file paths, stack traces, and internal implementation details.

**Location:** `/apps/desktop/claude-code-server/src/prompts-handler.ts`, lines 93-102

```typescript
catch (error) {
  console.error('Error listing prompts:', error)
  return Response.json(
    {
      error: error instanceof Error ? error.message : 'Failed to list prompts',
      code: 'LIST_FAILED',
    },
    { status: 500, headers: corsHeaders }
  )
}
```

**Attack Scenario:**
1. Attacker triggers various errors (invalid IDs, malformed requests)
2. Error messages reveal file paths, database locations, internal structure
3. Information aids in planning further attacks

**Impact:**
- Information disclosure
- Aids reconnaissance
- May reveal sensitive paths or configurations

**Remediation:**
```typescript
// Map internal errors to safe external messages
function getSafeErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error)

  // Log full error internally
  console.error('Internal error:', error)

  // Return sanitized message
  const safeMessages: Record<string, string> = {
    'SQLITE_ERROR': 'Database error occurred',
    'ENOENT': 'Resource not found',
    'EACCES': 'Access denied',
  }

  for (const [key, safe] of Object.entries(safeMessages)) {
    if (message.includes(key)) return safe
  }

  // Generic fallback - never expose raw error
  return 'An error occurred processing your request'
}
```

**References:**
- [CWE-209](https://cwe.mitre.org/data/definitions/209.html)

---

#### SEC-PROMPT-006: Timing Attack on Token Comparison

**Severity:** MEDIUM
**CWE:** CWE-208 (Observable Timing Discrepancy)
**OWASP:** A02:2021 - Cryptographic Failures

**Description:**
The authentication token comparison uses JavaScript's `===` operator, which is not constant-time. An attacker could potentially determine the token character-by-character via timing analysis.

**Location:** `/apps/desktop/claude-code-server/src/prompts-handler.ts`, line 26

```typescript
return token === AUTH_TOKEN
```

**Attack Scenario:**
1. Attacker makes many authentication attempts with different tokens
2. Measures response time for each attempt
3. Correct prefix characters may return faster due to short-circuit evaluation
4. Token can be derived character-by-character

**Impact:**
- Potential authentication bypass
- Token discovery without brute force

**Remediation:**
```typescript
import { timingSafeEqual } from 'crypto'

function checkAuth(req: Request): boolean {
  if (!AUTH_TOKEN) return true

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return false

  const token = authHeader.startsWith('Bearer ')
    ? authHeader.slice(7)
    : authHeader

  // Constant-time comparison
  try {
    return timingSafeEqual(
      Buffer.from(token, 'utf-8'),
      Buffer.from(AUTH_TOKEN, 'utf-8')
    )
  } catch {
    return false // Different lengths
  }
}
```

**References:**
- [CWE-208](https://cwe.mitre.org/data/definitions/208.html)

---

#### SEC-PROMPT-007: No Request Body Size Limits

**Severity:** MEDIUM
**CWE:** CWE-400 (Uncontrolled Resource Consumption)
**OWASP:** A04:2021 - Insecure Design

**Description:**
The `/prompts/compile` endpoint accepts JSON bodies without size limits. An attacker could send extremely large variable payloads, causing memory exhaustion.

**Location:** `/apps/desktop/claude-code-server/src/prompts-handler.ts`, line 197

```typescript
const body = (await req.json()) as CompileRequest
```

**Attack Scenario:**
1. Attacker sends POST to `/prompts/compile` with 100MB JSON body
2. Server attempts to parse the entire payload into memory
3. Memory exhaustion causes crashes or severe slowdowns

**Impact:**
- Denial of service
- Memory exhaustion
- Application instability

**Remediation:**
See rate limiting remediation above for body size limits.

---

#### SEC-PROMPT-008: Insufficient Input Validation on Prompt ID

**Severity:** MEDIUM
**CWE:** CWE-20 (Improper Input Validation)
**OWASP:** A03:2021 - Injection

**Description:**
The prompt ID from the URL path is extracted via regex and passed directly to `loadPrompt` without validation. While the current implementation finds prompts by iterating the loaded list (which limits impact), the ID could contain unexpected characters.

**Location:** `/apps/desktop/claude-code-server/src/index.ts`, lines 222-225

```typescript
const promptMatch = url.pathname.match(/^\/prompts\/([^/]+)$/)
if (promptMatch && req.method === 'GET') {
  const promptId = promptMatch[1]  // No validation
  return handleGetPrompt(req, promptId, corsHeaders)
}
```

**Attack Scenario:**
1. Attacker sends requests with special characters in prompt ID
2. While current implementation is safe, future changes could introduce vulnerabilities
3. Logging or error messages might expose unexpected behavior

**Impact:**
- Future vulnerability risk
- Potential for log injection
- Defense in depth violation

**Remediation:**
```typescript
// Validate prompt ID format (UUID expected)
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const promptMatch = url.pathname.match(/^\/prompts\/([^/]+)$/)
if (promptMatch && req.method === 'GET') {
  const promptId = decodeURIComponent(promptMatch[1])

  if (!UUID_PATTERN.test(promptId)) {
    return Response.json(
      { error: 'Invalid prompt ID format', code: 'INVALID_ID' },
      { status: 400, headers: corsHeaders }
    )
  }

  return handleGetPrompt(req, promptId, corsHeaders)
}
```

---

### LOW Severity

#### SEC-PROMPT-009: Console Logging of Errors May Expose Sensitive Data

**Severity:** LOW
**CWE:** CWE-532 (Insertion of Sensitive Information into Log File)
**OWASP:** A09:2021 - Security Logging and Monitoring Failures

**Description:**
Errors are logged to console with full details, which may expose sensitive information in production environments.

**Location:** Multiple locations in `prompts-handler.ts` (lines 94, 161, 248)

**Remediation:**
Implement structured logging with sensitive data masking.

---

#### SEC-PROMPT-010: Missing Security Headers

**Severity:** LOW
**CWE:** CWE-693 (Protection Mechanism Failure)
**OWASP:** A05:2021 - Security Misconfiguration

**Description:**
The server does not set security headers like `X-Content-Type-Options`, `X-Frame-Options`, or `Cache-Control` for sensitive data.

**Location:** `/apps/desktop/claude-code-server/src/index.ts`, lines 59-63

**Remediation:**
```typescript
const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Cache-Control': 'no-store, no-cache, must-revalidate',
  'Pragma': 'no-cache',
}
```

---

## Security Strengths

Despite the vulnerabilities identified, the codebase demonstrates several positive security practices:

1. **Path Traversal Protection**: The `loadPrompts` function in `/apps/desktop/mastra/src/mcp/lib/prompts.ts` correctly validates that the resolved path is within the user's home directory:
   ```typescript
   const resolvedPath = await realpath(folderPath)
   if (!resolvedPath.startsWith(homeDir)) {
     throw new Error('Prompts folder must be within user home directory')
   }
   ```

2. **SQL Query Parameterization**: The SQLite query in `db.ts` uses prepared statements with parameterized queries, preventing SQL injection.

3. **Variable Key Validation**: The parser validates variable keys against a strict pattern (`/^[\w-]{1,50}$/`), limiting injection vectors.

4. **Handlebars Input Escaping**: The `sanitizeValue` function attempts to escape Handlebars delimiters in user input.

5. **Template Size Limits**: A 100KB maximum template size is defined (though not consistently enforced in the API).

6. **Type Validation**: The parser validates variable types against an allowlist of valid types.

---

## Dependency Security Assessment

| Package | Version | Status | Notes |
|---------|---------|--------|-------|
| `ai` | ^6.0.0 | Review Needed | Large attack surface, many transitive deps |
| `ai-sdk-provider-claude-code` | ^3.3.3 | Review Needed | External SDK, trust boundary |
| `better-sqlite3` | ^11.10.0 | OK | Native module, keep updated |
| `handlebars` | ^4.7.8 | OK | Known issues addressed in this version |
| `gray-matter` | ^4.0.3 | OK | YAML parsing, watch for prototype pollution |

**Recommendation:** Run `npm audit` or `pnpm audit` regularly and update dependencies proactively.

---

## ACTION PLAN

### Immediate (Within 24-48 hours)

1. **[CRITICAL] Fix CORS Configuration**
   - Replace `Access-Control-Allow-Origin: *` with localhost-only origins
   - Validate Origin header against allowlist
   - Test thoroughly with Tauri application

2. **[HIGH] Enable Authentication by Default**
   - Generate random token on first launch
   - Store in system keychain (macOS Keychain, Windows Credential Manager)
   - Update client to use token automatically

### Short-term (Within 1 week)

3. **[HIGH] Implement Rate Limiting**
   - Add per-IP rate limiting (100 requests/minute)
   - Add request body size limits (1MB max)
   - Log rate limit violations

4. **[HIGH] Strengthen Template Interpolation**
   - Add variable value size limits
   - Add type validation for variable values
   - Consider sandboxed Handlebars execution

5. **[MEDIUM] Fix Timing-Safe Token Comparison**
   - Use `crypto.timingSafeEqual` for token comparison
   - Handle length mismatches gracefully

### Medium-term (Within 2-4 weeks)

6. **[MEDIUM] Sanitize Error Messages**
   - Create error mapping for safe external messages
   - Never expose file paths or stack traces
   - Maintain detailed internal logging

7. **[MEDIUM] Add Request Body Size Limits**
   - Implement maximum content length checking
   - Return 413 Payload Too Large for violations

8. **[MEDIUM] Validate Prompt ID Format**
   - Require UUID format for prompt IDs
   - Reject malformed IDs early

9. **[LOW] Add Security Headers**
   - Add `X-Content-Type-Options: nosniff`
   - Add `Cache-Control: no-store`
   - Consider `X-Frame-Options` if applicable

10. **[LOW] Implement Structured Logging**
    - Use structured logging library
    - Mask sensitive data in logs
    - Add request correlation IDs

---

## Recommendations for Enhanced Security Testing

1. **Penetration Testing**: Conduct a focused penetration test on the HTTP API endpoints
2. **Fuzzing**: Implement fuzz testing for the Handlebars template compilation
3. **Dependency Scanning**: Set up automated dependency vulnerability scanning (Snyk, Dependabot)
4. **Security Code Review**: Establish security code review requirements for API changes
5. **Monitoring**: Add alerting for authentication failures and rate limit violations

---

## Compliance Notes

### OWASP Top 10 2021 Coverage

| Category | Status | Findings |
|----------|--------|----------|
| A01 - Broken Access Control | FAIL | SEC-PROMPT-001, SEC-PROMPT-002 |
| A02 - Cryptographic Failures | PARTIAL | SEC-PROMPT-006 |
| A03 - Injection | PARTIAL | SEC-PROMPT-004, SEC-PROMPT-008 |
| A04 - Insecure Design | FAIL | SEC-PROMPT-003, SEC-PROMPT-005, SEC-PROMPT-007 |
| A05 - Security Misconfiguration | PARTIAL | SEC-PROMPT-010 |
| A06 - Vulnerable Components | REVIEW | Dependency audit needed |
| A07 - Auth Failures | FAIL | SEC-PROMPT-002 |
| A08 - Software/Data Integrity | PASS | N/A |
| A09 - Logging Failures | PARTIAL | SEC-PROMPT-009 |
| A10 - SSRF | PASS | N/A |

---

**Report Prepared By:** Security Engineer Agent
**Review Date:** 2026-01-30
**Next Review:** After remediation of CRITICAL and HIGH findings
