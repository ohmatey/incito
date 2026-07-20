---
name: "Polish My Writing"
description: "Clean up any piece of writing without changing your voice"
tags:
  - starter
  - writing
variables:
  - key: text
    label: "Text to polish"
    type: textarea
    required: true
    placeholder: "Paste the writing you want cleaned up"
    preview: "Our new feature it lets you to share prompts with you're team so everyone can use the same ones instead of everybody making there own version which wastes alot of time."
    description: "A message, a paragraph, a whole post — anything."
  - key: goal
    label: "Main goal"
    type: select
    required: true
    options:
      - fix grammar and spelling only
      - make it clearer
      - make it shorter
      - make it more polished
    default: make it clearer
    preview: "make it clearer"
    description: "What's the priority for this edit?"
  - key: keep_voice
    label: "Keep my voice"
    type: select
    required: false
    options:
      - "yes"
      - "no"
    default: "yes"
    preview: "yes"
    description: "Preserve how you naturally sound, rather than making it generic."
---
Improve the writing below. Goal: {{goal}}.

{{#if (eq keep_voice "yes")}}Preserve the author's natural voice and style — don't make it sound generic or corporate.{{/if}}
Fix errors and awkward phrasing. Don't change the meaning or add new claims. Return only the improved text.

Text:
{{text}}
