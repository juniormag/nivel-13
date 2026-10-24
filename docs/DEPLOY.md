# Deploy

> PT-BR. English: [DEPLOY.en.md](DEPLOY.en.md).

O jogo é um site estático (`dist/`) e uma API pequena. Em produção: **Cloudflare Pages** para o site, **Cloudflare Workers** para a API e **Cloudflare D1** (SQLite) para o banco. Tudo cabe no plano gratuito para uma campanha curta, mas confira os limites do D1 e do Workers antes de impulsionar.

Antes de qualquer passo, passe a lista **Antes de publicar** do [`README.md`](../README.md#antes-de-publicar-obrigatório). Ela é obrigatória.

## 0. Pré-requisitos

- Conta Cloudflare com acesso a Workers, D1 e Pages.
- Node 22 ou mais novo e pnpm. `pnpm install` na raiz.
- Wrangler 4, usado via `npx wrangler@4` (não precisa instalar). Faça login uma vez:
  ```bash
  npx wrangler@4 login
  ```
- Os comandos abaixo rodam da raiz do repositório.

## 1. Banco (D1)

```bash
npx wrangler@4 d1 create nivel13
```

Copie o `database_id` impresso e cole em `worker/wrangler.toml`, no lugar de `00000000-0000-0000-0000-000000000000`. Depois crie as tabelas:

```bash
pnpm db:init:remote
# o mesmo que: npx wrangler@4 d1 execute nivel13 --remote --file=worker/schema.sql --config worker/wrangler.toml
```

O schema usa `CREATE TABLE IF NOT EXISTS`, então rodar de novo não apaga nada.

## 2. API (Worker)

1. **Segredo do HMAC.** Gere um texto aleatório longo e guarde fora do repositório (gerenciador de senhas). Ele protege a ligação entre aparelho e escolha no movimento: trocar o `SALT` depois faz cada aparelho contar de novo.
   ```bash
   openssl rand -base64 48
   npx wrangler@4 secret put SALT --config worker/wrangler.toml
   ```
2. **Origem do site.** Em `worker/wrangler.toml`, troque `ALLOWED_ORIGIN` pela URL pública do site, sem barra no fim (por exemplo `https://nivel13.pages.dev`). Aceita lista separada por vírgula, para incluir um domínio próprio. Nunca use `*` em produção.
3. **Limite por IP.** `RATE_PER_MIN` (padrão 40 escritas por minuto por IP). Celulares atrás da mesma operadora podem dividir IP: se o placar mostrar muitos 429, suba para 80 ou 120.
4. **Publicar:**
   ```bash
   pnpm deploy:api
   ```
   O Wrangler imprime a URL, algo como `https://nivel13-api.SUA-CONTA.workers.dev`.
5. **Conferir:**
   ```bash
   curl -s https://nivel13-api.SUA-CONTA.workers.dev/api/health
   # {"ok":true,"day":"2026-10-24"}
   curl -s -i -X OPTIONS https://nivel13-api.SUA-CONTA.workers.dev/api/hello \
     -H 'origin: https://nivel13.pages.dev' -H 'access-control-request-method: POST' | grep -i access-control-allow-origin
   ```
   A segunda chamada precisa devolver a origem do site. Com outra origem, o cabeçalho não aparece.

## 2b. Chuta Aí: preview `/c/:n` e expurgo

- **Tabelas novas.** O schema do Chuta Aí (chute, duelo, grupo, eventos) está no mesmo `worker/schema.sql`. Num banco que já existe, rode `pnpm db:init:remote` de novo: só cria o que falta.
- **`SITE_URL` e `RESPONSAVEL`** em `worker/wrangler.toml`. `/c/:n` manda a pessoa para `SITE_URL/?c=n&…`, usa `SITE_URL/og/c-{n}.png` como imagem (ou `SITE_URL/og.png` se esse arquivo não existir) e põe "Propaganda eleitoral · RESPONSAVEL · rótulo de IA" no `og:description`.
- **Onde fica `/c/:n`.** O link compartilhado precisa cair no Worker:
  - com domínio próprio (recomendado): rotas do Worker para `seu-dominio/api/*` e `seu-dominio/c/*` (ver o passo 4), e o link fica `https://seu-dominio/c/5`;
  - sem domínio próprio: o link usa a URL do Worker, `https://nivel13-api.SUA-CONTA.workers.dev/c/5`, que redireciona para o site.
  Confira o preview colando o link numa conversa do WhatsApp (Android e iOS).
- **Expurgo.** `[triggers] crons` roda todo dia às 00:17 de Brasília: limpa a tabela `rate` e, a partir de `PURGE_AT` (30/11/2026), apaga **todas** as tabelas. O cron é publicado junto com `pnpm deploy:api`; confira em Workers & Pages, nivel13-api, Settings, Triggers. Para testar localmente:
  ```bash
  npx wrangler@4 dev --config worker/wrangler.toml --test-scheduled
  curl "http://localhost:8787/__scheduled?cron=17+3+*+*+*"
  ```
- **Apagar dados de um aparelho** (pedido pela LGPD): o jogo chama `POST /api/apagar`. Não há outro jeito de ligar um pedido a um aparelho, porque não guardamos dado pessoal.

## 3. Site (Pages)

Variáveis do build (detalhes no README):

| Variável | Valor |
|---|---|
| `VITE_RESPONSAVEL` | nome e CPF/CNPJ do responsável (**obrigatório**) |
| `VITE_SITE_URL` | `https://nivel13.pages.dev` (ou o domínio próprio) |
| `VITE_API_URL` | `https://nivel13-api.SUA-CONTA.workers.dev/api` |
| `VITE_ELECTION_AT`, `VITE_ELECTION_LABEL` | só se a data mudar |

**Opção A, upload direto (recomendada).** Build local ou no CI, upload do `dist/`:

```bash
VITE_RESPONSAVEL="Nome, CNPJ 00.000.000/0000-00" \
VITE_SITE_URL="https://nivel13.pages.dev" \
VITE_API_URL="https://nivel13-api.SUA-CONTA.workers.dev/api" \
pnpm build
npx wrangler@4 pages deploy dist --project-name nivel13
```

Na primeira vez o Wrangler pergunta se pode criar o projeto `nivel13`.

**Opção B, Git.** No painel: Workers & Pages, Create, Pages, Connect to Git. Build command `pnpm build`, output `dist`, e as variáveis acima mais `NODE_VERSION=22`. Confira no log do primeiro build se o pnpm usado é o do `packageManager`.

## 4. Domínio próprio (opcional)

- Ligue o domínio ao projeto Pages (Custom domains) e acrescente-o em `ALLOWED_ORIGIN` e em `VITE_SITE_URL`.
- Para servir a API e o preview no mesmo domínio e dispensar CORS, crie rotas do Worker para `seu-dominio/api/*` e `seu-dominio/c/*` (em `worker/wrangler.toml`, `routes = [{ pattern = "seu-dominio/api/*", zone_name = "seu-dominio" }, { pattern = "seu-dominio/c/*", zone_name = "seu-dominio" }]`) e faça o build com `VITE_API_URL=/api`.

## 5. Depois de publicar

- [ ] Abrir o site no celular pelo link do WhatsApp: título, fase 1, carta de fato.
- [ ] Rodapé com rótulo de IA e responsável preenchido; o mesmo num card compartilhado.
- [ ] Placar carrega (DevTools, rede: `/api/stats` com 200 e `cache-control: no-store`).
- [ ] Convite: abrir `SITE/?r=<id>` em outro aparelho, terminar o jogo e ver a corrente subir 1, uma vez só.
- [ ] Logs ao vivo: `npx wrangler@4 tail --config worker/wrangler.toml`.

## 6. Reverter e operar

- **API:** `npx wrangler@4 rollback --config worker/wrangler.toml` volta para a versão anterior.
- **Site:** no painel do Pages, Deployments, escolha o anterior e "Rollback".
- **Backup do banco:** `npx wrangler@4 d1 export nivel13 --remote --output=backup.sql` (não versionar: tem ids de aparelho).
- **Limpeza:** a tabela `rate` se limpa sozinha (linhas de dias anteriores). Para encerrar a campanha, apague o Worker e o banco (`npx wrangler@4 d1 delete nivel13`); não há dado pessoal, mas não guarde o que não precisa.
- **Tirar do ar rápido** (por exemplo, por ordem judicial ou no período vedado): no Pages, troque o deploy atual por uma página estática simples, ou desative o domínio. A API pode ficar ou ser apagada com `npx wrangler@4 delete --config worker/wrangler.toml`.

## Desenvolvimento local

`pnpm dev:api` sobe a mesma app Hono em Node com `node:sqlite` na porta 8787 (banco em `server/.data/dev.sqlite`; `DB_FILE=:memory:` para descartável). `pnpm dev` faz proxy de `/api` para lá. Em dev, `ALLOWED_ORIGIN` é `*` e `SITE_URL` é `http://localhost:4313`. O Vite não faz proxy de `/c/*`: para ver o preview em dev, abra `http://localhost:8787/c/5`.
