# Security Audit Report: Incito Desktop Application

**Date:** 2026-01-19
**Scope:** Full security audit of Incito Tauri v2 desktop application
**Auditor:** Security Engineer Agent
**Version Audited:** 0.3.0

---

## TLDR

- **CRITICAL**: CSP (Content Security Policy) is disabled (`csp: null`), exposing the webview to XSS attacks
- **HIGH**: File system permissions are overly permissive (`**` wildcard) allowing read/write/delete to ANY path on the system
- **HIGH**: API keys are stored in plaintext in SQLite database without encryption
- **MEDIUM**: Handlebars templates use `noEscape: true`, bypassing HTML encoding (acceptable for this use case but requires documentation)
- **MEDIUM**: No path traversal validation when writing files - malicious frontmatter could potentially write outside intended directory

---

## Executive Summary

This audit examined the Incito desktop application, a Tauri v2-based prompt template manager. The application handles user-provided markdown files with YAML frontmatter, performs variable interpolation using Handlebars, stores settings and API keys in a local SQLite database, and communicates with external AI APIs.

The overall security posture is **MODERATE RISK**. While the application architecture is generally sound and benefits from Tauri's sandboxing model, several significant security gaps were identified that require immediate attention.

**Risk Summary:**
| Severity | Count |
|----------|-------|
| CRITICAL | 1     |
| HIGH     | 3     |
| MEDIUM   | 4     |
| LOW      | 3     |

---

## Audit Scope & Methodology

### Files Reviewed
- `apps/desktop/src-tauri/tauri.conf.json` - Tauri configuration
- `apps/desktop/src-tauri/capabilities/default.json` - Permission capabilities
- `apps/desktop/src-tauri/src/main.rs` - Rust backend
- `apps/desktop/src-tauri/Cargo.toml` - Rust dependencies
- `apps/desktop/src/lib/prompts.ts` - File operations
- `apps/desktop/src/lib/parser.ts` - Frontmatter parsing
- `apps/desktop/src/lib/interpolate.ts` - Template interpolation
- `apps/desktop/src/lib/store.ts` - Database operations
- `apps/desktop/src/lib/constants.ts` - Validation patterns
- `apps/desktop/src/lib/launchers.ts` - URL generation
- `apps/desktop/src/lib/mastra-client.ts` - AI integration
- `apps/desktop/mastra/src/api.ts` - AI API layer
- `apps/desktop/mastra/src/agents/prompt-generator.ts` - AI agent

### Methodology
1. Static code analysis
2. Configuration review
3. Data flow analysis
4. Threat modeling
5. Dependency assessment
6. OWASP Top 10 mapping

---

## Security Findings

### CRITICAL Severity

#### SEC-001: Content Security Policy Disabled

**Severity:** CRITICAL
**CWE:** CWE-79 (Cross-site Scripting)
**Location:** `/apps/desktop/src-tauri/tauri.conf.json:24`

**Description:**
The Content Security Policy (CSP) is explicitly set to `null`, completely disabling this critical security control. CSP is a primary defense against XSS attacks in webview-based applications.

```json
"security": {
  "csp": null
}
```

**Attack Scenario:**
1. Attacker crafts a malicious markdown file with embedded JavaScript in the frontmatter or template
2. When the file is loaded and rendered, the JavaScript executes in the webview context
3. The script has access to Tauri APIs, file system, clipboard, and database via the exposed plugins
4. Attacker exfiltrates API keys, modifies files, or performs other malicious actions

**Impact:**
- Complete compromise of application security
- Exposure of stored API keys
- Arbitrary file system access
- Potential for data exfiltration

**Remediation:**
Implement a strict CSP that allows only necessary resources:

```json
"security": {
  "csp": "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' https://api.openai.com https://api.anthropic.com https://generativelanguage.googleapis.com"
}
```

**References:**
- OWASP CSP Cheat Sheet
- CWE-79: Improper Neutralization of Input During Web Page Generation

---

### HIGH Severity

#### SEC-002: Overly Permissive File System Permissions

**Severity:** HIGH
**CWE:** CWE-22 (Path Traversal), CWE-732 (Incorrect Permission Assignment)
**Location:** `/apps/desktop/src-tauri/capabilities/default.json:12-29`

**Description:**
File system permissions use wildcard (`**`) patterns that allow the application to read, write, and delete ANY file on the system that the user has access to.

```json
{
  "identifier": "fs:allow-read-file",
  "allow": [{ "path": "**" }]
},
{
  "identifier": "fs:allow-write-file",
  "allow": [{ "path": "**" }]
},
{
  "identifier": "fs:allow-remove",
  "allow": [{ "path": "**" }]
}
```

**Attack Scenario:**
1. Attacker exploits an XSS vulnerability (enabled by SEC-001)
2. Malicious script calls Tauri FS APIs to read sensitive files (`~/.ssh/id_rsa`, `~/.aws/credentials`)
3. Or writes malicious files to system locations
4. Or deletes critical user files

**Impact:**
- Complete file system access beyond intended scope
- Potential reading of secrets, credentials, SSH keys
- Ability to modify or delete arbitrary files
- Violation of principle of least privilege

**Remediation:**
Restrict permissions to only the user-selected prompts folder:

```json
{
  "identifier": "fs:allow-read-file",
  "allow": [{ "path": "$APPDATA/**" }]
},
{
  "identifier": "fs:scope",
  "allow": ["$APPDATA/**", "$HOME/Documents/**"]
}
```

Use Tauri's `persisted-scope` plugin (already included) to dynamically grant access only to user-selected directories.

**References:**
- CWE-22: Improper Limitation of a Pathname to a Restricted Directory
- Tauri v2 FS Scope Documentation

---

#### SEC-003: Plaintext API Key Storage

**Severity:** HIGH
**CWE:** CWE-312 (Cleartext Storage of Sensitive Information)
**Location:** `/apps/desktop/src/lib/store.ts:327-336`

**Description:**
API keys for AI providers (OpenAI, Anthropic, Google) are stored in plaintext in the SQLite database:

```typescript
await database.execute(
  'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
  ['ai_api_key', settings.apiKey]
)
```

**Attack Scenario:**
1. Attacker gains access to user's machine (physically or remotely)
2. Opens `incito.db` SQLite database in app data directory
3. Queries `SELECT value FROM settings WHERE key = 'ai_api_key'`
4. Obtains plaintext API key
5. Uses API key for unauthorized API calls (financial impact) or sells credentials

**Impact:**
- API key exposure leading to financial loss (API billing)
- Unauthorized use of AI services under victim's account
- Potential account suspension due to abuse

**Remediation:**
1. Use the operating system's secure credential storage:
   - macOS: Keychain
   - Windows: Credential Manager
   - Linux: libsecret/gnome-keyring
2. Tauri provides `tauri-plugin-stronghold` for encrypted storage
3. At minimum, encrypt API keys before storing using a key derived from machine-specific data

**References:**
- CWE-312: Cleartext Storage of Sensitive Information
- OWASP Sensitive Data Exposure

---

#### SEC-004: Missing Path Validation in File Operations

**Severity:** HIGH
**CWE:** CWE-22 (Path Traversal)
**Location:** `/apps/desktop/src/lib/prompts.ts:69-79`

**Description:**
The `createPrompt` function uses `join()` to construct file paths but does not validate that the resulting path stays within the intended prompts folder:

```typescript
const path = await join(folderPath, fileName)
await writeTextFile(path, template)
```

If `fileName` contains path traversal sequences (though currently sanitized by `toKebabCase`), it could write files outside the prompts folder.

Additionally, variant file creation (`createVariant`) does not fully validate the parent base name:

```typescript
const parentBaseName = parent.fileName.replace('.md', '')
const baseVariantName = `${parentBaseName}--${variantSlug}`
```

**Attack Scenario:**
1. Attacker crafts a prompt file with manipulated `fileName` in frontmatter
2. If validation is bypassed, file operations could target unintended locations
3. Combined with broad file system permissions, this enables arbitrary file write

**Impact:**
- Writing files outside intended directory
- Overwriting system files or user data
- Creating executable files in startup directories

**Remediation:**
Add explicit path validation:

```typescript
function isPathWithinFolder(filePath: string, folderPath: string): boolean {
  const resolved = path.resolve(filePath)
  const resolvedFolder = path.resolve(folderPath)
  return resolved.startsWith(resolvedFolder + path.sep)
}

// Before any write operation:
if (!isPathWithinFolder(targetPath, folderPath)) {
  throw new Error('Path traversal detected')
}
```

**References:**
- CWE-22: Improper Limitation of a Pathname to a Restricted Directory

---

### MEDIUM Severity

#### SEC-005: Handlebars Template Escaping Disabled

**Severity:** MEDIUM
**CWE:** CWE-79 (Cross-site Scripting)
**Location:** `/apps/desktop/src/lib/interpolate.ts:94`

**Description:**
Handlebars is configured with `noEscape: true`, disabling HTML entity encoding:

```typescript
const compiled = Handlebars.compile(template, { noEscape: true })
```

**Context:**
This is intentional for prompt templates - users need raw output without HTML encoding for AI prompts. However, if template output is ever rendered in the UI without sanitization, it could enable XSS.

**Attack Scenario:**
1. User creates template with `{{variable}}` where variable contains HTML/JS
2. Variable value is set to `<script>alert('xss')</script>`
3. If output is rendered in UI (preview, etc.) without sanitization, script executes

**Impact:**
- Potential XSS if output is rendered in UI
- Currently mitigated if output is only used as text (copied to clipboard)

**Remediation:**
1. Document this design decision clearly
2. Ensure all UI rendering of interpolated content uses safe methods (text nodes, not innerHTML)
3. Audit all locations where interpolated content is displayed

**References:**
- Handlebars Security Considerations
- CWE-79: Cross-site Scripting

---

#### SEC-006: SQL Injection Risk in Dynamic Queries

**Severity:** MEDIUM
**CWE:** CWE-89 (SQL Injection)
**Location:** `/apps/desktop/src/lib/store.ts`

**Description:**
While most SQL queries use parameterized statements correctly, the pattern of constructing queries should be audited for any string concatenation:

```typescript
// Good - parameterized
await database.execute(
  'SELECT value FROM settings WHERE key = ?',
  ['folder_path']
)
```

All reviewed queries appear to use parameterization. However, the `deletePromptVersions` cleanup query has complex logic:

```typescript
await database.execute(
  `DELETE FROM prompt_versions
   WHERE prompt_path = ? AND version_number <= (
     SELECT version_number FROM prompt_versions
     WHERE prompt_path = ?
     ORDER BY version_number DESC
     LIMIT 1 OFFSET ?
   )`,
  [promptPath, promptPath, MAX_VERSIONS_PER_PROMPT]
)
```

**Impact:**
- Currently LOW risk as parameterization is used
- Future modifications could introduce vulnerabilities

**Remediation:**
1. Add code review checklist item for SQL query safety
2. Consider using an ORM or query builder
3. Add automated SQL injection testing

**References:**
- CWE-89: SQL Injection

---

#### SEC-007: Insufficient Input Validation for AI-Generated Content

**Severity:** MEDIUM
**CWE:** CWE-20 (Improper Input Validation)
**Location:** `/apps/desktop/mastra/src/api.ts:29-138`

**Description:**
AI-generated prompt content is sanitized but relies on pattern-based cleanup rather than strict validation:

```typescript
function sanitizeResponse(parsed: any): any {
  // Type coercion and mapping
  if (!VALID_TYPES.includes(lowerType as typeof VALID_TYPES[number])) {
    const mappedType = TYPE_MAPPING[lowerType]
    // ...
  }
}
```

While Zod schema validation is performed, the sanitization step could potentially pass through unexpected data structures.

**Attack Scenario:**
1. Malicious AI response (prompt injection at AI provider) returns crafted JSON
2. Sanitization logic doesn't catch edge cases
3. Malicious content persists to file system

**Impact:**
- Potential for unexpected application behavior
- Risk of storing malformed data

**Remediation:**
1. Perform strict Zod validation BEFORE sanitization
2. Add additional validation for nested structures
3. Implement allowlist-based sanitization rather than denylist

---

#### SEC-008: External URL Generation Without Validation

**Severity:** MEDIUM
**CWE:** CWE-601 (Open Redirect)
**Location:** `/apps/desktop/src/lib/launchers.ts:14-30`

**Description:**
Launcher URLs are constructed with user-provided prompt content:

```typescript
getUrl: (prompt: string) => `https://claude.ai/new?q=${encodeURIComponent(prompt)}`,
```

While `encodeURIComponent` is used correctly, there's no validation of the prompt content length or structure before URL generation.

**Impact:**
- Extremely long prompts could cause issues
- URLs are opened via system browser - generally safe

**Remediation:**
1. Add maximum length validation for URL prompts
2. Truncate with user notification if exceeding limits
3. Document URL length limits per launcher

---

### LOW Severity

#### SEC-009: Theme Stored in localStorage

**Severity:** LOW
**CWE:** CWE-922 (Insecure Storage of Sensitive Information)
**Location:** `/apps/desktop/src/context/ThemeContext.tsx:25,70`

**Description:**
Theme preference is stored in localStorage:

```typescript
const stored = localStorage.getItem(THEME_STORAGE_KEY)
localStorage.setItem(THEME_STORAGE_KEY, newTheme)
```

**Impact:**
- Theme is non-sensitive data
- localStorage is appropriate for this use case
- No security concern, just noted for completeness

**Remediation:**
None required - appropriate use of localStorage for non-sensitive preferences.

---

#### SEC-010: Error Messages May Leak Information

**Severity:** LOW
**CWE:** CWE-209 (Error Message Information Leak)
**Location:** Multiple files

**Description:**
Error messages include raw exception details:

```typescript
return { ok: false, error: `Failed to get folder path: ${err instanceof Error ? err.message : String(err)}` }
```

**Impact:**
- Verbose error messages in production could reveal implementation details
- Helpful for debugging but could aid attackers

**Remediation:**
1. Implement error classification
2. Show generic messages to users, log detailed errors
3. Add error boundary components

---

#### SEC-011: Missing Rate Limiting on AI API Calls

**Severity:** LOW
**CWE:** CWE-770 (Allocation of Resources Without Limits)
**Location:** `/apps/desktop/src/lib/mastra-client.ts`

**Description:**
No client-side rate limiting is implemented for AI API calls. While providers have server-side limits, excessive requests could lead to:

**Impact:**
- Unexpected API costs
- Account suspension
- Poor user experience from rate limit errors

**Remediation:**
1. Implement client-side request throttling
2. Add debouncing for rapid successive requests
3. Cache recent results where appropriate

---

## Security Strengths

The application demonstrates several good security practices:

1. **Use of TypeScript**: Strong typing reduces runtime errors and catches type mismatches
2. **Zod Schema Validation**: AI responses are validated against defined schemas
3. **Parameterized SQL Queries**: Database queries use proper parameterization
4. **Input Validation Patterns**: Variable keys and tag names have validation rules
5. **URL Encoding**: External URLs properly encode user content
6. **No Dangerous React Patterns**: No use of `dangerouslySetInnerHTML` or `eval()`
7. **Tauri v2 Architecture**: Benefits from Rust's memory safety and Tauri's security model
8. **Persisted Scope Plugin**: Infrastructure for dynamic permission scoping exists

---

## ACTION PLAN

### Immediate (Before Next Release)

1. **[CRITICAL] Enable Content Security Policy**
   - Timeline: Immediate
   - Owner: Tech Lead
   - Add strict CSP to `tauri.conf.json`
   - Test that application functions correctly with CSP
   - Document any required CSP exceptions

2. **[HIGH] Restrict File System Permissions**
   - Timeline: 1-2 days
   - Owner: Tech Lead
   - Remove wildcard (`**`) permissions
   - Implement scoped permissions using `persisted-scope`
   - Grant access only to user-selected directories

3. **[HIGH] Encrypt API Key Storage**
   - Timeline: 3-5 days
   - Owner: Tech Lead
   - Evaluate `tauri-plugin-stronghold` or OS keychain integration
   - Migrate existing plaintext keys during app update
   - Add secure deletion of old plaintext storage

4. **[HIGH] Add Path Validation**
   - Timeline: 1-2 days
   - Owner: Developer
   - Implement path containment checks before all file operations
   - Add unit tests for path traversal attempts

### Short-Term (Within 2 Weeks)

5. **[MEDIUM] Audit Template Output Rendering**
   - Timeline: 3-5 days
   - Owner: Developer
   - Review all UI locations displaying interpolated content
   - Ensure safe rendering methods are used
   - Add tests for XSS in template variables

6. **[MEDIUM] Enhance AI Response Validation**
   - Timeline: 3-5 days
   - Owner: Developer
   - Restructure validation to be strict-first
   - Add comprehensive edge case tests
   - Consider sandboxing AI-generated content

7. **[MEDIUM] Add URL Length Validation**
   - Timeline: 1 day
   - Owner: Developer
   - Implement maximum URL length checks
   - Add user notification for truncated content

### Long-Term (Within 1 Month)

8. **[LOW] Implement Client-Side Rate Limiting**
   - Timeline: 3-5 days
   - Owner: Developer
   - Add request throttling for AI API calls
   - Implement exponential backoff on rate limit errors

9. **Create Security Documentation**
   - Timeline: Ongoing
   - Owner: Security Engineer
   - Document security architecture
   - Create threat model
   - Establish security testing procedures

10. **Dependency Security Monitoring**
    - Timeline: Setup in 1 day, ongoing
    - Owner: DevOps
    - Enable automated vulnerability scanning
    - Set up Dependabot or similar
    - Establish update cadence for dependencies

---

## Recommendations for Enhanced Security Testing

1. **Penetration Testing**: Conduct focused testing on:
   - File system access controls
   - XSS vectors through template interpolation
   - API key extraction attempts

2. **Automated Security Scanning**:
   - Integrate SAST tools (semgrep, eslint-plugin-security)
   - Add Rust security lints (cargo-audit)
   - Regular dependency vulnerability checks

3. **Security Regression Tests**:
   - Create test cases for each finding
   - Add to CI/CD pipeline
   - Block merges with security test failures

4. **Code Review Guidelines**:
   - Add security checklist for PR reviews
   - Require security team review for permission changes
   - Document secure coding patterns

---

## Appendix: File Locations Reference

| File | Security Relevance |
|------|-------------------|
| `src-tauri/tauri.conf.json` | CSP configuration |
| `src-tauri/capabilities/default.json` | Permission definitions |
| `src/lib/store.ts` | API key storage, database |
| `src/lib/prompts.ts` | File system operations |
| `src/lib/interpolate.ts` | Template rendering |
| `src/lib/parser.ts` | User input parsing |

---

*Report generated by Security Engineer Agent*
*Next audit recommended: After remediation of CRITICAL/HIGH findings*
