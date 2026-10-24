# nivel-13 · project rules

> English. Versão em PT-BR: [CLAUDE.project.md](CLAUDE.project.md).
> This file becomes the `CLAUDE.md` of every project created with `pnpm novo`. `pnpm novo` already fills in the project and client names; delete whatever does not apply. It applies to people and to agents.

We are Delta&Co: a design and design engineering studio. The bar is that of Work & Co, Porto Rocha and Koto: craft, interaction design, visual design, usability, accessibility, motion and good product decisions. Nothing that looks like a template, nothing broken, nothing dead.

## 1. Rule hierarchy

1. What the person asks for in the prompt.
2. The current round's brief (`briefs/BRIEF-v<N>.md`) and this project's kickoff documents (in `docs/`).
3. This file.
4. `ARCHITECTURE.md` at the monorepo root (the package contract).
5. The studio skills (`studio-*`).
6. Third-party skills.

When a skill suggests something that contradicts the project (font, palette, animation library, CSS structure, tone of copy), the project wins. A skill is repertoire, not authority.

## 2. Before writing code

- **Next 16 is not the Next you know.** Before writing any Next code, read the relevant guide in `node_modules/next/dist/docs/` (resolved from the app folder; in the monorepo the package may not be visible at the root). Respect deprecation warnings. Do not trust memory for routing, cache, `params`, metadata or font APIs.
- Read the current round's brief in full. It wins over this file where they diverge.
- Run `pnpm doctor` at the root if something seems broken (Node versions, ports, packages).

## 3. Proactive use of skills

Do not wait for the person to name a skill. Before any design, product or frontend task, identify the skill that leads and the ones that review, load them and say in **one line** which ones you are using.

Three third-party skills only run when called explicitly. When they make sense, suggest: `/prototype` (variations with a visual picker), `/pick-ui-library` (library choice), `/review-animations` (motion review with a high bar).

### Routing

| Request | Leads | Supports or reviews |
|---|---|---|
| Project start, "what to build" | `studio-kickoff` | `design-brief`, `jobs-to-be-done`, `competitive-analysis`, `metrics-definition` |
| Visual direction for any creation (screen, site, brand, poster, motion, 3D, image), moodboard, "in our taste" | `studio-taste` (MCP `taste`, `/taste`) | the style skill for the kind of request (`impeccable`, `design-taste-frontend`, `studio-type`, `studio-motion`…) |
| Critique of a screen, flow or page | `studio-craft-review` | `studio-taste` (`taste_score`), `web-design-guidelines`, `heuristic-evaluation`, `userinterface-wiki` |
| Typography (pairing, scale, numbers) | `studio-type` | `typography-scale`, `apple-design` |
| Product or brand motion | `studio-motion` | `animate`, `emil-design-eng`, `transitions-dev` |
| Brand or social film (Remotion) | `studio-film` | `studio-motion` |
| Shader, particles, 3D | `studio-creative-coding` | `fixing-motion-performance` |
| Ajustar requests (`feedback/inbox.jsonl`) | `studio-feedback` | the skill for the kind of request |
| "Is it ready?" | `studio-qa` | `fixing-accessibility`, `design-qa-checklist` |
| Case page | `studio-case` | `studio-film`, `studio-motion`, `design-taste-frontend` |
| Recurring decisions without consensus | `design-principles` | `concept-selection` |
| Journey, experience, service | `journey-map` | `experience-map`, `service-blueprint` |
| Structure, navigation, flows | `information-architecture` | `user-flow-diagram`, `navigation-patterns` |
| Visual foundations, new direction | `studio-taste` | `ui-ux-pro-max`, `studio-type`, `color-system`, `spacing-system`, `visual-hierarchy` |
| Comparing directions | `prototype-strategy` | suggest `/prototype`, then `taste_compare` and `concept-selection` |
| Product screen or flow | `impeccable` | `emil-design-eng`, `baseline-ui` |
| Landing, marketing | `design-taste-frontend` | `high-end-visual-design`, `frontend-design` |
| Gestures, sheets, drag, native feel | `apple-design` | `emil-design-eng`, `state-machine` |
| Form | `form-design` | `ux-writing`, `fixing-accessibility` |
| Error, loading, empty, first use | `error-handling-ux` / `loading-states` / `onboarding-design` | `ux-writing` |
| Component with many states | `state-machine` | `micro-interaction-spec` |
| Interface copy | `ux-writing` | |
| Known pattern (modal, toast, tabs, tooltip, accordion, skeleton, AI states) | `transitions-dev` | `transitions-polish` |
| Route transition or shared element in React | `vercel-react-view-transitions` | `animate` |
| "Where is motion missing?" | `find-animation-opportunities` | |
| Janky animation | `fixing-motion-performance` | |
| Improve without changing the identity | `improve-ui` | `baseline-ui` |
| Premium redesign | `redesign-existing-projects` | `impeccable` |
| Accessibility | `fixing-accessibility` (fixes) | `accessibility-audit` (report) |
| React component architecture | `vercel-composition-patterns` | `vercel-react-best-practices` |

Visual direction: `studio-taste` sets the direction (references, principles, anti-patterns from the collection) and the style skill executes; the brief and `DESIGN.md` beat both. Conflicts: one style skill leads per task (product → `impeccable`; marketing → `design-taste-frontend`; no system → `frontend-design`). Motion: known pattern → `transitions-dev`; original interaction → `animate`. To fix, use the `fixing-*` skills; to plan, the `improve-*` ones (which do not edit code).

The full list, with source and license, is in `claude/SKILLS-MANIFEST.md`.

## 4. Monorepo: commands

Everything runs from the monorepo root.

| Command | What it does |
|---|---|
| `pnpm install` | Installs everything (once, at the root). |
| `pnpm --filter @projects/nivel-13 dev` | Starts this project. |
| `pnpm docs` | Studio docs at `localhost:4000` (System, Notes, Labs, Tools). |
| `pnpm --filter @projects/nivel-13 feedback` | Starts the Ajustar receiver at `localhost:3999` (writes to this project's `feedback/inbox.jsonl`). Inside the project folder, `pnpm feedback`. At the root, `pnpm feedback` writes to the root `feedback/`. |
| `pnpm typecheck` · `pnpm lint` · `pnpm format` | TypeScript, Biome check, Biome format. |
| `pnpm build` | Builds everything via Turborepo. In a project: `pnpm --filter @projects/nivel-13 build`. |
| `pnpm doctor` | Environment diagnostics. |
| `pnpm skills` | Installs the studio and third-party skills (`claude/install-skills.sh`). |
| `pnpm novo <slug> --standalone --out <folder>` | When the project needs to move to the client's repo: creates the project outside the monorepo with the packages copied into `vendor/`. |

Fixed ports: docs 4000 · site 4100 · lab 4200 · film studio 4300 · feedback 3999. Parallel agents use their own ports and build folders (e.g. `NEXT_DIST_DIR=.next-<frente> pnpm next dev -p <porta>`), never the same `.next` folder.

## 5. Package import rules

| Need | Import from | Never |
|---|---|---|
| Color, type, space, radius, easing, duration, theme | `@studio/tokens` (CSS: `@studio/tokens/tokens.css`) | literal hex, `font-family` or `cubic-bezier` in a component |
| Reveal, Stagger, SplitText, Magnetic, SmoothScroll, springs | `@studio/motion` | reimplementing reduced motion by hand |
| Button, Dialog, Sheet, Tabs, Toast, Command, Number… | `@studio/ui` (CSS: `@studio/ui/ui.css`) | copying the component into the project to "tweak a detail" |
| Shader, particles, 3D, dot field | `@studio/fx` | a canvas without `useCanvasBudget` |
| Ajustar, Montar, Tipo, Grid, Versões | `@studio/design-tools` | a design tool in a production build |
| Icons | `@phosphor-icons/react` | a second icon family |

- The packages are TypeScript source (`exports` points to `src/`). In Next, they go into `transpilePackages`.
- Every client component starts with `'use client'`.
- The client's brand color comes in through the theme (`defineTheme({ accent, neutral, mode })` or `[data-theme]`), never inside `packages/`.
- Need to change a package? Change it in `packages/` and check `apps/docs` (the System page is built with the system itself). If the change is for this client only, it belongs to the project, not to the package.
- Project CSS uses its own prefix (e.g. `nivel-13-` or `v<N>-` per round). The `ui-`, `fx-`, `st-` prefixes belong to the packages.

## 6. Rounds and versions

Each round of work is a self-contained version. Old ones stay live, intact, for comparing and going back.

- Registry: `lib/versions.ts` (id, title, date, status, `current`, summary, routes, folders, brief). It feeds the **Versões** menu of `<StudioTools versions={…} />`.
- Routes in `app/v<N>/`, components in `components/v<N>/`, CSS scoped to `.v<N>` with the `v<N>-` prefix.
- Round brief in `briefs/BRIEF-v<N>.md`: critique received (verbatim), references, decisions, workstreams and file owners.
- **Never edit the folders of previous rounds.** The new round can import from them; if something needs to change, copy it into the new folder. A fix in a shared component that would change the look of an old round goes into the new folder.
- New round: `/round` (command in `.claude/commands/round.md`).

## 7. Design tools (`@studio/design-tools`)

In dev (and in preview with `?tools=1`), the floating `<StudioTools />` bar brings Ajustar, Tipo, Tema, Grid and Versões; `<Montar />` composes pages. When they are off, the page is identical to the original. They never go into the client's production build.

- **Ajustar:** the person clicks an element, writes, sends. The request becomes a line in `feedback/inbox.jsonl` (via the project's `feedback` receiver, port 3999). To read and apply them, use the `studio-feedback` skill (or `/feedback`). Each record has `id`, `ts`, `kind`, `url`, `selector`, `text` (the element's text), `note`, `viewport`, `theme`, `status`.
- When applying a request, set `status: "feito"` (done) (or `"respondido"` (answered) when it is a question, `"recusado"` (declined) with the reason in `reply`; with the receiver running, via `PATCH /__feedback/<id>`) and reply with what changed, file and line. Never delete lines from the inbox.
- **Tipo** swaps the type pairing live: that is why components never write a literal `font-family`; they use `var(--font-display)`, `var(--font-text)`, `var(--font-mono)`.
- **Versões** reads `lib/versions.ts`. A new round without a registry entry does not show up for the client.
- **Taste (MCP `taste`, in `.mcp.json`):** `taste_brief` before creating, `taste_search` and `taste_cluster` to dig deeper, `taste_score` and `taste_compare` on screenshots. The full loop is the `studio-taste` skill (or `/taste <task>`). References give direction, never templates.

## 8. Craft floor (always)

- Copy in PT-BR (or in the project's language). No em dash in the interface. No "not X, but Y" and no empty punchlines. No lorem, no placeholder, no dead button.
- A defined grid, respected (12 columns desktop, 4 mobile, margins and gutters from tokens). Nothing "eyeballed".
- Numbers: `tabular-nums` where they change or are compared; currency with symbol and cents following the project rule (see `studio-type`).
- Motion: only `transform`, `opacity`, light `filter` and `clip-path`. Closing faster than opening. `prefers-reduced-motion` shows the final frame. Hover only within `(hover: hover)`.
- Canvas and WebGL pause offscreen, DPR at most 2, a beautiful still frame as fallback.
- WCAG 2.2 AA accessibility: contrast, visible focus, keyboard for every gesture, labels, 44 px touch targets.
- Illustrative data always marked as illustrative. No invented number, client or testimonial presented as real.

## 9. Definition of done

Before saying a screen or flow is ready (use `studio-qa` or `/qa`):

1. **States:** empty, loading, error, success and edge cases, not just the happy path.
2. **Interaction:** everything clickable has a destination and feedback.
3. **Motion:** every animation has a coherent purpose, duration and curve; closing faster than opening; reduced motion respected.
4. **Accessibility:** keyboard, visible focus, contrast, labels, touch targets. axe with no serious violations.
5. **Visual craft:** clear hierarchy, consistent spacing and type scale, nothing that looks like a template.
6. **Verification:** run it and look. Playwright at 1440×900 and 390×844, light and dark, with and without reduced motion, zero console errors, zero horizontal scroll, close crops of the details.

7. **Taste (visual work):** `taste_score` on the final screenshots (or `taste_compare` across variants), reporting the score as closeness to the collection, not quality (screens: ≥ 45 is a healthy signal, < 30 reads like a template). With no taste data, say no check was run.

**Always say what was verified and what was not.** "I verified X at 1440 and 390; I did not verify Safari or a screen reader" is worth more than "done".

## 10. Working in parallel workstreams

- Each workstream touches only the files it owns (listed in the brief). Need something shared? Do not change it: describe it in the report.
- Contracts between workstreams (component signatures) live in the brief. Change the internals, not the signature.
- Only the director runs the final build.
- Short final report: what you did, files, how to integrate, what you verified, what you did not verify, local URLs.

## 11. Project

- Client: Nível 13
- Product and audience: `docs/` (fill it in at kickoff with `/kickoff`).
- Current round: see `lib/versions.ts` (`current: true`).
