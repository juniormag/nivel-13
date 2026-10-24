# nivel-13 · regras do projeto

> PT-BR. English version: [CLAUDE.project.en.md](CLAUDE.project.en.md).
> Este arquivo vira o `CLAUDE.md` de todo projeto criado com `pnpm novo`. O `pnpm novo` já preenche o nome do projeto e do cliente; apague o que não se aplica. Ele vale para pessoas e para agentes.

Somos a Delta&Co: estúdio de design e engenharia de design. A régua é a de Work & Co, Porto Rocha e Koto: craft, interaction design, visual design, usabilidade, acessibilidade, motion e boas decisões de produto. Nada com cara de template, nada quebrado, nada morto.

## 1. Hierarquia de regras

1. O que a pessoa pede no prompt.
2. O brief da rodada atual (`briefs/BRIEF-v<N>.md`) e os documentos de kickoff deste projeto (em `docs/`).
3. Este arquivo.
4. `ARCHITECTURE.md` na raiz do monorepo (contrato dos pacotes).
5. As skills do estúdio (`studio-*`).
6. As skills de terceiros.

Quando uma skill sugerir algo que contradiz o projeto (fonte, paleta, lib de animação, estrutura de CSS, tom de texto), o projeto vence. Skill é repertório, não autoridade.

## 2. Antes de escrever código

- **Next 16 não é o Next que você conhece.** Antes de escrever qualquer código de Next, leia o guia relevante em `node_modules/next/dist/docs/` (resolvido a partir da pasta do app; no monorepo o pacote pode não estar visível na raiz). Respeite avisos de depreciação. Não confie na memória para APIs de roteamento, cache, `params`, metadata ou fontes.
- Leia o brief da rodada atual inteiro. Ele vence este arquivo onde divergir.
- Rode `pnpm doctor` na raiz se algo parecer quebrado (versões de Node, portas, pacotes).

## 3. Uso proativo de skills

Não espere a pessoa nomear uma skill. Antes de qualquer tarefa de design, produto ou frontend, identifique a skill que lidera e as que revisam, carregue-as e diga em **uma linha** quais está usando.

Três skills de terceiros só rodam por chamada explícita. Quando fizerem sentido, sugira: `/prototype` (variações com seletor visual), `/pick-ui-library` (escolha de biblioteca), `/review-animations` (review de motion com régua alta).

### Roteamento

| Pedido | Lidera | Apoia ou revisa |
|---|---|---|
| Começo de projeto, "o que construir" | `studio-kickoff` | `design-brief`, `jobs-to-be-done`, `competitive-analysis`, `metrics-definition` |
| Direção visual de qualquer criação (tela, site, marca, pôster, motion, 3D, imagem), moodboard, "no nosso gosto" | `studio-taste` (MCP `taste`, `/taste`) | a skill de estilo do tipo de pedido (`impeccable`, `design-taste-frontend`, `studio-type`, `studio-motion`…) |
| Crítica de tela, fluxo ou página | `studio-craft-review` | `studio-taste` (`taste_score`), `web-design-guidelines`, `heuristic-evaluation`, `userinterface-wiki` |
| Tipografia (par, escala, números) | `studio-type` | `typography-scale`, `apple-design` |
| Motion de produto ou de marca | `studio-motion` | `animate`, `emil-design-eng`, `transitions-dev` |
| Filme de marca ou social (Remotion) | `studio-film` | `studio-motion` |
| Shader, partículas, 3D | `studio-creative-coding` | `fixing-motion-performance` |
| Pedidos do Ajustar (`feedback/inbox.jsonl`) | `studio-feedback` | a skill do tipo de pedido |
| "Está pronto?" | `studio-qa` | `fixing-accessibility`, `design-qa-checklist` |
| Página de case | `studio-case` | `studio-film`, `studio-motion`, `design-taste-frontend` |
| Decisões recorrentes sem consenso | `design-principles` | `concept-selection` |
| Jornada, experiência, serviço | `journey-map` | `experience-map`, `service-blueprint` |
| Estrutura, navegação, fluxos | `information-architecture` | `user-flow-diagram`, `navigation-patterns` |
| Fundamentos visuais, direção nova | `studio-taste` | `ui-ux-pro-max`, `studio-type`, `color-system`, `spacing-system`, `visual-hierarchy` |
| Comparar direções | `prototype-strategy` | sugerir `/prototype`, depois `taste_compare` e `concept-selection` |
| Tela ou fluxo de produto | `impeccable` | `emil-design-eng`, `baseline-ui` |
| Landing, marketing | `design-taste-frontend` | `high-end-visual-design`, `frontend-design` |
| Gestos, sheets, drag, sensação nativa | `apple-design` | `emil-design-eng`, `state-machine` |
| Formulário | `form-design` | `ux-writing`, `fixing-accessibility` |
| Erro, loading, vazio, primeiro uso | `error-handling-ux` / `loading-states` / `onboarding-design` | `ux-writing` |
| Componente com muitos estados | `state-machine` | `micro-interaction-spec` |
| Texto de interface | `ux-writing` | |
| Padrão conhecido (modal, toast, tabs, tooltip, accordion, skeleton, estados de IA) | `transitions-dev` | `transitions-polish` |
| Transição de rota ou shared element em React | `vercel-react-view-transitions` | `animate` |
| "Onde falta motion?" | `find-animation-opportunities` | |
| Animação travando | `fixing-motion-performance` | |
| Melhorar sem trocar a identidade | `improve-ui` | `baseline-ui` |
| Redesign premium | `redesign-existing-projects` | `impeccable` |
| Acessibilidade | `fixing-accessibility` (corrige) | `accessibility-audit` (relatório) |
| Arquitetura de componentes React | `vercel-composition-patterns` | `vercel-react-best-practices` |

Direção visual: `studio-taste` define a direção (referências, princípios, anti-padrões do acervo) e a skill de estilo executa; o brief e o `DESIGN.md` vencem os dois. Conflitos: uma skill de estilo lidera por tarefa (produto → `impeccable`; marketing → `design-taste-frontend`; sem sistema → `frontend-design`). Motion: padrão conhecido → `transitions-dev`; interação original → `animate`. Para corrigir, use as `fixing-*`; para planejar, as `improve-*` (que não editam código).

A lista completa, com fonte e licença, está em `claude/SKILLS-MANIFEST.md`.

## 4. Monorepo: comandos

Tudo roda da raiz do monorepo.

| Comando | O que faz |
|---|---|
| `pnpm install` | Instala tudo (uma vez, na raiz). |
| `pnpm --filter @projects/nivel-13 dev` | Sobe este projeto. |
| `pnpm docs` | Docs do estúdio em `localhost:4000` (System, Notes, Labs, Tools). |
| `pnpm --filter @projects/nivel-13 feedback` | Sobe o receptor do Ajustar em `localhost:3999` (grava em `feedback/inbox.jsonl` deste projeto). Dentro da pasta do projeto, `pnpm feedback`. Na raiz, `pnpm feedback` grava no `feedback/` da raiz. |
| `pnpm typecheck` · `pnpm lint` · `pnpm format` | TypeScript, Biome check, Biome format. |
| `pnpm build` | Build de tudo via Turborepo. Num projeto: `pnpm --filter @projects/nivel-13 build`. |
| `pnpm doctor` | Diagnóstico do ambiente. |
| `pnpm skills` | Instala as skills do estúdio e de terceiros (`claude/install-skills.sh`). |
| `pnpm novo <slug> --standalone --out <pasta>` | Quando o projeto precisa sair para o repo do cliente: cria o projeto fora do monorepo com os pacotes copiados para `vendor/`. |

Portas fixas: docs 4000 · site 4100 · lab 4200 · film studio 4300 · feedback 3999. Agentes em paralelo usam portas e pastas de build próprias (ex.: `NEXT_DIST_DIR=.next-<frente> pnpm next dev -p <porta>`), nunca a mesma pasta `.next`.

## 5. Regras de import dos pacotes

| Precisa de | Importe de | Nunca |
|---|---|---|
| Cor, tipo, espaço, raio, easing, duração, tema | `@studio/tokens` (CSS: `@studio/tokens/tokens.css`) | hex, `font-family` ou `cubic-bezier` literais em componente |
| Reveal, Stagger, SplitText, Magnetic, SmoothScroll, springs | `@studio/motion` | reimplementar reduced motion na mão |
| Botão, Dialog, Sheet, Tabs, Toast, Command, Number… | `@studio/ui` (CSS: `@studio/ui/ui.css`) | copiar o componente para dentro do projeto para "ajustar um detalhe" |
| Shader, partículas, 3D, campo de pontos | `@studio/fx` | canvas sem `useCanvasBudget` |
| Ajustar, Montar, Tipo, Grid, Versões | `@studio/design-tools` | ferramenta de design em build de produção |
| Ícones | `@phosphor-icons/react` | uma segunda família de ícones |

- Os pacotes são TypeScript fonte (`exports` aponta para `src/`). No Next, eles entram em `transpilePackages`.
- Todo componente cliente começa com `'use client'`.
- Cor de marca do cliente entra por tema (`defineTheme({ accent, neutral, mode })` ou `[data-theme]`), nunca dentro de `packages/`.
- Precisa mudar um pacote? Mude em `packages/` e verifique `apps/docs` (a página System é construída com o próprio sistema). Se a mudança é só deste cliente, ela pertence ao projeto, não ao pacote.
- CSS do projeto usa prefixo próprio (ex.: `nivel-13-` ou `v<N>-` por rodada). Prefixos `ui-`, `fx-`, `st-` são dos pacotes.

## 6. Rodadas e versões

Cada rodada de trabalho é uma versão autocontida. As antigas ficam no ar, intactas, para comparar e voltar.

- Registro: `lib/versions.ts` (id, título, data, status, `current`, resumo, rotas, pastas, brief). É ele que alimenta o menu **Versões** de `<StudioTools versions={…} />`.
- Rotas em `app/v<N>/`, componentes em `components/v<N>/`, CSS com escopo `.v<N>` e prefixo `v<N>-`.
- Brief da rodada em `briefs/BRIEF-v<N>.md`: crítica recebida (literal), referências, decisões, frentes e donos de arquivo.
- **Nunca edite as pastas de rodadas anteriores.** A rodada nova pode importar delas; se precisar mudar, copie para a pasta nova. Correção em componente compartilhado que mude o visual de uma rodada antiga vai para a pasta nova.
- Nova rodada: `/round` (comando em `.claude/commands/round.md`).

## 7. Ferramentas de design (`@studio/design-tools`)

Em dev (e em preview com `?tools=1`), a barra flutuante `<StudioTools />` traz Ajustar, Tipo, Tema, Grid e Versões; `<Montar />` compõe páginas. Desligadas, a página é idêntica à original. Nunca vão para build de produção do cliente.

- **Ajustar:** a pessoa clica num elemento, escreve, envia. O pedido vira uma linha em `feedback/inbox.jsonl` (via o receptor `feedback` do projeto, porta 3999). Para ler e aplicar, use a skill `studio-feedback` (ou `/feedback`). Cada registro tem `id`, `ts`, `kind`, `url`, `selector`, `text` (texto do elemento), `note`, `viewport`, `theme`, `status`.
- Ao aplicar um pedido, marque `status: "feito"` (ou `"respondido"` quando é pergunta, `"recusado"` com motivo em `reply`; com o receptor no ar, via `PATCH /__feedback/<id>`) e responda com o que mudou, arquivo e linha. Nunca apague linhas do inbox.
- **Tipo** troca o par tipográfico ao vivo: por isso componentes nunca escrevem `font-family` literal; usam `var(--font-display)`, `var(--font-text)`, `var(--font-mono)`.
- **Versões** lê `lib/versions.ts`. Rodada nova sem registro não aparece para o cliente.
- **Gosto (MCP `taste`, em `.mcp.json`):** `taste_brief` antes de criar, `taste_search` e `taste_cluster` para aprofundar, `taste_score` e `taste_compare` nos screenshots. O ciclo completo está na skill `studio-taste` (ou `/taste <tarefa>`). Referência dá direção, nunca é template.

## 8. Piso de craft (sempre)

- Texto em PT-BR (ou no idioma do projeto). Sem travessão (—) em interface. Sem "não X, mas Y" e sem frase de efeito vazia. Sem lorem, sem placeholder, sem botão morto.
- Grade definida e respeitada (12 colunas desktop, 4 mobile, margens e calhas de token). Nada "no olho".
- Números: `tabular-nums` onde mudam ou se comparam; moeda com símbolo e centavos na regra do projeto (ver `studio-type`).
- Motion: só `transform`, `opacity`, `filter` leve e `clip-path`. Fechar mais rápido que abrir. `prefers-reduced-motion` mostra o quadro final. Hover só em `(hover: hover)`.
- Canvas e WebGL pausam fora da tela, DPR no máximo 2, quadro parado bonito como fallback.
- Acessibilidade WCAG 2.2 AA: contraste, foco visível, teclado para todo gesto, rótulos, alvos de 44 px no toque.
- Dados ilustrativos sempre marcados como ilustrativos. Nenhum número, cliente ou depoimento inventado apresentado como real.

## 9. Definição de pronto

Antes de dizer que uma tela ou fluxo está pronto (use `studio-qa` ou `/qa`):

1. **Estados:** vazio, carregando, erro, sucesso e casos de borda, não só o caminho feliz.
2. **Interação:** tudo clicável tem destino e feedback.
3. **Motion:** cada animação tem propósito, duração e curva coerentes; fechar mais rápido que abrir; reduced motion respeitado.
4. **Acessibilidade:** teclado, foco visível, contraste, rótulos, alvos de toque. axe sem violações sérias.
5. **Craft visual:** hierarquia clara, escala de espaço e tipo consistente, nada com cara de template.
6. **Verificação:** rode e olhe. Playwright em 1440×900 e 390×844, claro e escuro, com e sem reduced motion, zero erro de console, zero rolagem horizontal, recortes de perto dos detalhes.

7. **Gosto (trabalho visual):** `taste_score` nos screenshots finais (ou `taste_compare` entre variantes), relatando a nota como proximidade ao acervo, não qualidade (telas: ≥ 45 é sinal saudável, < 30 parece template). Sem dados de gosto, diga que não houve checagem.

**Sempre diga o que foi verificado e o que não foi.** "Verifiquei X em 1440 e 390; não verifiquei Safari nem leitor de tela" vale mais que "pronto".

## 10. Trabalho em frentes paralelas

- Cada frente mexe só nos arquivos que são seus (listados no brief). Precisa de algo compartilhado? Não mude: descreva no relatório.
- Contratos entre frentes (assinatura de componente) ficam no brief. Muda-se por dentro, não a assinatura.
- Só o diretor roda o build final.
- Relatório final curto: o que fez, arquivos, como integrar, o que verificou, o que não verificou, URLs locais.

## 11. Projeto

- Cliente: Nível 13
- Produto e público: `docs/` (preencha no kickoff com `/kickoff`).
- Rodada atual: veja `lib/versions.ts` (`current: true`).
