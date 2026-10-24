---
description: "Design with the studio's taste in the loop: brief, references, divergent directions, build, score, iterate"
argument-hint: "<what to design> [optional: domain product|web|brand|graphic|motion|3d|image]"
---

Use the `studio-taste` skill on: $ARGUMENTS

If nothing is given, ask what to design in one question and stop.

1. Read the round brief and the project's `DESIGN.md` / `docs/` first; note what taste can never override.
2. Call `taste_brief` (MCP server `taste`) with the job in one sentence, not style words. Read 4–6 of the thumbnails it returns, across clusters.
3. Write a one-line design read and 2–3 divergent directions, each citing the ref ids it borrows moves from. At least one direction deliberately pushes beyond the collection (the adjacent possible). If I asked for variations, suggest `/prototype`.
4. Build the chosen direction(s) with the project's system. Screenshot each the same way (Playwright, 1440×900 first viewport; 390×844 for mobile-first), save to the scratchpad.
5. `taste_score` one render or `taste_compare` the variants; critique against the codex rules and against what the model cannot see. Iterate at most 2 rounds.
6. Report in the skill's output format: scores with the honest note (closeness to the collection, not quality), rejected suggestions and why, and what was and was not verified.

If the `taste` tools are missing or say there is no data, say so, design from the brief alone and do not claim a taste check.
