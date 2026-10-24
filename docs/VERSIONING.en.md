# Versioning · nivel-13

<!-- Comes ready. Only adjust if the project has a reason to. The why behind all this is in method/02-processo.en.md. -->

Every round of work becomes a **self-contained version**: navigable, comparable, and frozen when the next one starts. Old versions stay live and untouched, for comparing and going back.

## Version or round?

| What changed | It's a |
|---|---|
| The direction, or the system (type, color, grid, motion) | **New version** (v3 → v4) |
| Adjustments within the same direction, from critique | **Round** inside the version (4.1, 4.2) |
| A bug fix in a version already shown | A fix in that version, logged in its brief |

## Structure

| Piece | Where | Rule |
|---|---|---|
| Registry | `lib/versions.ts` | Single source: id, title, date, status, summary, routes, folders and brief for each version. Only one with `current: true` (and `status: 'atual'`). |
| Routes | `app/<id>/` (e.g. `app/v4/`) | Each version has its own root. Archived version routes are never edited. |
| Components | `components/<id>/` | New code for the version lives in its folder. May import from earlier versions; never edits them. |
| CSS | a `.<id>` scope on the version root + its own class prefix (`v4-`) | Nothing leaks between versions. |
| Brief | `briefs/BRIEF-<id>.md` | The living yardstick (liked, disliked, asked, repeated), decisions, rounds. |
| Index | `/` | Lists every version by reading the registry. |
| Menu | `<StudioTools versions={studioVersions} />` › Versions | The bar's menu listing every version, with the current page's one marked. |

```ts
// lib/versions.ts
export type RoundStatus = 'atual' | 'anterior' | 'aprovada' | 'rascunho'   // current | previous | approved | draft

export interface Round {
  id: `v${number}`                  // 'v4'
  title: string                     // short name of the direction or round
  date: string                      // YYYY-MM-DD
  status: RoundStatus
  current?: boolean                 // exactly one version with current: true
  summary: string                   // one sentence: what this version tests or decides
  routes: { label: string; href: string }[]   // [{ label: 'Landing', href: '/v4' }]
  folders: string[]                 // ['app/v4', 'components/v4']
  brief: string                     // 'briefs/BRIEF-v4.md'
}

export const versions: Round[] = [
  { id: 'v1', title: '{{title}}', date: '2026-10-24', status: 'atual', current: true, summary: '{{summary}}',
    routes: [{ label: 'Landing', href: '/v1' }], folders: ['app/v1', 'components/v1'], brief: 'briefs/BRIEF-v1.md' },
]
```

The same file exports `currentRound`, `roundOf(pathname)` and `studioVersions` (the Versions menu's format).

## Creating a new version

In Claude Code, `/round` does the steps below.

1. Copy the current version's block in `lib/versions.ts`, change the id, set `status: 'atual'` and `current: true`, and move the previous one to `status: 'anterior'` (without `current`).
2. Create `briefs/BRIEF-<id>.md` from the previous one: carry over the whole yardstick (liked, disliked), clear "asked" and "repeated", and fill them with the critique received.
3. Create `app/<id>/` and `components/<id>/`. To start from the previous version, **copy** (never move) and change the CSS scope and prefix.
4. Put the `.<id>` scope on the version's layout root.
5. Run verification (1440 and 390, with and without reduced motion) on the new version **and** on an old one, to make sure nothing leaked.
6. Publish: the main link opens the index, with the `current` version highlighted.

## Rules

- **An archived version is read-only.** If a fix to a shared component would change an old version's visuals, the fix goes into the new version's folder.
- **A unique class prefix per version.** A generic class shared between versions has already broken a layout on a real project.
- **Per-version tokens** when the system changes: `components/<id>/tokens.ts` and variables inside the `.<id>` scope.
- **Illustrative data stays labeled** as illustrative in every version.
- **Archive:** when the number of versions starts to weigh on the deploy, old ones move to a separate archive link; the main link keeps the current version and the index.

## Version brief (skeleton)

```md
# nivel-13 {{id}} · "{{title}}"

Read first: VERSIONING.md, briefs/BRIEF-{{previous}}.md, DESIGN.md. This document wins where they differ.
Routes: /{{id}}/… New code only in app/{{id}}/** and components/{{id}}/**.

## Yardstick
Liked: …
Disliked (never again): …
Asked now: …
Repeated (top priority): …

## Decisions in this version
…

## Round {{id}}.1
…
```
