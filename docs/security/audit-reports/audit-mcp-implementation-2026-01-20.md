# Security Audit Report: MCP (Model Context Protocol) Implementation

**Date:** 2026-01-20
**Scope:** MCP server implementation in `apps/desktop/mastra/src/mcp/`
**Reviewer:** Security Engineer (Automated Analysis)
**Severity Summary:** 1 HIGH, 4 MEDIUM, 3 LOW

---

## TLDR

- **HIGH**: API keys stored in plaintext in SQLite database without encryption - attackable via database file access
- **MEDIUM**: Path traversal risk in prompt file loading - folder path from database not validated
- **MEDIUM**: Handlebars template injection possible through user-controlled variable values with `noEscape: true`
- **MEDIUM**: MCP server runs with full filesystem access to configured prompts folder without sandboxing
- **MEDIUM**: No authentication mechanism for MCP stdio transport - any process that can spawn the binary has full access
- **LOW**: CSP disabled (`"csp": null`) in Tauri configuration
- **LOW**: Overly permissive filesystem capabilities (`"path": "**"`) in Tauri
- **LOW**: Error messages may leak sensitive path information

---

## 1. Executive Summary

This security audit examines the MCP (Model Context Protocol) implementation in the Incito desktop application. The MCP server allows external AI assistants (Claude Desktop, Cursor, Claude Code) to access the user's prompt library via stdio communication.

The implementation uses Mastra framework for MCP server functionality, better-sqlite3 for database access, and Handlebars for template interpolation. The server is compiled as a standalone binary and bundled with the Tauri application.

**Overall Risk Assessment: MEDIUM-HIGH**

The primary concerns are:
1. Unencrypted sensitive credential storage
2. Lack of input validation on filesystem paths
3. Potential template injection through Handlebars
4. No authentication/authorization for MCP access

---

## 2. Audit Scope & Methodology

### Files Analyzed
- `/apps/desktop/mastra/src/mcp/server.ts` - MCP server definition
- `/apps/desktop/mastra/src/mcp/stdio.ts` - Stdio transport entry point
- `/apps/desktop/mastra/src/mcp/lib/db.ts` - Database access for configuration
- `/apps/desktop/mastra/src/mcp/lib/prompts.ts` - Prompt file operations
- `/apps/desktop/mastra/src/mcp/tools/*.ts` - MCP tool implementations
- `/apps/desktop/src/lib/interpolate.ts` - Handlebars template processing
- `/apps/desktop/src/lib/parser.ts` - YAML frontmatter parsing
- `/apps/desktop/src-tauri/capabilities/default.json` - Tauri permissions
- `/apps/desktop/src-tauri/tauri.conf.json` - Tauri configuration

### Methodology
1. Static code analysis of all MCP-related source files
2. Data flow analysis from MCP input to filesystem operations
3. Threat modeling for MCP server attack vectors
4. Configuration review of Tauri security settings
5. Dependency analysis for known vulnerabilities

---

## 3. Security Findings

### FINDING-001: Plaintext API Key Storage
**Severity:** HIGH
**CWE:** CWE-312 (Cleartext Storage of Sensitive Information)

**Description:**
AI provider API keys are stored in plaintext in the SQLite database (`incito.db`). The database file is stored in user-accessible locations:
- macOS: `~/Library/Application Support/com.incito.app/incito.db`
- Windows: `%APPDATA%/com.incito.app/incito.db`
- Linux: `~/.local/share/com.incito.app/incito.db`

**Location:**
- `/apps/desktop/src/lib/store.ts` (lines 312-353)
- `/apps/desktop/mastra/src/mcp/lib/db.ts` (lines 38-48)

**Attack Scenario:**
1. Attacker gains access to user's filesystem (malware, physical access, backup exposure)
2. Reads SQLite database file directly
3. Extracts API keys: `sqlite3 incito.db "SELECT value FROM settings WHERE key='ai_api_key'"`
4. Uses stolen API keys for unauthorized AI service access or billing fraud

**Impact:**
- API key theft enables unauthorized access to AI services
- Potential financial impact from unauthorized API usage
- Privacy breach if API calls expose user data

**Remediation:**
```typescript
// Use OS-level secure storage
import * as keytar from 'keytar'

export async function saveAIApiKey(apiKey: string): Promise<void> {
  await keytar.setPassword('com.incito.app', 'ai_api_key', apiKey)
}

export async function getAIApiKey(): Promise<string | null> {
  return keytar.getPassword('com.incito.app', 'ai_api_key')
}
```

Alternatively, use Tauri's `tauri-plugin-store` with encryption or the system keychain via `keyring-rs`.

**References:**
- OWASP: Cryptographic Storage Cheat Sheet
- CWE-312: Cleartext Storage of Sensitive Information

---

### FINDING-002: Path Traversal Risk in Prompt Loading
**Severity:** MEDIUM
**CWE:** CWE-22 (Improper Limitation of a Pathname to a Restricted Directory)

**Description:**
The MCP server reads the `folder_path` from the database and uses it directly to load prompt files without validation. While the folder path itself is user-configured, there is no validation that:
1. The path exists and is a directory
2. The path is within expected boundaries
3. Symbolic links are not being followed to escape the configured directory

**Location:**
- `/apps/desktop/mastra/src/mcp/lib/prompts.ts` (lines 12-32)

```typescript
export async function loadPrompts(folderPath: string): Promise<PromptFile[]> {
  try {
    const entries = await readdir(folderPath, { withFileTypes: true })
    const mdFiles = entries.filter(
      (entry) => entry.isFile() && entry.name.endsWith('.md')
    )
    // ... reads files without path validation
  }
}
```

**Attack Scenario:**
1. Attacker modifies the database to set `folder_path` to a sensitive directory (e.g., `/etc/`, `~/.ssh/`)
2. Renames sensitive files to have `.md` extension or creates symlinks
3. MCP tools expose file contents through `get_prompt` or `list_prompts`

**Impact:**
- Information disclosure of sensitive files
- Exposure of credentials or configuration data

**Remediation:**
```typescript
import { realpath } from 'fs/promises'

export async function loadPrompts(folderPath: string): Promise<PromptFile[]> {
  // Validate folder path
  const resolvedPath = await realpath(folderPath)

  // Ensure we're reading from user's home directory or configured safe locations
  const homeDir = homedir()
  if (!resolvedPath.startsWith(homeDir)) {
    throw new Error('Prompts folder must be within user home directory')
  }

  // ... rest of implementation
}
```

**References:**
- OWASP: Path Traversal
- CWE-22: Improper Limitation of a Pathname to a Restricted Directory

---

### FINDING-003: Handlebars Template Injection
**Severity:** MEDIUM
**CWE:** CWE-94 (Improper Control of Generation of Code)

**Description:**
The interpolation function uses Handlebars with `noEscape: true`, which disables HTML escaping. Additionally, custom helpers are registered that perform comparisons and logical operations. User-provided variable values are passed directly into the template context.

**Location:**
- `/apps/desktop/src/lib/interpolate.ts` (lines 92-99)

```typescript
try {
  // noEscape prevents HTML escaping (we want raw output for prompts)
  const compiled = Handlebars.compile(template, { noEscape: true })
  return compiled(context)
} catch {
  return template
}
```

**Attack Scenario:**
1. MCP client (AI assistant) calls `use_prompt` with malicious variable values
2. Variable values containing Handlebars syntax could manipulate template output
3. Example: Variable value `{{#each (lookup this 'constructor')}}...{{/each}}`

While Handlebars has prototype access restrictions by default, complex attacks exploiting registered helpers may be possible.

**Impact:**
- Template output manipulation
- Potential information disclosure through helper abuse
- Denial of service through recursive templates

**Remediation:**
```typescript
// Sanitize variable values before interpolation
function sanitizeValue(value: unknown): unknown {
  if (typeof value === 'string') {
    // Escape Handlebars delimiters in user input
    return value.replace(/\{\{/g, '\\{{').replace(/\}\}/g, '\\}}')
  }
  if (Array.isArray(value)) {
    return value.map(sanitizeValue)
  }
  return value
}

// Use strict mode and disable prototype access
const compiled = Handlebars.compile(template, {
  noEscape: true,
  strict: true
})
```

**References:**
- Handlebars Security Considerations
- CWE-94: Improper Control of Generation of Code

---

### FINDING-004: No MCP Authentication/Authorization
**Severity:** MEDIUM
**CWE:** CWE-306 (Missing Authentication for Critical Function)

**Description:**
The MCP server uses stdio transport without any authentication mechanism. Any process that can spawn the `incito-mcp` binary gains full access to all MCP tools. This includes listing all prompts, reading prompt contents, and using prompts with arbitrary variables.

**Location:**
- `/apps/desktop/mastra/src/mcp/stdio.ts` (entire file)
- `/apps/desktop/mastra/src/mcp/server.ts` (entire file)

```typescript
// No authentication - server starts immediately
server.startStdio()
```

**Attack Scenario:**
1. Malicious software on user's machine spawns `incito-mcp` binary
2. Sends MCP protocol messages to list and read all prompts
3. Extracts potentially sensitive information from prompt templates

**Impact:**
- Unauthorized access to user's prompt library
- Exposure of potentially sensitive business logic in prompts
- No audit trail of MCP access

**Remediation:**
```typescript
// Option 1: File-based token authentication
const authToken = process.env.INCITO_MCP_TOKEN || readTokenFile()

server.use(async (context, next) => {
  const providedToken = context.headers?.['x-auth-token']
  if (providedToken !== authToken) {
    throw new Error('Unauthorized')
  }
  return next()
})

// Option 2: Process identity verification
// Verify parent process is a known AI assistant
```

Consider implementing:
- Token-based authentication
- Process identity verification
- Rate limiting
- Audit logging

**References:**
- MCP Security Best Practices
- CWE-306: Missing Authentication for Critical Function

---

### FINDING-005: Disabled Content Security Policy
**Severity:** LOW
**CWE:** CWE-693 (Protection Mechanism Failure)

**Description:**
The Tauri configuration has CSP disabled (`"csp": null`), which removes a defense-in-depth layer against XSS attacks in the webview.

**Location:**
- `/apps/desktop/src-tauri/tauri.conf.json` (lines 23-25)

```json
"security": {
  "csp": null
}
```

**Impact:**
- No CSP protection against XSS attacks
- Potential for script injection if other vulnerabilities exist

**Remediation:**
```json
"security": {
  "csp": "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'"
}
```

**References:**
- Tauri Security: Content Security Policy
- OWASP: CSP Cheat Sheet

---

### FINDING-006: Overly Permissive Filesystem Capabilities
**Severity:** LOW
**CWE:** CWE-250 (Execution with Unnecessary Privileges)

**Description:**
The Tauri capabilities grant filesystem read/write access to all paths (`"path": "**"`). While the application requires access to user-selected folders, this grants broader permissions than necessary.

**Location:**
- `/apps/desktop/src-tauri/capabilities/default.json` (lines 11-29)

```json
{
  "identifier": "fs:allow-read-file",
  "allow": [{ "path": "**" }]
},
{
  "identifier": "fs:allow-write-file",
  "allow": [{ "path": "**" }]
}
```

**Impact:**
- Application has ability to read/write any file
- Increases potential impact of other vulnerabilities

**Remediation:**
```json
{
  "identifier": "fs:allow-read-file",
  "allow": [{ "path": "$HOME/**" }]
},
{
  "identifier": "fs:allow-write-file",
  "allow": [{ "path": "$APPDATA/**" }, { "path": "$HOME/Documents/**" }]
}
```

Consider using Tauri's scoped filesystem access with user-confirmed paths only.

**References:**
- Tauri Security: Filesystem Access
- Principle of Least Privilege

---

### FINDING-007: Information Leakage in Error Messages
**Severity:** LOW
**CWE:** CWE-209 (Generation of Error Message Containing Sensitive Information)

**Description:**
Error messages throughout the codebase include full file paths and system information that could aid attackers in reconnaissance.

**Location:**
- Multiple files, example from `/apps/desktop/mastra/src/mcp/lib/db.ts` (lines 45-47)

```typescript
} catch (error) {
  console.error('Error reading database:', error)
  return null
}
```

**Impact:**
- System path disclosure
- Database location exposure
- Aid in targeted attacks

**Remediation:**
```typescript
} catch (error) {
  // Log full error internally
  logger.error('Database read error', { error, dbPath })
  // Return generic error to client
  return null
}
```

**References:**
- OWASP: Error Handling
- CWE-209: Generation of Error Message Containing Sensitive Information

---

### FINDING-008: Zod Schema Bypass via Unknown Fields
**Severity:** LOW
**CWE:** CWE-20 (Improper Input Validation)

**Description:**
The MCP tool schemas use `z.record(z.unknown())` for the `variables` field in `use_prompt`, which accepts any key-value pairs without validation against the prompt's defined variables.

**Location:**
- `/apps/desktop/mastra/src/mcp/tools/use-prompt.ts` (lines 9-11)

```typescript
variables: z
  .record(z.unknown())
  .describe('Variable values to fill in the template'),
```

**Impact:**
- Allows injection of unexpected variables into templates
- May enable template manipulation through variable key collisions

**Remediation:**
```typescript
// Validate variables against prompt's defined schema at runtime
export async function usePrompt(input: UsePromptInput): Promise<UsePromptResult> {
  // ... load prompt ...

  // Validate only expected variables are provided
  const allowedKeys = new Set(prompt.variables.map(v => v.key))
  const providedKeys = Object.keys(input.variables)
  const unexpectedKeys = providedKeys.filter(k => !allowedKeys.has(k))

  if (unexpectedKeys.length > 0) {
    throw new Error(`Unexpected variables: ${unexpectedKeys.join(', ')}`)
  }

  // ... continue with interpolation
}
```

**References:**
- OWASP: Input Validation Cheat Sheet
- CWE-20: Improper Input Validation

---

## 4. Security Strengths

1. **Zod Schema Validation**: Input schemas are defined using Zod, providing type-safe validation at the API boundary
2. **Variable Key Validation**: The parser validates variable keys against a pattern (`/^[\w-]{1,50}$/`)
3. **Template Size Limits**: Maximum template size is enforced (100KB)
4. **Read-Only Database Access**: MCP server opens database in read-only mode
5. **File Type Filtering**: Only `.md` files are loaded from the prompts folder
6. **Tag Name Validation**: Tag names are validated for length and format
7. **Parameterized SQL Queries**: All database queries use parameterized statements, preventing SQL injection

---

## 5. ACTION PLAN

### Immediate (CRITICAL/HIGH - Within 1 Week)

1. **[HIGH] Implement Secure Credential Storage**
   - Replace plaintext API key storage with OS keychain integration
   - Use `keytar` (Node.js) or `keyring-rs` (Rust) for secure storage
   - Migrate existing keys on first app launch
   - Owner: Backend/Security team

### Short-Term (MEDIUM - Within 2 Weeks)

2. **[MEDIUM] Add Path Validation for Prompts Folder**
   - Implement path traversal protection
   - Validate folder is within user's home directory
   - Resolve symlinks and validate final path
   - Owner: Backend team

3. **[MEDIUM] Implement MCP Authentication**
   - Add token-based authentication for MCP access
   - Generate unique token per installation
   - Document secure token storage for AI clients
   - Owner: Backend team

4. **[MEDIUM] Secure Handlebars Interpolation**
   - Sanitize user input before template interpolation
   - Enable strict mode in Handlebars
   - Consider allowlisting safe helpers only
   - Owner: Frontend team

5. **[MEDIUM] Restrict Filesystem Capabilities**
   - Limit Tauri fs permissions to user home directory
   - Use scoped access with runtime validation
   - Owner: Backend team

### Medium-Term (LOW - Within 1 Month)

6. **[LOW] Enable Content Security Policy**
   - Configure appropriate CSP for the webview
   - Test with strict policy and relax as needed
   - Owner: Frontend team

7. **[LOW] Sanitize Error Messages**
   - Remove sensitive paths from user-facing errors
   - Implement structured logging for internal debugging
   - Owner: Full team

8. **[LOW] Enhance Variable Validation**
   - Validate MCP input variables against prompt schema
   - Reject unexpected variable keys
   - Owner: Backend team

---

## 6. Recommendations for Enhanced Security Testing

1. **Penetration Testing**: Conduct focused penetration testing on MCP server attack surface
2. **Dependency Audit**: Run `npm audit` and review Handlebars CVEs regularly
3. **Fuzzing**: Fuzz test the MCP protocol handlers with malformed inputs
4. **Static Analysis**: Integrate CodeQL or Semgrep for continuous security scanning
5. **Secrets Detection**: Add pre-commit hooks to detect accidental API key commits

---

## 7. References

- [OWASP Top 10 2021](https://owasp.org/Top10/)
- [CWE/SANS Top 25 Most Dangerous Software Weaknesses](https://cwe.mitre.org/top25/)
- [Tauri Security Best Practices](https://tauri.app/v1/guides/security/security/)
- [Model Context Protocol Specification](https://modelcontextprotocol.io/)
- [Handlebars Security Considerations](https://handlebarsjs.com/guide/#security-considerations)

---

**Report Version:** 1.0
**Classification:** Internal Use Only
