# User Personas

This document defines the user personas for Incito, representing different user segments and their needs.

---

## Primary Persona: "The Prompt Engineer"

### Profile

**Name:** Alex Chen
**Age:** 28-35
**Role:** Content Marketer / Developer / Researcher
**Tech Savvy:** High (comfortable with code, markdown, terminal)
**AI Experience:** Advanced (uses AI tools daily, understands prompt engineering)

### Background

Alex works in a fast-paced environment where they interact with AI systems dozens of times per day. They've built up a collection of effective prompts through trial and error, and they're frustrated with:
- Retyping similar prompts repeatedly
- Losing track of what worked before
- Inconsistent results when prompts vary slightly
- No good way to organize and reuse prompts

### Goals

**Primary Goal:**
- Streamline AI interactions to save time and maintain quality

**Secondary Goals:**
- Build a library of proven, reusable prompts
- Experiment with variations to optimize results
- Share prompts with team members
- Never lose a good prompt again

### Pain Points

- **Repetition:** "I type the same prompt structure 20 times a day with different inputs"
- **Lost Knowledge:** "I had a perfect prompt last month but can't remember how I worded it"
- **Inconsistency:** "Slight changes in wording produce wildly different results"
- **Chaos:** "My prompts are scattered across notes, clipboard managers, and text files"

### Behavior Patterns

**Tool Usage:**
- Uses 3-5 AI platforms regularly (ChatGPT, Claude, Gemini, etc.)
- Keyboard-first workflow (loves shortcuts)
- Prefers desktop apps over web tools
- Comfortable with markdown and text files

**Work Style:**
- Creates prompts iteratively (tries, refines, saves best version)
- Experiments with variations (tone, length, format)
- Organizes by project or use case
- Values speed and efficiency

### Needs from Incito

**Must Have:**
- ✅ Fast variable filling and prompt execution
- ✅ Reliable storage and organization
- ✅ Support for multiple AI platforms
- ✅ Keyboard shortcuts for everything

**Should Have:**
- ✅ Version history for iteration
- ✅ Variants for experimentation
- ⚠️ Template sharing/export (not yet available)
- ⚠️ Usage analytics (not yet available)

**Could Have:**
- Cloud sync across devices
- Team collaboration
- AI-powered prompt suggestions
- Results tracking

### Quote

> "I need to be fast and consistent with my AI interactions. I can't waste time retyping prompts or guessing what worked last time. Give me templates, variables, and one-click launch."

---

## Secondary Persona: "The Methodical Researcher"

### Profile

**Name:** Dr. Sarah Patel
**Age:** 35-45
**Role:** Academic Researcher / Data Analyst
**Tech Savvy:** Medium (knows basics, not a developer)
**AI Experience:** Intermediate (uses AI for research, learning best practices)

### Background

Sarah uses AI to help with literature reviews, data analysis, and drafting research summaries. She values thoroughness and reproducibility. She needs to:
- Document her prompts for research methods sections
- Rerun analyses with consistent prompting
- Organize prompts by research project
- Track what worked and why

### Goals

**Primary Goal:**
- Maintain consistent, reproducible AI-assisted research

**Secondary Goals:**
- Document prompt strategies for papers
- Organize prompts by project and topic
- Learn from successful prompts
- Improve over time

### Pain Points

- **Reproducibility:** "How do I ensure my AI analysis is consistent?"
- **Documentation:** "I need to explain my methods, including prompts used"
- **Learning Curve:** "I'm not a prompt engineering expert"
- **Organization:** "I have prompts for 5 different research projects"

### Behavior Patterns

**Tool Usage:**
- Primarily uses ChatGPT and Claude
- Mouse-first workflow (less keyboard shortcuts)
- Prefers guided interfaces
- Values documentation and notes

**Work Style:**
- Careful and deliberate (not rushing)
- Takes notes extensively
- Organizes by project
- Seeks best practices

### Needs from Incito

**Must Have:**
- ✅ Reliable prompt storage
- ✅ Notes and documentation
- ✅ Clear organization (tags, folders)
- ⚠️ Better onboarding and guidance (current gap)

**Should Have:**
- ✅ Version history for tracking changes
- ⚠️ Export for documentation (not yet seamless)
- Examples and templates
- Guided variable creation

**Could Have:**
- Citation-ready export format
- Integration with research tools
- Collaboration with co-authors

### Quote

> "I need to trust that my prompts are reproducible and well-documented. I want to focus on my research, not learning complex tools."

---

## Anti-Persona: "The Casual AI User"

### Profile

**Name:** Mike Johnson
**Age:** 25-65
**Role:** General knowledge worker
**Tech Savvy:** Low to Medium
**AI Experience:** Beginner (uses AI occasionally, not daily)

### Why Not a Target

Mike uses AI sporadically (a few times a week) for one-off tasks. He doesn't need:
- Template management (doesn't reuse prompts)
- Variable systems (each prompt is unique)
- Organization (not enough volume)
- Desktop app (web tools are fine)

### What Mike Needs Instead

- Simple web-based AI interface
- Pre-made prompt templates
- Guided experiences
- No installation or setup

### Why This Matters

Understanding who Incito is NOT for helps us:
- Stay focused on power user needs
- Not over-simplify for beginners
- Design for frequent, complex usage
- Prioritize efficiency over simplicity

---

## Persona Usage Guidelines

### When Making UX Decisions

Ask:
1. **Which persona is this for?** (Primary: Alex, Secondary: Sarah)
2. **What job are they hiring Incito to do?** (See jtbd.md)
3. **What's their context?** (Busy work day, needs speed)
4. **What's their skill level?** (High for Alex, Medium for Sarah)

### Prioritization

When features compete for resources:

1. **Serves Alex (Primary Persona):** HIGH PRIORITY
   - Core workflow optimizations
   - Power user features (shortcuts, bulk ops)
   - Efficiency improvements

2. **Serves both Alex and Sarah:** HIGH PRIORITY
   - Organization and search
   - Documentation and notes
   - Reliability and trust

3. **Serves Sarah (Secondary Persona):** MEDIUM PRIORITY
   - Onboarding and guidance
   - Templates and examples
   - Export and documentation features

4. **Serves neither:** LOW PRIORITY or OUT OF SCOPE
   - Over-simplification
   - One-off use cases
   - Beginner-focused features

### Evolution

Personas evolve as we learn more about our users:

**Update when:**
- User research reveals new insights
- Usage patterns shift
- Market changes (new AI tools, new use cases)
- Feature requests cluster around new needs

**How to update:**
1. Document observed changes in user behavior
2. Validate with user research (interviews, surveys)
3. Update persona profiles
4. Re-evaluate product priorities

Last updated: 2026-01-19
