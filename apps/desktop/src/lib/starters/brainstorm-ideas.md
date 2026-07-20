---
name: "Brainstorm Ideas"
description: "Generate a range of ideas for a goal, then sharpen the best"
tags:
  - starter
  - creative
variables:
  - key: goal
    label: "What are you trying to do?"
    type: textarea
    required: true
    placeholder: "Describe the goal, problem, or thing you need ideas for"
    preview: "come up with ways to get more people to sign up for our weekly newsletter"
    description: "The clearer the goal, the more useful the ideas."
  - key: count
    label: "How many ideas?"
    type: number
    required: false
    default: 8
    min: 3
    max: 20
    preview: 8
    description: "How many ideas do you want to start with?"
  - key: constraints
    label: "Any constraints? (optional)"
    type: text
    required: false
    placeholder: "e.g. low budget, no new tools, must ship this week"
    preview: "low budget, no engineering help"
    description: "Real-world limits make the ideas more practical."
---
Brainstorm {{count}} distinct ideas for the goal below.

{{#if constraints}}Work within these constraints: {{constraints}}.{{/if}}
Aim for variety — mix safe options with a few bolder ones. Keep each idea to one line.
Then pick the two you think are strongest and explain why in a sentence each.

Goal:
{{goal}}
