---
name: "PRD Generator"
description: "Product Requirements Document template with guided sections"
variables:
  - key: product_name
    label: "Product/Feature Name"
    type: text
    required: true
    placeholder: "What are you building?"
    preview: "Incito"
  - key: problem
    label: "Problem Statement"
    type: textarea
    required: true
    placeholder: "What problem does this solve?"
    preview: "Users struggle to write effective prompts for AI tools"
  - key: target_user
    label: "Target User"
    type: text
    required: true
    placeholder: "Who is this for?"
    preview: "Power users of AI assistants who want consistent results"
  - key: success_metrics
    label: "Success Metrics"
    type: textarea
    required: false
    placeholder: "How will you measure success?"
    preview: "Time to create prompts reduced by 50%, prompt reuse rate"
  - key: constraints
    label: "Known Constraints"
    type: textarea
    placeholder: "Technical, timeline, or resource constraints"
    preview: "Must work offline, weekend project scope"
  - key: detail_level
    label: "Detail Level"
    type: select
    options:
      - lightweight
      - standard
      - comprehensive
    default: standard
---

# Product Requirements Document: {{product_name}}

## Overview

**Product:** {{product_name}}
**Target User:** {{target_user}}
**Document Detail Level:** {{detail_level}}

## Problem Statement

{{problem}}

## Success Metrics

{{#if success_metrics}}
{{success_metrics}}
{{/if}}

{{#if constraints}}
## Constraints

{{constraints}}
{{/if}}

---

Based on the above inputs, generate a {{detail_level}} PRD that includes:

### For lightweight:
- User stories (3-5)
- Core requirements
- Out of scope

### For standard (add):
- User journey
- Detailed requirements with acceptance criteria
- Technical considerations
- Open questions

### For comprehensive (add):
- Competitive analysis
- Risk assessment
- Rollout plan
- Metrics instrumentation plan

Focus on clarity and actionability. Flag assumptions that need validation.
