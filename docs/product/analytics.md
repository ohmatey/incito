---
last-updated: 2026-07-10
status: draft
linked-strategy: /docs/product/product-strategy.md
---

# Incito Analytics Registry

> Maps every strategic bet's "Validated by" signal (from
> [product-strategy.md](/docs/product/product-strategy.md)) to how it is actually
> measured. A bet whose signal is neither `live` nor deliberately `waived` cannot be
> validated — that gap is the point of this doc.

## TLDR

- Incito is **local-first**, so cross-user behavior (the whole author→consumer loop) is **structurally invisible to telemetry** — the sharing happens in a shared folder the app never sees.
- The landing page also promises a privacy posture (see the telemetry note below), which further constrains product-analytics as a validation path.
- Therefore most bet signals are **waived to manual discovery** — recruited Maya-profile testers and direct author conversations — by design, not by neglect.

## Signal registry

| Bet | Validated-by signal | Measurement | Status |
|-----|--------------------|-------------|--------|
| Author→consumer loop | 5 Maya-profile testers complete a run + copy unaided | Moderated first-session observation; log to `discovery/customer-insights-log.md` | **waived → manual** |
| Author→consumer loop | ≥1 real team adopts a shared library within 6 weeks | Direct author interview; not observable locally | **waived → manual** |
| Teaching-by-exposure | Consumers report understanding what the template does | Post-session qualitative question | **waived → manual** |
| Teaching-by-exposure | Some consumers graduate to editing/authoring | Would require a local `app_mode` transition count (use→author) — instrumentable *locally* if privacy posture allows | **candidate → instrument** |
| Files-as-distribution | ≥1 team runs a shared folder across 3+ people | Author interview; folder contents not phoned home | **waived → manual** |
| Hardening | Crash-free sessions | Requires local error/telemetry capture — see telemetry note | **blocked → see note** |

## Locally-measurable candidates (no cross-user data, no network)

These proxy the bets without violating local-first, IF the privacy posture permits any local counters persisted to SQLite (not sent anywhere):

- **Runs by mode**: count copies/runs while `app_mode = 'use'` vs `'author'` — proxies "consumers actually use authored templates."
- **use→author transitions**: increment when a user first flips to Author mode — proxies teaching-by-exposure graduation.
- **Starter adoption**: whether the "Add starter templates" action was used — proxies first-run value.

Decision needed `[DECISION]`: are purely-local, never-transmitted counters acceptable under the "Zero telemetry" positioning, or does even local counting conflict with the promise? Until decided, these stay **candidate**, not **live**.

## Telemetry posture note (blocker for instrumented validation)

Investigated 2026-07-10. The contradiction is **real and was worse than the prior review stated** — the review said "opt-in (default off)"; it is actually **opt-out (default ON)**.

**Findings:**
- Landing page states verbatim: **"Local-first. Zero telemetry."** and "Enterprise-ready privacy by default." (`apps/landing/i18n/locales/en.json:60-61`, rendered by `components/sections/Features.tsx`; Thai mirror in `th.json:60`).
- Desktop app shipped `DEFAULT_ANALYTICS_SETTINGS.enabled = true` (`apps/desktop/src/lib/store.ts`), so on first launch `PostHogContext` auto-generated a distinct id, called `posthog.init` + `identify()`, and issued network requests to `us.i.posthog.com` **without user action** (`src/context/PostHogContext.tsx:37,52,55`).
- It was inert in practice **only** because the API key is an unreplaced placeholder `phc_YOUR_PROJECT_KEY` with a `// TODO: Replace ... before release` comment (`PostHogContext.tsx:16-17`) — a footgun: filling that TODO would silently start default-on telemetry behind the "zero telemetry" promise.
- No feature calls the exposed `track()` — zero event sites. The landing site itself ships no analytics.

**Fixed this session (surgical, privacy-preserving):** flipped the default to `enabled: false` (opt-in) so the shipped app honors its own public promise out of the box.

**Decisions still owned by the founder (outward-facing / strategic — not made here):**
1. Remove the PostHog SDK entirely vs. keep it as genuine opt-in? (If kept, the placeholder-key footgun remains — filling it must stay gated behind the now-default-off toggle.)
2. Does "Zero telemetry" marketing survive at all if any opt-in analytics ship? The honest positions are *remove telemetry entirely* or *soften the claim to "no telemetry unless you opt in."* Changing public copy is a marketing call.

Until (1) and (2) are settled, product telemetry is not a sanctioned validation channel and every signal above defaults to manual discovery.

## Change Log

| Date | Change | Why |
|------|--------|-----|
| 2026-07-10 | Initial registry seeded from the four active bets | Strategy doc requires every "Validated by" signal to map to a measurement; most waived to manual discovery given local-first + privacy posture |
