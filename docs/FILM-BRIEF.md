# Filme · nivel-13 · {{título do filme}}

<!-- Roteiro em batidas de um filme. Escreva antes de abrir o Remotion. O método está em method/10-motion-design-e-filmes.md. Os tempos daqui viram src/timeline.ts, a fonte única de tempos para imagem e som. -->

## 1. Ficha

| Campo | Valor |
|---|---|
| Tipo | {{filme de marca · vertical social · loop de produto · filme de case · sinal de marca}} |
| Duração | {{30 s}} |
| Formatos | {{16:9 1920×1080 (mestre) · 9:16 1080×1920 · 4:5 1080×1350}} <!-- o template renderiza todos no FPS de src/timeline.ts (30 qps) --> |
| Idiomas | {{pt-BR · en}} |
| Onde vai passar | {{site, Instagram, apresentação, evento}} |
| Som | {{trilha licenciada · trilha sintetizada a partir da cue list · sons de UI · locução}} |
| Loudness | −14 LUFS integrado, −1 dBTP <!-- −16 LUFS em filme de interface --> |
| Prazo | 2026-10-24 |

## 2. A ideia em uma frase

<!-- Se não cabe numa frase, o filme ainda não tem ideia. -->

{{}}

**Depois de assistir, a pessoa deve:** {{sentir / saber / fazer}}

## 3. Grade

- **BPM:** {{120}} → batida = {{0,5 s}} = {{15}} quadros a 30 qps; compasso = {{2 s}}; semicolcheia = {{0,125 s}}.
- Cortes na batida; rajadas em semicolcheia; respiro no contratempo.
- Cada quadro importante **assenta e fica parado ≥ 1,2 s** antes de trocar.

## 4. Batidas

<!-- Uma linha por batida. Uma ideia por quadro. Texto em tela: no máximo ~7 palavras por cartela; tempo mínimo = 0,5 s + 1 s a cada 3 palavras. -->

| # | Tempo | Batida | Imagem | Texto em tela | Som | Motion / transição |
|---|---|---|---|---|---|---|
| 1 | 0,0–3,0 s | Gancho | {{}} | {{}} | {{ataque em 0,0}} | {{}} |
| 2 | 3,0–8,0 s | Tensão | {{}} | {{}} | {{}} | {{}} |
| 3 | 8,0–18,0 s | Ideia | {{}} | {{}} | {{}} | {{}} |
| 4 | 18,0–26,0 s | Prova | {{o produto de verdade, dados reais}} | {{}} | {{}} | {{}} |
| 5 | 26,0–30,0 s | Assinatura | {{lockup da marca}} | {{uma ação}} | {{silêncio de 300–500 ms antes do logo; sinal sonoro}} | {{assinatura do logo}} |

## 5. Material

| Item | Fonte | Status |
|---|---|---|
| Componentes e motores reais do projeto | {{`@studio/fx`, `components/vN/…`}} | {{}} |
| Capturas de interface (Playwright) | {{rotas, interações, densidade 2–3×}} | {{}} |
| Fotografia / vídeo | {{famílias do DESIGN.md}} | {{}} |
| Trilha | {{licença ou síntese}} | {{}} |
| Fontes | {{licença cobre vídeo?}} | {{}} |

## 6. Regras deste filme

- Fatos do projeto; nada inventado (número, cliente, depoimento).
- Render determinístico: nada de relógio ou aleatório sem semente.
- Zonas seguras nos verticais: nada essencial nos ~250 px de cima nem nos ~340 px de baixo (a 1920 de altura), nem na coluna direita de ~120 px na metade de baixo.
- Tipografia de vertical: corpo ≥ 42 px, títulos 96–160 px.
- {{regra específica: ex.: o logo só aparece na batida 5}}

## 7. QA

- [ ] Folha de contato revisada (`qa:sheet`; `--n` para mais quadros).
- [ ] Quadros de cada cue e +6 quadros revisados.
- [ ] Overlay de zona segura em todos os quadros-chave dos verticais.
- [ ] Varredura automática (o que não pode existir) com resultado zero.
- [ ] Loudness e pico real medidos (`qa:loudness`); sincronia ±1 quadro (`qa:sync`).
- [ ] Legendas `.vtt` e queimadas para social; versão em inglês sem português.
- [ ] Exportação: H.264 High, CRF 16–18, yuv420p, BT.709, AAC 48 kHz, `+faststart`.
- [ ] Pôster do lockup resolvido; capa do vertical com o essencial no centro.
- [ ] Assistido a 1×, 0,25×, sem som e no celular.

## 8. Entregáveis

- [ ] `{{nome}}-16x9.mp4` (mestre)
- [ ] `{{nome}}-9x16.mp4`, `{{nome}}-4x5.mp4`
- [ ] Pôsteres e capa
- [ ] Legendas `.vtt` (pt-BR, en)
- [ ] Projeto Remotion para renderizar de novo
