# Nível 13 · A Virada

> PT-BR. English: [README.en.md](README.en.md).

Jogo web casual em pixel art 2.5D, inspirado na imagem de referência: um monumento "13" de pedra rachada no alto de um morro, com o Rio à noite ao fundo, e o HUD de RPG (nível, XP, corações, atributos, menu, habilidades, minimapa). Abre direto pelo link do WhatsApp, sem instalar nem cadastrar.

- **Jornada:** 13 fases de 1 a 2 minutos cada, cada uma com uma mecânica diferente. Leva uns 20 minutos no total. Cada fase termina com uma carta de fato com fonte, e o monumento se reconstrói conforme você avança. No nível 13, a coroa desce.
- **Desafio do Dia:** 5 cartas de Fato ou Fake, iguais para todo mundo, com resultado em emoji (estilo Wordle) e sequência de dias.
- **Placar da Virada:** movimento por estado (declaração anônima), corrente de convites (quem terminou o jogo pelo seu link) e os fatos que mais convencem (👍).
- **Compartilhar:** cards 1080×1920 gerados no aparelho (conquista, economia no IR, "vou votar", desafio do dia), texto pronto para o WhatsApp e prévia OG.

## Fases

| # | Fase | Mecânica | Fato |
|---|---|---|---|
| 1 | Mapa da Fome | pintar o Brasil | Saída do Mapa da Fome (FAO 2025/2026) |
| 2 | Fato ou Fake | arrastar a carta antes do meteoro | checagens |
| 3 | Seu Imposto | calculadora com o salário da pessoa | Lei 15.270/2025 (IR zero até R$ 5 mil) |
| 4 | Floresta em Pé | apagar focos | PRODES/INPE 2025 |
| 5 | Carteira Assinada | acertar as janelas | desemprego mínimo (IBGE) |
| 6 | Escola que Paga | ritmo em duas pistas | Pé-de-Meia |
| 7 | 8 de Janeiro | defesa da Praça dos Três Poderes | 8/1 e a minuta |
| 8 | O Julgamento | linha do tempo | condenação de Jair Bolsonaro (STF) |
| 9 | Siga o Dinheiro | jogo da memória | rachadinhas (denúncia arquivada) e a casa de R$ 6 mi (em investigação) |
| 10 | Raio-X | reter malas com joias | joias sauditas (indiciamento, caso aberto) |
| 11 | Soberania | escudo giratório | condenação de Eduardo Bolsonaro por coação |
| 12 | Farmácia Popular | pegar com a cesta | 95% gratuito |
| 13 | A Grande Fake | chefão: rebater cada boato com o fato | síntese |

Habilidades (Q, W, E, R), liberadas ao longo do jogo: **Checar** limpa as ameaças, **Lembrar** mostra a resposta, **Foco** deixa tudo em câmera lenta e **Proteger** cria um escudo contra o próximo golpe.

## Rodar

```bash
pnpm install                                   # na raiz do monorepo
pnpm --filter @projects/nivel-13 dev:api       # API local em :8787 (SQLite via node:sqlite)
pnpm --filter @projects/nivel-13 dev           # jogo em http://localhost:4213
pnpm --filter @projects/nivel-13 build         # dist/ estático
```

Sem a API, o jogo funciona inteiro no aparelho; só o placar ao vivo fica indisponível.

## Publicar

1. **Site estático** (Cloudflare Pages, Vercel ou Netlify): build de `dist/` com as variáveis:
   - `VITE_RESPONSAVEL`: nome e CPF/CNPJ de quem responde pela peça. É obrigatório: aparece no rodapé, no "Sobre" e em todo card.
   - `VITE_SITE_URL`: URL pública, usada nos links de convite e nos cards.
   - `VITE_API_URL`: URL do Worker terminando em `/api`.
   - `VITE_ELECTION_AT` e `VITE_ELECTION_LABEL`: opcionais. O padrão é 25/10/2026, das 8h às 17h.
2. **API** (Cloudflare Worker + D1), a partir de `worker/`:
   ```bash
   npx wrangler d1 create nivel13          # cole o database_id em worker/wrangler.toml
   npx wrangler d1 execute nivel13 --remote --file=worker/schema.sql
   npx wrangler secret put SALT            # texto aleatório longo
   npx wrangler deploy                     # ajuste ALLOWED_ORIGIN para a URL do site
   ```

## Antes de publicar (obrigatório)

- [ ] **Revisão jurídica de cada carta** em `src/content/facts.ts`, `statements.ts`, `games/linha.ts`, `games/memoria.ts` e `games/chefe.ts`. O status jurídico precisa estar exato: "condenado" só com condenação. Flávio Bolsonaro nunca foi réu no caso das rachadinhas, e o jogo diz isso. Ele processa quem fala do caso.
- [ ] **Datas e números** reconferidos na fonte primária no dia do deploy. A pesquisa foi feita em 23–24/10/2026.
- [ ] **Regras do TSE (Res. 23.610/2019, atualizada em 2024 e 2026):** a peça usa IA (código, arte e texto) e por isso leva o rótulo de IA no rodapé e em todo card. A imprensa noticiou que é vedada a divulgação de conteúdo sintético novo nas 72 h antes da votação, e no dia da eleição publicar ou impulsionar propaganda nova é crime. Confirme com o jurídico se e quando pode ir ao ar.
- [ ] **Impulsionamento pago** só por candidato, partido ou coligação, com CNPJ.
- [ ] O placar não dá prêmio nem ponto por voto (art. 299 do Código Eleitoral). A escolha no movimento é guardada como HMAC do id do aparelho mais a UF, sem apelido (LGPD, art. 11).

## Decisões de design

- **Nenhuma violência contra pessoas reais:** os chefões são objetos (minutas, joias, a hidra de boatos). As pessoas aparecem só em retratos neutros nas cartas.
- **Nenhuma fala inventada** atribuída a uma pessoa real.
- **Credibilidade primeiro:** o Fato ou Fake também desmente exageros contra o outro lado (por exemplo, "Flávio foi condenado" é marcado como **fake**).
- **Peso:** a tela inicial custa 47 KB gzip de JS. O monumento 3D (three.js, 137 KB gzip) carrega depois do primeiro quadro, e sem WebGL aparece um 13 em 2D. O áudio é sintetizado na hora, sem arquivos.
- **Acessibilidade:** teclado em tudo, `prefers-reduced-motion`, legendas em texto e "Modo leitura" na coleção para quem prefere ler a jogar.

## Estrutura

```
src/
  main.ts            entrada e rotas
  config.ts          data da eleição, responsável, API
  core/              store (localStorage), áudio, pixel, sprites, compartilhar, API, tempo
  scene/             cenário 2D procedural, monumento 3D em voxels, controlador
  content/           fatos com fonte, banco Fato ou Fake, fases, contorno do Brasil
  games/             os 13 minijogos (interface MicroGame em types.ts)
  ui/                telas: título, cadastro, mapa, fase, resultado, final, desafio, placar, coleção, votar, sobre
worker/              API (Cloudflare Worker + D1) e schema.sql
server/dev-api.mjs   a mesma API em Node com SQLite local
```
