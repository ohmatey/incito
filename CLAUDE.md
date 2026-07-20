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

Incito is a Tauri v2 desktop application for authoring, running, and sharing
markdown-based prompt templates. It has grown well past a simple template manager
into a platform (prompts, runs, graders, playbooks, agents, analytics) — several
surfaces are gated behind experimental feature flags (see `FeatureFlagsContext`).

**Tech Stack:**
- **Desktop Framework:** Tauri v2
- **Frontend:** React + TypeScript + Vite
- **Routing:** TanStack Router (hash history, for Tauri `file://` compat)
- **Styling:** Tailwind CSS + shadcn/ui
- **Markdown:** gray-matter for frontmatter parsing
- **Persistence:** SQLite via `@tauri-apps/plugin-sql` (all app state — drafts, runs,
  settings, panel layout, feature flags, app mode). `lib/store.ts` is the (large)
  data-access layer.

**Project Structure (indicative — the app has ~30 top-level components):**
```
apps/desktop/
├── src/
│   ├── main.tsx            # Provider stack + RouterProvider
│   ├── router.tsx          # TanStack Router route tree
│   ├── layouts/RootLayout  # Nav rail + <Outlet/>; renders FolderSelect until a folder is chosen
│   ├── routes/             # Page components (PromptsPage, PromptDetail, SearchPage, SettingsPage, …)
│   ├── context/            # AppContext, LayoutContext, FeatureFlagsContext, AppModeContext, RunModeContext, …
│   ├── components/
│   │   ├── ui/             # shadcn components
│   │   ├── NavSidebar      # 60px left icon rail
│   │   ├── PromptList      # Prompt list column (resizable)
│   │   ├── CenterPane      # Variable form (center)
│   │   ├── preview/        # PromptPreview — live interpolated preview (permanent column)
│   │   └── RightPanel      # Authoring tabs: history, notes, config, instructions, runs, settings
│   ├── lib/
│   │   ├── prompts.ts      # File CRUD via Tauri fs API
│   │   ├── parser.ts       # Frontmatter parsing (gray-matter)
│   │   ├── interpolate.ts  # Handlebars variable substitution
│   │   ├── store.ts        # SQLite data-access layer
│   │   └── starters/       # Bundled starter templates (Vite ?raw)
│   └── types/prompt.ts     # TypeScript interfaces
└── src-tauri/              # Tauri backend (Rust)
    ├── src/main.rs
    └── tauri.conf.json
```

**App modes:** `AppModeContext` toggles `use` (stripped consumer view — form + live
preview + Copy, all authoring chrome hidden) vs `author` (full surface). Default is
`use`; persisted to SQLite. This is the author→consumer adoption bet — see
`docs/product/product-strategy.md`.

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
    type: text          # text | textarea | select | number | slider | array | multi-select | image | datetime
    required: true
    placeholder: "..."
    preview: "Example value for preview mode"
    default: "..."
    options: []         # for select / multi-select types only
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
