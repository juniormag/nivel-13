---
description: Brutal craft critique of a page, flow or round, with tiers, Before/After/Why and a score
argument-hint: "[route, URL or component] [optional: viewport or focus]"
---

Use the `studio-craft-review` skill on: $ARGUMENTS

If nothing is given, review the routes of the current round (the `current: true` entry in `lib/versions.ts`).

- Look at the running thing, not the code alone: Playwright at 1440×900 and 390×844, light and dark if both exist, close crops, hover, focus, overlays, reduced motion, console.
- Score the seven studio principles (or the project's own, if `docs/PRINCIPIOS.md` defines them) from 0 to 3.
- Output exactly: one findings table with Tier, Where, Before, After, Why (exact values, `file:line` when known), then the scorecard, the verdict, and what was and was not verified.

Read-only: do not change files unless I ask. If the motion needs a line-by-line pass, suggest `/review-animations`.
