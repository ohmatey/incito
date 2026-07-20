---
name: "Draft a Reply"
description: "Draft a reply to a message that says what you want to say"
tags:
  - starter
  - writing
variables:
  - key: message
    label: "Message you received"
    type: textarea
    required: true
    placeholder: "Paste the message you need to reply to"
    preview: "Hi — we were hoping to get the designs by Wednesday but haven't seen anything yet. Is everything on track? Let us know if there's a problem."
    description: "Paste what they sent you."
  - key: intent
    label: "What do you want to say back?"
    type: textarea
    required: true
    placeholder: "The gist of your response, in your own words"
    preview: "designs are running a day late because of a sick day, will send Thursday morning, sorry for the delay"
    description: "Just the key points — the AI will shape them into a full reply."
  - key: tone
    label: "Tone"
    type: select
    required: true
    options:
      - friendly
      - professional
      - direct
      - apologetic
    default: friendly
    preview: "apologetic"
    description: "How should the reply feel?"
---
Write a reply to the message below.

What I want to convey: {{intent}}
Tone: {{tone}}

Match the sender's level of formality, keep it concise, and make sure my main point is clear. Return only the reply.

Their message:
{{message}}
