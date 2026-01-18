# Changelog

All notable changes to Incito will be documented in this file.

## [0.1.0] - 2026-01-18

### Major Architectural Changes

#### Layout Restructuring
- **Replaced** monolithic `PromptEditor.tsx` with new `CenterPane.tsx` component
- **Replaced** `VariablesPanel.tsx` with new tabbed `RightPanel.tsx` system
- **Added** `NavSidebar.tsx` - 60px left navigation with icons for Search, Prompts, Tags, and Settings
- **Added** `right-panel/` directory with modular tab components:
  - `PreviewTab.tsx` - Live preview of interpolated prompt output
  - `InstructionsTab.tsx` - Variable configuration in edit mode
  - `HistoryTab.tsx` - Version history browser with restore capability
  - `NotesTab.tsx` - Prompt notes and annotations
  - `ConfigTab.tsx` - Delete, quick launch, and configuration options
  - `RightPanelHeader.tsx` - Tab navigation header

#### Custom Hooks Architecture
- **Added** `src/lib/hooks/` directory with extracted state management:
  - `usePromptManager.ts` - Centralized prompt CRUD and state
  - `usePromptEditState.ts` - Edit mode, validation, unsaved changes tracking
  - `useTagManager.ts` - Tag management with SQLite persistence
- **Refactored** App.tsx to use new hook architecture for better separation of concerns

#### Database Integration (SQLite)
- **Added** SQLite database support via `@tauri-apps/plugin-sql`
- **Added** New tables: `tags`, `prompt_tags`, `prompt_versions`
- **Added** Standardized `Result<T>` error handling pattern
- **Added** AI settings persistence (provider, API key, model)

### New Features

#### Version History System
- Automatic version creation before each save (up to 50 versions per prompt)
- Version preview and one-click restoration
- Relative date formatting ("5 minutes ago")
- Full version diff viewing

#### Notes & Annotations
- Add, edit, and delete notes on any prompt
- Notes persist in prompt frontmatter
- Timestamped note creation
- Separate notes from main template content

#### Quick Launch / App Integration
- **Added** `src/lib/launchers.ts` with support for:
  - Claude (claude.ai)
  - ChatGPT (chat.openai.com)
  - Perplexity (perplexity.ai)
  - Gemini (gemini.google.com)
- Per-prompt default launcher selection
- One-click launch from action bar
- Automatic clipboard copying with browser open

#### Advanced Variable Types
- **Added** `slider` type - Range input with min/max/step configuration
- **Added** `array` type - Dynamic arrays with add/remove UI
- **Added** `multi-select` type - Multiple selection from options list
- **Added** Variable properties:
  - `min`, `max`, `step` for slider type
  - `format` for array serialization ('newline', 'comma', 'numbered', 'bullet')
  - `description` for help text display

#### Global Search
- **Added** `SearchPage.tsx` component
- Full-text search across prompt names and descriptions
- Tag-based filtering
- Keyboard navigation (↑/↓, Enter to select)
- `Cmd+K` / `Ctrl+K` global shortcut

#### Tags System
- SQLite-backed tag management
- Tag colors for visual organization
- Prompt-to-tag relationship mapping
- Tag usage analytics
- Dedicated Tags management page

### UI/UX Improvements

#### PromptList Cleanup
- Removed tag color dots from prompt list items for cleaner UI

#### New VariableInputCard Component
- Card-based layout with focus/hover states
- Active state highlighting with ring styling
- Type-specific input rendering
- Required field indicator (red asterisk)
- Description/help text display
- Array type with dynamic add/remove buttons
- Multi-select with checkbox interface
- Slider with min/max display

#### CenterPane Enhancements
- **Run Mode:**
  - Variable input cards with focus management
  - Real-time completion progress bar
  - Copy button enabled/disabled based on required fields
  - Quick launch buttons for default launchers
  - All launchers dropdown menu
- **Edit Mode:**
  - Name input with validation and error display
  - Tag selection interface
  - Template auto-sync with variables

#### Input Component Updates
- **Added** `src/components/ui/slider.tsx` (Radix UI slider wrapper)
- Updated `input.tsx` and `textarea.tsx` styling

### Bug Fixes & Improvements

#### Parser Improvements
- Better frontmatter validation with field-level error detail
- Default launchers parsing and validation
- Notes validation and deserialization

#### Interpolation Enhancements
- Array serialization with multiple formats
- Conditional block handling for arrays (checks length)
- Improved default value fallback logic

#### Template Auto-Sync
- `setLocalTemplate` automatically syncs variables with template
- Detects new/removed `{{variable}}` patterns in real-time
- Prevents stale variable definitions

#### Unsaved Changes Detection
- `hasUnsavedChanges` computed property
- Tracks changes to name, description, template, variables, tags
- Save button disabled when no changes or validation errors

### Dependencies

#### Added
- `@tauri-apps/plugin-sql` ^2.3.1 - SQLite database support
- `@mastra/core` ^0.24.9 - AI orchestration
- `@ai-sdk/anthropic` ^3.0.15 - Anthropic API
- `@ai-sdk/google` ^3.0.10 - Google API
- `@ai-sdk/openai` ^3.0.12 - OpenAI API
- `ai` ^4.3.19 - Vercel AI SDK

### Keyboard Shortcuts

- `Cmd+K` / `Ctrl+K` - Open global search
- `Cmd+N` / `Ctrl+N` - Create new prompt
- `↑` / `↓` - Navigate search results
- `Enter` - Select search result
- `Escape` - Close search / clear focus

### Breaking Changes

- `PromptHeader` now requires `rightPanelOpen` and `activeTab` props
- `CenterPane` replaces `PromptEditor` with different props
- `RightPanel` with tabs replaces `VariablesPanel`
- State management moved to custom hooks

### File Format

No breaking changes to markdown frontmatter format. New optional fields (`notes`, `defaultLaunchers`) are backward compatible.

---

## [0.0.1] - 2026-01-15

### Added
- Initial release
- Manual run workflow
- Basic prompt template management
- Variable interpolation with `{{variable}}` syntax
- Conditional blocks with `{{#if key}}content{{/if}}`
- Tauri v2 desktop application
- File-based storage with YAML frontmatter
