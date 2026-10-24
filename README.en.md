# Nível 13 · A Virada

> English. PT-BR: [README.md](README.md).

Casual 2.5D pixel-art web game modeled on the reference image: a cracked stone "13" monument on a hill above Rio at night, with an RPG HUD (level, XP, hearts, stats, menu, skills, minimap). It opens straight from a WhatsApp link, with no install and no sign-up.

- **Journey:** 13 levels of 1 to 2 minutes each, each one with a different mechanic, about 20 minutes in total. Every level ends with a sourced fact card, and the monument rebuilds as you progress. At level 13, the crown descends.
- **Daily Challenge:** 5 Fact-or-Fake cards, the same for everyone, with a Wordle-style emoji result and a day streak.
- **Placar da Virada (leaderboard):** movement by state (anonymous declaration), invite chains (players who finished through your link) and the most convincing facts (👍).
- **Sharing:** 1080×1920 cards generated on the device (achievement, income-tax savings, "I will vote", daily result), ready-made WhatsApp text and an OG preview.

## Run

```bash
pnpm install                                   # at the monorepo root
pnpm --filter @projects/nivel-13 dev:api       # local API on :8787 (SQLite via node:sqlite)
pnpm --filter @projects/nivel-13 dev           # game at http://localhost:4213
pnpm --filter @projects/nivel-13 build         # static dist/
```

Without the API the game runs fully on the device; only the live leaderboard is unavailable.

## Deploy

1. **Static site** (Cloudflare Pages, Vercel or Netlify): build `dist/` with these variables:
   - `VITE_RESPONSAVEL` (required): the name and tax ID of the party responsible for the material. It shows in the footer, in "Sobre" and on every card.
   - `VITE_SITE_URL`: the public site URL.
   - `VITE_API_URL`: the Worker URL ending in `/api`.
   - `VITE_ELECTION_AT` and `VITE_ELECTION_LABEL`: optional. The default is 25/10/2026, 8am to 5pm.
2. **API** (Cloudflare Worker + D1) from `worker/`. The steps are in `worker/wrangler.toml` and in the PT-BR README.

## Before publishing (required)

- [ ] **Legal review of every card** in `src/content/` and in the `linha`, `memoria` and `chefe` games. Legal status must be exact: "convicted" only where there is a conviction.
- [ ] **Re-check dates and figures** against primary sources on deploy day. The research was done on 23–24 Oct 2026.
- [ ] **TSE rules (Res. 23.610/2019, as amended in 2024 and 2026):** AI is used throughout (code, art and copy), so the AI label is on the footer and on every card. The press reported that new synthetic content is banned in the 72 hours before the vote, and publishing or boosting new material on election day is a crime. Confirm with counsel whether and when the game can go live.
- [ ] **Paid boosting** is allowed only for candidates, parties or coalitions, under their tax ID.
- [ ] No rewards are tied to voting (Electoral Code, art. 299). The movement choice is stored as an HMAC of the device id plus the state, never linked to a nickname (LGPD, art. 11).

## Design decisions

- **No violence against real people.** Bosses are objects (minutas, jewels, a hydra of rumors). Real people appear only as neutral portraits on cards.
- **No invented quotes** attributed to real people.
- **Credibility first.** Fact-or-Fake also debunks exaggerations against the other side.
- **Weight.** The first screen costs 47 KB gzip of JS. The 3D monument (137 KB gzip) loads after the first frame, and a 2D fallback appears without WebGL. Audio is synthesized at runtime.
- **Accessibility.** Keyboard support everywhere, `prefers-reduced-motion`, text captions, and a "Modo leitura" (reading mode) in the collection.
