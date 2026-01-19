# User Workflows

This document maps the key user workflows in Incito, identifying friction points and opportunities for improvement.

---

## Primary Workflows

### Workflow 1: First-Time Setup (Onboarding)

**Goal:** Get from "just installed" to "successfully using first prompt"

**Current Steps:**

1. Launch Incito
2. See "Select Prompts Folder" screen
3. Click "Select Folder" button
4. Navigate file picker to folder
5. Select folder
6. App loads prompts (if any exist)
7. First prompt auto-selected (if prompts exist)
8. ??? (User unsure what to do next)

**Friction Points:**

- ❌ **HIGH**: No explanation of what a "prompts folder" should contain
- ❌ **HIGH**: No guidance if folder is empty
- ❌ **HIGH**: No onboarding tour or help
- ❌ **MEDIUM**: No sample prompts to explore
- ❌ **MEDIUM**: No clear next step after folder selection

**Recommended Improvements:**

1. Add welcome modal explaining key concepts
2. Provide "Create Sample Prompts" option
3. Show guided tooltip tour for first-time users
4. Auto-create sample prompts if folder is empty (with permission)
5. Add "Getting Started" guide link

**Success Metrics:**
- Time to first prompt created (target: < 2 minutes)
- % of users who successfully create first prompt (target: > 80%)
- % of users who return after first session (target: > 60%)

---

### Workflow 2: Use Existing Prompt (Core Happy Path)

**Goal:** Fill variables and copy/launch prompt as fast as possible

**Current Steps:**

1. Select prompt from list (click or keyboard nav)
2. Prompt loads in center pane with variable inputs
3. Fill in required variables (type in text fields, select options, etc.)
4. Watch progress bar fill up (visual feedback)
5. Click "Copy Prompt" or launcher button
6. See "Copied!" confirmation toast
7. Paste into AI platform or auto-launched

**User Experience:**

- ✅ **EXCELLENT**: Fast and straightforward
- ✅ **EXCELLENT**: Clear visual feedback (progress bar, highlights)
- ✅ **EXCELLENT**: Multiple output options (copy, launchers)
- ⚠️ **GOOD**: Could be faster with Cmd+Enter shortcut

**Friction Points:**

- ❌ **MEDIUM**: No keyboard shortcut to copy
- ❌ **MEDIUM**: No indication of launcher behavior (copy+open vs. deep link)
- ❌ **LOW**: Can't see final output before copying (preview shows template with highlights)

**Recommended Improvements:**

1. Add Cmd+Enter to copy/launch
2. Show "Copy & Open ChatGPT" vs. "Open ChatGPT" in tooltips
3. Add optional "plain text" preview toggle
4. Auto-focus first required variable on prompt selection

**Success Metrics:**
- Time from prompt selection to copy (target: < 10 seconds)
- Completion rate (target: > 95%)
- Keyboard shortcut adoption (target: > 40%)

---

### Workflow 3: Create New Prompt

**Goal:** Create a reusable prompt template from scratch

**Current Steps:**

1. Click "+" in prompt list OR press Cmd+N
2. Choose "Blank Template" or "Generate with AI"
3. **If Blank:**
   - Empty prompt created and opened in edit mode
   - Fill in name, description, tags
   - Write template with {{variable}} placeholders
   - Variables auto-detected but not configured yet
   - Click "Save"
   - Switch to view mode
   - Configure variables in Instructions tab
   - Save again
4. **If AI:**
   - Describe desired prompt in dialog
   - Wait for AI generation
   - Review generated prompt (opens in view mode)
   - Optionally edit to refine

**User Experience:**

- ✅ **GOOD**: Two creation paths (blank vs. AI) serve different needs
- ✅ **GOOD**: Auto-detection of variables reduces manual work
- ⚠️ **CONFUSING**: Variables auto-created but need configuration later
- ⚠️ **CONFUSING**: Edit mode → Save → View mode → Instructions tab → Save again (two-step process)

**Friction Points:**

- ❌ **HIGH**: Variable configuration workflow unclear (edit template, then configure separately)
- ❌ **HIGH**: No guidance on template format for new users
- ❌ **MEDIUM**: Can't configure variables while writing template
- ❌ **MEDIUM**: AI generation requires separate settings configuration
- ❌ **LOW**: No templates or examples to start from

**Recommended Improvements:**

1. Show inline variable configuration in edit mode (Instructions tab available while editing)
2. Add template examples/snippets
3. Show variable syntax help in template editor
4. Streamline AI prompt creation flow
5. Add "Create from Example" option

**Success Metrics:**
- Time to create first prompt (target: < 3 minutes for blank, < 1 minute for AI)
- Completion rate (target: > 70%)
- % using AI vs. blank (track to understand preference)

---

### Workflow 4: Edit Existing Prompt

**Goal:** Update a prompt template or variable configuration

**Current Steps:**

1. Select prompt
2. Click "Edit" button (top right)
3. Edit mode activates (center pane changes to edit form)
4. Instructions tab becomes available in right panel
5. Make changes:
   - Update name, description, tags (center pane)
   - Update template (center pane textarea)
   - Configure variables (Instructions tab in right panel)
6. Click "Save" (top right)
7. Edit mode exits, returns to view mode
8. OR click "Cancel" to discard changes

**User Experience:**

- ✅ **CLEAR**: Edit/Save/Cancel buttons make mode obvious
- ✅ **GOOD**: Changes tracked, Save button enabled only when changes exist
- ⚠️ **CONFUSING**: Split between center pane and right panel
- ⚠️ **DANGEROUS**: No confirmation on Cancel if unsaved changes

**Friction Points:**

- ❌ **CRITICAL**: No unsaved changes warning on Cancel
- ❌ **CRITICAL**: No unsaved changes warning when switching prompts
- ❌ **HIGH**: Edit mode not visually distinct (easy to forget you're editing)
- ❌ **HIGH**: No undo/redo
- ❌ **MEDIUM**: Template editor lacks syntax highlighting
- ❌ **MEDIUM**: Variable sync happens on save (not real-time during editing)

**Recommended Improvements:**

1. Add confirmation dialog: "Discard unsaved changes?" on Cancel
2. Add confirmation when switching prompts with unsaved changes
3. Add visual indicator of edit mode (background tint or banner)
4. Implement undo/redo (Cmd+Z)
5. Add template syntax highlighting
6. Show live variable detection while typing

**Success Metrics:**
- Edit success rate (saved vs. canceled) (target: > 80% saved)
- Accidental data loss incidents (target: 0 per month)
- Time to complete edit (target: < 2 minutes)

---

### Workflow 5: Organize and Find Prompts

**Goal:** Locate the right prompt quickly among many

**Current Steps:**

**Option A: Browse in List**
1. Scroll through prompt list
2. Look for name or warning icon
3. Click to select

**Option B: Search**
1. Press Cmd+K to open search view
2. Type search query
3. Results filter in real-time
4. Click result to select

**Option C: Filter by Tag**
1. Navigate to Tags page
2. Browse or search tags
3. Click tag to see prompts with that tag

**User Experience:**

- ✅ **GOOD**: Multiple ways to find prompts (browse, search, tags)
- ✅ **GOOD**: Search is fast and accessible (Cmd+K)
- ⚠️ **OKAY**: Browsing works but no inline filter
- ⚠️ **OKAY**: Tags view requires navigating away from prompts

**Friction Points:**

- ❌ **MEDIUM**: No inline search in prompt list (must use search page)
- ❌ **MEDIUM**: No tag badges visible in prompt list
- ❌ **MEDIUM**: Pinned prompts not visually distinct enough
- ❌ **LOW**: No recent/frequent prompts section

**Recommended Improvements:**

1. Add inline search/filter in prompt list header
2. Show tag badges in prompt list items
3. Make pinned items more visually distinct (always show pin icon)
4. Add "Recent" smart list
5. Add filter dropdown (by tag, validity, etc.)

**Success Metrics:**
- Time to find specific prompt (target: < 5 seconds)
- Search usage vs. browsing (track ratio)
- Pinning adoption rate (target: > 30% of users)

---

### Workflow 6: Experiment with Variants

**Goal:** Create and compare different versions of a prompt

**Current Steps:**

1. Select base prompt
2. Open Preview tab (right panel)
3. Click "+ Variant" button (easy to miss!)
4. Enter variant name (e.g., "Formal")
5. Variant created with same variables, copied template
6. Edit variant template as needed
7. Switch between variants using dropdown in Preview tab
8. Compare by manually switching and reading

**User Experience:**

- ✅ **INNOVATIVE**: Variant system is powerful
- ✅ **CLEVER**: Shares variables between variants
- ⚠️ **HIDDEN**: Feature not discoverable (small button, no explanation)
- ⚠️ **LIMITED**: Can't compare variants side-by-side

**Friction Points:**

- ❌ **HIGH**: Variant creation button not discoverable
- ❌ **HIGH**: No explanation of what variants are
- ❌ **MEDIUM**: Variants not visible in prompt list
- ❌ **MEDIUM**: Can't see all variants at once
- ❌ **LOW**: Variant naming convention unclear

**Recommended Improvements:**

1. Add "What are variants?" tooltip or help link
2. Show variant count badge in prompt list
3. Add variant icon in prompt list for items with variants
4. Add side-by-side variant comparison view
5. Improve variant naming guidance

**Success Metrics:**
- Variant feature discovery rate (target: > 50% of users)
- Variants created per user (target: > 2)
- Variant usage rate (% prompts with variants) (target: > 15%)

---

### Workflow 7: Track Changes with History

**Goal:** Review and restore previous versions of a prompt

**Current Steps:**

1. Select prompt
2. Open History tab (right panel)
3. Scroll through version list (newest first)
4. Click version to preview (shows in modal or panel)
5. Click "Restore" to revert
6. Confirmation required
7. Prompt restored, new version created

**User Experience:**

- ✅ **RELIABLE**: Automatic version tracking
- ✅ **SIMPLE**: One-click restore
- ⚠️ **LIMITED**: No diff view to see what changed
- ⚠️ **LIMITED**: No version descriptions/labels

**Friction Points:**

- ❌ **MEDIUM**: Can't see what changed between versions
- ❌ **MEDIUM**: No labels or notes on versions
- ❌ **LOW**: Can't delete old versions
- ❌ **LOW**: No export of version history

**Recommended Improvements:**

1. Add diff view showing changes
2. Allow adding description when saving version
3. Add "Compare with current" view
4. Allow deleting old versions (with confirmation)

**Success Metrics:**
- Version restore usage (target: > 10% of users restore at least once)
- Average versions per prompt (track for health)

---

## Secondary Workflows

### Add Notes to Prompt

**Steps:**
1. Select prompt → Notes tab → Click "+" → Type note → Click "Add"

**Friction:** Notes not editable (must delete + re-add), no markdown support

### Configure Default Launchers

**Steps:**
1. Select prompt → Config tab → Select launchers → Auto-saves

**Experience:** Simple and clear, works well

### Pin/Unpin Prompts

**Steps:**
1. Right-click prompt → "Pin" OR hover → click pin icon

**Friction:** Pin icon only visible on hover, pinned items not visually distinct

---

## Journey Maps

### New User Journey (First Hour)

**Goal:** Go from installation to productive use

**Phases:**

1. **Discovery** (0-5 min)
   - Downloads and installs Incito
   - Launches app
   - Sees folder selection screen
   - ❓ *Confusion: What folder? What should be in it?*

2. **Setup** (5-15 min)
   - Selects or creates folder
   - Sees empty state or sample prompts
   - ❓ *Confusion: Now what?*
   - Clicks "+" to create first prompt
   - ❓ *Confusion: How do I format this?*

3. **Learning** (15-30 min)
   - Creates first prompt (trial and error)
   - Figures out {{variable}} syntax
   - Tries using prompt with variables
   - ✅ *Success: Copies and pastes into AI*

4. **Adoption** (30-60 min)
   - Creates 2-3 more prompts
   - Discovers tags and organization
   - Starts building library
   - ✅ *Delight: "This is going to save me so much time!"*

**Emotion Curve:**
- Installation: Hopeful (+)
- Folder selection: Confused (-)
- Empty state: Lost (--)
- First prompt created: Accomplished (+)
- First successful use: Excited (++)
- Building library: Confident (++)

**Critical Intervention Points:**
- Folder selection (needs explanation)
- Empty state (needs guidance + samples)
- First prompt creation (needs templates + help)

---

### Power User Journey (Daily Use)

**Goal:** Execute 10-20 prompts efficiently throughout day

**Phases:**

1. **Launch** (0-1 min)
   - Cmd+Tab to Incito (or launch if not running)
   - Familiar interface loads

2. **Select** (1-2 min)
   - Recent or pinned prompts visible
   - OR Cmd+K to search
   - Prompt loads instantly

3. **Fill** (2-4 min)
   - Variables auto-focused
   - Tab through fields
   - Keyboard-first interaction

4. **Execute** (4-5 min)
   - Cmd+Enter to copy (or click launcher)
   - Toast confirms success
   - Switches to AI platform

5. **Repeat** (throughout day)
   - Back to Incito for next prompt
   - Smooth, fast, habitual

**Emotion Curve:**
- Consistent positive (+)
- Occasional delight when discovering shortcuts (++)
- Frustration if keyboard shortcut missing (-)

**Success Factors:**
- Keyboard shortcuts everywhere
- Fast performance (no lag)
- Predictable behavior
- Muscle memory builds over time

---

## Workflow Optimization Opportunities

### Quick Wins

1. **Add keyboard shortcut for copy** (Cmd+Enter) - HIGH IMPACT
2. **Show tooltips on launcher buttons** - MEDIUM IMPACT
3. **Add confirmation on unsaved changes** - HIGH IMPACT (prevents data loss)
4. **Auto-focus first variable on prompt selection** - MEDIUM IMPACT

### Medium Effort

5. **Add command palette** (Cmd+P) - HIGH IMPACT for power users
6. **Inline search in prompt list** - MEDIUM IMPACT
7. **Visual edit mode indicator** - MEDIUM IMPACT
8. **Onboarding tour for first-time users** - HIGH IMPACT for adoption

### Large Effort

9. **Side-by-side variant comparison** - HIGH IMPACT for variant adoption
10. **Diff view in version history** - MEDIUM IMPACT
11. **Template syntax highlighting** - LOW IMPACT (nice to have)
12. **Undo/redo system** - HIGH IMPACT for confidence

---

Last updated: 2026-01-19
