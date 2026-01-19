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

**Last Audit:** 2026-01-19
**Overall Risk Level:** MODERATE

### Open Security Issues

| ID | Severity | Title | Status |
|----|----------|-------|--------|
| SEC-001 | CRITICAL | CSP Disabled | Open |
| SEC-002 | HIGH | Overly Permissive FS Permissions | Open |
| SEC-003 | HIGH | Plaintext API Key Storage | Open |
| SEC-004 | HIGH | Missing Path Validation | Open |
| SEC-005 | MEDIUM | Handlebars noEscape | Documented |
| SEC-006 | MEDIUM | SQL Query Safety | Monitored |
| SEC-007 | MEDIUM | AI Content Validation | Open |
| SEC-008 | MEDIUM | URL Length Validation | Open |

## Recent Reports

### Audit Reports

1. **[Desktop App Security Audit - 2026-01-19](./audit-reports/audit-desktop-app-2026-01-19.md)**
   - Full security audit of Tauri v2 desktop application
   - 1 CRITICAL, 3 HIGH, 4 MEDIUM findings
   - Immediate action required on CSP and file permissions

## Security Contacts

For security concerns or vulnerability reports, contact the security team or project maintainers.

## Quick Links

- [Full Audit Report](./audit-reports/audit-desktop-app-2026-01-19.md)
- [Tauri v2 Security Documentation](https://v2.tauri.app/security/)
- [OWASP Desktop Application Security](https://owasp.org/www-project-desktop-app-security-top-10/)
