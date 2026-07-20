---
last-updated: 2026-07-10
status: draft
linked-strategy: /docs/product/product-strategy.md
pending-sync: true
---

# Incito Roadmap

> **DRAFT** — replaces the lost `.can/roadmap.md`. Strawman for reaction; open
> decisions marked `[DECISION n]` and defined in the strategy doc. Every theme
> traces to a bet in `/docs/product/product-strategy.md`.

## TLDR

- **Now** = validate the author→consumer loop with the smallest honest test: a consumer run mode, a starter library, and 5 Maya-profile discovery sessions — while hardening continues.
- **Next** = make sharing effortless (template packs) and make templates self-teaching by default (author-side lint), only in the shape the Now-horizon evidence demands.
- **Later** = team feedback loop and cloud sync — gated on the loop validating; parked, not promised.
- The changelog and CLAUDE.md describe a v0.2 app; the product is at v0.14. Doc debt is a Now-horizon hardening item because stale docs undermine the reliability story.

**Capacity reality check:** solo, part-time (per the 2026-05-23 direction — small independently-shippable increments, no release-blocking refactors). Now-horizon themes are ordered by leverage; if only two ship, ship the first two. Consumer run mode is deliberately a *subtractive* feature — hiding authoring chrome, not building new machinery — to fit this constraint.

## Now — validate the loop (target: next 6–8 weeks, part-time paced)

**Outcome: a non-technical teammate gets value from a shared template in their first session, unaided.** (Bets: author→consumer loop, teaching-by-exposure, hardening)

| Theme | What ships | Bet | Success signal |
|-------|-----------|-----|----------------|
| Consumer run mode | A stripped view: form + live interpolated prompt preview + copy/run. All authoring chrome (variable config, graders, custom runs, variants) hidden. Entry point obvious from the prompt list. `[DECISION 2 — preview always visible, not a tab]` | Author→consumer, teaching-by-exposure | Maya-profile tester completes a run unaided |
| Starter template library | ~10 genuinely good templates for universal jobs (rewrite email, summarize doc, meeting notes → actions, draft policy, feedback synthesis). First-run value without an Alex present. | Author→consumer | New user runs a starter template in session one |
| Maya discovery sessions | Recruit 5 non-technical testers; watch first sessions against the kill condition. Log to `/docs/product/discovery/customer-insights-log.md`. | All new bets | 5 sessions logged; bet verdict evidence |
| Analytics registry | Create `/docs/product/analytics.md`; decide per bet signal: instrument, or accept as manual-discovery-only. Note the "Zero telemetry" landing-page promise — resolve the PostHog contradiction (remove the SDK or change the claim) as part of this. | All | Every active bet's "Validated by" is mapped or explicitly waived; landing claim and shipped code agree |
| Hardening (continuing) | Reliability work per the 2026-05-23 direction (test net around `store.ts`, observability beyond `console.error`); plus doc debt — CHANGELOG (stuck at 0.2.0) and CLAUDE.md (pre-playbooks architecture) updated to v0.14 reality. | Hardening | Crash-free sessions; docs match the shipped app |

## Next — make the loop effortless (gated on Now evidence)

**Outcome: an Alex can hand a template to their team in under a minute, and the template teaches itself.** (Bets: files-as-distribution, teaching-by-exposure)

| Theme | What ships | Bet |
|-------|-----------|-----|
| Template packs | One-file export/import (zip or single .md bundle) for teams that don't share folders. Files-first, no backend. | Files-as-distribution |
| Self-teaching templates by default | Author-side nudges: warn when a template lacks labels, placeholders, or preview values — the frontmatter schema *is* the lesson plan, so make good schemas the default path. | Teaching-by-exposure |
| Consumer-run polish | Whatever the 5 discovery sessions surface as first-session friction. Deliberately unscoped until evidence exists. | Author→consumer |
| Docs site for Maya (continuing) | Extend apps/docs (shipped 2026-02-05) as reference material — reference, not curriculum, per the non-goal. | Author→consumer |

## Later — compound the loop (gated on loop validation)

Parked, not promised. Pulling any of these forward requires a strategy-doc change-log entry.

- **Team feedback loop** — consumer ratings/results visible to the author; closes the improve-the-template cycle. (Requires the loop to exist first.)
- **Cloud sync / real-time sharing** — only if files-as-distribution is killed or teams outgrow folders.
- **Graduation path** — consumer → author affordances ("duplicate and tweak" from run mode) if teaching-by-exposure validates.
- **Monetization** — team-tier hypothesis; engage GTM once ≥1 team is in the loop. `[DECISION 5]`

## Explicitly not on the roadmap

Tutorials/courses, accounts/backend (this horizon), marketplace, casual-user simplification — see Non-Goals in the strategy doc.

## Roadmap Linkage

- Strategy: [product-strategy.md](/docs/product/product-strategy.md) — every theme above names its bet.
- PRDs: none yet. First PRD should be **Consumer Run Mode** once `[DECISION 2]` is settled.
- Sal issues: `pending-sync: true` — sector137 MCP unavailable this session. Intended issues on next connected session: consumer-run-mode PRD, starter-library curation, discovery-session recruiting, analytics registry, changelog/CLAUDE.md refresh.

## ACTION PLAN

1. React to the five open decisions (see strategy doc / session notes) — confirm, adjust, or reject each.
2. On confirmation: update `/docs/ux/personas.md` (Maya reframe, prioritization table) and flip both docs to `status: active`.
3. Write the Consumer Run Mode PRD + story map; slice against this roadmap's Now horizon.
4. Recruit the 5 Maya-profile testers — this is the longest lead-time item; start before building.
5. Next connected session: sync intended issues to Sal.

## Change Log

| Date | Change | Why | Impact |
|------|--------|-----|--------|
| 2026-07-10 | Initial draft replacing lost .can/roadmap.md; seeded from strategy-doc bets | Adoption focus pivoting to author→consumer loop | Supersedes the hardening-only sequencing; hardening continues as a Now theme rather than the sole direction |
