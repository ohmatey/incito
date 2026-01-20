# Security Documentation

This directory contains security documentation for the Incito project.

## Overview

Incito is a Tauri v2 desktop application for managing prompt templates. Security considerations include:

- File system access controls
- API key storage and protection
- User input validation (markdown/YAML parsing)
- Template interpolation safety
- Webview security (CSP, XSS prevention)

## Directory Structure

```
/docs/security/
  /audit-reports/           # Security vulnerability assessments
  /architecture-reviews/    # Security design analysis
  /compliance-reports/      # OWASP, NIST, CWE compliance
  /templates/               # Reusable document templates
  /reference/               # Security standards and practices
  README.md                 # This file
```

## Current Security Status

**Last Audit:** 2026-01-20
**Overall Risk Level:** MEDIUM-HIGH

### Open Security Issues

| ID | Severity | Title | Status | Source |
|----|----------|-------|--------|--------|
| SEC-001 | CRITICAL | CSP Disabled | Open | Desktop Audit |
| SEC-002 | HIGH | Overly Permissive FS Permissions | Open | Desktop Audit |
| SEC-003 | HIGH | Plaintext API Key Storage | Open | Desktop Audit, MCP Audit |
| SEC-004 | HIGH | Missing Path Validation | Open | Desktop Audit |
| MCP-001 | HIGH | Plaintext API Key Storage | Open | MCP Audit |
| MCP-002 | MEDIUM | Path Traversal Risk | Open | MCP Audit |
| MCP-003 | MEDIUM | Handlebars Template Injection | Open | MCP Audit |
| MCP-004 | MEDIUM | No MCP Authentication | Open | MCP Audit |
| SEC-005 | MEDIUM | Handlebars noEscape | Documented | Desktop Audit |
| SEC-006 | MEDIUM | SQL Query Safety | Monitored | Desktop Audit |
| SEC-007 | MEDIUM | AI Content Validation | Open | Desktop Audit |
| SEC-008 | MEDIUM | URL Length Validation | Open | Desktop Audit |

## Recent Reports

### Audit Reports

1. **[MCP Implementation Security Audit - 2026-01-20](./audit-reports/audit-mcp-implementation-2026-01-20.md)**
   - Security audit of Model Context Protocol (MCP) server implementation
   - 1 HIGH, 4 MEDIUM, 3 LOW findings
   - Focus: API key storage, path traversal, template injection, authentication
   - **Priority**: Secure credential storage and MCP authentication

2. **[Desktop App Security Audit - 2026-01-19](./audit-reports/audit-desktop-app-2026-01-19.md)**
   - Full security audit of Tauri v2 desktop application
   - 1 CRITICAL, 3 HIGH, 4 MEDIUM findings
   - Immediate action required on CSP and file permissions

## Security Contacts

For security concerns or vulnerability reports, contact the security team or project maintainers.

## Quick Links

- [Full Audit Report](./audit-reports/audit-desktop-app-2026-01-19.md)
- [Tauri v2 Security Documentation](https://v2.tauri.app/security/)
- [OWASP Desktop Application Security](https://owasp.org/www-project-desktop-app-security-top-10/)
