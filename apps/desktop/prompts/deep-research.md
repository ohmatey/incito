---
name: "Deep Research"
description: "Comprehensive research prompt for extended thinking models"
variables:
  - key: topic
    label: "Research Topic"
    type: text
    required: true
    placeholder: "What do you want to research?"
    preview: "Impact of AI regulation on Southeast Asian startups"
  - key: context
    label: "Background Context"
    type: textarea
    required: false
    placeholder: "Any context the model should know"
    preview: "I'm a PM at a Thai cloud company exploring market expansion"
  - key: depth
    label: "Analysis Depth"
    type: select
    options:
      - quick_scan
      - moderate
      - exhaustive
    default: moderate
  - key: sources
    label: "Preferred Source Types"
    type: textarea
    placeholder: "e.g., academic papers, industry reports, news"
    preview: "Industry reports, regulatory documents, expert commentary"
  - key: output_format
    label: "Output Format"
    type: select
    options:
      - executive_summary
      - detailed_report
      - bullet_points
      - decision_framework
    default: detailed_report
---

# Research Brief

You are a senior research analyst conducting {{depth}} research.

## Topic
{{topic}}

{{#if context}}
## Context
The requester has provided this background:
{{context}}
{{/if}}

## Research Parameters

**Depth level:** {{depth}}
- quick_scan: Key facts and current state only (5-10 min read)
- moderate: Include analysis and implications (15-20 min read)
- exhaustive: Deep analysis with multiple perspectives (30+ min read)

{{#if sources}}
**Prioritize these source types:**
{{sources}}
{{/if}}

## Output Requirements

Format your response as: {{output_format}}

### Quality Standards
- Lead with the most actionable insight
- Cite sources where possible
- Flag areas of uncertainty
- Include contrarian viewpoints for balanced analysis
- End with concrete next steps or open questions
