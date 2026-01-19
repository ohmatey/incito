# Incito Threat Model

**Version:** 1.0
**Date:** 2026-01-19
**Status:** Initial

---

## TLDR

- **Primary Assets:** User's prompt templates, AI API keys, file system access
- **Key Threats:** XSS via disabled CSP, arbitrary file access, API key theft
- **Attack Surface:** Local webview, file system, external AI APIs, user-provided content
- **Trust Boundaries:** Webview <-> Tauri backend, App <-> AI APIs, App <-> File system

---

## Application Overview

Incito is a Tauri v2 desktop application that:
1. Manages markdown files containing prompt templates
2. Parses YAML frontmatter with variable definitions
3. Interpolates variables using Handlebars templating
4. Stores settings and API keys in local SQLite database
5. Sends prompts to external AI APIs (OpenAI, Anthropic, Google)
6. Launches URLs in system browser

### Data Flow

```
User -> UI (React) -> Tauri IPC -> Rust Backend -> File System / SQLite
                                -> External AI APIs (via SDK)
                   -> System Browser (launchers)
```

---

## Assets

### High Value Assets

| Asset | Description | Sensitivity |
|-------|-------------|-------------|
| AI API Keys | OpenAI, Anthropic, Google credentials | HIGH - Financial impact |
| User Prompts | Prompt templates with potentially sensitive content | MEDIUM |
| File System Access | Read/write to user's file system | HIGH |
| Application State | Settings, preferences, recent files | LOW |

### Asset Locations

| Asset | Storage Location | Protection |
|-------|-----------------|------------|
| API Keys | SQLite `incito.db` | **None (plaintext)** |
| Prompts | User-selected folder | File system permissions |
| Settings | SQLite `incito.db` | None required |
| Theme | localStorage | None required |

---

## Threat Actors

### External Attackers
- **Capability:** Remote code execution via malicious files
- **Motivation:** Data theft, API key harvesting, ransomware
- **Access:** Malicious markdown files shared with user

### Malicious Insiders
- **Capability:** Physical access to machine
- **Motivation:** API key theft, data exfiltration
- **Access:** Direct database file access

### AI Provider Compromise
- **Capability:** Manipulated AI responses
- **Motivation:** Prompt injection attacks
- **Access:** Via AI API responses

---

## Attack Vectors

### AV-1: Cross-Site Scripting (XSS) via Webview

**Path:** Malicious content -> Webview -> Tauri APIs
**Enabled by:** Disabled CSP (SEC-001)
**Impact:** CRITICAL

```
1. Attacker crafts malicious markdown file
2. User opens file in Incito
3. Malicious script executes in webview
4. Script accesses Tauri APIs (fs, clipboard, sql)
5. Exfiltrates API keys, modifies files
```

### AV-2: Arbitrary File Access

**Path:** Compromised webview -> FS API -> Any file
**Enabled by:** Wildcard permissions (SEC-002)
**Impact:** HIGH

```
1. Attacker exploits XSS vulnerability
2. Calls Tauri fs:read on ~/.ssh/id_rsa
3. Reads private keys, credentials
4. Exfiltrates via network (if CSP allows)
```

### AV-3: API Key Theft via Database

**Path:** Local access -> SQLite file -> API keys
**Enabled by:** Plaintext storage (SEC-003)
**Impact:** HIGH

```
1. Attacker gains filesystem access
2. Locates incito.db in app data
3. Reads plaintext API keys
4. Uses keys for unauthorized API access
```

### AV-4: Path Traversal

**Path:** Malicious filename -> File write -> System files
**Enabled by:** Missing validation (SEC-004)
**Impact:** HIGH

```
1. Attacker crafts file with traversal in name
2. Application writes to unintended location
3. Could overwrite system files or configs
```

### AV-5: Template Injection

**Path:** Malicious variable value -> Handlebars -> Execution
**Enabled by:** noEscape mode (SEC-005)
**Impact:** MEDIUM

```
1. User enters malicious content in variable
2. Handlebars renders without escaping
3. If rendered in UI, could execute scripts
```

---

## Trust Boundaries

```
                    BOUNDARY 1
                        |
    User Input    ->    |    -> Validation -> Internal Processing
    (Markdown)          |
                        |
                    BOUNDARY 2
                        |
    Webview       ->    |    -> IPC -> Rust Backend -> File System
    (JavaScript)        |
                        |
                    BOUNDARY 3
                        |
    Application   ->    |    -> HTTPS -> AI Provider APIs
                        |
```

### Boundary Controls

| Boundary | Current Controls | Required Controls |
|----------|-----------------|-------------------|
| User Input | gray-matter parsing, type validation | + CSP, + sanitization |
| Webview-Backend | Tauri capabilities | + Scoped permissions |
| External APIs | HTTPS, API keys | + Rate limiting |

---

## Risk Assessment Matrix

| Threat | Likelihood | Impact | Risk Level | Mitigation Status |
|--------|------------|--------|------------|-------------------|
| XSS via disabled CSP | HIGH | CRITICAL | CRITICAL | Not mitigated |
| Arbitrary file access | MEDIUM | HIGH | HIGH | Not mitigated |
| API key theft (local) | MEDIUM | HIGH | HIGH | Not mitigated |
| Path traversal | LOW | HIGH | MEDIUM | Partially mitigated |
| Template injection | LOW | MEDIUM | LOW | Documented risk |
| AI response manipulation | LOW | MEDIUM | LOW | Partially mitigated |

---

## Mitigation Strategies

### Defense in Depth Layers

1. **Input Validation Layer**
   - YAML parsing with type checking
   - Variable key validation
   - File path validation

2. **Content Security Layer**
   - Enable strict CSP
   - Sanitize rendered output
   - Escape HTML in UI

3. **Access Control Layer**
   - Scope file system permissions
   - Restrict to user-selected folders
   - Use persisted-scope plugin

4. **Data Protection Layer**
   - Encrypt API keys
   - Use OS secure storage
   - Clear sensitive data on logout

5. **External Communication Layer**
   - HTTPS only
   - Certificate validation
   - Rate limiting

---

## Monitoring and Detection

### Anomaly Indicators

- Excessive file read operations
- Access to files outside prompts folder
- Unusual API call patterns
- Database queries for sensitive keys

### Logging Recommendations

- Log all file operations (path, operation type)
- Log AI API calls (success/failure, model used)
- Log permission errors
- Log validation failures

---

## ACTION PLAN

1. **Immediate:** Enable CSP to block XSS vectors
2. **Short-term:** Implement scoped file permissions
3. **Short-term:** Encrypt API key storage
4. **Medium-term:** Add comprehensive input validation
5. **Ongoing:** Regular security audits and threat model updates

---

## References

- [OWASP Threat Modeling](https://owasp.org/www-community/Threat_Modeling)
- [STRIDE Threat Model](https://docs.microsoft.com/en-us/azure/security/develop/threat-modeling-tool)
- [Tauri Security Best Practices](https://v2.tauri.app/security/)
