---
description: "The Delta&Co front door: new project, a single piece, or attach this repo, then the taste loop"
argument-hint: "<what you want> e.g. 'site para a Acme', 'poster do lançamento', 'attach'"
---

Use the `delta` skill on: $ARGUMENTS

1. Resolve the scaffold (`$DELTACO_SCAFFOLD`, then `~/Documents/deltaco-scaffold`, else ask once) and detect the context: studio project, foreign repo, or empty folder.
2. Pick the path: create a project, build a piece in `projects/pecas`, or attach this repo with `scripts/attach.mjs`. At most 3 questions, in one batch, with defaults.
3. Say in one line which 2–3 skills you are using. Run the taste loop (`taste_brief` before, `taste_score` after) and respect the project's `DESIGN.md` and `docs/`.
4. End with the skill's output block, including what was and was not verified.

If nothing is given, ask "O que vamos fazer?" with the options: projeto novo · uma peça · acoplar este repo.
