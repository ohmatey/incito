---
name: "Synthesize Feedback"
description: "Turn a pile of feedback or reviews into clear themes"
tags:
  - starter
  - analysis
variables:
  - key: feedback
    label: "Feedback to analyze"
    type: textarea
    required: true
    placeholder: "Paste survey responses, reviews, or comments — one per line is fine"
    preview: "Love the product but it's too expensive.\nSetup took forever, needed help.\nWorks great once it's running.\nWish it synced to my phone.\nThe price is steep for a small team.\nOnboarding was confusing."
    description: "Paste as much as you have — the more responses, the better the themes."
  - key: theme_count
    label: "How many themes?"
    type: number
    required: false
    default: 4
    min: 2
    max: 8
    preview: 3
    description: "Roughly how many groups to sort the feedback into."
---
Analyze the feedback below and group it into about {{theme_count}} recurring themes.

For each theme:
- Give it a short, descriptive name
- Summarize what people said in one or two sentences
- Note roughly how common it was

Base everything only on the feedback provided. Do not invent points.

Feedback:
{{feedback}}
