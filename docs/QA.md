# QA · nivel-13 · {{versão}} · 2026-10-24

<!-- A definição de pronto, para marcar com EVIDÊNCIA. Cada item marcado tem um link para screenshot, número ou relatório na coluna ao lado, ou uma justificativa. "Acho que sim" não marca. O porquê de cada item está em method/14-qa-e-entrega.md. -->

- **Rotas verificadas:** {{/, /case, /produto, …}}
- **Quem verificou:** {{}}
- **Ferramentas:** Playwright {{versão}} · axe · {{dispositivos reais}}

## 1. Estados e interação

| ✓ | Item | Evidência |
|---|---|---|
| [ ] | Vazio, carregando, erro, sucesso, parcial e extremos em todas as telas | `qa/estados/` |
| [ ] | Todo clicável tem destino e feedback; zero `href="#"`, zero botão morto | lista de clicáveis |
| [ ] | Nenhum placeholder, lorem ou "em breve" | busca: `rg -i "lorem\|em breve\|todo"` |
| [ ] | Pressionar com resposta em até 100 ms | |
| [ ] | `Esc` fecha camadas; foco volta ao gatilho | |

## 2. Conteúdo

| ✓ | Item | Evidência |
|---|---|---|
| [ ] | Texto revisado por uma segunda pessoa | {{quem}} |
| [ ] | Paridade pt-BR / en; zero palavra da outra língua (por script) | saída do script |
| [ ] | Dado ilustrativo marcado | |
| [ ] | Números com `Intl`; tabular onde muda ou se compara | recorte de perto |
| [ ] | Caixa de frase; sem travessão em texto de interface | busca: `rg "—"` |

## 3. Visual

| ✓ | Item | Evidência |
|---|---|---|
| [ ] | Overlay de grade: nada fora de coluna sem exceção registrada | screenshot com `G` |
| [ ] | Sem hex, `font-family` literal ou curva fora dos tokens em componente | saída do `rg` |
| [ ] | Tracking e entrelinha pela régua do `DESIGN.md` | recortes do display |
| [ ] | Máscaras de linha não cortam acento nem descendente | recorte com "ÇÃO" |
| [ ] | Recortes de perto aprovados: títulos, números, botões, ícones | `qa/recortes/` |
| [ ] | 360, 390, 768, 1024, 1440, 1920 sem quebra | `qa/responsivo/` |

## 4. Motion

| ✓ | Item | Evidência |
|---|---|---|
| [ ] | Toda animação passa no teste do propósito | |
| [ ] | Fechar mais rápido que abrir; interrompível (dois cliques rápidos) | |
| [ ] | Movimento reduzido: sem deslocamento; canvas e vídeo em quadro final | screenshots `reduce` |
| [ ] | 60 qps nas animações principais (painel de performance) | trace |
| [ ] | Loops em pausa fora da tela; controle de pausa em loop > 5 s | |

## 5. Acessibilidade

| ✓ | Item | Evidência |
|---|---|---|
| [ ] | axe: 0 violações (wcag2a, wcag2aa, wcag22aa) nas rotas | relatório |
| [ ] | Fluxo principal completo só com teclado | |
| [ ] | Foco visível (2 px, 3:1), não coberto por header fixo | screenshot com `Tab` |
| [ ] | Contraste medido, inclusive texto sobre o pior quadro de vídeo | tabela do `DESIGN.md` |
| [ ] | Alvos ≥ 44 px no toque | |
| [ ] | Zoom 200% e reflow a 320 px | |
| [ ] | VoiceOver no fluxo principal | notas |

## 6. Técnico e performance

| ✓ | Item | Evidência |
|---|---|---|
| [ ] | 0 erros de console em todas as rotas, 1440 e 390 | saída do script |
| [ ] | 0 px de rolagem horizontal em 390 e 1440 | saída do script |
| [ ] | Build de produção limpo; `StudioTools` invisível sem `?tools=1` | log do build |
| [ ] | LCP ≤ 2,5 s · INP ≤ 200 ms · CLS ≤ 0,1 (celular médio) | {{valores}} |
| [ ] | JS inicial ≤ 170 KB gzip; 3D e player sob demanda | análise do bundle |
| [ ] | Fontes ≤ 4 arquivos, ≤ 200 KB | |
| [ ] | Canvas: DPR ≤ 2, máx. 2 vivos, pausa fora da tela | |
| [ ] | Metadados: título, descrição, OG 1200×630, favicon, `lang`, `hreflang` | |

## 7. Navegadores

| ✓ | Navegador | Dispositivo | Observações |
|---|---|---|---|
| [ ] | Safari iOS | iPhone real | |
| [ ] | Chrome Android | aparelho médio real | |
| [ ] | Chrome | macOS / Windows | |
| [ ] | Safari | macOS | |
| [ ] | Firefox | desktop | |
| [ ] | Edge | Windows | |

## 8. Filme (se houver)

| ✓ | Item | Evidência |
|---|---|---|
| [ ] | −14 LUFS integrado, ≤ −1 dBTP | relatório `ebur128` |
| [ ] | Sincronia de som ±1 quadro | relatório de sincronia |
| [ ] | Zonas seguras nos verticais | folha de contato com overlay |
| [ ] | Legendas; versão em inglês sem português | |
| [ ] | H.264 High, yuv420p, BT.709, `+faststart`; pôster do lockup | `ffprobe` |

## O que NÃO foi verificado

<!-- Obrigatório. Honestidade aqui evita a surpresa do cliente depois. -->

- {{ex.: Edge no Windows não testado; NVDA não testado}}

## Resultado

- **Pronto para entregar?** Sim · Não
- **Pendências aceitas pelo cliente:** {{}}
