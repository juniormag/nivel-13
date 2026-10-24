# Nível 13 · A Virada

> PT-BR. English: [README.en.md](README.en.md).

Jogo web casual em pixel art moderna para o eleitor brasileiro indeciso, no celular, chegando pelo link do WhatsApp. Abre direto, sem instalar nem cadastrar.

- **Jornada:** 13 fases de 1 a 2 minutos, cada uma com uma mecânica diferente e terminando numa carta de fato com fonte. O monumento "13" se reconstrói a cada fase, e no nível 13 a coroa desce.
- **Desafio do Dia:** 5 cartas de Fato ou Fake iguais para o Brasil todo, resultado em emoji e sequência de dias.
- **Placar da Virada:** movimento por estado (declaração anônima), corrente de convites (conta quem termina o jogo pelo seu link) e os fatos que mais convencem (👍).
- **Compartilhar:** cards gerados no aparelho, texto pronto para o WhatsApp e prévia OG.

Design do jogo em [`docs/GAME-DESIGN.md`](docs/GAME-DESIGN.md), direção de arte em [`docs/ART-DIRECTION.md`](docs/ART-DIRECTION.md).

## Stack

| Camada | Ferramenta |
|---|---|
| Build | Vite 8, TypeScript 5.9 |
| Telas, HUD e overlays | React 19, Zustand (estado e save no aparelho) |
| Minijogos | PixiJS 8, em resolução lógica com escala nearest |
| Mundo do título | three / React Three Fiber |
| API do placar | Hono em Cloudflare Workers + D1 (SQLite); em dev, a mesma app em Node com `node:sqlite` |
| Qualidade | Vitest, Playwright, Biome, GitHub Actions |

Requer Node 22 ou mais novo e pnpm (versão em `packageManager` no `package.json`).

## Rodar

```bash
pnpm install
pnpm dev:api     # API local em http://localhost:8787/api (SQLite em server/.data/dev.sqlite)
pnpm dev         # jogo em http://localhost:4313 (o Vite faz proxy de /api para a 8787)
```

Sem a API, o jogo funciona inteiro no aparelho: só o placar ao vivo fica indisponível.

| Script | O que faz |
|---|---|
| `pnpm dev` | servidor do Vite na porta 4313 |
| `pnpm dev:api` | API local na 8787 (`DB_FILE=:memory:` para banco descartável, `PORT` para outra porta) |
| `pnpm typecheck` | `tsc` do jogo, do Worker (`worker/tsconfig.json`) e dos testes (`tests/tsconfig.json`) |
| `pnpm lint` | Biome no repositório inteiro |
| `pnpm format` | Biome formatando no lugar |
| `pnpm test` | Vitest: API, rng, save e conta do IR |
| `pnpm test:watch` | Vitest em modo observação |
| `pnpm e2e` | Playwright: fumaça no Chromium em 390×844 (sobe jogo e API se não estiverem rodando) |
| `pnpm build` | `dist/` estático |
| `pnpm preview` | serve o `dist/` na 4313 |
| `pnpm db:init:remote` | aplica `worker/schema.sql` no D1 de produção |
| `pnpm deploy:api` | publica o Worker (`worker/wrangler.toml`) |

Para o e2e com um Chromium já instalado na máquina: `PW_CHROMIUM=/caminho/do/chrome pnpm e2e`. Sem isso, rode antes `pnpm exec playwright install chromium`.

## Variáveis de ambiente (build do site)

Lidas no build pelo Vite (`src/config.ts`). Em dev, use um `.env.local` (não versionado).

| Variável | Obrigatória | Para quê |
|---|---|---|
| `VITE_RESPONSAVEL` | **sim** | Nome e CPF/CNPJ de quem responde pela peça. Aparece no rodapé, no "Sobre" e em todo card. Sem ela, o jogo mostra "(preencher VITE_RESPONSAVEL)". |
| `VITE_SITE_URL` | recomendada | URL pública, sem barra no fim. Usada nos links de convite (`?r=`) e nos cards. Padrão: a origem da página. |
| `VITE_API_URL` | em produção | URL da API terminando em `/api` (por exemplo `https://nivel13-api.SEU.workers.dev/api`). Padrão: `/api`. |
| `VITE_ELECTION_AT` | não | Abertura das urnas em ISO 8601. Padrão: `2026-10-25T08:00:00-03:00`. |
| `VITE_ELECTION_LABEL` | não | Texto da data. Padrão: "domingo, 25 de outubro, das 8h às 17h". |

Variáveis do Worker (em `worker/wrangler.toml` ou como segredo): `ALLOWED_ORIGIN` (URL do site; lista separada por vírgula), `RATE_PER_MIN` (padrão 40) e o segredo `SALT`. Detalhes em [`docs/DEPLOY.md`](docs/DEPLOY.md).

## Publicar

Resumo: site estático no Cloudflare Pages, API no Cloudflare Workers com banco D1. O passo a passo completo, com verificação e reversão, está em [`docs/DEPLOY.md`](docs/DEPLOY.md).

```bash
npx wrangler@4 login
npx wrangler@4 d1 create nivel13            # cole o database_id em worker/wrangler.toml
pnpm db:init:remote                          # cria as tabelas
npx wrangler@4 secret put SALT --config worker/wrangler.toml
pnpm deploy:api                              # antes, ajuste ALLOWED_ORIGIN no wrangler.toml
VITE_RESPONSAVEL="..." VITE_SITE_URL="https://..." VITE_API_URL="https://.../api" pnpm build
npx wrangler@4 pages deploy dist --project-name nivel13
```

## Antes de publicar (obrigatório)

- [ ] **Revisão jurídica de cada carta** em `src/content/facts.ts`, `src/content/statements.ts`, `src/content/levels.ts` e nos textos das fases `src/games/linha.ts`, `src/games/memoria.ts` e `src/games/chefe.ts`. O status jurídico precisa estar exato: "condenado" só com condenação. Flávio Bolsonaro nunca foi réu no caso das rachadinhas, e o jogo diz isso. Ele processa quem fala do caso.
- [ ] **Datas e números** reconferidos na fonte primária no dia do deploy. A pesquisa foi feita em 23 e 24/10/2026.
- [ ] **`VITE_RESPONSAVEL` preenchida** com nome e CPF/CNPJ reais, e conferida no rodapé, no "Sobre" e num card compartilhado.
- [ ] **Regras do TSE (Res. 23.610/2019, atualizada em 2024 e 2026):** a peça usa IA (código, arte e texto) e por isso leva o rótulo de IA no rodapé e em todo card. A imprensa noticiou que é vedada a divulgação de conteúdo sintético novo nas 72 h antes da votação, e no dia da eleição publicar ou impulsionar propaganda nova é crime. Confirme com o jurídico se e quando pode ir ao ar.
- [ ] **Impulsionamento pago** só por candidato, partido ou coligação, com CNPJ.
- [ ] **Nenhuma recompensa ligada a voto:** o placar não dá prêmio nem ponto por voto (art. 299 do Código Eleitoral).
- [ ] **Privacidade (LGPD):** a escolha no movimento é guardada como HMAC do id do aparelho mais a UF, sem apelido (art. 11). O `SALT` de produção é longo, aleatório e não está no repositório.
- [ ] **CORS fechado:** `ALLOWED_ORIGIN` aponta só para a URL do site, nunca `*`.

## API e privacidade

A API (`worker/src/index.ts`) é uma app Hono. O mesmo código roda no Cloudflare Workers e em Node (`server/dev-api.mjs`).

| Rota | Método | O que faz |
|---|---|---|
| `/api/health` | GET | `{ ok, day }`, verifica o banco |
| `/api/hello` | POST | registra ou atualiza o aparelho: `id`, `name` (apelido opcional, filtrado), `uf`, `avatar`, `ref` |
| `/api/complete` | POST | marca o jogo como terminado; a corrente de quem convidou ganha 1 só na primeira conclusão (no máximo 300 por dia) |
| `/api/like` | POST | 👍 num fato, um por aparelho; devolve `{ ok, likes }` |
| `/api/movimento` | POST | `vou`, `virei` ou `pensando`, guardado sob HMAC do id, com UF e sem apelido |
| `/api/daily` | POST | resultado do Desafio do Dia (0 a 5), um por aparelho e dia; aceita só ontem, hoje e amanhã |
| `/api/stats` | GET | números agregados do placar; nunca devolve ids |

Regras: nenhum dado pessoal (o id é aleatório e gerado no aparelho); validação manual de todo campo (corpo até 2 KB); limite por IP e por minuto, com o IP guardado só como HMAC; CORS a partir de `ALLOWED_ORIGIN`; `cache-control: no-store` em toda resposta. O schema do D1 fica em `worker/schema.sql`.

## Testes

- `tests/api.test.ts`: a app Hono contra SQLite em memória (pelo mesmo adaptador do servidor local, `server/d1-sqlite.mjs`): todas as rotas, corrente, privacidade, CORS, limite de taxa e validação.
- `tests/rng.test.ts`, `tests/save.test.ts`: lógica pura (mulberry32, shuffle, ações do save e sequência do diário).
- `tests/ir.test.ts`: a conta do IR (R$ 5.000 dá R$ 312,89 por mês e R$ 4.067,57 por ano). Fica pulado enquanto `src/games/ir.ts` não exportar `economiaIR`, `reducao` e `tabela`.
- `tests/e2e/smoke.spec.ts`: abre o título, entra na fase 1, vê a introdução, toca na tela e falha se aparecer erro no console.

O CI (`.github/workflows/ci.yml`) roda typecheck, lint, testes e build em todo push e PR, e depois o e2e no Chromium.

## Equipe de agentes e trabalho em paralelo

As definições dos agentes do Claude Code ficam em [`.claude/agents/`](.claude/agents):

| Agente | Cuida de |
|---|---|
| `game-director` | mecânica, ritmo, curva e momentos de share; revisa, não escreve motor |
| `gameplay-engineer` | minijogos PixiJS em `src/games` (contrato `MicroGame`) |
| `pixel-art-director` | cenário, sprites, VFX, monumento 3D e paleta |
| `ui-engineer` | telas React, HUD, componentes pixel e acessibilidade |
| `growth-share-engineer` | cards, OG e convites com corrente |
| `sound-designer` | efeitos e trilha em WebAudio |
| `fact-checker` | fato, fonte e risco jurídico de cada texto |
| `backend-engineer` | API, privacidade, testes, CI e deploy |
| `qa-playtester` | joga tudo via Playwright e devolve bugs priorizados |

Para trabalhar em paralelo sem conflito, cada agente só edita os arquivos que são seus, conforme a tabela de [`docs/OWNERSHIP.md`](docs/OWNERSHIP.md). Os contratos entre áreas (`src/engine/types.ts`, `src/lib/api.ts`, `src/share/types.ts`, `src/ui/WorldStage.tsx`) mudam só com o dono. Quem precisa de algo fora da sua área não edita: descreve no relatório o que precisa e por quê, e a sessão principal repassa. Um jeito prático:

1. A sessão principal (diretor) fecha os contratos e distribui as tarefas, uma por agente, citando os arquivos de cada um.
2. Os agentes rodam ao mesmo tempo, cada um checando só os seus arquivos (`npx biome check <arquivos>`, `npx tsc -p .`, `pnpm test`).
3. No fim, a sessão principal junta tudo, roda `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build` e `pnpm e2e`, e pede ao `qa-playtester` a rodada com screenshots em 390×844 e 1440×900.

## Estrutura

```
src/
  main.tsx, app/       entrada, navegação e telas React
  engine/              Runner das fases e contrato MicroGame
  games/               os 13 minijogos
  scene/               cenário e monumento
  content/             fatos com fonte, Fato ou Fake, fases
  state/               save no aparelho (zustand) e estado da partida
  share/               cards e compartilhamento
  lib/                 api do placar, rng, pixel, sprites, tempo
  ui/                  componentes e estilo
worker/                API (Hono + D1), schema.sql, wrangler.toml
server/                a mesma API em Node com SQLite local
tests/                 Vitest (unidade) e e2e/ (Playwright)
```
