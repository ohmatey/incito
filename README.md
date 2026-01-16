# Prompt Studio

A desktop application for managing markdown-based prompt templates with variable interpolation.

## Tech Stack

- **Desktop:** Tauri v2
- **Frontend:** React + TypeScript + Vite
- **Styling:** Tailwind CSS + shadcn/ui

## Getting Started

```bash
# Install dependencies
npm install

# Run in development mode
npm run tauri dev

# Build for production
npm run tauri build
```

## How It Works

1. Select a folder containing your prompt templates (`.md` files)
2. Browse and edit prompts in the editor
3. Fill in variables using the right panel
4. Copy the interpolated output to your clipboard

## Prompt Format

Prompts are markdown files with YAML frontmatter:

```yaml
---
name: "My Prompt"
description: "A helpful prompt"
variables:
  - key: topic
    label: "Topic"
    type: text
    required: true
---
Write about {{topic}} in detail.
```

### Variable Types

- `text` - Single line input
- `textarea` - Multi-line input
- `select` - Dropdown with options
- `number` - Numeric input
- `checkbox` - Boolean toggle

### Conditionals

Use Handlebars-style conditionals:

```
{{#if optional_var}}This content appears when optional_var has a value{{/if}}
```
