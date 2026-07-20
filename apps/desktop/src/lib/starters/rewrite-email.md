---
name: "Rewrite an Email"
description: "Rewrite a rough email so it reads clearly in the tone you want"
tags:
  - starter
  - writing
variables:
  - key: draft
    label: "Your rough draft"
    type: textarea
    required: true
    placeholder: "Paste the email you want to improve"
    preview: "hey just checking if you got my last message about the invoice, need to know by friday or we cant process it"
    description: "Don't worry about grammar or tone — just get the message down."
  - key: tone
    label: "Tone"
    type: select
    required: true
    options:
      - friendly
      - professional
      - direct
      - warm
      - apologetic
    default: professional
    preview: "friendly"
    description: "How should it come across to the reader?"
  - key: audience
    label: "Who is it for?"
    type: text
    required: false
    placeholder: "e.g. a client, my manager, a teammate"
    preview: "a client we've worked with for a while"
    description: "Helps pitch the wording at the right level of formality."
---
Rewrite the following email so it is clear, concise, and easy to read.

Tone: {{tone}}
{{#if audience}}Audience: {{audience}}{{/if}}

Keep the original intent, fix any awkward phrasing, and make sure the ask is obvious. Return only the rewritten email.

Draft:
{{draft}}
