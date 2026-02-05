# User Stories

This document contains user stories that guide feature development for Incito.

## User Story Format

All user stories follow this format:

```
As a [persona],
I want to [action],
So that [benefit].

Acceptance Criteria:
- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Criterion 3
```

---

## Epic: Onboarding & First-Time Experience

### Story 1.1: First-Time Setup Guidance

**As a** new user,
**I want to** understand what a prompts folder is and how to set one up,
**So that** I can get started without confusion or errors.

**Acceptance Criteria:**
- [ ] Folder selection screen explains what a prompts folder contains
- [ ] "Create Sample Folder" button generates example prompts
- [ ] Empty folder state provides clear next steps
- [ ] Help link points to getting started documentation

**Priority:** HIGH
**Persona:** Both (Alex & Sarah)
**JTBD:** Fast, consistent AI prompt execution (first-time setup)

---

### Story 1.2: Onboarding Tour

**As a** first-time user,
**I want to** see a guided tour of the interface,
**So that** I can discover key features without trial and error.

**Acceptance Criteria:**
- [ ] Optional tour launches on first run
- [ ] Tour highlights: prompt list, variable inputs, preview panel, copy/launch
- [ ] Tour can be skipped or replayed later
- [ ] Tour uses real prompts (samples) not empty placeholders

**Priority:** HIGH
**Persona:** Both (Alex & Sarah, especially Sarah)
**JTBD:** Learn by doing, not reading

---

## Epic: Core Workflow Optimization

### Story 2.1: Keyboard Shortcut for Copy

**As a** power user,
**I want to** copy my prompt using a keyboard shortcut,
**So that** I can execute prompts faster without reaching for the mouse.

**Acceptance Criteria:**
- [ ] Cmd+Enter / Ctrl+Enter copies prompt to clipboard
- [ ] Shortcut respects completion status (disabled if required fields missing)
- [ ] Shortcut shown in UI (button tooltip or hint)
- [ ] Toast notification confirms copy success

**Priority:** HIGH
**Persona:** Alex (Primary)
**JTBD:** Speed without sacrifice

---

### Story 2.2: Unsaved Changes Protection

**As a** user editing a prompt,
**I want to** be warned before losing my changes,
**So that** I don't accidentally discard important work.

**Acceptance Criteria:**
- [ ] Confirmation dialog shown when clicking "Cancel" with unsaved changes
- [ ] Warning shown when switching prompts with unsaved changes in edit mode
- [ ] Option to "Save & Continue" or "Discard Changes" or "Keep Editing"
- [ ] Browser/app close warning when unsaved changes exist

**Priority:** CRITICAL
**Persona:** Both (Alex & Sarah)
**JTBD:** Fail gracefully, guide kindly

---

### Story 2.3: Command Palette

**As a** power user,
**I want to** access all actions via a searchable command palette,
**So that** I can discover and execute features without memorizing locations.

**Acceptance Criteria:**
- [ ] Cmd+P / Cmd+Shift+P opens command palette
- [ ] All actions listed (create, edit, save, copy, search, etc.)
- [ ] Fuzzy search filters actions
- [ ] Keyboard shortcuts shown next to actions
- [ ] Recently used actions appear at top

**Priority:** MEDIUM
**Persona:** Alex (Primary)
**JTBD:** Speed without sacrifice, efficiency

---

## Epic: Accessibility

### Story 3.1: Keyboard-Accessible Tabs

**As a** keyboard user,
**I want to** navigate between right panel tabs using keyboard,
**So that** I can access all features without a mouse.

**Acceptance Criteria:**
- [ ] Tab key focuses on right panel tabs
- [ ] Arrow keys navigate between tabs (ARIA tabs pattern)
- [ ] Cmd+1/2/3/4/5 shortcuts jump to specific tabs
- [ ] Enter or Space activates selected tab
- [ ] Focus indicator clearly visible

**Priority:** HIGH
**Persona:** Both (accessibility requirement)
**JTBD:** Accessible by default

---

### Story 3.2: ARIA Labels for Screen Readers

**As a** screen reader user,
**I want to** hear descriptive labels for all interactive elements,
**So that** I can understand and navigate the interface.

**Acceptance Criteria:**
- [ ] All icon-only buttons have aria-label (Settings, Search, etc.)
- [ ] Form inputs have aria-describedby for validation errors
- [ ] Toast notifications use aria-live region
- [ ] Variable highlighting has aria-description for screen readers
- [ ] Complex interactions have ARIA annotations (tabs, dialogs, menus)

**Priority:** HIGH
**Persona:** All users (accessibility requirement)
**JTBD:** Accessible by default

---

## Epic: Edit Mode Experience

### Story 4.1: Visual Edit Mode Indicator

**As a** user,
**I want to** clearly see when I'm in edit mode,
**So that** I don't accidentally edit when I meant to view.

**Acceptance Criteria:**
- [ ] Subtle background tint or border in edit mode
- [ ] Mode indicator badge in header ("Editing")
- [ ] Clear visual distinction from view mode
- [ ] Consistent across all panel areas

**Priority:** HIGH
**Persona:** Both (Alex & Sarah)
**JTBD:** Consistency creates confidence

---

### Story 4.2: Undo/Redo in Template Editor

**As a** user editing a template,
**I want to** undo and redo my changes,
**So that** I can experiment freely without fear of mistakes.

**Acceptance Criteria:**
- [ ] Cmd+Z / Ctrl+Z undoes last change in template textarea
- [ ] Cmd+Shift+Z / Ctrl+Shift+Z redoes undone change
- [ ] Undo history persists during edit session
- [ ] Undo/redo respects autosave state
- [ ] Works for template content, not metadata (name, description)

**Priority:** MEDIUM
**Persona:** Both (Alex & Sarah)
**JTBD:** Fail gracefully, guide kindly

---

## Epic: Guided Prompting for Non-Technical Users

### Story 4.3: Guided Prompt Builder

**As a** non-technical user,
**I want to** create a prompt using a guided step-by-step flow,
**So that** I can build a reliable prompt without learning syntax.

**Acceptance Criteria:**
- [ ] “Guided Builder” option on new prompt flow
- [ ] Steps: intent, audience, constraints, output format
- [ ] Examples shown for each step
- [ ] Generates a draft template with variables filled in
- [ ] User can edit before saving

**Priority:** HIGH
**Persona:** Maya (Domain Expert Operator)
**JTBD:** Create effective prompts without engineering help

---

### Story 4.4: Inline Variable Wizard

**As a** non-technical user,
**I want to** configure variables without editing template syntax,
**So that** I can set up prompts safely and quickly.

**Acceptance Criteria:**
- [ ] Variables detected and listed with friendly names
- [ ] Wizard explains each variable and asks for type
- [ ] Example values and validation shown
- [ ] No requirement to edit `{{variable}}` syntax

**Priority:** HIGH
**Persona:** Maya (Domain Expert Operator)
**JTBD:** Create effective prompts without engineering help

---

### Story 4.5: Prompt Quality Checks

**As a** user,
**I want to** see simple checks before saving a prompt,
**So that** I can avoid common mistakes and ambiguity.

**Acceptance Criteria:**
- [ ] Warnings for missing context or unclear instructions
- [ ] Check for missing variables or unused variables
- [ ] Suggestions for output format clarity
- [ ] Ability to ignore with “Save Anyway”

**Priority:** MEDIUM
**Persona:** Maya (Domain Expert Operator)
**JTBD:** Create effective prompts without engineering help

---

### Story 4.6: Sample Input Preview

**As a** user,
**I want to** preview a prompt with sample inputs,
**So that** I can sanity-check before using it live.

**Acceptance Criteria:**
- [ ] “Preview with Sample Input” button in edit mode
- [ ] Sample inputs auto-filled or user-provided
- [ ] Preview shows final prompt text (no highlights)
- [ ] Optional expected output example field

**Priority:** MEDIUM
**Persona:** Maya (Domain Expert Operator)
**JTBD:** Validate prompt quality and improve safely

---

### Story 4.7: Output Comparison and Notes

**As a** user,
**I want to** compare outputs between versions and note what changed,
**So that** I can improve prompts safely.

**Acceptance Criteria:**
- [ ] Side-by-side output comparison view
- [ ] Ability to rate output quality (1-5)
- [ ] Notes field for why the change was made
- [ ] Links back to the prompt version

**Priority:** MEDIUM
**Persona:** Maya (Domain Expert Operator)
**JTBD:** Validate prompt quality and improve safely

---

## Epic: Organization & Discovery

### Story 5.1: Inline Prompt List Search

**As a** user with many prompts,
**I want to** quickly filter prompts without leaving the main view,
**So that** I can find what I need faster.

**Acceptance Criteria:**
- [ ] Search input in prompt list header
- [ ] Filters prompts in real-time as user types
- [ ] Searches name, description, and tags
- [ ] Clear button to reset filter
- [ ] Maintains selected prompt if still visible

**Priority:** MEDIUM
**Persona:** Both (Alex & Sarah)
**JTBD:** Organize prompts by use case

---

### Story 5.2: Tag Badges in Prompt List

**As a** user,
**I want to** see tags directly in the prompt list,
**So that** I can identify prompts by category at a glance.

**Acceptance Criteria:**
- [ ] Tag badges shown below prompt name in list item
- [ ] Color-coded tags (using tag color from database)
- [ ] Truncated if too many tags (e.g., "+2 more")
- [ ] Clicking tag filters to that tag (or navigates to tag view)

**Priority:** MEDIUM
**Persona:** Both (Alex & Sarah)
**JTBD:** Organize prompts by use case

---

### Story 5.3: Enhanced Pinned Prompts

**As a** user,
**I want to** easily identify and access my most-used prompts,
**So that** I can jump to them instantly.

**Acceptance Criteria:**
- [ ] Pin icon always visible on pinned items (not just on hover)
- [ ] Pinned items have subtle visual distinction (background or border)
- [ ] Pinned section clearly separated from other prompts
- [ ] Drag-to-reorder pinned prompts
- [ ] Limit of 10 pinned prompts with message if exceeded

**Priority:** MEDIUM
**Persona:** Alex (Primary)
**JTBD:** Organize prompts by use case, speed

---

## Epic: Variant System

### Story 6.1: Discoverable Variant Creation

**As a** user,
**I want to** easily discover and understand the variant feature,
**So that** I can create variations of my prompts.

**Acceptance Criteria:**
- [ ] "What are variants?" tooltip or help link in Preview tab
- [ ] "+ Variant" button more prominent (size, color, or position)
- [ ] Empty state in variant dropdown: "Create your first variant"
- [ ] Onboarding tour highlights variants

**Priority:** MEDIUM
**Persona:** Alex (Primary)
**JTBD:** Experiment with prompt variations

---

### Story 6.2: Variant Visibility in List

**As a** user with variants,
**I want to** see which prompts have variants,
**So that** I know where variations exist.

**Acceptance Criteria:**
- [ ] Badge or icon shows variant count (e.g., "3 variants")
- [ ] Visual indicator differentiates parent from variant prompts
- [ ] Clicking badge/icon opens variant selector or navigates to prompt
- [ ] Variant count updates dynamically when variants created/deleted

**Priority:** LOW
**Persona:** Alex (Primary)
**JTBD:** Experiment with prompt variations

---

## Epic: Advanced Features

### Story 7.1: Version History Diff View

**As a** user tracking changes,
**I want to** see what changed between prompt versions,
**So that** I can understand the evolution and decide whether to restore.

**Acceptance Criteria:**
- [ ] "Compare with current" button in history list
- [ ] Side-by-side or inline diff view
- [ ] Highlights additions (green), deletions (red), changes (yellow)
- [ ] Diff applies to template and frontmatter (name, variables, etc.)
- [ ] Easy navigation between versions

**Priority:** LOW
**Persona:** Both (Alex & Sarah, especially Sarah for documentation)
**JTBD:** Iterate and improve prompts over time

---

### Story 7.2: Editable Notes

**As a** user documenting prompts,
**I want to** edit my notes instead of deleting and recreating,
**So that** I can maintain context more easily.

**Acceptance Criteria:**
- [ ] Click note to enter edit mode
- [ ] Inline editing with save/cancel buttons
- [ ] Markdown support for formatting
- [ ] Markdown preview option
- [ ] Edit timestamp tracked ("Edited 2 hours ago")

**Priority:** LOW
**Persona:** Sarah (Secondary)
**JTBD:** Maintain context about prompts

---

## Epic: Launcher Integration

### Story 8.1: Clear Launcher Behavior

**As a** user,
**I want to** understand what each launcher button will do,
**So that** I can choose the right option confidently.

**Acceptance Criteria:**
- [ ] Tooltip explains behavior: "Copy & open ChatGPT" vs. "Open ChatGPT with prompt"
- [ ] Visual indicator (icon) for deep link support
- [ ] Consistent labeling across launchers
- [ ] Documentation link for launcher configuration

**Priority:** MEDIUM
**Persona:** Both (Alex & Sarah)
**JTBD:** Fast, consistent AI prompt execution

---

## Backlog: Future Stories

### Auto-save variable values
**Priority:** LOW
**Note:** Draft system now implemented, may need refinement

### Template syntax highlighting
**Priority:** LOW
**Persona:** Alex

### Export/import prompts
**Priority:** MEDIUM
**Persona:** Both

### Team collaboration features
**Priority:** LOW (future)
**Persona:** Both

### Usage analytics (most-used prompts, success tracking)
**Priority:** LOW (future)
**Persona:** Alex

### Template marketplace
**Priority:** LOW (future)
**Persona:** Both

---

## Story Prioritization Framework

**Critical (Fix Immediately):**
- Data loss prevention
- Accessibility violations
- Core workflow blockers

**High (Next Release):**
- Significant UX improvements
- Onboarding enhancements
- Power user efficiency gains

**Medium (2-3 Releases):**
- Nice-to-have features
- Discoverability improvements
- Edge case handling

**Low (Backlog):**
- Polish and refinement
- Advanced features for minority of users
- Future opportunities

---

Last updated: 2026-02-05
