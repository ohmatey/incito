---
name: "Meeting Notes → Action Items"
description: "Pull clear, assignable action items out of messy meeting notes"
tags:
  - starter
  - productivity
variables:
  - key: notes
    label: "Meeting notes"
    type: textarea
    required: true
    placeholder: "Paste your raw notes from the meeting"
    preview: "talked about launch. Sam will finalize the pricing page. we need legal to review terms before we ship. Priya raised that the mobile layout is broken. aiming for end of month. someone should tell the beta users."
    description: "Rough notes are fine — bullet points, half-sentences, whatever you jotted."
  - key: include_owners
    label: "Include owners?"
    type: select
    required: false
    options:
      - "yes"
      - "no"
    default: "yes"
    preview: "yes"
    description: "If names appear in the notes, assign each action to a person."
---
Read the meeting notes below and extract a list of clear action items.

For each action, write a single line starting with a verb.
{{#if (eq include_owners "yes")}}Where a name is mentioned, put the owner in [brackets] at the end of the line.{{/if}}
If any item is vague, phrase it as a concrete next step. List nothing that isn't in the notes.

Notes:
{{notes}}
