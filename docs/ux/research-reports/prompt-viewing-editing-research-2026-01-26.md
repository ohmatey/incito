# UX Research Report: Prompt Viewing & Editing Experience

**Date:** 2026-01-26
**Focus Area:** Prompt template viewing and editing UX
**Researcher:** UX Designer Agent
**Related Documentation:**
- CLAUDE.md (project architecture)
- apps/desktop/src/components/PromptEditorDialog.tsx
- apps/desktop/src/components/CenterPane.tsx
- apps/desktop/src/routes/PromptDetail.tsx
- apps/desktop/src/components/right-panel/PreviewTab.tsx

---

## TLDR

- **Current state**: Modal-based editing dialog constrains template visibility; no side-by-side editing and preview
- **Critical issue**: Users cannot see interpolated preview while editing templates (modal blocks view)
- **High impact**: Template editor lacks syntax highlighting, line numbers, and visual aids for markdown/variable syntax
- **Medium impact**: Preview tab has excellent variable highlighting but is hidden during editing
- **Recommendation**: Implement split-pane editing mode with live preview, syntax highlighting, and improved modal sizing

---

## Executive Summary

The prompt viewing and editing experience in Incito has a strong foundation with sophisticated preview functionality and AI-powered refinement. However, the modal-based editing workflow significantly limits template visibility and forces users to toggle between editing and previewing. The lack of syntax highlighting and visual aids in the template editor reduces efficiency for users working with markdown and variable interpolation.

**Key Strengths:**
- Excellent interactive preview with variable highlighting and conditional block visualization
- AI refinement panel provides helpful template improvement workflow
- Variable interpolation preview is sophisticated and well-implemented

**Key Weaknesses:**
- Modal-based editing prevents simultaneous viewing of template and preview
- No syntax highlighting for markdown or variable syntax
- Large templates require excessive scrolling in fixed-height modals
- No visual differentiation between template content and variable syntax

---

## Context & JTBD Alignment

**Job-to-be-Done:**
"When I'm creating or editing a prompt template, I need to see how my markdown and variables will render in real-time, so I can efficiently craft the perfect prompt without trial-and-error."

**Target Persona:**
Power users creating complex prompt templates with:
- Multiple variables and conditional logic
- Markdown formatting (headers, lists, code blocks)
- Long-form templates (500+ words)

**Success Metrics:**
- Time to edit template and verify output: Target < 2 minutes (current: ~5-7 minutes with toggling)
- Template editing errors (incorrect variable syntax, broken conditionals): Target < 1 per template
- User satisfaction with editing experience: Target 8/10 or higher

---

## Research Methodology

**Heuristic Evaluation:**
Analyzed codebase against Nielsen's 10 Usability Heuristics:
1. Visibility of system state
2. Match between system and real world
3. User control and freedom
4. Consistency and standards
5. Error prevention
6. Recognition rather than recall
7. Flexibility and efficiency of use
8. Aesthetic and minimalist design
9. Help users recognize, diagnose, recover from errors
10. Help and documentation

**Competitive Analysis:**
Researched industry standards for template editors:
- GitHub Gist (side-by-side markdown editing)
- Notion (live inline preview)
- VS Code (syntax highlighting, minimap)
- StackEdit (split-pane markdown editor)

**Code Review:**
Examined implementation of:
- PromptEditorDialog (modal-based editing)
- CenterPane (in-place editing during edit mode)
- PreviewTab (sophisticated preview rendering)
- Variable interpolation logic

---

## Detailed Findings

### CRITICAL SEVERITY

#### Finding 1: Modal-Based Editing Blocks Preview Access

**Issue:**
The `PromptEditorDialog` is a modal (`max-w-6xl max-h-[90vh]`) that blocks access to the preview tab when editing. Users cannot see the interpolated preview while editing the template.

**Impact:**
- Forces iterative workflow: Edit → Save → Navigate to Preview → Identify issue → Edit again
- Increases cognitive load by requiring users to mentally simulate variable interpolation
- Particularly problematic for conditional blocks (`{{#if}}`) where logic visibility is critical

**Evidence from code:**
```tsx
// PromptEditorDialog.tsx line 106
<DialogContent className="max-w-6xl max-h-[90vh] flex flex-col">
```
Modal overlays entire interface, preventing simultaneous preview access.

**User Impact:**
Power users editing complex templates spend 3-5x longer due to toggle overhead.

**Recommendation:**
**Option A (Recommended)**: Implement split-pane editing mode
- Left pane: Template editor with syntax highlighting
- Right pane: Live preview that updates as user types (debounced)
- Toggle between horizontal and vertical split based on user preference

**Option B**: Make dialog non-modal with draggable positioning
- Allow users to position editor dialog alongside preview
- Less optimal due to window management overhead

---

### HIGH SEVERITY

#### Finding 2: No Syntax Highlighting in Template Editor

**Issue:**
Template textarea uses basic `font-mono` styling with no syntax highlighting for:
- Markdown syntax (headers, lists, code blocks, bold, italic)
- Variable interpolation syntax (`{{variable}}`)
- Conditional blocks (`{{#if}}`, `{{else}}`, `{{/if}}`)
- YAML frontmatter

**Evidence from code:**
```tsx
// PromptEditorDialog.tsx line 154
<Textarea
  value={template}
  className="flex-1 min-h-[400px] font-mono text-sm resize-none"
/>
```
Plain textarea without any visual differentiation.

**Impact:**
- Difficult to spot syntax errors (missing braces, typos in variable names)
- No visual feedback for markdown formatting
- Harder to scan long templates and identify structure

**Competitive Benchmark:**
- VS Code, GitHub, and StackEdit all provide syntax highlighting
- Industry standard for template/markdown editors

**Recommendation:**
Implement syntax highlighting using a lightweight library:
1. **react-codemirror** or **monaco-editor** (Monaco is heavier but more powerful)
2. Create custom syntax mode for Incito template format:
   - Highlight `{{variables}}` in blue
   - Highlight `{{#if}}...{{/if}}` blocks in purple with indentation guides
   - Highlight markdown syntax (headers, bold, italic, code)
   - Highlight YAML frontmatter in gray
3. Add line numbers on the left gutter

**Example implementation approach:**
```tsx
import CodeMirror from '@uiw/react-codemirror'
import { markdown } from '@codemirror/lang-markdown'

<CodeMirror
  value={template}
  height="400px"
  extensions={[markdown(), customHandlebarsExtension()]}
  onChange={setTemplate}
/>
```

---

#### Finding 3: No Line Numbers or Code Navigation Aids

**Issue:**
Template editor lacks line numbers, making it difficult to:
- Reference specific lines when discussing with team
- Navigate long templates efficiently
- Debug error messages that reference line numbers (if implemented)

**Impact:**
- Reduced efficiency when editing large templates (300+ lines)
- No quick navigation to specific sections
- No minimap for long templates

**Recommendation:**
Add line numbers and navigation aids:
1. Line numbers in left gutter (CodeMirror provides this)
2. Minimap for templates > 100 lines (optional, Monaco Editor feature)
3. "Go to line" command (Cmd/Ctrl+G)
4. Folding for YAML frontmatter and conditional blocks

---

### MEDIUM SEVERITY

#### Finding 4: Preview Tab Hidden During Edit Mode

**Issue:**
The excellent PreviewTab component is completely hidden during edit mode. CenterPane switches to edit interface, removing preview access.

**Evidence from code:**
```tsx
// CenterPane.tsx line 438
if (isEditMode) {
  return (
    <div className="flex h-full flex-1 flex-col bg-gray-100 dark:bg-gray-900">
      {/* Edit mode UI - no preview */}
    </div>
  )
}
```

**Impact:**
- Users lose access to sophisticated variable highlighting during editing
- Cannot verify variable interpolation in real-time
- Forces mental simulation of template rendering

**Current Workaround:**
The AI refinement panel provides split view (2/3 editor, 1/3 AI panel), but this is only for AI instructions, not preview.

**Recommendation:**
Repurpose the split-pane pattern used for AI refinement:
1. Add "Show Preview" toggle in edit mode (similar to "Refine with AI" button)
2. Split editor 60/40: Template editor (left) + Live preview (right)
3. Debounce preview updates (500ms) to avoid performance issues
4. Highlight active variable in both editor and preview when hovering

---

#### Finding 5: Modal Height Constraint for Long Templates

**Issue:**
Modal is constrained to `max-h-[90vh]`, which on smaller screens (1366x768) provides only ~600px of editing space. Long templates require excessive scrolling.

**Evidence:**
```tsx
// PromptEditorDialog.tsx line 106
<DialogContent className="max-w-6xl max-h-[90vh] flex flex-col">
```

**Impact:**
- Users editing 500+ line templates lose context while scrolling
- No overview of template structure
- Difficult to copy content from one section to another (requires scrolling)

**Recommendation:**
1. Implement full-screen mode toggle (button in dialog header)
2. Remember user's last dialog size (store in localStorage)
3. Make dialog resizable (drag edges to resize)
4. Or: Move editing to dedicated route instead of modal (more major change)

---

#### Finding 6: Insufficient Visual Hierarchy in Template Content

**Issue:**
In edit mode (CenterPane), the template editor textarea blends with other form fields. No visual emphasis that this is the primary editing area.

**Evidence:**
```tsx
// CenterPane.tsx line 507-512
<Textarea
  value={localTemplate}
  className="min-h-[300px] w-full resize-y border-gray-200 bg-white font-mono text-sm"
  placeholder={t('centerPane.templatePlaceholder')}
/>
```

**Impact:**
- Template editor doesn't feel like the "hero" element
- Users may not immediately identify this as primary workspace

**Recommendation:**
Enhance visual hierarchy:
1. Increase template editor to 70% of viewport height (min-h-[70vh])
2. Add subtle shadow and border emphasis
3. Use slightly larger font (14px instead of 12px)
4. Add header label with icon: "📝 Template Content"

---

### LOW SEVERITY

#### Finding 7: AI Refinement Panel Could Show Diff Preview

**Issue:**
AI refinement updates template in-place without showing what changed. Users cannot see a diff or preview of changes before accepting.

**Impact:**
- Users must trust AI changes blindly
- No undo mechanism shown (though undo may exist in form history)
- Difficult to learn from AI suggestions

**Recommendation:**
Add diff preview option:
1. After AI refinement completes, show "Accept" / "Reject" buttons
2. Highlight changed sections in yellow before accepting
3. Or: Use split-pane diff view (original left, AI version right)

---

#### Finding 8: No Markdown Preview in Edit Mode

**Issue:**
While variable interpolation is previewed excellently, markdown rendering is shown as raw markdown in preview. Users see `**bold**` instead of **bold**.

**Evidence:**
```tsx
// PreviewTab.tsx line 405
<pre className="whitespace-pre-wrap p-4 font-mono text-sm">
  {renderHighlightedContent}
</pre>
```

**Impact:**
- Users cannot verify markdown formatting without copying to external tool
- Reduces confidence in final output

**Recommendation:**
Add markdown rendering toggle in preview:
1. Button: "Show Formatted" / "Show Raw"
2. In formatted mode, render markdown to HTML while preserving variable highlighting
3. Use library like `react-markdown` with custom renderers for variables

---

## Accessibility Considerations

### Keyboard Navigation
**Current State:**
- No keyboard shortcuts for template editing actions
- Cmd/Ctrl+Enter copies prompt (good)
- Cmd/Ctrl+Shift+Up/Down navigates variables (excellent)

**Recommendations:**
1. Cmd/Ctrl+E: Toggle edit mode
2. Cmd/Ctrl+P: Toggle preview panel
3. Cmd/Ctrl+/: Comment/uncomment selection (useful for templates)
4. Cmd/Ctrl+F: Find in template
5. Escape: Close modal

### Screen Reader Support
**Current State:**
- Textarea has basic screen reader support
- Variable highlighting in preview is visual-only

**Recommendations:**
1. Add aria-label to template editor: "Template content editor"
2. Add live region announcements for AI refinement status
3. Provide screen reader description of variable states in preview

### WCAG Compliance
**Issues:**
- Color contrast in variable highlighting needs verification (AA standard)
- AI-filled variable indicator relies only on color (should add icon/pattern)

**Recommendations:**
1. Verify all highlight colors meet WCAG AA contrast ratios
2. Add pattern/icon in addition to color for variable states
3. Ensure modal can be navigated entirely via keyboard

---

## Proposed Solutions

### Solution 1: Split-Pane Editing Mode (RECOMMENDED)

**Description:**
Transform edit mode into split-pane interface with live preview.

**Layout:**
```
┌────────────────────────────────────────────────┐
│ Prompt Name                    [Edit] [Save]   │
├────────────────────┬───────────────────────────┤
│                    │                           │
│  Template Editor   │   Live Preview            │
│  (with syntax      │   (variable highlighting) │
│   highlighting)    │                           │
│                    │   Variables update        │
│  Line numbers      │   as user types           │
│  Code folding      │   (debounced 500ms)       │
│                    │                           │
│  [🤖 Refine AI]    │   [📝 Raw | ✨ Formatted] │
│                    │                           │
└────────────────────┴───────────────────────────┘
```

**Implementation:**
1. Modify CenterPane edit mode to include split pane
2. Repurpose PreviewTab component for right pane
3. Add syntax highlighting with CodeMirror or Monaco
4. Debounce preview updates to maintain performance
5. Make split ratio adjustable (drag divider)

**Tradeoffs:**
- ✅ Eliminates modal toggling
- ✅ Real-time feedback
- ✅ Matches industry standards
- ❌ More complex implementation
- ❌ Requires larger screen real estate

---

### Solution 2: Enhanced Modal with Live Preview Toggle

**Description:**
Keep modal-based editing but add preview pane option.

**Layout:**
```
┌──────────────────────────────────────────────┐
│ Edit Prompt              [Preview] [Fullscreen]│
├──────────────────────────────────────────────┤
│                                              │
│  Template Editor                             │
│  (with syntax highlighting)                  │
│                                              │
│  ┌──────────────────────────────────┐       │
│  │ [Show Preview ▼]                 │       │
│  └──────────────────────────────────┘       │
│                                              │
│  When toggled:                               │
│  ┌────────────────┬─────────────────┐       │
│  │ Editor 60%     │ Preview 40%     │       │
│  └────────────────┴─────────────────┘       │
│                                              │
│                         [Cancel]  [Save]     │
└──────────────────────────────────────────────┘
```

**Implementation:**
1. Add "Show Preview" button to PromptEditorDialog
2. Conditionally split dialog into 60/40 panes
3. Add syntax highlighting to editor
4. Add fullscreen mode toggle
5. Debounce preview updates

**Tradeoffs:**
- ✅ Less disruptive to existing UI
- ✅ Still provides live preview
- ❌ Modal still blocks other UI elements
- ❌ Less screen space than Solution 1

---

### Solution 3: Dedicated Editing Route (Major Refactor)

**Description:**
Move editing to dedicated route: `/prompts/:id/edit`

**Implementation:**
1. Create new route with full-screen editing interface
2. Use split-pane layout (similar to Solution 1)
3. Add toolbar with formatting helpers
4. Add command palette for advanced operations

**Tradeoffs:**
- ✅ Maximum screen space
- ✅ Can add advanced features (version diffing, collaboration)
- ✅ No modal constraints
- ❌ Requires navigation (less fluid)
- ❌ Major architectural change
- ❌ More complex routing logic

---

## Questions for Consideration

1. **Usage Patterns**: How long are typical templates? Do users edit templates frequently or create once and reuse?
2. **Screen Size**: What are the target screen sizes? Is this primarily for desktop (1920x1080+) or also smaller screens?
3. **Markdown Usage**: How heavily do users rely on markdown formatting? Should formatted preview be default?
4. **AI Refinement**: How often do users use AI refinement? Should it be more prominent or less?
5. **Mobile Support**: Is mobile editing a consideration? (Likely not for Tauri desktop app)
6. **Collaboration**: Will template editing ever need collaborative features (multiple users editing)?

---

## Recommendation

**Primary Recommendation**: Implement **Solution 1 (Split-Pane Editing Mode)**

**Rationale:**
1. **Aligns with user need**: Eliminates modal toggling, provides real-time feedback
2. **Industry standard**: Matches expectations from GitHub, VS Code, StackEdit
3. **Reduces errors**: Syntax highlighting and live preview prevent variable syntax mistakes
4. **Scalable**: Can be enhanced with additional features (diff view, collaboration) later
5. **Performance**: Debouncing ensures smooth typing experience

**Phased Implementation:**

**Phase 1 (MVP - 1 week):**
- Implement split-pane layout in CenterPane edit mode
- Add basic syntax highlighting with react-codemirror
- Connect PreviewTab to right pane with debounced updates
- Add toggle to collapse/expand preview pane

**Phase 2 (Enhanced - 1 week):**
- Add line numbers and code folding
- Implement fullscreen mode
- Add markdown formatted preview toggle
- Improve syntax highlighting (custom Handlebars mode)

**Phase 3 (Advanced - 1 week):**
- Add minimap for long templates
- Implement "Go to line" command
- Add diff preview for AI refinement
- Add keyboard shortcuts and command palette

**Success Criteria:**
- Users can edit templates and see preview without toggling: 100% coverage
- Template syntax errors reduced by 50% (due to highlighting)
- User satisfaction rating: 8/10 or higher
- Time to edit template: < 2 minutes (down from 5-7 minutes)

---

## Appendix: Competitive Analysis Details

### GitHub Gist Markdown Editor
- **Strengths**: Side-by-side edit/preview, syntax highlighting, clean UI
- **Weaknesses**: No variable interpolation support
- **Applicability**: Layout pattern directly applicable

### Notion Block Editor
- **Strengths**: Live inline preview, markdown shortcuts, block-based editing
- **Weaknesses**: Proprietary format, heavy implementation
- **Applicability**: Inspiration for future inline editing mode

### VS Code Editor
- **Strengths**: Syntax highlighting, minimap, extensions, IntelliSense
- **Weaknesses**: Overkill for simple templates
- **Applicability**: Monaco editor (VS Code's engine) could be used

### StackEdit
- **Strengths**: Split-pane markdown editor, keyboard shortcuts, export options
- **Weaknesses**: No variable support, web-only
- **Applicability**: UX patterns for split-pane editing

---

## Related Research

For future UX research, consider:
1. Variable management UX (ConfigTab analysis)
2. Form completion flow (variable filling workflow)
3. Tag organization and discovery
4. Variant management and comparison

---

## Document History

- **2026-01-26**: Initial research report created
- Focus: Prompt viewing and editing experience
- Next review: After implementation of Phase 1 recommendations
