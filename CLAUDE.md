# Nível 13 · regras do repositório

Jogo web casual em pixel art moderna. Público: eleitor brasileiro indeciso, no celular, abrindo pelo WhatsApp.
Leia antes de mexer: `docs/GAME-DESIGN.md`, `docs/ART-DIRECTION.md`, `docs/PROMPTS.md` (prompts mestres e rubrica de taste), `docs/reference/` (imagem de referência) e `docs/research/`.

## Stack
Vite 8 · React 19 (telas, HUD, overlays) · PixiJS 8 (minijogos, pixel perfeito em resolução lógica) · three / React Three Fiber (mundo do título) · Zustand (estado) · Hono + Cloudflare D1 (API em `worker/`) · Vitest + Playwright · Biome.

## Regras que não se negociam
1. **Fato tem fonte.** Toda afirmação sobre pessoa real vem de `src/content/` com fonte, data e status jurídico exato. "Condenado" só com condenação. Nada de texto factual escrito direto em componente.
2. **Nenhuma violência contra pessoa real** e nenhuma fala inventada atribuída a pessoa real. Chefões são objetos e símbolos.
3. **Nenhuma imagem gerada por IA de pessoa real.** Retratos são caricaturas pixel neutras feitas em código.
4. **Rótulo de IA e responsável** (`CONFIG.aiLabel`, `responsavelText()`) no rodapé e em todo asset compartilhável.
5. **Nenhuma recompensa ligada a voto.** Intenção de voto só anônima e agregada.
6. **Pixel perfeito:** desenhe em pixels lógicos inteiros e amplie com nearest. Sem blur, sem antialias e sem escala fracionária em sprite.
7. **Celular primeiro:** 60 fps num Android médio, alvos de 44 px ou mais, `prefers-reduced-motion` respeitado, teclado em tudo no desktop.
8. Texto de interface em PT-BR, sem travessão (—).

## Comandos
`pnpm dev` (4313) · `pnpm dev:api` (8787) · `pnpm typecheck` · `pnpm lint` · `pnpm test` · `pnpm e2e` · `pnpm build`.
Antes de dizer pronto: typecheck, lint e build passando, mais screenshots Playwright em 390×844 e 1440×900. Diga o que foi e o que não foi verificado.

## Equipe
As definições dos agentes ficam em `.claude/agents/`. Cada agente só mexe nos arquivos que são seus, conforme `docs/OWNERSHIP.md`.
