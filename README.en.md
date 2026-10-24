# Nível 13 · A Virada

> English. PT-BR: [README.md](README.md).

A casual web game in modern pixel art for undecided Brazilian voters, played on a phone after tapping a WhatsApp link. It opens straight away, with no install and no sign-up.

- **Journey:** 13 levels of 1 to 2 minutes, each with its own mechanic and ending on a sourced fact card. The "13" monument rebuilds itself level by level, and at level 13 the crown comes down.
- **Daily Challenge:** 5 Fact-or-Fake cards, the same for the whole country, with an emoji result and a day streak.
- **Placar da Virada (scoreboard):** movement by state (anonymous declaration), invite chain (counts people who finish the game from your link) and the most convincing facts (👍).
- **Share:** cards rendered on the device, ready-made WhatsApp text and an OG preview.

Game design in [`docs/GAME-DESIGN.md`](docs/GAME-DESIGN.md), art direction in [`docs/ART-DIRECTION.md`](docs/ART-DIRECTION.md) (both in Portuguese).

## Stack

| Layer | Tool |
|---|---|
| Build | Vite 8, TypeScript 5.9 |
| Screens, HUD and overlays | React 19, Zustand (state and on-device save) |
| Mini-games | PixiJS 8, logical resolution with nearest scaling |
| Title world | three / React Three Fiber |
| Scoreboard API | Hono on Cloudflare Workers + D1 (SQLite); in dev, the same app on Node with `node:sqlite` |
| Quality | Vitest, Playwright, Biome, GitHub Actions |

Requires Node 22 or newer and pnpm (version pinned in `packageManager` in `package.json`).

## Run

```bash
pnpm install
pnpm dev:api     # local API at http://localhost:8787/api (SQLite in server/.data/dev.sqlite)
pnpm dev         # game at http://localhost:4313 (Vite proxies /api to 8787)
```

Without the API the whole game still works on the device; only the live scoreboard is unavailable.

| Script | What it does |
|---|---|
| `pnpm dev` | Vite dev server on port 4313 |
| `pnpm dev:api` | local API on 8787 (`DB_FILE=:memory:` for a throwaway DB, `PORT` for another port) |
| `pnpm typecheck` | `tsc` for the game, the Worker (`worker/tsconfig.json`) and the tests (`tests/tsconfig.json`) |
| `pnpm lint` | Biome on the whole repo |
| `pnpm format` | Biome formatting in place |
| `pnpm test` | Vitest: API, API client, rng, save, scoring, rounds and the income-tax math |
| `pnpm test:watch` | Vitest in watch mode |
| `pnpm e2e` | Playwright: Chromium smoke test at 390×844 (starts the game and API if they are not running) |
| `pnpm build` | static `dist/` |
| `pnpm preview` | serves `dist/` on 4313 |
| `pnpm db:init:remote` | applies `worker/schema.sql` to the production D1 |
| `pnpm deploy:api` | deploys the Worker (`worker/wrangler.toml`) |

To run e2e with a Chromium already on the machine: `PW_CHROMIUM=/path/to/chrome pnpm e2e`. Otherwise run `pnpm exec playwright install chromium` first.

## Environment variables (site build)

Read at build time by Vite (`src/config.ts`). In dev, use an untracked `.env.local`.

| Variable | Required | Purpose |
|---|---|---|
| `VITE_RESPONSAVEL` | **yes** | Name and CPF/CNPJ of whoever is legally responsible for the piece. Shown in the footer, in "Sobre" and on every card. Without it the game shows "(preencher VITE_RESPONSAVEL)". |
| `VITE_SITE_URL` | recommended | Public URL, no trailing slash. Used in invite links (`?r=`) and cards. Default: the page origin. |
| `VITE_API_URL` | in production | API URL ending in `/api` (for example `https://nivel13-api.YOUR.workers.dev/api`). Default: `/api`. |
| `VITE_ELECTION_AT` | no | Polls opening time in ISO 8601. Default: `2026-10-25T08:00:00-03:00`. |
| `VITE_ELECTION_LABEL` | no | Date label. Default: "domingo, 25 de outubro, das 8h às 17h". |

Worker variables (in `worker/wrangler.toml` or as a secret): `ALLOWED_ORIGIN` (site URL; comma-separated list allowed), `SITE_URL` (where `/c/:n` redirects and the `og:image` base), `RESPONSAVEL` (same as `VITE_RESPONSAVEL`, shown in the preview), `RATE_PER_MIN` (default 40), `PURGE_AT` (purge date, default 30 Nov 2026) and the `SALT` secret. Details in [`docs/DEPLOY.en.md`](docs/DEPLOY.en.md).

## Deploy

Summary: static site on Cloudflare Pages, API on Cloudflare Workers with a D1 database. The full walkthrough, with verification and rollback, is in [`docs/DEPLOY.en.md`](docs/DEPLOY.en.md).

```bash
npx wrangler@4 login
npx wrangler@4 d1 create nivel13            # paste the database_id into worker/wrangler.toml
pnpm db:init:remote                          # creates the tables
npx wrangler@4 secret put SALT --config worker/wrangler.toml
pnpm deploy:api                              # set ALLOWED_ORIGIN in wrangler.toml first
VITE_RESPONSAVEL="..." VITE_SITE_URL="https://..." VITE_API_URL="https://.../api" pnpm build
npx wrangler@4 pages deploy dist --project-name nivel13
```

## Before publishing (mandatory)

- [ ] **Legal review of every card** in `src/content/facts.ts`, `src/content/statements.ts`, `src/content/levels.ts` and the level texts in `src/games/linha.ts`, `src/games/memoria.ts` and `src/games/chefe.ts`. Legal status must be exact: "convicted" only with a conviction. Flávio Bolsonaro was never a defendant in the "rachadinhas" case, and the game says so. He sues people who talk about the case.
- [ ] **Dates and numbers** re-checked against the primary source on deploy day. Research was done on 23 and 24 Oct 2026.
- [ ] **`VITE_RESPONSAVEL` set** to a real name and CPF/CNPJ, and checked in the footer, in "Sobre" and on a shared card.
- [ ] **TSE rules (Res. 23.610/2019, updated in 2024 and 2026):** the piece uses AI (code, art and text), so it carries the AI label in the footer and on every card. The press reported that releasing new synthetic content in the 72 h before the vote is prohibited, and that publishing or boosting new campaign material on election day is a crime. Confirm with legal whether and when it can go live.
- [ ] **Paid boosting** only by a candidate, party or coalition, with a CNPJ.
- [ ] **No reward tied to voting:** the scoreboard gives no prize or points for a vote (art. 299 of the Electoral Code).
- [ ] **Privacy (LGPD):** the movement choice is stored as an HMAC of the device id plus the state, with no nickname (art. 11). The production `SALT` is long, random and not in the repo.
- [ ] **CORS closed:** `ALLOWED_ORIGIN` points only at the site URL, never `*`.
- [ ] **Purge announced:** the Sobre screen says everything is deleted on 30 Nov 2026, and `PURGE_AT` in `wrangler.toml` matches. A "delete my data" button exists (`api.apagar()`).
- [ ] **Link preview** (`/c/:n`) with `RESPONSAVEL` set: `og:description` carries "Propaganda eleitoral · responsible party · AI label". Validate with legal (VIRAL-DESIGN §3.6).

## API and privacy

The API is a Hono app: `worker/src/index.ts` (scoreboard), `worker/src/viral.ts` (Chuta Aí), `worker/src/og.ts` (`/c/:n` preview) and `worker/src/worker.ts` (Worker entry). The same code runs on Cloudflare Workers and on Node (`server/dev-api.mjs`). Chuta Aí spec in [`docs/VIRAL-DESIGN.md`](docs/VIRAL-DESIGN.md) §5.3 and §5.5 (Portuguese).

| Route | Method | What it does |
|---|---|---|
| `/api/health` | GET | `{ ok, day }`, checks the database |
| `/api/hello` | POST | registers or updates the device: `id`, `name` (optional, filtered nickname), `uf`, `avatar`, `ref` |
| `/api/complete` | POST | marks the game as finished; the inviter's chain gains 1 only on the first completion (at most 300 per day) |
| `/api/like` | POST | 👍 on a fact, one per device; returns `{ ok, likes }` |
| `/api/movimento` | POST | `vou`, `virei` or `pensando`, stored under an HMAC of the id, with state and no nickname |
| `/api/daily` | POST | Daily Challenge result (0 to 5), one per device per day; accepted from 2 days ago to tomorrow |
| `/api/stats` | GET | aggregated scoreboard numbers; never returns ids |
| `/api/chute` | POST | a Chuta Aí game `{ id, date, s, b?, via? }`: total computed on the server (weights 2-2-3-3-3), one per device per day, id-free histogram; returns `{ ok, pct, plays, total }`. A device's first game coming from a duel or group link counts as an invite-chain link |
| `/api/chute/:date` | GET | "Brasil chutou": `{ plays, hist[5][21], totals[14] }`, public cache for 60 s |
| `/api/duelo` | POST | creates a Tira-teima `{ id, date, s }` → `{ code }` (6 letters; up to 20 per device per day) |
| `/api/duelo/:code` | GET | challenger's `{ date, n, s, total, name, avatar }`, no id |
| `/api/duelo/:code/resp` | POST | answers `{ id, s }` → `{ ok, them, me }`; once per device, the owner cannot answer |
| `/api/duelo/mine?id=` | GET | `[{ code, accepts, wins }]` |
| `/api/grupo` | POST | creates a group board `{ id }` → `{ code, nome }` (generated name, animal + 2 digits; up to 10 groups per device) |
| `/api/grupo/:code/entrar`, `/sair` | POST | join (up to 50 members) or leave; the last one out deletes the group |
| `/api/grupo/:code?date=&id=` | GET | `{ nome, date, n, hoje, semana, membros }` with nickname, avatar, total and streak; never state, vote or id |
| `/api/apagar` | POST | LGPD: deletes everything from the device (player, games, duels, groups, likes, daily and movement via HMAC) |
| `/api/ev` | POST | event counter from the §5.5 list `{ e, k? }`, no id |
| `/c/:n` | GET | OG page for WhatsApp that redirects to `SITE_URL/?c=n&…`; `og:image` is `/og/c-{n}.png` or `/og.png` |

Rules: no personal data (the id is random and generated on the device) and no id in any response; manual validation of every field (body up to 2 KB); per-IP, per-minute rate limits (40 writes, 60 reads by code, 120 aggregate reads), with the IP stored only as an HMAC; CORS from `ALLOWED_ORIGIN`; `cache-control: no-store` except where noted above. The group board never queries the movement table. A daily cron deletes **all** data from 30 Nov 2026 (`PURGE_AT`). The D1 schema lives in `worker/schema.sql`.

## Tests

- `tests/api.test.ts`: the Hono app against in-memory SQLite (through the same adapter as the local server, `server/d1-sqlite.mjs`): scoreboard routes, invite chain, privacy, CORS, rate limit and validation.
- `tests/viral.test.ts`: Chuta Aí, Brasil chutou, duel, group, deletion, events, `/c/:n` and purge. Every response is checked to contain no device id.
- `tests/api-client.test.ts`: the `src/lib/api.ts` client talking to the real app (the test `fetch` hands each request to Hono).
- `tests/rng.test.ts`, `tests/save.test.ts`: pure logic (mulberry32, shuffle, save actions and the daily streak).
- `tests/ir.test.ts`: the income-tax math (R$ 5,000 gives R$ 312.89 per month and R$ 4,067.57 per year). Skipped while `src/games/ir.ts` does not export `economiaIR`, `reducao` and `tabela`.
- `tests/e2e/smoke.spec.ts`: opens the title, enters level 1, sees the intro, taps the screen and fails on any console error.

CI (`.github/workflows/ci.yml`) runs typecheck, lint, tests and build on every push and PR, then e2e on Chromium.

## Agent team and parallel work

The Claude Code agent definitions live in [`.claude/agents/`](.claude/agents):

| Agent | Owns |
|---|---|
| `game-director` | mechanics, pacing, difficulty curve and share moments; reviews, does not write engine code |
| `gameplay-engineer` | PixiJS mini-games in `src/games` (`MicroGame` contract) |
| `pixel-art-director` | scenery, sprites, VFX, 3D monument and palette |
| `ui-engineer` | React screens, HUD, pixel components and accessibility |
| `growth-share-engineer` | cards, OG and invite chain |
| `sound-designer` | WebAudio effects and music |
| `fact-checker` | fact, source and legal risk of every text |
| `backend-engineer` | API, privacy, tests, CI and deploy |
| `qa-playtester` | plays everything through Playwright and returns prioritized bugs |

To work in parallel without conflicts, each agent only edits the files it owns, per the table in [`docs/OWNERSHIP.md`](docs/OWNERSHIP.md). Cross-area contracts (`src/engine/types.ts`, `src/lib/api.ts`, `src/share/types.ts`, `src/ui/WorldStage.tsx`) change only through their owner. An agent that needs something outside its area does not edit it: it describes what it needs and why in its report, and the main session relays it. A practical flow:

1. The main session (director) settles the contracts and hands out tasks, one per agent, naming each agent's files.
2. Agents run at the same time, each checking only its own files (`npx biome check <files>`, `npx tsc -p .`, `pnpm test`).
3. At the end the main session merges, runs `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build` and `pnpm e2e`, and asks `qa-playtester` for a pass with screenshots at 390×844 and 1440×900.

## Layout

```
src/
  main.tsx, app/       entry, navigation and React screens
  engine/              level Runner and MicroGame contract
  games/               the 13 mini-games
  scene/               scenery and monument
  content/             sourced facts, Fact or Fake, levels
  state/               on-device save (zustand) and match state
  share/               cards and sharing
  lib/                 scoreboard api, rng, pixel, sprites, time
  ui/                  components and styles
worker/                API (Hono + D1), schema.sql, wrangler.toml
server/                the same API on Node with local SQLite
tests/                 Vitest (unit) and e2e/ (Playwright)
```
