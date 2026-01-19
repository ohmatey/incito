# Jobs-to-be-Done (JTBD)

This document tracks the jobs users are hiring Incito to do.

## Primary JTBD

### Job: Fast, Consistent AI Prompt Execution

**Job Statement:**
> When I need to interact with AI systems repeatedly with similar prompts but varying parameters, I want a fast way to fill in variables and launch my prompt, so that I can be more productive and maintain consistency across my AI interactions.

**Context:**
- **When:** Throughout the work day, multiple times per session
- **Trigger:** Need to query AI with a familiar pattern (e.g., "analyze this code", "summarize this article", "draft this email")
- **Outcome:** Prompt sent to AI system quickly without retyping or searching for previous examples

**Functional Needs:**
- Store reusable prompt templates
- Define variables for customization
- Fill variables quickly with forms
- Copy or launch prompt in one action
- Support multiple AI platforms

**Emotional Needs:**
- Feel in control of AI interactions
- Confidence in prompt quality
- Satisfaction from efficiency gains
- No anxiety about losing good prompts

**Social Needs:**
- Appear professional/competent in AI-generated outputs
- Share prompts with team (future need)

**Current UX Support:** 8/10 - Core workflow well-supported, minor friction in discovery and onboarding

---

## Secondary JTBDs

### Job: Iterate and Improve Prompts Over Time

**Job Statement:**
> When I discover a better way to phrase a prompt, I want to save and compare versions, so that I can continuously improve my AI results without losing what worked before.

**Current UX Support:** 7/10 - Version history works well, but no diff view or annotations

**Functional Needs:**
- Save prompt versions automatically
- Restore previous versions
- Compare versions side-by-side (NOT YET SUPPORTED)
- Annotate why a version was created (NOT YET SUPPORTED)

---

### Job: Organize Prompts by Use Case

**Job Statement:**
> When I have dozens of prompts for different purposes, I want to find the right one quickly, so that I don't waste time searching or recreating prompts I've already built.

**Current UX Support:** 6/10 - Tags and pinning help, but search and filtering could be stronger

**Functional Needs:**
- Tag prompts by category
- Pin frequently-used prompts
- Search across prompts
- Filter by tags or other criteria

---

### Job: Experiment with Prompt Variations

**Job Statement:**
> When I have a working prompt, I want to create variations for different tones, lengths, or audiences, so that I can optimize for specific contexts without losing the original.

**Current UX Support:** 9/10 - Variant system is excellent, but discoverability is low

**Functional Needs:**
- Create variants from existing prompts
- Switch between variants easily
- Compare variant outputs (PARTIAL - can view, not side-by-side)

---

### Job: Maintain Context About Prompts

**Job Statement:**
> When I return to a prompt after weeks or months, I want to remember why I created it and how to use it best, so that I don't have to re-learn or guess.

**Current UX Support:** 5/10 - Notes exist but basic, no usage analytics or examples

**Functional Needs:**
- Add notes to prompts
- See when prompt was last used (NOT YET SUPPORTED)
- Track which variables work best (NOT YET SUPPORTED)
- Store example outputs (NOT YET SUPPORTED)

---

## Jobs We Don't Serve (Yet)

### Job: Collaborate on Prompts with Team

**Job Statement:**
> When working with a team, I want to share prompts and see their updates, so that we maintain consistency and don't duplicate work.

**Why not yet:**
- Desktop-only app with local file storage
- No sync or collaboration features
- Future opportunity

**Potential Solutions:**
- Git-based workflow (prompts are markdown files)
- Cloud sync service integration
- Built-in sharing/export features

---

### Job: Analyze Prompt Effectiveness

**Job Statement:**
> When using multiple prompts, I want to see which ones generate the best results, so that I can focus on what works and improve what doesn't.

**Why not yet:**
- No analytics or tracking
- No integration with AI platforms to measure outcomes
- Complex to implement

**Potential Solutions:**
- Track copy/launch frequency
- Manual rating system
- AI platform integrations for result quality

---

## How We Discover JTBDs

**User Research:**
- Interviews with target users (future)
- Usage analytics (when available)
- Feature requests and feedback

**Observation:**
- How users actually use the product
- Which features get ignored vs. loved
- Where users get stuck or frustrated

**Inference:**
- Code review shows intended use cases
- Competitive analysis reveals market jobs
- Domain expertise in prompt engineering

---

## Evolution

As Incito matures, we'll refine these JTBDs based on:

1. **User feedback** - What jobs are they actually hiring it for?
2. **Usage patterns** - What do they do most often?
3. **Feature requests** - What jobs are we not serving?
4. **Market changes** - How is the AI landscape evolving?

Last updated: 2026-01-19
