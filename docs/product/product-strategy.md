---
last-updated: 2026-07-10
status: draft
linked-roadmap: /docs/product/roadmap.md
linked-prds: []
pending-sync: true
---

# Product Strategy: Incito

> **DRAFT** — strawman for reaction. Open decisions are marked `[DECISION n]` and
> mirrored in the roadmap. Becomes `active` once each is confirmed or amended.

## TLDR

- Incito is a local-first desktop app for authoring, running, and sharing reusable AI prompt templates as markdown files.
- Current strategic bet: the **author→consumer loop** — one prompt-literate power user (Alex) encodes their prompting skill into templates; non-technical teammates (Maya) get outcomes through forms and absorb prompting by exposure, never by instruction.
- North star (proposed): weekly template runs by non-author users. Honest caveat: local-first makes this hard to observe — validation leans on direct user discovery, not telemetry.
- Sharpest non-goal: we do not teach prompting as content. No tutorials, no courses, no prompt-engineering curriculum. The interface is the teacher.

## Vision

Every team has one person who is good at AI and twenty who get mediocre results from it. Today that knowledge transfers through Slack messages and shoulder-taps, and it decays instantly. Incito makes prompting skill a durable, shareable team asset: the expert writes a template once, the team runs it forever, and — because the assembled prompt is always visible — the team slowly becomes literate without anyone sitting through a lesson.

The long-term shape is "the spreadsheet of prompting": authored by the few, used by the many, learned by osmosis, stored in plain files the team already knows how to share.

## Positioning

- **Category**: prompt template manager / team prompt library (desktop, local-first)
- **For** the team's AI power user **who** is tired of being the human prompt API for colleagues, **Incito** turns their best prompts into fill-in-the-form tools anyone can run, **unlike** raw ChatGPT/Claude or shared docs of copy-paste prompts, **because** templates carry the expertise (variables, guardrails, structure) and files carry the distribution (any shared folder is a team library).
- **What we are NOT**: a chat client, a prompt marketplace, an AI-literacy course, a cloud SaaS with accounts and seats.

## ICP & Target Users

| Segment | Who | Why them | Evidence |
|---------|-----|----------|----------|
| Primary (author) | Alex Chen — "The Prompt Engineer" (/docs/ux/personas.md) | Feels the pain daily, adopts tools, brings the team in. The wedge and the distribution channel. | Persona research 2026-01-19; product built and iterated against this persona through v0.14 |
| Co-primary (consumer) | Maya Rodriguez — "The Domain Expert Operator" | Recurring, team-standardized AI jobs; wants outcomes and guardrails, not syntax. Ten Mayas per Alex. | Persona research 2026-01-19 — **hypothesis** for the consumer framing; original persona framed her as a guided *author* `[DECISION 1]` |

**Persona boundary that must stay sharp:** Maya-as-consumer superficially resembles the anti-persona Mike ("Casual AI User" — wants pre-made templates and guided experiences). The differentiator is **recurrence and team context**: Maya runs the same jobs weekly and needs team-consistent output; Mike has one-offs. If a feature serves one-off casual use, it's serving Mike — cut it.

## Strategic Bets

| Bet | We believe... | Validated by | Kill condition | Status | Source PRD |
|-----|---------------|--------------|----------------|--------|------------|
| Hardening for Alex | Reliability and power-user speed are table stakes; Alex won't bring their team into a flaky tool | Crash-free sessions; Alex-persona retention | Sustained reliability with no growth in team sharing → hardening alone doesn't compound | active (placed 2026-05-23) | — |
| Author→consumer loop | A non-technical teammate can get value from an Alex-authored template in their first session, unaided — and repeated exposure to the assembled prompt builds literacy | 5 Maya-profile testers complete a run + copy/use output without help; ≥1 real team adopts a shared library within 6 weeks of consumer mode shipping | Testers can't succeed without a human walkthrough, or no author ever shares a folder → the loop doesn't exist, revisit direct-to-Maya authoring instead | active (placed 2026-07-10) | TBD |
| Teaching-by-exposure | Showing the live interpolated prompt beside the form is sufficient "teaching"; explicit instruction is unnecessary and unwanted | Consumers report understanding what the template does; some consumers graduate to editing/authoring | Consumers ignore the preview entirely AND fail to trust outputs → exposure isn't teaching, reconsider (but instruction-content remains a non-goal) | active (placed 2026-07-10) | TBD |
| Files as distribution | Shared folders (Dropbox/Drive/git) are sufficient team distribution; no backend needed to validate the loop | ≥1 team running a shared prompt folder across 3+ people | Teams demand real-time sync/permissions before adopting at all → files-first fails, cloud moves from Later to Next | active (placed 2026-07-10) | TBD |

**Analytics registry gap (Intel Mode, stated plainly):** none of the "Validated by" signals above currently map to live analytics. The in-app analytics feature tracks local usage, not cross-user sharing — and local-first means the sharing loop is structurally invisible to telemetry. Two additional hard constraints: the landing page publicly promises **"Zero telemetry"** (while shipping an inert opt-in PostHog SDK — a contradiction flagged in the 2026-05-23 review that still needs resolving), so product telemetry cannot be the validation path without a positioning change. Bet validation is therefore **manual discovery by design**: recruited Maya-profile testers and direct author conversations. `/docs/product/analytics.md` does not exist yet — creating it (mostly as a waived/manual registry) is on the roadmap's Now horizon.

**Capacity (binding constraint):** solo, part-time. Everything on the roadmap must be a small, independently-shippable increment; no release-blocking refactors. The 2026-05-23 hardening review stands: the feature surface sits on a thin foundation (untested 4,239-line `store.ts`, `console.error` observability) — new consumer-facing work must not outpace that repair.

## Non-Goals

- **Teaching prompting as content** (tutorials, tips, courses, onboarding lessons). Why: curricula have brutal adoption curves; nobody adopts a tool to be taught. Revisit only if the teaching-by-exposure bet is killed — and even then, prefer better templates over lessons.
- **Cloud backend / accounts / seats** in the current horizon. Why: files-first is the distribution bet, and a backend before validation is speculative infrastructure. Revisit if the files-as-distribution bet is killed.
- **Serving Mike (casual one-off users)**. Why: no recurrence means no template value; simplifying for Mike degrades the product for Maya and Alex both. Standing non-goal.
- **Prompt marketplace / public sharing**. Why: the unit of distribution is a team, not the internet. Revisit only after multiple teams validate the loop.

## Business Model

- **Revenue model**: none live. Working hypothesis: free for authors (single-player), paid for team features once the loop is validated — the author is the champion, the team is the expansion. `[DECISION 5 — park or engage Harlan]`
- **Unit economics**: n/a pre-revenue.
- **Pricing posture**: undecided; no GTM playbook exists yet.

## North Star & Success Metrics

| Metric | Current | Target | Why this metric |
|--------|---------|--------|-----------------|
| Weekly template runs by non-author users | unmeasured (see analytics gap) | ≥1 team, 3+ consumers, recurring weekly | Directly proxies the loop: authored once, consumed repeatedly by others |
| Consumer first-session success (qualitative) | untested | 5/5 unaided | Leading indicator, measurable now via discovery |

## Moats & Differentiation

Honest entry: **no moat yet.** Plain markdown files are deliberately low-switching-cost (that's the adoption pitch). What could compound: the team's accumulated template library becomes the team's operational knowledge — leaving Incito means abandoning the library's ergonomics, not the files. Taste in the consumer experience is the near-term differentiator.

## Change Log

| Date | Change | Why | Downstream impact |
|------|--------|-----|-------------------|
| 2026-07-10 | Initial draft. Placed author→consumer, teaching-by-exposure, and files-as-distribution bets alongside the pre-existing hardening direction (2026-05-23). **Deliberately revises the 2026-05-23 fork that chose "Alex, not Maya":** that fork rejected Maya as a guided *author* (a flow only ~3/10 supported) — this bet reopens Maya strictly as a *consumer* of Alex-authored templates. Guided authoring for Maya stays parked. | Prior roadmap (.can/roadmap.md) lost; founder pivoting adoption focus toward non-technical users; personas doc already contained Maya | New roadmap seeded from bets; personas.md needs Maya reframe + prioritization update `[DECISION 1]`; analytics.md to be created |
