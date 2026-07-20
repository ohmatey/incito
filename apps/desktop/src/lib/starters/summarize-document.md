---
name: "Summarize a Document"
description: "Turn a long document into a short, skimmable summary"
tags:
  - starter
  - reading
variables:
  - key: document
    label: "Text to summarize"
    type: textarea
    required: true
    placeholder: "Paste the report, article, or notes here"
    preview: "The Q3 review covered three areas: revenue grew 12% driven by the new plan tier, churn ticked up slightly among trial users, and the support team cleared its backlog after hiring two agents. Leadership agreed to invest more in onboarding next quarter."
    description: "Paste anything — an article, a report, meeting notes."
  - key: length
    label: "How long?"
    type: select
    required: true
    options:
      - one sentence
      - a short paragraph
      - 3-5 bullet points
    default: 3-5 bullet points
    preview: "3-5 bullet points"
    description: "How much detail do you want back?"
  - key: focus
    label: "Focus on (optional)"
    type: text
    required: false
    placeholder: "e.g. decisions made, risks, next steps"
    preview: "decisions and next steps"
    description: "Leave blank for a general summary, or name what matters most."
---
Summarize the text below as {{length}}.
{{#if focus}}Focus especially on: {{focus}}.{{/if}}

Be faithful to the source — do not add anything that isn't there. Use plain language.

Text:
{{document}}
