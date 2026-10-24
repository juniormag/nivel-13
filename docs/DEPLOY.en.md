# Deploy

> English. PT-BR: [DEPLOY.md](DEPLOY.md).

The game is a static site (`dist/`) plus a small API. In production: **Cloudflare Pages** for the site, **Cloudflare Workers** for the API and **Cloudflare D1** (SQLite) for the database. Everything fits the free plan for a short campaign, but check the D1 and Workers limits before boosting.

Before any step, go through the **Before publishing** list in [`README.en.md`](../README.en.md#before-publishing-mandatory). It is mandatory.

## 0. Prerequisites

- A Cloudflare account with Workers, D1 and Pages.
- Node 22 or newer and pnpm. `pnpm install` at the root.
- Wrangler 4, used through `npx wrangler@4` (no install needed). Log in once:
  ```bash
  npx wrangler@4 login
  ```
- Commands below run from the repository root.

## 1. Database (D1)

```bash
npx wrangler@4 d1 create nivel13
```

Copy the printed `database_id` into `worker/wrangler.toml`, replacing `00000000-0000-0000-0000-000000000000`. Then create the tables:

```bash
pnpm db:init:remote
# same as: npx wrangler@4 d1 execute nivel13 --remote --file=worker/schema.sql --config worker/wrangler.toml
```

The schema uses `CREATE TABLE IF NOT EXISTS`, so running it again deletes nothing.

## 2. API (Worker)

1. **HMAC secret.** Generate a long random string and keep it outside the repo (password manager). It protects the link between a device and its movement choice: changing `SALT` later makes every device count again.
   ```bash
   openssl rand -base64 48
   npx wrangler@4 secret put SALT --config worker/wrangler.toml
   ```
2. **Site origin.** In `worker/wrangler.toml`, set `ALLOWED_ORIGIN` to the public site URL, no trailing slash (for example `https://nivel13.pages.dev`). A comma-separated list is allowed, to include a custom domain. Never use `*` in production.
3. **Per-IP limit.** `RATE_PER_MIN` (default 40 writes per minute per IP). Phones behind the same carrier can share an IP: if the scoreboard shows many 429s, raise it to 80 or 120.
4. **Deploy:**
   ```bash
   pnpm deploy:api
   ```
   Wrangler prints the URL, something like `https://nivel13-api.YOUR-ACCOUNT.workers.dev`.
5. **Check:**
   ```bash
   curl -s https://nivel13-api.YOUR-ACCOUNT.workers.dev/api/health
   # {"ok":true,"day":"2026-10-24"}
   curl -s -i -X OPTIONS https://nivel13-api.YOUR-ACCOUNT.workers.dev/api/hello \
     -H 'origin: https://nivel13.pages.dev' -H 'access-control-request-method: POST' | grep -i access-control-allow-origin
   ```
   The second call must echo the site origin. With any other origin the header is absent.

## 3. Site (Pages)

Build variables (details in the README):

| Variable | Value |
|---|---|
| `VITE_RESPONSAVEL` | name and CPF/CNPJ of the responsible party (**required**) |
| `VITE_SITE_URL` | `https://nivel13.pages.dev` (or the custom domain) |
| `VITE_API_URL` | `https://nivel13-api.YOUR-ACCOUNT.workers.dev/api` |
| `VITE_ELECTION_AT`, `VITE_ELECTION_LABEL` | only if the date changes |

**Option A, direct upload (recommended).** Build locally or in CI, then upload `dist/`:

```bash
VITE_RESPONSAVEL="Name, CNPJ 00.000.000/0000-00" \
VITE_SITE_URL="https://nivel13.pages.dev" \
VITE_API_URL="https://nivel13-api.YOUR-ACCOUNT.workers.dev/api" \
pnpm build
npx wrangler@4 pages deploy dist --project-name nivel13
```

The first time, Wrangler asks whether it may create the `nivel13` project.

**Option B, Git.** In the dashboard: Workers & Pages, Create, Pages, Connect to Git. Build command `pnpm build`, output `dist`, plus the variables above and `NODE_VERSION=22`. Check in the first build log that the pnpm in use matches `packageManager`.

## 4. Custom domain (optional)

- Attach the domain to the Pages project (Custom domains) and add it to `ALLOWED_ORIGIN` and `VITE_SITE_URL`.
- To serve the API on the same domain and skip CORS, add a Worker route for `your-domain/api/*` (in `worker/wrangler.toml`, `routes = [{ pattern = "your-domain/api/*", zone_name = "your-domain" }]`) and build with `VITE_API_URL=/api`.

## 5. After publishing

- [ ] Open the site on a phone from a WhatsApp link: title, level 1, fact card.
- [ ] Footer shows the AI label and the responsible party; same on a shared card.
- [ ] Scoreboard loads (DevTools, network: `/api/stats` returns 200 with `cache-control: no-store`).
- [ ] Invite: open `SITE/?r=<id>` on another device, finish the game and see the chain go up by 1, only once.
- [ ] Live logs: `npx wrangler@4 tail --config worker/wrangler.toml`.

## 6. Roll back and operate

- **API:** `npx wrangler@4 rollback --config worker/wrangler.toml` returns to the previous version.
- **Site:** in the Pages dashboard, Deployments, pick the previous one and "Rollback".
- **Database backup:** `npx wrangler@4 d1 export nivel13 --remote --output=backup.sql` (do not commit it: it holds device ids).
- **Cleanup:** the `rate` table cleans itself (rows from previous days). To end the campaign, delete the Worker and the database (`npx wrangler@4 d1 delete nivel13`); there is no personal data, but do not keep what you do not need.
- **Take it down fast** (for example by court order or during the blackout period): in Pages, replace the current deployment with a simple static page, or detach the domain. The API can stay or be deleted with `npx wrangler@4 delete --config worker/wrangler.toml`.

## Local development

`pnpm dev:api` runs the same Hono app on Node with `node:sqlite` on port 8787 (database in `server/.data/dev.sqlite`; `DB_FILE=:memory:` for a throwaway one). `pnpm dev` proxies `/api` there. In dev, `ALLOWED_ORIGIN` is `*`.
