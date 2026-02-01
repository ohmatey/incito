# Security Audit Report: Incito Desktop Application and Landing Page

**Date**: 2026-01-30
**Scope**: Tauri v2 desktop application (`apps/desktop`), Next.js landing page (`apps/landing`)
**Methodology**: Static code analysis, configuration review, dependency assessment
**Auditor**: Security Engineer Agent

---

## TLDR

- **MEDIUM**: API keys stored in plain SQLite database without encryption - should use OS keychain/secure storage
- **MEDIUM**: Overly permissive Tauri filesystem capabilities grant `$HOME/**` read/write access - should be restricted to app data directories
- **MEDIUM**: The `check_claude_code_path` Rust command executes arbitrary user-provided paths with `--version` flag - potential for command execution abuse
- **LOW**: CSP allows external API connections but is otherwise appropriately restrictive
- **POSITIVE**: SQL injection prevention via parameterized queries, good input validation patterns, rate limiting on sidecar server

---

## 1. Executive Summary

This security audit examined the Incito prompt engineering desktop application built with Tauri v2 and its accompanying Next.js marketing landing page. The analysis focused on Tauri security configuration, frontend security patterns, file system operations, and dependency security.

**Overall Risk Assessment**: **MEDIUM**

The application demonstrates several security best practices including parameterized SQL queries, CORS restrictions, rate limiting, and input validation. However, there are notable areas requiring improvement, particularly around secrets storage, filesystem access permissions, and executable path validation.

---

## 2. Audit Scope & Methodology

### 2.1 Components Reviewed
- `/apps/desktop/src-tauri/tauri.conf.json` - Tauri security configuration
- `/apps/desktop/src-tauri/capabilities/default.json` - Permission capabilities
- `/apps/desktop/src-tauri/src/main.rs` - Rust backend
- `/apps/desktop/src/lib/prompts.ts` - File system operations
- `/apps/desktop/src/lib/interpolate.ts` - Template variable processing
- `/apps/desktop/src/lib/parser.ts` - Frontmatter parsing
- `/apps/desktop/src/lib/store.ts` - Database and settings storage
- `/apps/desktop/src/lib/mastra-client.ts` - AI provider API integration
- `/apps/desktop/src/lib/resources.ts` - Resource file management
- `/apps/desktop/claude-code-server/src/index.ts` - Sidecar HTTP server
- `/apps/landing/` - Next.js landing page

### 2.2 Standards Applied
- OWASP Top 10 (2021)
- CWE Top 25 Most Dangerous Software Weaknesses
- Tauri Security Best Practices
- NIST Application Security Guidelines

---

## 3. Security Findings

### 3.1 MEDIUM Severity Findings

#### Finding M1: Insecure API Key Storage

**Severity**: MEDIUM
**CWE Reference**: CWE-312 (Cleartext Storage of Sensitive Information)
**Location**: `/apps/desktop/src/lib/store.ts:567-596`

**Description**:
API keys for OpenAI, Anthropic, and Google AI providers are stored in plain text in a SQLite database (`incito.db`). The comment in the code acknowledges this limitation:

```typescript
// Store API key in SQLite settings table
// Note: For enhanced security, consider using Tauri's secure-store plugin in the future
const API_KEY_SETTING = 'secure_api_key'

async function getApiKey(): Promise<Result<string | null>> {
  const database = await getDb()
  const result = await database.select<{ value: string }[]>(
    'SELECT value FROM settings WHERE key = ?',
    [API_KEY_SETTING]
  )
  return { ok: true, data: result.length > 0 ? result[0].value : null }
}
```

**Impact**:
- API keys are readable by any process with access to the SQLite database
- If the database is backed up or synced, keys could be exposed
- Malware or other applications could extract API keys

**Remediation**:
1. Use OS-native secure storage via Tauri's `tauri-plugin-store` with encryption or a dedicated keychain plugin
2. Consider using the `keytar` library through a Tauri command for platform-native credential storage
3. At minimum, encrypt stored API keys with a key derived from OS credentials

---

#### Finding M2: Overly Permissive Filesystem Capabilities

**Severity**: MEDIUM
**CWE Reference**: CWE-732 (Incorrect Permission Assignment for Critical Resource)
**Location**: `/apps/desktop/src-tauri/capabilities/default.json:12-46`

**Description**:
The Tauri capability configuration grants extremely broad filesystem access:

```json
{
  "identifier": "fs:allow-read-dir",
  "allow": [
    { "path": "$APPDATA/**" },
    { "path": "$HOME/**" }
  ]
},
{
  "identifier": "fs:allow-write-file",
  "allow": [
    { "path": "$APPDATA/**" },
    { "path": "$HOME/**" }
  ]
},
{
  "identifier": "fs:allow-remove",
  "allow": [
    { "path": "$APPDATA/**" },
    { "path": "$HOME/**" }
  ]
}
```

**Impact**:
- The application can read, write, and delete ANY file in the user's home directory
- If XSS or other frontend vulnerabilities exist, attackers could access sensitive files
- Violates principle of least privilege

**Remediation**:
1. Restrict filesystem access to specific directories needed by the application:
   - `$APPDATA/com.incito.app/**` for application data
   - A user-selected prompts directory (which can be persisted via Tauri's scope)
2. Use Tauri's persisted-scope plugin to remember user-selected directories without blanket permissions
3. Remove `$HOME/**` from all capability scopes

**Recommended Configuration**:
```json
{
  "identifier": "fs:allow-read-dir",
  "allow": [
    { "path": "$APPDATA/com.incito.app/**" }
  ]
},
{
  "identifier": "fs:allow-read-file",
  "allow": [
    { "path": "$APPDATA/com.incito.app/**" }
  ]
}
```

---

#### Finding M3: Arbitrary Path Execution in check_claude_code_path

**Severity**: MEDIUM
**CWE Reference**: CWE-78 (Improper Neutralization of Special Elements used in an OS Command)
**Location**: `/apps/desktop/src-tauri/src/main.rs:143-171`

**Description**:
The `check_claude_code_path` Tauri command accepts a user-provided path and executes it with `--version`:

```rust
#[tauri::command]
fn check_claude_code_path(path: String) -> Result<ClaudeCodePathResult, String> {
    // Check if file exists
    let path_obj = std::path::Path::new(&path);
    if !path_obj.exists() {
        return Ok(ClaudeCodePathResult { ... });
    }

    // Try to get version to verify it's actually Claude Code
    match get_claude_version(&path) {
        Some(version) => Ok(ClaudeCodePathResult { ... }),
        ...
    }
}

fn get_claude_version(path: &str) -> Option<String> {
    let mut child = std::process::Command::new(path)
        .arg("--version")
        .spawn()
        .ok()?;
    ...
}
```

**Impact**:
- A malicious user or compromised UI could execute arbitrary executables
- While the UI likely restricts this to file picker results, the Tauri command itself accepts any string
- The `--version` argument limits the attack surface but doesn't eliminate it

**Attack Scenario**:
If an attacker can inject values into the settings or manipulate IPC calls, they could execute malicious binaries.

**Remediation**:
1. Validate that the path points to a legitimate Claude Code binary before execution:
   - Check file signature/hash
   - Verify the binary name matches expected patterns (e.g., `claude`, `claude.exe`)
   - Restrict to specific directories (e.g., `/usr/local/bin`, `/usr/bin`, user-installed paths)
2. Add path canonicalization to prevent symlink attacks
3. Consider sandboxing the execution or using a whitelist approach

---

### 3.2 LOW Severity Findings

#### Finding L1: CSP Allows External API Connections

**Severity**: LOW
**CWE Reference**: CWE-1021 (Improper Restriction of Rendered UI Layers or Frames)
**Location**: `/apps/desktop/src-tauri/tauri.conf.json:24-26`

**Description**:
The Content Security Policy allows connections to external API endpoints:

```json
"csp": "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' https://api.openai.com https://api.anthropic.com https://generativelanguage.googleapis.com http://localhost:3457 https://gist.githubusercontent.com"
```

**Assessment**:
This is acceptable because:
- The APIs listed are legitimate AI provider endpoints required for functionality
- `localhost:3457` is the local sidecar server
- `gist.githubusercontent.com` is for auto-update manifest (though this could be more restricted)
- No `unsafe-eval` is permitted
- `style-src 'unsafe-inline'` is common for Tailwind CSS but could be improved

**Recommendations**:
1. Consider using nonce-based style loading instead of `unsafe-inline`
2. Replace `gist.githubusercontent.com` with a more controlled update endpoint

---

#### Finding L2: Rate Limit IP Spoofing Possible

**Severity**: LOW
**CWE Reference**: CWE-290 (Authentication Bypass by Spoofing)
**Location**: `/apps/desktop/claude-code-server/src/index.ts:128-131`

**Description**:
The rate limiting implementation trusts the `X-Forwarded-For` header:

```typescript
const clientIp = req.headers.get('X-Forwarded-For')?.split(',')[0]?.trim()
  || req.headers.get('X-Real-IP')
  || 'unknown'
```

**Assessment**:
Since the server only binds to localhost and is used for local IPC, this is low risk. The rate limiting is a defense-in-depth measure.

**Recommendations**:
For a localhost-only server, remove the forwarded header checks and rely on connection IP, or simply trust the localhost origin.

---

#### Finding L3: Update Manifest on GitHub Gist

**Severity**: LOW
**CWE Reference**: CWE-494 (Download of Code Without Integrity Check)
**Location**: `/apps/desktop/src-tauri/tauri.conf.json:30-33`

**Description**:
The auto-updater fetches manifests from a GitHub Gist:

```json
"endpoints": [
  "https://gist.githubusercontent.com/ohmatey/c47e0d36ed59d7e7a396cdd2aa3d0631/raw/latest.json"
]
```

**Assessment**:
- The update mechanism does use signature verification (`pubkey` is configured)
- However, if the Gist is compromised, users could be served malicious update metadata
- Gist URLs with `/raw/` can be cached by CDN, potentially delaying revocation

**Recommendations**:
1. Host update manifests on a controlled domain with proper access controls
2. Implement certificate pinning for update checks
3. Consider using GitHub Releases API instead

---

### 3.3 Informational Findings

#### Finding I1: Path Traversal Protection in Place

**Status**: POSITIVE
**Location**: `/apps/desktop/src/lib/prompts.ts:16-20, 88-90`

**Description**:
The codebase properly implements path traversal protection:

```typescript
async function isPathInFolder(filePath: string, folderPath: string): Promise<boolean> {
  const resolvedFile = await resolve(filePath)
  const resolvedFolder = await resolve(folderPath)
  return resolvedFile.startsWith(resolvedFolder)
}

// Usage:
if (!await isPathInFolder(path, folderPath)) {
  throw new Error('Path traversal detected')
}
```

This pattern is used consistently in `createPrompt`, `duplicatePrompt`, and `createVariant`.

---

#### Finding I2: SQL Injection Prevention

**Status**: POSITIVE
**Location**: `/apps/desktop/src/lib/store.ts` (multiple functions)

**Description**:
All SQL queries use parameterized statements:

```typescript
await database.execute(
  'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
  ['folder_path', path]
)

const result = await database.select<Tag[]>(
  'SELECT id, name, color FROM tags WHERE name = ?',
  [name]
)
```

This effectively prevents SQL injection attacks.

---

#### Finding I3: Handlebars Template Security

**Status**: ACCEPTABLE WITH NOTES
**Location**: `/apps/desktop/src/lib/interpolate.ts:59-67`

**Description**:
The template interpolation system uses Handlebars with `noEscape: true`:

```typescript
const compiled = Handlebars.compile(template, { noEscape: true, strict: false })
```

**Assessment**:
- `noEscape: true` is intentional for prompt templates (users want raw output)
- The `sanitizeValue` function escapes Handlebars syntax to prevent template injection:

```typescript
function sanitizeValue(value: unknown): unknown {
  if (typeof value === 'string') {
    return value.replace(/\{\{/g, '\\{{').replace(/\}\}/g, '\\}}')
  }
  // ...
}
```

**Note**: This is acceptable for the use case (prompts are not rendered as HTML), but the escaping only prevents Handlebars template injection, not other content manipulation.

---

#### Finding I4: CORS and Rate Limiting on Sidecar

**Status**: POSITIVE
**Location**: `/apps/desktop/claude-code-server/src/index.ts:9-49`

**Description**:
The Claude Code sidecar server implements:
- CORS whitelist for localhost origins
- Rate limiting (100 requests/minute per IP)
- Proper request origin validation

```typescript
const ALLOWED_ORIGINS = new Set([
  'http://localhost:1420',
  'http://localhost:5173',
  'http://127.0.0.1:1420',
  'http://127.0.0.1:5173',
  'tauri://localhost',
  'https://tauri.localhost',
])
```

---

#### Finding I5: No XSS Vectors Detected

**Status**: POSITIVE
**Location**: Entire frontend codebase

**Description**:
- No use of `dangerouslySetInnerHTML`
- No direct `innerHTML` manipulation
- No `eval()` or `new Function()` usage
- React's default escaping protects against XSS

---

#### Finding I6: Input Validation on Variable Keys

**Status**: POSITIVE
**Location**: `/apps/desktop/src/lib/constants.ts:78-95`

**Description**:
Variable keys are validated with strict patterns:

```typescript
export const VARIABLE_KEY_PATTERN = /^[\w-]{1,50}$/

export function isValidVariableKey(key: string): boolean {
  return VARIABLE_KEY_PATTERN.test(key)
}
```

Tags, template sizes, and other inputs have validation constraints.

---

## 4. Dependency Security Assessment

### 4.1 Desktop Application Dependencies

**Key Dependencies Reviewed**:
- `handlebars@4.7.8` - No known critical vulnerabilities
- `gray-matter@4.0.3` - Parses YAML frontmatter, using `js-yaml` internally
- `@tauri-apps/*@2.0.0` - Latest stable Tauri v2 plugins
- `@ai-sdk/*` - AI SDK providers for OpenAI, Anthropic, Google

**Recommendation**: Run `pnpm audit` regularly to check for newly disclosed vulnerabilities.

### 4.2 Landing Page Dependencies

The Next.js landing page uses minimal dependencies:
- `next@16.1.0` - Recent Next.js version
- `react@19.2.0` - Latest React
- `framer-motion` - Animation library

**Assessment**: The landing page is a static export with no server-side code, minimal attack surface.

---

## 5. Security Strengths

1. **Parameterized SQL Queries**: All database operations use proper parameter binding
2. **Path Traversal Protection**: Consistent validation prevents directory traversal attacks
3. **Rate Limiting**: Sidecar server implements request throttling
4. **CORS Restrictions**: API server only accepts requests from known origins
5. **Input Validation**: Variable keys, tags, and templates have size/format constraints
6. **No Dangerous HTML Operations**: No innerHTML or dangerouslySetInnerHTML usage
7. **Tauri Sidecar for CLI**: Properly isolates CLI operations in a separate process
8. **Update Signature Verification**: Auto-updater validates signatures

---

## 6. ACTION PLAN

### Immediate Actions (Within 1 Week)

1. **[M1] Implement Secure API Key Storage**
   - Migrate API keys from SQLite to OS keychain
   - Use `tauri-plugin-stronghold` or similar secure storage
   - Priority: HIGH
   - Owner: Tech Lead

2. **[M3] Add Path Validation for Claude Executable**
   - Validate executable paths against allowed patterns
   - Add file signature/name verification
   - Priority: HIGH
   - Owner: Tech Lead

### Short-Term Actions (Within 2 Weeks)

3. **[M2] Restrict Filesystem Capabilities**
   - Replace `$HOME/**` with specific app directories
   - Use persisted-scope for user-selected directories
   - Test thoroughly to ensure functionality is maintained
   - Priority: MEDIUM
   - Owner: Tech Lead

4. **[L3] Improve Update Infrastructure**
   - Move update manifests to a controlled domain
   - Consider GitHub Releases API integration
   - Priority: LOW
   - Owner: Tech Lead

### Ongoing Actions

5. **Dependency Monitoring**
   - Set up automated `pnpm audit` in CI pipeline
   - Subscribe to security advisories for key dependencies
   - Priority: MEDIUM
   - Owner: DevOps/Tech Lead

6. **Security Testing**
   - Add security-focused test cases for path validation
   - Test IPC command boundary conditions
   - Priority: MEDIUM
   - Owner: QA Engineer

---

## 7. Recommendations for Enhanced Security Testing

1. **Fuzz Testing**: Apply fuzzing to Tauri IPC commands with malformed inputs
2. **Penetration Testing**: Conduct periodic pen testing of the sidecar server
3. **Static Analysis**: Integrate SAST tools (e.g., Semgrep) in CI pipeline
4. **Dependency Scanning**: Use tools like Snyk or Dependabot for automated vulnerability alerts
5. **CSP Monitoring**: Consider implementing CSP violation reporting

---

## 8. Appendix: Files Reviewed

| File | Lines | Security-Relevant |
|------|-------|-------------------|
| `src-tauri/tauri.conf.json` | 54 | CSP, update config |
| `src-tauri/capabilities/default.json` | 67 | Permission scopes |
| `src-tauri/src/main.rs` | 385 | IPC commands, shell exec |
| `src/lib/prompts.ts` | 385 | File operations |
| `src/lib/interpolate.ts` | 163 | Template processing |
| `src/lib/parser.ts` | 444 | Input parsing |
| `src/lib/store.ts` | 700+ | Database, API keys |
| `src/lib/mastra-client.ts` | 1408 | External API calls |
| `src/lib/resources.ts` | 451 | File management |
| `claude-code-server/src/index.ts` | 350 | HTTP server |

---

*This report was generated as part of the security review process. All findings should be addressed according to their severity and the action plan timeline.*
