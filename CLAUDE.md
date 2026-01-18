# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Monorepo Structure

This is a pnpm monorepo containing:
- `apps/desktop` - Tauri v2 desktop application
- `apps/landing` - Next.js 14 marketing landing page

## Build & Development Commands

```bash
# Install all dependencies
pnpm install

# Desktop app development (launches both Vite and Tauri)
pnpm dev:desktop

# Landing page development
pnpm dev:landing

# Production builds
pnpm build:desktop
pnpm build:landing

# Add shadcn components to desktop app
cd apps/desktop && npx shadcn-ui@latest add <component-name>
```

## Architecture

### Desktop App (`apps/desktop`)

Incito is a Tauri v2 desktop application for managing markdown-based prompt templates with variable interpolation.

**Tech Stack:**
- **Desktop Framework:** Tauri v2
- **Frontend:** React + TypeScript + Vite
- **Styling:** Tailwind CSS + shadcn/ui
- **Markdown:** gray-matter for frontmatter parsing

**Project Structure:**
```
apps/desktop/
├── src/                    # React frontend
│   ├── components/
│   │   ├── ui/            # shadcn components
│   │   ├── FolderSelect   # Initial folder picker
│   │   ├── PromptList     # Left sidebar (250px)
│   │   ├── PromptEditor   # Center panel (flex)
│   │   └── VariablesPanel # Right sidebar (300px)
│   ├── lib/
│   │   ├── prompts.ts     # CRUD operations via Tauri fs API
│   │   ├── parser.ts      # Frontmatter parsing with gray-matter
│   │   ├── interpolate.ts # Variable substitution
│   │   └── store.ts       # localStorage for folder path
│   └── types/prompt.ts    # TypeScript interfaces
└── src-tauri/             # Tauri backend (Rust)
    ├── src/main.rs
    └── tauri.conf.json
```

### Landing Page (`apps/landing`)

Next.js 14 static marketing site for Incito.

**Tech Stack:**
- **Framework:** Next.js 14 (App Router, static export)
- **Styling:** Tailwind CSS
- **Animations:** Framer Motion

**Project Structure:**
```
apps/landing/
├── app/                   # Next.js App Router
│   ├── layout.tsx
│   ├── page.tsx
│   └── globals.css
├── components/
│   ├── ui/               # Button, Container
│   ├── sections/         # Header, Hero, Problem, HowItWorks, Features, FinalCTA, Footer
│   └── shared/           # Logo, FadeIn, ThemeToggle, ScreenshotPlaceholder
├── context/
│   └── ThemeContext.tsx  # Light/dark/system theme support
└── lib/
    ├── utils.ts          # cn() helper
    └── constants.ts      # URLs
```

## Prompt File Format

Markdown files with YAML frontmatter defining variables:
```yaml
---
name: "Prompt Name"
description: "Description"
variables:
  - key: topic
    label: "Topic"
    type: text          # text | textarea | select | number | checkbox
    required: true
    placeholder: "..."
    preview: "Example value for preview mode"
    default: "..."
    options: []         # for select type only
---
Template content with {{topic}} placeholders
{{#if optional_var}}Conditional content{{/if}}
```

## Key Patterns

**Variable Interpolation:**
- Simple: `{{variable_key}}`
- Conditional: `{{#if key}}content{{/if}}`

**Tauri v2 Plugin APIs:**
- Uses `@tauri-apps/plugin-fs` for read/write/delete
- Uses `@tauri-apps/plugin-dialog` for folder picker
- Uses `@tauri-apps/plugin-clipboard-manager` for copy

**State Flow:**
1. User selects prompts folder → path saved to localStorage
2. App reads all `.md` files, parses frontmatter
3. Variables panel generates form from frontmatter schema
4. Copy button interpolates template with form values

## Implementation Notes

- Debounce file saves at 500ms after last keystroke
- Malformed frontmatter shows warning icon in list, errors in editor
- gray-matter works in browser environments
- Form values reset when switching prompts
- Duplicate creates `{name} copy.md` with incremented suffix if exists
