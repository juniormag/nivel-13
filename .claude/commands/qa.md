---
description: Definition-of-done pass (Playwright desktop + mobile, axe, reduced motion, dark mode) with a verified/not-verified report
argument-hint: "[routes or 'rodada atual'] [optional: extra viewports or browsers]"
---

Use the `studio-qa` skill. Scope: $ARGUMENTS (empty means every route of the current round in `lib/versions.ts`).

Write the scope first. Then run the full pass: console and failed requests, horizontal overflow, layout shift, screenshots in every cell of the matrix (1440×900 and 390×844, light and dark, default and reduced motion) and look at them, axe with WCAG 2.2 AA tags, keyboard and focus, contrast over images and canvases, states, links, content (no lorem, no placeholders, numbers rule), performance feel.

Return the report in the skill's format, with PASSA, PASSA COM RESSALVAS or NÃO PASSA, the failures with evidence, and the mandatory "Verificado" and "Não verificado" lines. Keep captures in the scratchpad.
