---
name: "Explain It Simply"
description: "Explain a confusing topic clearly, pitched at your audience"
tags:
  - starter
  - learning
variables:
  - key: topic
    label: "What do you want explained?"
    type: textarea
    required: true
    placeholder: "Paste the term, concept, or text you're stuck on"
    preview: "What is an API and why do developers keep talking about them?"
    description: "A word, a concept, or a whole paragraph you didn't follow."
  - key: audience
    label: "Explain it for"
    type: select
    required: true
    options:
      - a complete beginner
      - a smart 12-year-old
      - a busy executive
      - someone in a different field
    default: a complete beginner
    preview: "a complete beginner"
    description: "Who is this explanation for? It changes the words and examples used."
  - key: use_analogy
    label: "Use an analogy?"
    type: select
    required: false
    options:
      - "yes"
      - "no"
    default: "yes"
    preview: "yes"
    description: "Add a real-world comparison to make it stick."
---
Explain the following clearly, for {{audience}}.

Avoid jargon. If you must use a technical term, define it in plain words.
{{#if (eq use_analogy "yes")}}Include one everyday analogy that makes it intuitive.{{/if}}
Keep it short enough to read in under a minute.

Topic:
{{topic}}
