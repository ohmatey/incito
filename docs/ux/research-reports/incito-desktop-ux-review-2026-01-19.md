# Incito Desktop App - UX Review

**Date:** 2026-01-19
**Reviewer:** UX Designer
**Scope:** Comprehensive review of Incito desktop application UX
**Version:** v0.3.0

---

## TLDR

- **Overall Assessment**: The application demonstrates strong foundational UX with a clean three-panel layout, intelligent variable system, and thoughtful error handling
- **Key Strengths**: Real-time preview with variable highlighting, robust validation, smart template parsing, comprehensive keyboard shortcuts
- **Critical Issues**: Onboarding experience lacks guidance, edit mode state management confusing, no undo/redo functionality
- **Priority Recommendations**: Add first-run onboarding, improve edit mode feedback, implement command palette, add accessibility improvements
- **User Flow Rating**: 7/10 - Solid core experience with room for discoverability improvements

---

## Executive Summary

Incito is a Tauri v2 desktop application for managing markdown-based prompt templates with variable interpolation. The app provides a sophisticated yet approachable interface for creating, editing, and using prompt templates with dynamic variables.

**Core Strengths:**
- Clean, logical information architecture with three-panel layout
- Excellent real-time preview system with interactive variable highlighting
- Robust error handling and validation feedback
- Smart template parsing that automatically detects and syncs variables
- Comprehensive variable types (text, textarea, select, slider, array, multi-select)

**Core Weaknesses:**
- Steep learning curve for new users with no onboarding
- Edit mode state transitions lack clarity
- Missing critical power-user features (undo/redo, bulk operations)
- Accessibility gaps in keyboard navigation and screen reader support

---

## Context and Research Methodology

### Research Approach

1. **Code Analysis**: Reviewed key components in `/apps/desktop/src/`:
   - `App.tsx` and `AppContext.tsx` - Application state and flow
   - `PromptDetail.tsx` - Main prompt interaction page
   - `CenterPane.tsx` - Variable input and editing
   - `RightPanel.tsx` and tabs - Preview, history, notes, config
   - `FolderSelect.tsx` - Initial onboarding
   - `PromptList.tsx` and `PromptListItem.tsx` - Navigation
   - `VariableInputCard.tsx` - Variable input patterns
   - Parser and validation logic in `/lib/parser.ts`

2. **Industry Benchmarking**: Compared against similar tools:
   - Raycast Snippets - Fast, keyboard-first snippet management
   - Alfred Snippets - Powerful templating with variables
   - Obsidian Templates - Markdown-based templates with community
   - VS Code Snippets - Developer-focused snippet system

3. **Heuristic Evaluation**: Assessed against Nielsen's 10 usability heuristics and WCAG 2.1 accessibility guidelines

### Target Persona (Inferred from Product)

**Power User Persona - "The Prompt Engineer"**
- Role: Content creator, developer, marketer, or researcher
- Goal: Create reusable prompt templates to streamline AI interactions
- Tech Savvy: High - comfortable with markdown, understands templating
- Workflow: Iterative - frequently refines and experiments with prompts
- Pain Point: Managing dozens of similar prompts with slight variations
- Values: Speed, flexibility, reliability, version control

---

## Detailed UX Findings

### 1. Initial Onboarding & First Impressions

#### Current Experience
**Folder Selection Screen** (`FolderSelect.tsx`):
- Clean, centered card design
- Single "Select Folder" button
- Minimal explanation of what happens next

**Strengths:**
- ✅ Simple, uncluttered interface
- ✅ Clear primary action
- ✅ Professional visual design with good dark mode support

**Issues:**
- ✅ ~~**CRITICAL**: No explanation of what a "prompts folder" is or should contain~~ *(Fixed: Added explanatory content to FolderSelect)*
- ❌ **HIGH**: No guidance on file format, structure, or getting started
- ❌ **HIGH**: Missing "Create Sample Prompts" or "Quick Start" option
- ❌ **MEDIUM**: No link to documentation or help resources
- ❌ **MEDIUM**: Doesn't communicate the value proposition clearly

**User Impact:**
- New users don't know what to do after selecting a folder
- High risk of users selecting wrong folder or empty folder
- No clear path from "never used before" to "productive user"

**Recommended Improvements:**
1. Add explanatory text: "Select a folder where your prompt templates are stored (or where you'd like to create them)"
2. Provide "Create Sample Folder" button that generates example prompts
3. Add "?" help icon linking to quick start guide
4. Show folder requirements: "We'll scan for .md files with template frontmatter"

**Priority:** HIGH - First impressions critical for adoption

---

### 2. Navigation & Information Architecture

#### Three-Panel Layout
**Structure:**
- Left: NavSidebar (icons) + PromptList (when on prompts view)
- Center: PromptHeader + CenterPane (content/editing)
- Right: RightPanel (preview, history, notes, config, instructions)

**Strengths:**
- ✅ Logical separation of concerns
- ✅ Familiar desktop app pattern (IDE-like)
- ✅ Collapsible right panel for more space
- ✅ Resizable panels with saved widths (good!)
- ✅ Clear visual hierarchy with consistent borders

**Issues:**
- ❌ **MEDIUM**: No visual indicator when right panel is closed (just disappears)
- ❌ **MEDIUM**: Left sidebar icons lack tooltips (Settings, Tags, Search not immediately clear)
- ❌ **LOW**: No breadcrumb or path indicator showing current folder location
- ❌ **LOW**: Panel resize handles not visually obvious (discoverability issue)

**User Flow Analysis:**

**First-time user journey:**
1. ✅ Select folder → prompts load automatically
2. ❓ First prompt auto-selected (good) but no explanation of interface
3. ❌ User doesn't know about right panel tabs or their purpose
4. ❌ No guidance on "what to do next"

**Recommended Improvements:**
1. Add tooltips to all NavSidebar icons
2. Show subtle animation or indicator when right panel closes
3. Add optional tour/tooltip system for first run
4. Make resize handles more visually distinct (slight border or grip icon)
5. Add folder path indicator in settings or header

**Priority:** MEDIUM

---

### 3. Prompt List & Discovery

#### Current Implementation (`PromptList.tsx`, `PromptListItem.tsx`)

**Strengths:**
- ✅ Clean, scannable list with good typography
- ✅ "Pinned" section separates favorites (excellent!)
- ✅ Warning icon for invalid prompts (good error signaling)
- ✅ Context menu for duplicate/delete/pin operations (discoverable!)
- ✅ Keyboard navigation support (up/down arrows work)
- ✅ Visual feedback on selection (bold, background color)

**Issues:**
- ❌ **MEDIUM**: No search/filter within prompts list on main view (must go to search page)
- ❌ **MEDIUM**: No grouping or categorization (folders, tags display)
- ❌ **MEDIUM**: Pin icon only shows on hover - pinned items not visually distinct enough
- ❌ **LOW**: No prompt description preview in list (helps distinguish similar prompts)
- ❌ **LOW**: No indication of prompt completion status or last used date

**Interaction Patterns:**
- Right-click context menu: Good! But could be more discoverable
- Hover shows pin button: Nice progressive disclosure
- Pinned items have divider: Clear separation

**Search Experience** (`SearchPage.tsx`):
- Dedicated search view with Cmd+K shortcut (excellent!)
- But requires navigating away from main prompts view

**Recommended Improvements:**
1. Add tag badges directly in prompt list items (color-coded)
2. Make pinned items visually distinct (pin icon always visible, or subtle background)
3. Add filter dropdown in PromptList header (by tag, validity, recent)
4. Show prompt description as subtle secondary text
5. Consider inline search in PromptList header as alternative to full search page

**Priority:** MEDIUM

---

### 4. Variable Input System (Core Feature)

#### Variable Input Cards (`VariableInputCard.tsx`, `CenterPane.tsx`)

**Strengths:**
- ✅ **EXCELLENT**: Comprehensive variable types (text, textarea, select, slider, array, multi-select)
- ✅ **EXCELLENT**: Visual feedback on focus/active state (border highlights)
- ✅ **EXCELLENT**: Bi-directional sync between inputs and preview highlighting
- ✅ Required field indicators with asterisk
- ✅ Placeholder text for guidance
- ✅ Field descriptions support (helpful context)
- ✅ Smart array handling (add/remove items, Enter key support)
- ✅ Slider with visual min/max indicators and current value display
- ✅ Multi-select with checkbox UI and selected badges

**Issues:**
- ✅ ~~**MEDIUM**: No validation feedback on required fields until copy attempt~~ *(Fixed: Added real-time validation with inline error messages on blur)*
- ❌ **MEDIUM**: No auto-save or draft persistence for variable values (now addressed with recent draft system)
- ❌ **LOW**: Slider doesn't show value while dragging (only after release)
- ✅ ~~**LOW**: No keyboard shortcuts to jump between variables (Tab works but no Cmd+Option+Up/Down)~~ *(Fixed: Added Cmd+Shift+Up/Down navigation)*
- ❌ **LOW**: Array inputs don't support paste-to-split (paste comma-separated values)

**Completion Status UI:**
- ✅ Progress bar shows filled/total required variables (great feedback!)
- ✅ Green when complete, blue when in-progress (clear states)
- ✅ Numeric indicator (e.g., "3/5") for precise tracking

**Variable Highlighting in Preview:**
- ✅ **OUTSTANDING**: Click variable in preview → scroll to and focus input
- ✅ **OUTSTANDING**: Hover input → highlight in preview
- ✅ Color coding: Blue (filled), Gray (default), Red (missing required)
- ✅ Tooltips show variable label on hover
- ✅ Conditional blocks show with colored left border (green=active, orange=hidden)

**Recommended Improvements:**
1. ✅ ~~Add inline validation errors below required fields when empty~~ *(Implemented: Real-time validation on blur with red border and error message)*
2. Show validation state icons (checkmark for valid, warning for empty required)
3. Implement paste-to-array for array/multi-select inputs
4. ~~Add Cmd+Shift+Up/Down to navigate between variables~~ ✅ Implemented
5. Show slider value in tooltip while dragging

**Priority:** LOW to MEDIUM - Core experience is strong, enhancements would delight

---

### 5. Edit Mode Experience

#### State Management & Transitions

**Current Flow:**
1. View Mode (default) → Click "Edit" button → Edit Mode
2. Edit Mode → Click "Save" or "Cancel" → Return to View Mode
3. Edit Mode → Changes tracked → "Save" button enabled when changes detected

**Strengths:**
- ✅ Clear separation between view and edit modes
- ✅ Save/Cancel buttons only visible in edit mode (reduces clutter)
- ✅ Name validation with inline error messages
- ✅ Unsaved changes indicator (button enabled/disabled state)
- ✅ Template auto-syncs variables on save (detects new {{var}} placeholders)

**Issues:**
- ✅ ~~**CRITICAL**: No confirmation dialog when canceling with unsaved changes~~ *(Fixed: Added AlertDialog confirmation)*
- ❌ **HIGH**: Edit mode state not immediately obvious (no visual indicator in UI beyond button labels)
- ❌ **HIGH**: Switching prompts while in edit mode doesn't warn about unsaved changes
- ❌ **HIGH**: No undo/redo functionality (Cmd+Z doesn't work)
- ❌ **MEDIUM**: Template editor is plain textarea (no syntax highlighting, line numbers)
- ❌ **MEDIUM**: Variable sync happens on save, not in real-time during template editing
- ❌ **LOW**: No auto-save or draft persistence during editing

**Confusion Points:**
1. Users might not realize they're in edit mode (need stronger visual cue)
2. Canceling doesn't confirm, leading to accidental data loss
3. No way to recover from accidental edits beyond manual retyping

**Recommended Improvements:**
1. Add visual indicator of edit mode (banner, background color change, or mode badge)
2. Add confirmation dialog on cancel if hasUnsavedChanges
3. Add confirmation dialog on prompt switch if hasUnsavedChanges
4. Implement browser-level undo/redo for template textarea
5. Add "Discard changes?" confirmation on window close
6. Consider auto-save to drafts every 30 seconds
7. Show live variable detection preview while typing template (optional)

**Priority:** HIGH - Edit mode is core workflow, current gaps risk data loss

---

### 6. Right Panel Tabs & Secondary Features

#### Tab Structure (`RightPanel.tsx`)

**Available Tabs:**
- **Preview** (default): Interactive template preview with variable highlighting
- **Instructions** (edit mode only): Variable configuration (type, required, options)
- **Notes**: Per-prompt notes with timestamps
- **History**: Version history for rollback
- **Config**: Launcher configuration, delete prompt

**Strengths:**
- ✅ Logical grouping of related features
- ✅ Tab icons + labels for clarity
- ✅ Instructions tab hidden in view mode (contextual relevance)
- ✅ Clean header with close button
- ✅ Each tab scrolls independently (good UX)

**Issues:**
- ❌ **MEDIUM**: Tabs not keyboard accessible (no Tab key navigation between tabs)
- ❌ **MEDIUM**: No keyboard shortcut to toggle right panel (only mouse click)
- ❌ **LOW**: Active tab indicator could be stronger (subtle underline)
- ❌ **LOW**: No indication of content in tabs (e.g., "3 notes" badge)

#### Preview Tab (`PreviewTab.tsx`)

**Strengths:**
- ✅ **OUTSTANDING**: Real-time template rendering with Handlebars support
- ✅ **OUTSTANDING**: Interactive variable highlighting (click to jump to input)
- ✅ **EXCELLENT**: Variant selector and creation workflow
- ✅ **EXCELLENT**: AI refinement feature with inline input
- ✅ Conditional block visualization (green/orange border)
- ✅ Tooltips on hover showing variable names

**Issues:**
- ❌ **MEDIUM**: Preview doesn't show final output format (what gets copied)
- ❌ **LOW**: Variant creation mode not obvious (small + Variant button)
- ❌ **LOW**: No preview mode toggle (with/without variable highlighting)

**Recommended Improvements:**
1. Add keyboard shortcut for common tabs (Cmd+1 Preview, Cmd+2 Notes, etc.)
2. Add Cmd+Shift+P to toggle right panel
3. Show badge counts on tabs (e.g., "Notes (3)", "History (12)")
4. Make tab clickable area larger
5. Add "Plain Text" toggle in Preview to show final interpolated output

**Priority:** MEDIUM

---

### 7. Copy & Launch Workflow (Primary JTBD)

#### Current Flow (`CenterPane.tsx`)

**Action Bar:**
- Progress bar (if required variables exist)
- "Copy Prompt" button (primary CTA)
- Default launcher quick buttons (configured in Config tab)
- "More launchers" dropdown menu

**Strengths:**
- ✅ Clear primary action (Copy Prompt)
- ✅ Visual feedback on copy (button changes to "Copied" with checkmark)
- ✅ Progress bar prevents copying incomplete prompts (good guard rail)
- ✅ Toast notification confirms success
- ✅ Multiple launcher options (ChatGPT, Claude, Gemini, etc.)
- ✅ Deep link support where available (ChatGPT, Claude)

**Issues:**
- ✅ ~~**MEDIUM**: Copy button disabled state not explained (no tooltip saying "Fill required fields")~~ *(Fixed: Added tooltip)*
- ✅ ~~**MEDIUM**: No keyboard shortcut for copy (Cmd+Enter would be natural)~~ *(Fixed: Added Cmd+Enter shortcut)*
- ❌ **MEDIUM**: Launcher buttons don't explain what happens (copy+launch vs. deep link)
- ❌ **LOW**: No indication of which launchers support deep links
- ❌ **LOW**: Can't reorder or customize quick launcher buttons from action bar

**Launcher Integration:**
- Supports: ChatGPT, Claude, Gemini, Perplexity, Ollama, LM Studio
- Deep link vs. Copy+Launch patterns clear in code but not in UI

**Recommended Improvements:**
1. ~~Add Cmd+Enter keyboard shortcut to copy (or copy+launch default)~~ ✅ Implemented
2. ~~Add tooltip on disabled copy button: "Fill all required fields to continue"~~ ✅ Implemented
3. Add subtle icon to launcher buttons indicating deep link support (external link icon)
4. Show tooltip on launcher hover: "Copy & open ChatGPT" vs. "Open in ChatGPT with prompt"
5. Add drag-to-reorder for quick launchers in Config tab

**Priority:** MEDIUM - Core workflow is functional, enhancements improve speed

---

### 8. Error Handling & Validation

#### Parse Errors (`CenterPane.tsx` - Invalid Prompts)

**Strengths:**
- ✅ **EXCELLENT**: Clear error state UI with red border and warning icon
- ✅ **EXCELLENT**: Specific error messages per field (e.g., "variables[2]: Invalid type")
- ✅ Shows raw content for debugging
- ✅ Warning icon in prompt list for quick identification
- ✅ Graceful degradation (app doesn't crash on malformed prompts)

**Issues:**
- ❌ **MEDIUM**: No "Fix automatically" or "Open in editor" quick action
- ❌ **MEDIUM**: Error messages use technical field names (e.g., "variables[2]") not user-friendly
- ❌ **LOW**: No link to documentation explaining frontmatter format

#### Variable Validation (`parser.ts`)

**Strengths:**
- ✅ Comprehensive validation for all variable types
- ✅ Key format validation (alphanumeric, hyphen, underscore)
- ✅ Type-specific validation (slider min/max, select options, etc.)
- ✅ Errors collected and surfaced in UI

**Issues:**
- ❌ **MEDIUM**: Validation happens on save, not during editing (delayed feedback)
- ❌ **LOW**: No autocomplete suggestions for variable keys in template

#### Name Validation (Edit Mode)

**Strengths:**
- ✅ Real-time validation with inline error message
- ✅ Prevents duplicate names
- ✅ Red text + red border for clear error state
- ✅ Save button disabled when name invalid

**Recommended Improvements:**
1. Add "Fix automatically" button on parse errors (suggests corrections)
2. Make error messages more user-friendly ("The variable at position 3 is missing a type")
3. Add real-time validation feedback in Instructions tab during variable configuration
4. Add help link from error screen to documentation
5. Consider template linting while typing (non-blocking suggestions)

**Priority:** MEDIUM

---

### 9. Advanced Features

#### Variant System

**Strengths:**
- ✅ **INNOVATIVE**: Create variants with different templates but same variables
- ✅ Variant selector in Preview tab
- ✅ AI-powered variant creation
- ✅ Parent-child relationship tracking

**Issues:**
- ❌ **HIGH**: Variant UX not discoverable (small button, no explanation)
- ❌ **MEDIUM**: No visual indicator in prompt list showing variants
- ❌ **MEDIUM**: Can't preview all variants side-by-side
- ❌ **LOW**: Variant naming convention unclear to users

#### Version History (`HistoryTab.tsx`)

**Strengths:**
- ✅ Automatic version tracking on save
- ✅ One-click restore functionality
- ✅ Timestamp for each version

**Issues:**
- ❌ **MEDIUM**: No diff view showing what changed
- ❌ **MEDIUM**: No version descriptions/labels
- ❌ **LOW**: Can't delete old versions to clean up

#### Notes System (`NotesTab.tsx`)

**Strengths:**
- ✅ Simple note-taking per prompt
- ✅ Timestamps for context
- ✅ Easy add/delete

**Issues:**
- ❌ **MEDIUM**: Notes not searchable globally
- ❌ **LOW**: No markdown support in notes
- ❌ **LOW**: No note editing (only delete + re-add)

**Recommended Improvements:**
1. Add "What are variants?" tooltip/help text in Preview tab
2. Show variant count badge in prompt list item
3. Add diff view in History tab (highlight changes)
4. Allow adding description when creating version
5. Make notes editable inline
6. Add markdown rendering in notes

**Priority:** LOW to MEDIUM - Nice-to-have enhancements

---

### 10. Keyboard Shortcuts & Power User Features

#### Current Shortcuts

**Implemented:**
- ✅ `Cmd+K / Ctrl+K`: Navigate to search + focus input (excellent!)
- ✅ `Cmd+N / Ctrl+N`: New prompt dialog
- ✅ Arrow keys: Navigate prompt list
- ✅ Tab: Move between form fields
- ✅ Enter: Submit forms (variant creation, AI refinement)
- ✅ Esc: Close dialogs, cancel variant/refine mode

**Missing:**
- ✅ ~~`Cmd+Enter`: Copy prompt (most natural for primary action)~~ Implemented
- ❌ `Cmd+E`: Toggle edit mode
- ❌ `Cmd+S`: Save (when in edit mode)
- ✅ ~~`Cmd+Shift+P`: Toggle right panel~~ Implemented as Cmd+\
- ❌ `Cmd+1/2/3/4/5`: Switch right panel tabs
- ❌ `Cmd+Shift+N`: New variant
- ❌ `Cmd+D`: Duplicate current prompt
- ❌ `Cmd+Delete`: Delete current prompt
- ✅ ~~No command palette for discoverability~~ *(Partial: Added keyboard shortcuts modal with Cmd+/)*

**Recommended Improvements:**
1. Implement all missing shortcuts listed above
2. Add command palette (Cmd+Shift+P or Cmd+P) listing all actions
3. Add shortcut hints to buttons (e.g., "Copy (⌘↵)")
4. ~~Add keyboard shortcuts help modal (Cmd+?)~~ ✅ Implemented (Cmd+/)
5. Make all UI actions keyboard-accessible

**Priority:** HIGH - Power users expect comprehensive keyboard support

---

### 11. Accessibility Assessment (WCAG 2.1)

#### Keyboard Navigation

**Current State:**
- ✅ Most UI elements keyboard-accessible via Tab
- ✅ Dialogs have focus trapping
- ✅ Escape key closes modals
- ❌ **CRITICAL**: Right panel tabs not keyboard-accessible
- ❌ **HIGH**: Context menu requires mouse (right-click only)
- ❌ **HIGH**: No skip-to-content links
- ❌ **MEDIUM**: Focus indicators weak in some areas

#### Screen Reader Support

**Current State:**
- ✅ ~~**CRITICAL**: No ARIA labels on most interactive elements~~ *(Fixed: Added aria-labels to all icon-only buttons)*
- ✅ ~~**CRITICAL**: Icon-only buttons lack accessible names (NavSidebar icons)~~ *(Fixed: Added aria-labels)*
- ✅ ~~**HIGH**: No ARIA live regions for dynamic content (toast notifications not announced)~~ *(Fixed: Added ARIA live region to Toaster)*
- ❌ **HIGH**: Variable highlighting in preview not accessible (purely visual)
- ❌ **MEDIUM**: Form validation errors not announced

**Found ARIA Usage:**
- Limited to shadcn/ui components (Dialog, AlertDialog, etc.)
- Custom components lack ARIA annotations

#### Color Contrast

**Current State:**
- ✅ Good contrast in light mode
- ✅ Good contrast in dark mode
- ⚠️ Some gray text may be borderline (need contrast testing)

#### Focus Management

**Current State:**
- ✅ Focus maintained in dialogs
- ✅ Focus returns after dialog close
- ❌ **MEDIUM**: Focus not moved when opening edit mode
- ❌ **MEDIUM**: Focus lost when switching prompts
- ❌ **LOW**: No focus visible in prompt list on first load

**Recommended Improvements:**
1. ~~Add ARIA labels to all icon buttons: `aria-label="Settings"`, `aria-label="Search"`, etc.~~ ✅ Implemented
2. ~~Add ARIA live region for toast notifications: `<div role="status" aria-live="polite">`~~ ✅ Implemented
3. Make tabs keyboard-accessible with arrow keys (implement ARIA tabs pattern)
4. Add skip-to-content link at top of app
5. Ensure all focus states have visible outline (at least 2px, high contrast)
6. Add ARIA descriptions to complex interactions (variable preview linking)
7. Announce form validation errors to screen readers
8. Add keyboard shortcut to context menu actions (or make accessible via menu bar)

**Priority:** HIGH - Accessibility is both ethical requirement and legal compliance

---

### 12. Visual Design & Consistency

#### Design System

**Strengths:**
- ✅ Consistent use of Tailwind + shadcn/ui components
- ✅ Cohesive color palette (grays, primary blue, semantic colors)
- ✅ Good typography hierarchy (font sizes, weights)
- ✅ Dark mode support throughout
- ✅ Consistent spacing and padding

**Issues:**
- ✅ ~~**LOW**: Some button sizing inconsistencies (sm vs. default)~~ *(Fixed: Consolidated to sm and default sizes)*
- ✅ ~~**LOW**: Icon sizes vary slightly (h-4 vs. h-3.5)~~ *(Fixed: Standardized to h-4 w-4 throughout)*
- ❌ **LOW**: Border radius not fully consistent (rounded-md vs. rounded-lg)

#### Visual Hierarchy

**Strengths:**
- ✅ Clear content hierarchy (headers, body, actions)
- ✅ Good use of white space
- ✅ Proper visual weight for CTAs (primary vs. secondary buttons)

**Issues:**
- ❌ **LOW**: Edit mode not visually distinct enough
- ❌ **LOW**: Active state indicators could be stronger

**Recommended Improvements:**
1. Create design system documentation for developers
2. Standardize icon sizes across app (use h-4 w-4 consistently)
3. Audit button sizes and consolidate to two sizes (sm, default)
4. Add subtle visual indicator for edit mode (background tint or banner)

**Priority:** LOW - Visual consistency is good, minor refinements only

---

### 13. Empty States & Edge Cases

#### Empty Folder

**Current State:**
- ✅ Shows "No prompts found" message in prompt list
- ✅ ~~**HIGH**: No guidance on how to create first prompt~~ *(Fixed: Added "Create your first prompt" card)*
- ✅ ~~**HIGH**: No "Create your first prompt" CTA~~ *(Fixed: Added card with description and Cmd+N hint)*
- ❌ **MEDIUM**: Center pane empty state could be more helpful

#### No Prompt Selected

**Current State:**
- ✅ Shows pinned prompts in center pane (clever!)
- ✅ Fallback message: "Select a prompt to get started"
- ⚠️ Good but could add "or create new prompt" CTA

#### Invalid Prompt Selected

**Current State:**
- ✅ Comprehensive error display (see section 8)
- ✅ Shows raw content for debugging

#### No Variables in Prompt

**Current State:**
- ✅ Shows message: "No variables defined. Add {{variableName}} in the template."
- ✅ Still allows copying template
- ✅ Good guidance

**Recommended Improvements:**
1. Add "Create your first prompt" card in empty state
2. Add "Import examples" button in empty state
3. Enhance no-prompt-selected state with quick actions
4. Add tips/suggestions in empty states

**Priority:** MEDIUM

---

## Summary of Findings by Severity

### Critical Issues (Immediate Action Required)

1. **No onboarding for first-time users** - Users don't know how to get started
2. ~~**No unsaved changes confirmation** - Risk of data loss when canceling/switching prompts~~ ✅ Fixed (cancel confirmation added)
3. ~~**Accessibility gaps** - ARIA labels missing, screen reader support incomplete~~ ✅ Partially fixed (ARIA labels added, live regions added)
4. **Keyboard accessibility** - Tabs, context menu not keyboard-accessible

### High Priority Issues (Address in Next Release)

5. **Edit mode state unclear** - No visual indicator user is in edit mode
6. **No undo/redo** - Can't recover from editing mistakes
7. **Variable sync on save only** - Template changes don't update variable list in real-time
8. **Missing keyboard shortcuts** - Power users expect Cmd+Enter, Cmd+S, etc.
9. ~~**Empty state guidance lacking**~~ ✅ Fixed - Added "Create your first prompt" card
10. **Variant discoverability low** - Innovative feature hidden from users

### Medium Priority Issues (Nice to Have)

11. No search/filter in prompt list (must use search page)
12. ~~No validation feedback until copy attempt~~ ✅ Fixed - Real-time validation with inline errors
13. Template editor lacks syntax highlighting
14. No command palette for action discovery
15. Launcher buttons lack explanation of behavior
16. Parse errors use technical language
17. Pin visual indicator weak
18. Right panel tabs lack keyboard shortcuts

### Low Priority Issues (Future Enhancements)

19. No breadcrumb showing folder path
20. Resize handles not visually obvious
21. No description preview in prompt list
22. Slider value not shown while dragging
23. Array inputs don't support paste-to-split
24. No diff view in version history
25. Notes not editable (delete+recreate only)

---

## Recommended Action Plan

### Phase 1: Foundation (Week 1-2)

**Goal:** Fix critical user experience gaps and accessibility

1. **Add first-run onboarding flow**
   - Welcome modal explaining key concepts
   - Option to create sample prompts folder
   - Tooltip tour of main interface

2. **Implement unsaved changes confirmation**
   - ~~Warn on Cancel with changes~~ ✅ Implemented
   - Warn on prompt switch with changes
   - Warn on window close with changes

3. **Add essential ARIA labels**
   - Label all icon buttons
   - Add role and aria-label to tabs
   - Add live region for toasts

4. **Make tabs keyboard accessible**
   - Implement ARIA tabs pattern
   - Add arrow key navigation
   - Add Cmd+1/2/3 shortcuts

### Phase 2: Power User Features (Week 3-4)

**Goal:** Improve speed and efficiency for regular users

5. **Implement comprehensive keyboard shortcuts**
   - Cmd+Enter: Copy prompt
   - Cmd+E: Toggle edit mode
   - Cmd+S: Save
   - Cmd+Shift+P: Toggle right panel
   - Cmd+?: Show shortcuts help

6. **Add command palette**
   - Cmd+P to open
   - Searchable list of all actions
   - Shows keyboard shortcuts

7. **Add undo/redo support**
   - Cmd+Z / Cmd+Shift+Z
   - At least for template editing

8. **Enhance edit mode feedback**
   - Visual banner or background tint
   - Mode indicator in header
   - Clearer state transitions

### Phase 3: Refinement (Week 5-6)

**Goal:** Polish experience and add delighters

9. **Improve empty states**
   - ✅ "Create first prompt" CTAs - Implemented
   - Sample prompt templates
   - Contextual help

10. **Add inline search to prompt list**
    - Quick filter without leaving view
    - Tag filtering

11. **Enhance variable validation**
    - ✅ Real-time feedback - Implemented
    - ✅ Inline error messages - Implemented
    - Auto-fix suggestions

12. **Improve variant discoverability**
    - Onboarding tooltip
    - Visual indicator in list
    - Better naming guidance

---

## Jobs-to-be-Done Alignment

Based on the application design, the primary JTBD appears to be:

**Primary JTBD:**
> When I need to interact with AI systems repeatedly with similar prompts but varying parameters, I want a fast way to fill in variables and launch my prompt, so that I can be more productive and maintain consistency across my AI interactions.

**Current UX Performance:**
- **Speed:** 8/10 - Fast once learned, but onboarding slows initial adoption
- **Flexibility:** 9/10 - Excellent variable system supports diverse use cases
- **Reliability:** 8/10 - Robust validation, but risk of unsaved changes
- **Learnability:** 5/10 - Lacks onboarding, many features undiscoverable

**Secondary JTBDs (Well Supported):**
- Version and iterate on prompts over time (History tab)
- Organize prompts by category or use case (Tags, Pinning)
- Create variations of successful prompts (Variants)
- Track context and decisions per prompt (Notes)

**Secondary JTBDs (Weakly Supported):**
- Share prompts with team (no export/import yet)
- Sync prompts across devices (desktop only, local files)
- Analyze which prompts are most effective (no analytics)

---

## Competitive Benchmarking

### vs. Raycast Snippets
**Raycast Strengths:**
- Instant global access (always one hotkey away)
- Fuzzy search across all snippets
- Inline variable filling in popup

**Incito Advantages:**
- More powerful variable types (slider, multi-select, array)
- Template preview with highlighting
- Version history

**Lessons for Incito:**
- Add global hotkey to activate app and open search
- Make search more prominent (inline in list?)

### vs. Alfred Snippets
**Alfred Strengths:**
- System-wide snippet expansion
- Simple, focused interface
- Clipboard history integration

**Incito Advantages:**
- Dedicated app with rich editing
- Multiple launch targets (not just clipboard)
- AI-powered creation and refinement

**Lessons for Incito:**
- Consider adding system-wide hotkey support
- Simplify core flow even more

### vs. Obsidian Templates
**Obsidian Strengths:**
- Integrated into note-taking workflow
- Community templates marketplace
- Powerful plugin ecosystem

**Incito Advantages:**
- Purpose-built for prompts (not general notes)
- Better variable UX (forms vs. manual replacement)
- Launch integrations

**Lessons for Incito:**
- Consider template marketplace or import/export
- Enable community sharing

---

## Success Metrics to Track

If these UX improvements are implemented, measure:

1. **Time to First Prompt Created** - Should decrease with onboarding
2. **Prompt Creation Success Rate** - Fewer parse errors, better validation
3. **Feature Discovery Rate** - More users finding variants, notes, history
4. **Keyboard Shortcut Adoption** - Track usage of shortcuts
5. **Edit Mode Data Loss Events** - Should decrease to near-zero
6. **Accessibility Score** - WCAG 2.1 AA compliance (currently failing)
7. **User Satisfaction (NPS)** - Qualitative feedback on experience

---

## Conclusion

**Overall Assessment: 7/10**

Incito demonstrates strong foundational UX with a well-architected interface and innovative features. The variable system with real-time preview highlighting is genuinely impressive and sets it apart from competitors.

However, the application suffers from discoverability issues, lacking onboarding, and incomplete accessibility. New users will struggle to understand the interface without guidance, and power users will miss keyboard shortcuts and advanced features.

**Key Strengths:**
1. Excellent variable system (multiple types, real-time preview)
2. Clean, logical information architecture
3. Robust error handling and validation
4. Thoughtful features (variants, history, notes)

**Key Weaknesses:**
1. No onboarding or first-run experience
2. Edit mode state management confusing
3. Missing critical keyboard shortcuts
4. Accessibility gaps (ARIA, keyboard nav)

**Recommendation:**
Focus Phase 1 and 2 improvements on onboarding, unsaved changes protection, accessibility, and keyboard shortcuts. These changes will dramatically improve both first-time user experience and power user productivity. The core UX foundation is solid - it needs polish and discoverability improvements to reach its potential.

With these improvements, Incito could become the gold standard for prompt template management.

---

## Appendix: Research Sources

### Code Files Reviewed
- `/apps/desktop/src/App.tsx` - Main application shell
- `/apps/desktop/src/context/AppContext.tsx` - Global state management
- `/apps/desktop/src/routes/PromptDetail.tsx` - Prompt detail view
- `/apps/desktop/src/components/FolderSelect.tsx` - Initial onboarding
- `/apps/desktop/src/components/PromptList.tsx` - Navigation
- `/apps/desktop/src/components/PromptListItem.tsx` - List item interactions
- `/apps/desktop/src/components/CenterPane.tsx` - Main content area
- `/apps/desktop/src/components/RightPanel.tsx` - Secondary features
- `/apps/desktop/src/components/right-panel/PreviewTab.tsx` - Preview implementation
- `/apps/desktop/src/components/VariableInputCard.tsx` - Variable inputs
- `/apps/desktop/src/components/NewPromptDialog.tsx` - Prompt creation
- `/apps/desktop/src/components/PromptHeader.tsx` - Header controls
- `/apps/desktop/src/lib/parser.ts` - Validation logic
- `/apps/desktop/src/types/prompt.ts` - Type definitions

### Industry Standards Referenced
- Nielsen Norman Group - 10 Usability Heuristics
- WCAG 2.1 Level AA Guidelines
- Apple Human Interface Guidelines (Desktop)
- Material Design - Navigation Patterns

### Competitive Products Analyzed
- Raycast Snippets
- Alfred Snippets
- Obsidian Templates
- VS Code Snippets
- TextExpander
