# Incito Design Principles

These principles guide UX decisions for the Incito desktop application.

## Core Principles

### 1. Speed Without Sacrifice
**What it means:** Optimize for power user efficiency without compromising discoverability for new users.

**How we apply it:**
- Provide keyboard shortcuts for all actions, but also clear UI buttons
- Show progressive disclosure: simple by default, powerful when needed
- Minimize clicks to common tasks (copy, launch, create)
- Intelligent defaults reduce configuration burden

**Example:**
- ✅ Copy prompt: Button visible AND Cmd+Enter shortcut
- ❌ Hidden feature only accessible via obscure shortcut

### 2. Template-First, Variables-Second
**What it means:** The template content is the star; variables are the supporting cast.

**How we apply it:**
- Large, readable template preview takes center stage
- Variables in sidebar or below, not center pane in edit mode
- Preview shows final output, not abstract placeholders
- Template editing uses familiar markdown patterns

**Example:**
- ✅ Full-screen preview with inline variable highlighting
- ❌ Form-first UI where template is buried

### 3. Fail Gracefully, Guide Kindly
**What it means:** Errors happen; our job is to prevent them and help recovery.

**How we apply it:**
- Validate early and often (real-time feedback)
- Confirmation dialogs for destructive actions
- Clear, helpful error messages (not technical jargon)
- Undo/redo for editing operations
- Auto-save to prevent data loss

**Example:**
- ✅ "Fill all required fields to continue" tooltip on disabled button
- ❌ Button just disabled with no explanation

### 4. Consistency Creates Confidence
**What it means:** Users should never wonder "will this work the same way?"

**How we apply it:**
- Use design system components (shadcn/ui) consistently
- Same interaction patterns across features (context menus, dialogs)
- Predictable keyboard shortcuts (Cmd+S saves, Cmd+N creates)
- Consistent terminology (don't switch between "template" and "prompt")

**Example:**
- ✅ All destructive actions require confirmation dialog
- ❌ Some deletes confirm, others don't

### 5. Accessible by Default
**What it means:** Inclusive design is not optional; it's foundational.

**How we apply it:**
- All features keyboard-accessible
- ARIA labels on all interactive elements
- High color contrast (WCAG AA minimum)
- Focus indicators always visible
- Screen reader compatible

**Example:**
- ✅ Icon buttons have aria-label="Settings"
- ❌ Icon-only button with no accessible name

### 6. Learn by Doing, Not Reading
**What it means:** Users should learn through interaction, not documentation.

**How we apply it:**
- Contextual help (tooltips, inline hints)
- Smart defaults that "just work"
- Sample prompts to explore
- Progressive onboarding (first-run tips)
- Error messages that teach

**Example:**
- ✅ Variable placeholder shows "Enter topic..." to guide input
- ❌ Empty input with no hint

## Feature Design Guidelines

### Navigation
- **Rule:** Users should always know where they are and how to get elsewhere
- **Implementation:** Clear active states, breadcrumbs, visible tabs

### Forms & Input
- **Rule:** Forms should feel like conversations, not interrogations
- **Implementation:** Logical field order, helpful placeholders, inline validation

### Actions & Feedback
- **Rule:** Every action gets immediate, understandable feedback
- **Implementation:** Toast notifications, button state changes, loading indicators

### Empty States
- **Rule:** Empty is an opportunity, not a dead end
- **Implementation:** Helpful prompts, clear CTAs, examples or samples

### Errors & Validation
- **Rule:** Errors are learning opportunities, not failures
- **Implementation:** Specific messages, suggested fixes, prevent when possible

## When Principles Conflict

Sometimes principles compete. Here's how to prioritize:

**Speed vs. Discoverability:**
- Favor discoverability for new users, add speed shortcuts for power users
- Progressive disclosure: show simple path, reveal advanced options on demand

**Consistency vs. Innovation:**
- Stay consistent within Incito (most important)
- Break external conventions only if significantly better
- Clearly signal when breaking expectations

**Accessibility vs. Aesthetics:**
- Always choose accessibility
- Challenge: make accessible design beautiful (not "accessible enough")

**Prevention vs. Flexibility:**
- Prevent destructive mistakes (delete, overwrite)
- Allow flexibility for intentional actions
- Use confirmation dialogs, not blocking

## Design Decision Framework

When making UX decisions, ask:

1. **Does this align with our principles?**
2. **Does this serve the user's job-to-be-done?**
3. **Is this accessible to all users?**
4. **Is this consistent with existing patterns?**
5. **Will users discover this easily?**
6. **Can this fail? How do we handle it gracefully?**

If you answer "no" to any of these, reconsider the approach.

## Evolution of Principles

These principles are living guidelines, not rigid rules. As Incito grows and we learn more about our users, we'll refine them.

**How to propose changes:**
1. Document current principle and why it's limiting
2. Propose new or modified principle with rationale
3. Show examples of how it would change design decisions
4. Discuss with team and update this document
