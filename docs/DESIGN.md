# Design · nivel-13

<!-- Registro das decisões do sistema. Cada decisão tem o valor e o PORQUÊ. Sem porquê, a decisão volta a ser discutida na próxima rodada. Claude atualiza este arquivo ao fim de cada rodada; você revisa o diff. Valores que não estão aqui não existem: se um componente precisa de algo novo, a decisão entra aqui primeiro. -->

> Versão atual: {{vN}} · Última atualização: 2026-10-24

## 0. Direção

- **Nome:** {{nome da direção}}
- **Tese em uma frase:** {{}}
- **Três verbos do motion:** {{ex.: acende, flui, assenta}}
- **Por que esta e não as outras:** {{o que as direções descartadas testavam; ver DECISIONS.md}}

## 1. Tipografia

| Papel | Fonte | Pesos | Por quê |
|---|---|---|---|
| Display | {{}} | {{500}} | {{}} |
| Texto | {{}} | {{400, 500}} | {{}} |
| Rótulo / dados | {{mono}} | {{400}} | {{}} |

- **Licença:** {{web / app / vídeo, quem é o licenciado}}
- **Teste de pt-BR:** {{passou em "ÇÃO Ã nº 1º “aspas”"? observações}}
- **Escala:** razão {{1,2}} no celular → {{1,333}} no desktop; tokens `--step--2 … --step-7`.

### Tracking e entrelinha por tamanho

<!-- Comece pela tabela de method/04-tipografia.md §6 e calibre com a fonte real. -->

| Tamanho | Tracking | Entrelinha |
|---|---|---|
| ≥ 80 px | {{−0,035 em}} | {{0,95}} |
| 56–80 | {{}} | {{}} |
| 40–56 | {{}} | {{}} |
| 24–40 | {{}} | {{}} |
| 17–24 | {{}} | {{}} |
| 13–17 | {{}} | {{}} |
| ≤ 12 | {{}} | {{}} |
| Mono caixa alta | {{+0,05 em}} | {{1,3}} |

### Números (uma regra para o projeto inteiro)

- Que mudam, se comparam ou ficam em coluna: `tabular-nums lining-nums`, tracking {{}}.
- Número único de destaque: `proportional-nums lining-nums`, tracking {{}}, peso {{}}.
- Moeda em display: símbolo a {{0,42 em}}, peso {{500}}, cor `--fg-muted`, alinhado ao topo das versais; centavos a {{0,5 em}}.
- Unidades: {{0,5 em}}, separadas por espaço inquebrável estreito (U+202F).
- Intervalos: {{meia-risca sem espaços / hífen}}.

## 2. Cor

| Token | OKLCH | Hex (reserva) | Papel | Por quê |
|---|---|---|---|---|
| {{brand-9}} | {{oklch(…)}} | {{#…}} | Acento, CTA | {{}} |
| {{neutral-1}} | | | Fundo | |
| {{…}} | | | | |

**Mapeamento semântico:** `--bg` → {{}}, `--fg` → {{}}, `--accent` → {{}}, `--accent-ink` → {{}}, `--focus` → {{}}.

### Pares de contraste medidos

| Texto / elemento | Fundo | WCAG | APCA Lc | Passa? |
|---|---|---|---|---|
| `--fg` | `--bg` | {{}} | {{}} | |
| `--accent-ink` | `--accent` | {{}} | {{}} | |
| Título branco | {{pior quadro do vídeo do hero}} | {{}} | {{}} | |

### Gradiente da marca (se houver)

- Paradas: {{cor 1 → cor 2 → cor 3}}, interpolado em `oklch`.
- Onde vive: {{campo / moldura / luz sobre foto}}. Onde nunca vive: {{atrás do logo, em botão, em texto}}.
- Movimento: {{ciclo de N s, velocidade}}. Grão: {{3%}}.

### Modo escuro

{{sim/não; superfícies por elevação; o que muda no acento}}

### Logo sobre fundos

{{tinta clara em fundo escuro, tinta escura em fundo claro; corte de luminância; mínimo 3:1}}

## 3. Espaço e grade

- Base 4; escala `4 8 12 16 24 32 48 64 96 128 160`.
- Grade: {{12}} colunas desktop, {{8}} tablet, {{4}} celular. Calha `{{clamp(16px, 1.8vw, 24px)}}`. Margem `{{clamp(16px, 3.4vw, 48px)}}`. Largura máxima `{{1440px}}`.
- Espaço entre seções: `{{clamp(64px, 10vw, 160px)}}`.
- Quebras de grade permitidas: {{ex.: mídia full-bleed no case}}.

## 4. Forma e profundidade

| Elemento | Raio | Por quê |
|---|---|---|
| Botão, campo | {{6}} | |
| Card pequeno | {{12}} | |
| Mídia, card grande | {{20–28}} | |
| Chip | pílula | |

- Sombras: {{camadas, tinta de onde}}. Borda ou sombra, não as duas.
- Vidro: {{onde é permitido}}.

## 5. Motion

| Token | Valor | Uso no projeto |
|---|---|---|
| `--ease-out` | {{cubic-bezier(.23, 1, .32, 1)}} | |
| `--ease-in-out` | {{cubic-bezier(.77, 0, .175, 1)}} | |
| `--ease-drawer` | {{cubic-bezier(.32, .72, 0, 1)}} | |
| Mola padrão | {{duration 0.5, bounce 0.15}} | |
| Durações | {{140 / 180 / 240 / 400 / 800 ms}} | |

- **Assinatura da marca:** {{descrição e tempos}}.
- **Ordem do hero:** {{fundo → marca → assenta → texto em stagger N ms → motion ambiente}}.
- **Transição entre seções:** {{morph de cor / cantos que se abrem, raio N px desktop, N px celular}}.
- **Loops:** {{onde existe loop e onde repousa}}.
- **Movimento reduzido:** {{o que vira o quê}}.

## 6. Iconografia e imagem

- Ícones: Phosphor, peso {{regular}}, tamanhos {{16 / 20 / 24}}.
- Famílias de fotografia: {{1. … 2. … 3. …}}, grading {{}}.
- Proporções permitidas: {{3:2, 4:5, 16:9, 1:1}}.
- Vídeo: {{quantos, duração, peso máximo}}.

## 7. Texto de interface

- Caixa de frase. Sem travessão. {{outras regras de pontuação}}
- Rótulo mono em caixa alta: {{onde sim, onde não}}.

## 8. Exceções

<!-- Toda vez que algo viola uma regra acima de propósito, registre aqui. Exceção sem registro é bug. -->

| Onde | Regra quebrada | Por quê | Data |
|---|---|---|---|
| {{}} | {{}} | {{}} | {{}} |

## 9. Histórico

| Versão | Data | O que mudou no sistema |
|---|---|---|
| v1 | 2026-10-24 | Sistema inicial |
