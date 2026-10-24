---
description: Run the first 90 minutes of a project (interview, kickoff docs, template, three directions)
argument-hint: "[client or project name] [optional: paste the brief]"
---

Use the `studio-kickoff` skill to run the kickoff for: $ARGUMENTS

1. Read the kickoff documents in `docs/`, the project `CLAUDE.md`, `ARCHITECTURE.md` at the monorepo root and any client material in the project. Tell me in five lines what you already know and what you do not.
2. Interview me in four short rounds (business, people, brand, work). One round at a time; after each answer, play it back in two sentences ("O que ouvi: …").
3. Research for at most 15 minutes: the client's surfaces, three competitors, the references I named (mechanism, not look). Save screenshots to `docs/refs/`.
4. Fill the kickoff documents in `docs/`. Every fact has a source; every unknown is an open question.
5. Choose the template (site, film, lab or a mix), make sure `lib/versions.ts` has `v1` current and fill `briefs/BRIEF-v1.md` (the site template ships both).
6. Propose three directions that differ in belief, with a recommendation.

If I pasted a brief and I am not around, run all blocks asynchronously and mark every inference as "inferido, confirmar".
End with: files filled, template, directions table, open questions, next step.
