# JTBD Completeness Review: Non-Technical Users

**Date:** 2026-02-04
**Scope:** Evaluating Incito's completeness for non-technical users doing basic prompt engineering
**Reviewer:** UX Analysis

---

## Executive Summary

**Overall Assessment: 4/10 for Non-Technical Users**

Incito is a powerful prompt engineering platform designed primarily for technical power users. While it excels at serving developers and tech-savvy professionals, it presents significant barriers for non-technical users who want to do basic prompt engineering.

**Key Finding:** The product explicitly positions casual users as an "anti-persona" (see `/docs/ux/personas.md`), which explains why non-technical users are underserved. However, there is a market opportunity to expand the audience with targeted improvements.

---

## Defining "Non-Technical Users Doing Basic Prompt Engineering"

### Who Are They?

Non-technical users interested in basic prompt engineering include:

- **Marketing professionals** who want consistent AI-generated copy
- **Small business owners** who use ChatGPT/Claude for customer service templates
- **Educators** creating AI-assisted lesson plans
- **Writers** developing structured prompts for creative workflows
- **HR professionals** standardizing interview questions and job descriptions
- **Consultants** creating reusable client communication templates

### What Is "Basic Prompt Engineering"?

For non-technical users, basic prompt engineering means:

1. **Saving prompts** they've crafted through trial and error
2. **Reusing prompts** with slight variations (names, topics, etc.)
3. **Organizing prompts** by project or use case
4. **Sharing prompts** with colleagues
5. **Improving prompts** over time based on results

They do NOT need:
- Advanced variable types (sliders, arrays, images)
- YAML frontmatter editing
- Conditional logic (`{{#if}}`)
- Graders, playbooks, or evaluation systems
- Multi-provider comparison
- MCP integration

---

## Jobs-to-be-Done Analysis for Non-Technical Users

### Job 1: Save Prompts I've Already Crafted

**Job Statement:**
> When I find a prompt that works well in ChatGPT/Claude, I want to save it somewhere organized, so I can use it again without rewriting it.

**Current Support: 2/10**

**Barriers:**
- User must create a markdown file manually
- Must understand YAML frontmatter format
- No "Save from clipboard" or "Import prompt" feature
- No browser extension to capture prompts from ChatGPT/Claude
- No examples or templates to learn from

**What Non-Technical Users Need:**
- "Paste a prompt" input field (no file creation needed)
- AI auto-detection of variables ("We found potential variables: {topic}, {audience}")
- Zero-knowledge-required onboarding
- Built-in template library with examples

**Evidence from Code:**
```
FolderSelect.tsx explains: "A prompts folder is any directory containing .md files"
```
This assumes users know what directories and .md files are.

---

### Job 2: Reuse Prompts with Different Inputs

**Job Statement:**
> When I have a working prompt template, I want to quickly swap out the changing parts (names, topics, etc.), so I can use the same structure repeatedly.

**Current Support: 6/10**

**Strengths:**
- Variable form inputs work well once set up
- AI fill feature reduces manual typing
- Copy to clipboard is one-click

**Barriers:**
- Setting up variables requires markdown syntax knowledge (`{{variable}}`)
- YAML frontmatter for variable configuration is developer-oriented
- No visual variable creation (drag-and-drop or highlight-to-create)
- Error messages assume technical knowledge ("Frontmatter parse error")

**What Non-Technical Users Need:**
- Highlight text and click "Make this a variable"
- Plain English configuration ("Is this required? What's the default?")
- No code exposure for basic use cases

---

### Job 3: Organize Prompts by Project

**Job Statement:**
> When I have prompts for different projects (marketing, sales, support), I want to keep them organized, so I can find them quickly.

**Current Support: 5/10**

**Strengths:**
- Tags system exists and works
- Pinned prompts for favorites
- Search functionality

**Barriers:**
- Folder-based model assumes file system literacy
- No guided organization (suggested categories, auto-tagging)
- Tags must be manually created and applied
- No visual folder/project view (like Google Drive)

**What Non-Technical Users Need:**
- "Collections" or "Projects" concept (more intuitive than folders)
- AI-suggested tags based on prompt content
- Visual drag-and-drop organization

---

### Job 4: Improve Prompts Over Time

**Job Statement:**
> When a prompt doesn't work well, I want to easily tweak it and remember what I changed, so I can find the best version.

**Current Support: 7/10**

**Strengths:**
- Version history exists and works well
- AI refinement feature ("make it more professional")
- Variants for A/B testing different versions

**Barriers:**
- No clear guidance on what makes a good prompt
- No plain-English tips during editing
- Variant feature is hidden/not discoverable
- No comparison view (old vs. new version side-by-side)

**What Non-Technical Users Need:**
- "Improve this prompt" suggestions (like grammar checkers)
- Plain English prompt quality indicators
- Easy comparison of versions

---

### Job 5: Understand How the App Works

**Job Statement:**
> When I first open the app, I want to understand how to use it quickly, so I don't feel overwhelmed or give up.

**Current Support: 3/10**

**Critical Barriers:**

1. **Immediate technical barrier:** First screen asks to "Select a folder" with no guidance
2. **No sample prompts:** User starts with empty state, no examples
3. **Technical language throughout:**
   - "YAML frontmatter"
   - "Markdown files"
   - "{{variable}} syntax"
   - "Interpolation"
   - "Frontmatter parse error"
4. **No interactive tutorial or tour**
5. **No video walkthrough or onboarding**
6. **Help links lead to technical documentation**

**Evidence from Code (prompts.json):**
```json
"folderExplanation": "A prompts folder is any directory containing"
"mdFiles": "(Markdown) files. Each file represents a reusable prompt template."
"feature1": "Store prompts as Markdown files with YAML frontmatter"
```

This language alienates non-technical users immediately.

**What Non-Technical Users Need:**
- "Get Started" wizard with pre-built templates
- Plain English everywhere ("Save your favorite prompts" not "YAML frontmatter")
- Interactive walkthrough on first launch
- 2-minute video tutorial embedded in app

---

## Feature Complexity Assessment

### Features Appropriate for Non-Technical Users

| Feature | Complexity | Verdict |
|---------|------------|---------|
| Variable form inputs | Low | Keep - intuitive |
| Copy to clipboard | Low | Keep - essential |
| Tags | Medium | Keep - but simplify creation |
| Notes | Low | Keep - familiar pattern |
| AI fill | Medium | Keep - very helpful |
| Search | Low | Keep - essential |
| Dark mode | Low | Keep - standard |

### Features Too Complex for Non-Technical Users

| Feature | Complexity | Verdict |
|---------|------------|---------|
| YAML frontmatter editing | High | Hide - visual editor instead |
| Conditional syntax (`{{#if}}`) | High | Hide - advanced feature |
| Array variables | High | Hide - rarely needed |
| Image variables | High | Hide - niche use case |
| Graders | Very High | Hide - developer tool |
| Playbooks | Very High | Hide - developer tool |
| MCP integration | Very High | Hide - developer tool |
| Run mode | High | Hide - complex workflow |
| Agents | High | Hide - advanced feature |

---

## Competitive Analysis

### What Non-Technical Users Use Today

1. **Notes apps (Apple Notes, Notion, Evernote)**
   - Pros: Familiar, simple, already installed
   - Cons: No variable substitution, no AI integration

2. **Text expansion tools (TextExpander, Espanso)**
   - Pros: Simple snippets, variables work
   - Cons: Not prompt-specific, no organization

3. **ChatGPT/Claude directly**
   - Pros: No setup required
   - Cons: Prompts lost in chat history

4. **Browser bookmarks/folders**
   - Pros: Zero learning curve
   - Cons: Can't modify prompts dynamically

### Why Non-Technical Users Might Choose Incito

**They wouldn't currently.** The technical barriers are too high.

To attract non-technical users, Incito would need:
1. A "Simple Mode" that hides technical features
2. A web version (no download required)
3. Pre-built template library (50+ ready-to-use prompts)
4. Visual prompt builder (no code)

---

## Recommendations

### Tier 1: Quick Wins (1-2 weeks)

These changes would immediately improve non-technical user experience:

1. **Plain English UI Copy**
   - Replace "Markdown files with YAML frontmatter" with "Prompt templates"
   - Replace "{{variable}} syntax" with "Fill-in-the-blank fields"
   - Replace "Frontmatter parse error" with "We couldn't read this file"
   - Replace "Interpolation" with "Template with your values"

2. **Sample Prompts on First Launch**
   - Create 5-10 high-quality example prompts
   - "Get Started with Examples" button on FolderSelect
   - Categories: Writing, Marketing, Email, Analysis, Creative

3. **Better Empty State**
   - "Start with a template" button (not just "Create blank")
   - Template picker with categories
   - "Paste a prompt you love" option

4. **Contextual Help Tooltips**
   - "What's a variable?" tooltip on variable input
   - "How do I add variables?" link in editor
   - Non-technical explanations throughout

### Tier 2: Significant Improvements (1-2 months)

5. **Visual Variable Creator**
   - Highlight text in template → "Make this a variable"
   - Guided dialog: "What should this field be called?"
   - No markdown syntax exposure

6. **Simple Mode Toggle**
   - Settings option: "Simple Mode"
   - Hides: Graders, Playbooks, Run Mode, MCP, Agents
   - Shows: Core prompt management only
   - Different terminology and simpler UI

7. **Interactive Onboarding Tour**
   - 3-5 step overlay on first launch
   - Uses sample prompts to demonstrate features
   - Can be replayed from Help menu

8. **Template Library**
   - 50+ curated templates by category
   - "Use this template" one-click import
   - Community-contributed templates (future)

### Tier 3: Strategic Expansion (3-6 months)

9. **Browser Extension**
   - "Save to Incito" from ChatGPT/Claude
   - Auto-detects potential variables
   - Syncs with desktop app

10. **Web Version**
    - Lower barrier to entry (no download)
    - Syncs with desktop app
    - Simple subset of features

11. **AI-Powered Onboarding**
    - "Describe what you use AI for" → auto-generates starter prompts
    - "Import your ChatGPT history" → suggests prompts to save
    - Personalized template recommendations

---

## Updated Persona Recommendation

### New Tertiary Persona: "The Practical Prompter"

**Name:** Maya Rodriguez
**Age:** 35-50
**Role:** Marketing Manager / Small Business Owner / Consultant
**Tech Savvy:** Low (uses apps, doesn't understand code)
**AI Experience:** Beginner-Intermediate (uses ChatGPT weekly, not daily)

**Background:**
Maya discovered that AI tools save her hours on writing tasks. She's developed 10-15 prompts through trial and error that work really well. Currently, she keeps them in Apple Notes with manual copy-paste. She's frustrated when she loses a good prompt or forgets how she phrased something.

**Goals:**
- Save prompts that work
- Quickly fill in the blanks and copy
- Organize by client or project
- Share prompts with team members

**What She Needs:**
- Zero technical knowledge required
- Pre-built templates to start
- Plain English everything
- "It just works" simplicity

**What She Doesn't Need:**
- Markdown, YAML, or any code
- Advanced variable types
- Developer features (graders, MCP, etc.)
- Multi-provider comparison

**Quote:**
> "I'm not a developer - I just want to save my prompts and fill in the blanks. Why is this app asking me about YAML?"

---

## Metrics to Track

If targeting non-technical users, measure:

### Onboarding Success
- **Time to first prompt created:** Target <60 seconds (currently estimated >5 minutes)
- **Sample prompt usage rate:** Target >70% of new users try a sample
- **Onboarding completion rate:** Target >80% (currently no onboarding)

### Retention
- **Day 1 retention:** Target >60%
- **Week 1 retention:** Target >40%
- **Feature adoption:** Track which features non-technical users actually use

### User Feedback
- **NPS score by tech level:** Compare technical vs. non-technical users
- **Support ticket categories:** Track "I don't understand" complaints
- **Feature request themes:** What do non-technical users ask for?

---

## Conclusion

**Incito is not currently designed for non-technical users**, and that's a deliberate product decision (see anti-persona "The Casual AI User" in personas.md).

However, there is a significant market opportunity:

1. **Large addressable market:** Millions of non-technical professionals use ChatGPT/Claude
2. **Unmet need:** No good tool exists for simple prompt management
3. **Low switching cost:** Users aren't locked into competitors
4. **Network effects potential:** Teams want to share prompts

**If Incito wants to serve non-technical users:**

1. Create a "Simple Mode" that hides complexity
2. Rewrite UI copy in plain English
3. Add sample prompts and templates
4. Build visual variable creation
5. Consider a web version for lower friction

**If Incito wants to stay focused on power users:**

That's a valid strategic choice. The current product serves power users well (8/10 per recent UX review). Non-technical users can be explicitly communicated as "not the target audience" to set expectations.

---

## Appendix: Evidence from Codebase

### Technical Language in UI

From `/apps/desktop/src/i18n/locales/en/prompts.json`:

```
"folderExplanation": "A prompts folder is any directory containing"
"mdFiles": "(Markdown) files"
"feature1": "Store prompts as Markdown files with YAML frontmatter"
"feature2Variables": "{{variables}}"
"addVariablesHint": "Add variables using {{name}} syntax in your template"
```

### Anti-Persona Definition

From `/docs/ux/personas.md`:

```markdown
## Anti-Persona: "The Casual AI User"

Mike uses AI sporadically (a few times a week) for one-off tasks. He doesn't need:
- Template management (doesn't reuse prompts)
- Variable systems (each prompt is unique)
- Organization (not enough volume)
- Desktop app (web tools are fine)

Understanding who Incito is NOT for helps us:
- Stay focused on power user needs
- Not over-simplify for beginners
```

### Current JTBD Ratings

From `/docs/ux/jtbd.md`:

| Job | Rating | Notes |
|-----|--------|-------|
| Fast, Consistent AI Prompt Execution | 8/10 | Serves power users well |
| Iterate and Improve Prompts | 7/10 | Version history works |
| Organize Prompts by Use Case | 6/10 | Tags help but complex |
| Experiment with Variations | 9/10 | Variants excellent |
| Maintain Context | 5/10 | Notes basic |

**Note:** These ratings are for technical users. For non-technical users, all ratings would be 2-4 points lower due to setup and learning barriers.

---

**Report Generated:** 2026-02-04
**Recommendation:** Share with product team to inform audience strategy decisions
