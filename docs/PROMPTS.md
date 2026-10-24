# Livro de prompts · Nível 13

> Como pedir trabalho de craft para agentes (e para gente) e conseguir o nível da referência (`docs/reference/referencia.png`).
> Use junto com `docs/research/visual.md` (36 regras), `docs/research/x-craft.md` (técnicas do X), `docs/research/share.md`, `docs/ART-DIRECTION.md` e `.claude/agents/`.

---

## 0. Por que a maioria dos prompts de "faça world class" falha

"Bonito", "premium" e "world class" não são instruções: o agente devolve a média do que já viu. Prompt de craft funciona quando tem **sete ingredientes**:

| # | Ingrediente | Exemplo ruim | Exemplo bom |
|---|---|---|---|
| 1 | **Papel com repertório concreto** | "você é um artista" | "você é tech artist no nível de Hyper Light Drifter e Dead Cells; pense como Pedro Medeiros (@saint11)" |
| 2 | **Referência visível** | "estilo pixel art" | "abra `docs/reference/ref-monumento.png` com Read e compare cada screenshot lado a lado" |
| 3 | **A ideia em uma frase** | "um título legal" | "um monumento em ruínas que se reconstrói a cada fato" |
| 4 | **Restrições com número** | "brilho bonito" | "núcleo de 1 a 3 px branco, halo 1 degrau mais escuro pontilhado a 50%, aditivo até 70%" |
| 5 | **Contrato e dono** | "melhore o jogo" | "só edite `src/scene/*`; exporte `renderLevelBackdrop(level, W, H)`" |
| 6 | **Laço de verificação** | "teste" | "Playwright em 390×844 e 1440×900, recorte 4× de zoom, nota na rubrica (seção 1), repita até ≥ 4 em todos os itens, no mínimo 3 rodadas" |
| 7 | **Formato do relatório** | (nada) | "arquivos, regras aplicadas onde, screenshots, o que verificou, o que não verificou" |

Três regras de processo:
- **Uma fatia vertical antes de escalar.** Título + fase 1 + um card de share no nível da referência; só então as outras 12 fases. Qualidade escala por cópia de padrão, não por volume.
- **Crítica separada de criação.** Quem fez não é quem aprova: rode o prompt P12 (crítico) com outro agente, sem mostrar a ele o raciocínio do autor.
- **Rodadas curtas com números.** Cada rodada muda de 1 a 3 coisas medidas (px, ms, cor, contagem). "Mais polido" não é mudança.

---

## 1. Rubrica de taste (todo agente se autoavalia; o crítico dá a nota final)

Nota de 0 a 5 por item, comparando com a referência. **Pronto = nada abaixo de 4.**

| Item | 5 é… |
|---|---|
| Composição | um foco claro (o 13 ou o objeto da fase), caminho do olho em Z, HUD emoldurando sem cobrir o foco |
| Valor | ≥ 45% quase preto, objetos focais nos valores mais altos; o teste em cinza separa foco, interação e HUD |
| Paleta | só as 32 cores, vermelho ≤ 25%, dourado ≤ 3% e só no que é conquista |
| Densidade de detalhe | detalhe alto no foco e nas bordas, calma nas áreas de jogo; nada de ruído uniforme |
| Profundidade | 4 a 7 planos, perspectiva atmosférica em violeta-vermelho, primeiro plano escuro emoldurando |
| Luz | 3 fontes declaradas, rim light vermelho de 1 px, sombras com hue shift e não cinza |
| Energia/VFX | núcleo branco-quente → vermelho → vinho, faíscas, raios de luz verticais, cintilação de 2 cores |
| Movimento | 8 a 12 fps em sprites, tweens a 60 fps, câmera respirando, nada parado e nada nervoso |
| Feel | latência do toque ao feedback < 50 ms; todo acerto tem som, partícula e número; erro com hit-stop |
| HUD/tipografia | caixa alta pixel, número vermelho de acento, molduras finas claras, alinhamento em grade |
| Legibilidade no celular | tudo lê a 390 px de largura, alvos ≥ 44 px, texto ≥ 12 px |
| Consistência | a tela parece recortada do mesmo jogo da referência |

---

## 2. Prompts mestres (copie, preencha os `{{campos}}`)

### P1 · Cena do título (diretor de arte)
```
Você é diretor de arte e tech artist de pixel art moderna, no nível de Hyper Light Drifter (IGF Visual Art 2017), Eastward, Sea of Stars e Octopath (HD-2D). Abra com Read: docs/reference/referencia.png e os recortes ref-monumento.png, ref-baia.png e ref-cristo.png. Leia docs/research/visual.md e docs/research/x-craft.md.

Ideia: "um monumento em ruínas que se reconstrói a cada fato".
Entregue a cena do título em {{arquivos}} com:
- 7 camadas de parallax nos fatores 0 / 0,02 / 0,06 / 0,10 / 0,18 / 0,30 / 1,0 / 1,25 e câmera respirando ±2 px em 6 s;
- lua em eclipse (disco night, anel red-hot de 1 px, red de 2 px, crimson e crimsonDeep pontilhados);
- nuvens acesas por baixo (topo crimson/red, corpo crimsonDeep, base blood1/blood0), em duas camadas com deriva oposta;
- Pão de Açúcar e Urca com baía refletindo luzes; Corcovado com Cristo em brilho de 3 camadas e estrada em zigue-zague pontilhada;
- brasas interativas (o dedo empurra num raio de 34 px; até 120 partículas no celular) e brilhos de 4 pontas no ciclo de 6 quadros a 12 fps.
Só a paleta de src/lib/palette.ts. Escala inteira com nearest.
Verifique: Playwright em 390×844 (DPR 3) e 1440×900; recortes com zoom 4× do monumento, da lua e do Cristo; nota na rubrica de docs/PROMPTS.md §1 lado a lado com a referência; repita até nenhum item ficar abaixo de 4 (mínimo 3 rodadas).
Relatório: arquivos, regras aplicadas onde, notas por rodada, screenshots, o que não verificou.
```

### P2 · Monumento 3D pixel nativo
```
Você é tech artist de 3D estilizado (pipeline de Dead Cells: 3D em baixa resolução com toon; HD-2D; shader de pixel 3D do t3ssel8r). Em three.js, renderize o "13" num render target do tamanho lógico da tela, sem MSAA, e amplie com nearest.
- Geometria: blocos de pedra com bisel de 1 voxel e juntas visíveis, rachaduras pintadas em textura com texel = pixel lógico, faces laterais e base vermelhas, trepadeiras escorrendo pela frente.
- Luz: toon em 4 a 5 faixas mapeadas para a rampa stone (stone0..stoneHi) na frente e fire (blood0..red) nas laterais; key light quente no alto à esquerda; rim red-hot do lado dos anéis.
- Pós: quantizar para a paleta de 32 cores; contorno de 1 px por normal e profundidade em stone0.
- Anéis: LineLoop em 3D no mesmo alvo, metade de trás oculta pelo monumento, cintilação red-hot/red a cada 3–4 quadros, mais 120 faíscas por anel com rastro.
- Progresso 0→1: ruína com o topo desmoronado → inteiro, com os voxels subindo do chão (ease-out cúbico, 0,6 s cada, escalonados). Celebrate: a coroa cai com 2 quiques e faz uma explosão dourada.
Orçamento: ≤ 6 draw calls a mais, 60 fps num Android médio, pausa com a aba escondida. Fallback 2D sem WebGL.
```

### P3 · Cenário de fase (template)
```
Desenhe o cenário da fase {{n}} – {{local}} – em src/scene, no estilo do título: noite, a mesma paleta, de 4 a 5 planos achatados num canvas W×H lógico.
Marco do local: {{marco}} (ex.: Teatro Amazonas, Congresso, guindastes de Santos), em silhueta reconhecível a 150 px de largura.
A área central de jogo fica calma (valor ≤ 30%, sem textura); o detalhe vai para horizonte e bordas. Luz: {{fonte de luz do local}} + rim vermelho.
Inclua 1 elemento vivo animável (bandeira, água, luzes piscando) e devolva-o como camada separada.
Teste: desatura e confira que os objetos do jogo, desenhados por cima, continuam separados do fundo.
```

### P4 · VFX de energia, fogo e impacto
```
Crie o efeito {{efeito}} como sprite animado a 12–15 fps (4 a 8 quadros), ou partículas PixiJS.
Rampa por idade: white → goldHi → emberBright → ember → red → blood1 e morre.
Brilho em 3 camadas: núcleo de 1 a 3 px, halo pontilhado 1 degrau mais escuro, aditivo até 70%.
Antecipação de 1 a 2 quadros, smear de 1 quadro, impacto segurado durante o hit-stop e recuperação de 2 a 3 quadros.
Mostre num contact sheet com todos os quadros a 4×.
```

### P5 · Sprite ou objeto de jogo
```
Desenhe {{objeto}} em {{16|24|32}} px no mapa de caracteres de src/lib/sprites.ts.
Silhueta legível em preto chapado. No máximo 12 cores. Sombra com hue shift para violeta e luz para amarelo; 2 sombras + 1 luz + rim.
Contorno seletivo: escuro do lado da sombra, some do lado da luz. Sem pillow shading e sem AA contra o céu.
Se anima: idle de 2 a 4 quadros a 8 fps, com variante de squash para o impacto.
Entregue a 1×, 4× e sobre o fundo real da fase.
```

### P6 · Passe de game feel num minijogo
```
Você é game designer de feel (Vlambeer, "The Art of Screenshake"; Celeste, forgiveness; Balatro, contadores e chamas). Na fase {{n}} ({{arquivo}}):
1. Meça o tempo do toque ao feedback; o alvo é < 50 ms (som + partícula + número no mesmo quadro).
2. Acerto: ring de 14 a 24 px, burst de 8 a 12 partículas da rampa, float de pontos, pop 1,25→1,0 em 180 ms (ease-out-back) e pitch subindo 1 semitom por combo.
3. Erro: c.hit() (hit-stop de 70 ms, tremor trauma², clarão branco por 2 quadros e depois vermelho).
4. Curva: 10 s fáceis, pico a 70% da duração, final generoso. Escreva os números (spawn, velocidade, janela) no topo do arquivo.
5. Perdão: buffer de 100 ms, raio de toque +2 px, janela coyote de 80 ms.
6. Telegrafe toda ameaça 300 ms antes (brilho, tremor ou som).
Grave 10 s em vídeo pelo Playwright e descreva, segundo a segundo, o que o jogador sente.
```

### P7 · Tela ou HUD (UI)
```
Você é designer de interface de jogos (os menus de Metaphor: ReFantazio, TGA 2024 de Direção de Arte; o HUD de Hades; os contadores de Balatro, TGA 2024 de Melhor Indie). Abra os recortes ref-hud-player.png, ref-hud-stats.png, ref-menu.png, ref-skills.png e ref-minimap.png.
Construa {{tela}} com os componentes de src/ui. Molduras em 9-slice com bisel de 1 px (claro em cima à esquerda, escuro embaixo à direita), fundo opaco, caixa alta pixel, número de acento em vermelho, grade de 8 px.
Hierarquia: uma ação principal em vermelho por tela. Entrada em escada de 40 ms entre itens, 120 a 220 ms no total; saída mais rápida que a entrada.
Celular: nada cobre o foco; alvos ≥ 44 px; polegar alcança a ação principal.
Verifique com axe, teclado e screenshots em 390×844 e 1440×900, lado a lado com os recortes.
```

### P8 · Passe de interaction design
```
Revise as microinterações de {{tela/fluxo}}:
- botão: pressão 0,92 em 60 ms (ease-out-quad) e soltura com 8% de overshoot em 150 ms; som 'select' na pressão e não na soltura; navigator.vibrate(8) no celular quando suportado;
- foco: anel dourado de 2 px, ▶ balançando 1 px a cada 400 ms no item ativo;
- transição entre telas: wipe em pixel de 8 colunas em 180 ms; o mundo do título nunca pisca nem recarrega;
- estados: carregando (skeleton em pixel), vazio, erro com ação, sucesso com recompensa visual;
- movimento reduzido: troque animação por corte seco, mantendo cor e som.
Liste cada interação com gatilho, resposta, duração, curva e som.
```

### P9 · Som
```
Você é sound designer (Celeste/Lena Raine, HLD/Disasterpeace, Balatro). Para {{evento}}, crie um efeito em 3 camadas: transiente de 5 a 20 ms, corpo tonal com envelope de pitch e cauda com reverb. Variação de ±4% no pitch e ±2 dB no ganho a cada disparo; pan pela posição x.
Combo: +1 semitom por acerto até uma oitava. Erro: grave em 70–90 Hz com crunch e ducking da trilha por 120 ms.
Trilha: camadas por intensidade, com troca na barra. O DNA é brasileiro (baião, frevo, funk) em chiptune moderno. Nada passa de -1 dBFS.
```

### P10 · Momento de share
```
Para o momento {{momento}}, crie o card no formato story (1080×1920 = arte 180×320 × 6) e feed (1080×1350 = 180×225 × 6).
Tudo legível dentro de x 65–1015 e y 270–1250; os 35% de baixo ficam livres.
Hierarquia: 1 número grande (o orgulho), 1 frase curta, 1 prova (fonte), link curto desenhado na arte, rótulo de IA e responsável.
Gere o arquivo ANTES do toque em compartilhar (exigência do iOS). Teste em Chrome Android, Safari iOS e navegador interno do WhatsApp.
```

### P11 · Mecânica viral diária
```
Projete o modo diário para que 1 rodada leve de 60 a 120 s, seja igual para todo o Brasil e gere um share sem spoiler (grade de emoji e número) que provoque "e você?".
Inclua: duelo por link (?d=), placar de grupo do WhatsApp (?g=), sequência com 1 congelamento por semana e uma revelação surpreendente com fonte em toda rodada.
Meça o k-factor (convites × conversão) e as retenções D1 e D7. Nunca premie voto.
```

### P12 · Crítico de taste (rode com OUTRO agente)
```
Você é diretor de arte convidado, exigente e sem apego ao trabalho. Abra docs/reference/referencia.png e os screenshots em {{pasta}}.
Para cada screenshot: nota de 0 a 5 em cada item da rubrica de docs/PROMPTS.md §1, com uma frase de evidência por nota (o que você vê, onde, em px).
Depois liste as 3 mudanças que mais aproximam da referência, em ordem de impacto, cada uma com instrução executável (arquivo, valor atual → valor novo).
Não elogie. Não proponha mais que 3 mudanças.
```

### P13 · Playtest e QA
```
Jogue {{fase/fluxo}} como um tio de 52 anos num Android médio chegando pelo WhatsApp: sem ler instrução, com o polegar, CPU 4× lenta.
Registre o segundo em que entendeu o que fazer, o primeiro erro e o motivo, se terminou, o que lembra 1 minuto depois e se mandaria para alguém.
Depois, como QA: erros de console, fps, peso, axe. Entregue uma tabela de bugs priorizada com screenshot.
```

### P14 · Checagem de fatos
```
Para cada afirmação em {{arquivo}}: fonte primária ou veículo de referência com data; status jurídico exato (investigado, indiciado, denunciado, réu, condenado, recurso, arquivado); se a pessoa negou, isso está dito. Corrija o texto, liste as mudanças e marque o que precisa de advogado. Nunca invente fonte.
```

### P15 · Primeiros 30 segundos
```
Redesenhe os primeiros 30 s: 0–3 s, o mundo já está vivo e há um único botão; 3–10 s, o primeiro gesto ensina sozinho, sem texto; até 20 s, primeira vitória com recompensa visual e sonora; 30 s, a pessoa sabe o que é o jogo e quer a próxima fase.
Corte toda tela, campo e texto que não sirva a isso. Meça com Playwright quantos toques e segundos leva até a primeira vitória.
```

---

## 3. Referências premiadas e o que copiar de cada uma

| Jogo | Prêmio | O que levar para o Nível 13 |
|---|---|---|
| Hyper Light Drifter | IGF Excellence in Visual Art 2017 | Paleta limitada e um acento repetido costurando a cena; silhuetas fortes |
| Celeste | TGA Melhor Indie 2018 | Perdão (coyote, buffer), feedback em todo pulo, dificuldade justa |
| Balatro | TGA Melhor Indie 2024 | Contadores que sobem, chamas nos números grandes, "mais uma rodada", som em escada |
| Metaphor: ReFantazio | TGA Direção de Arte 2024 | Menus como peça de arte: cada transição animada e tipografia ousada |
| Clair Obscur: Expedition 33 | TGA Direção de Arte e Melhor Indie 2025 | Timing reativo (aparar e esquivar) dando agência a cada segundo |
| Rytmos | Apple Design Award 2024, Interação | Um gesto simples, música como recompensa pelo acerto |
| DREDGE | Apple Design Award 2025, Interação | Controles pensados para o toque e clima construído pela paleta |
| Lies of P / Infinity Nikki | Apple Design Award 2024 / 2025, Visuais | Tema coeso: tudo, do menu ao efeito, do mesmo mundo |
| Dead Cells | Indie de referência em pipeline | 3D renderizado em baixa resolução com toon, virando pixel art com movimento rico |
| Octopath Traveler (HD-2D) | Referência de estilo | Sprite pixel em mundo 3D com profundidade e luz dinâmica |
| UFO 50 | Coleção indie aclamada | 50 jogos com 1 paleta de 32 cores: a consistência vem da restrição |
| Wordle · Termo · Contexto | Virais (os dois últimos, brasileiros) | 1 rodada por dia, share sem spoiler, conversa no grupo |

Fontes dos prêmios: [TGA 2024](https://file770.com/the-game-awards-2024/), [TGA 2025](https://file770.com/the-game-awards-2025-winners/), [ADA 2024](https://www.techradar.com/computing/software/apple-just-awarded-these-14-apps-and-games-one-of-its-highest-accolades), [ADA 2025](https://9to5mac.com/2025/06/03/apple-announces-2025-apple-design-award-winners/). HLD e Celeste: ver `docs/research/visual.md`.

---

## 4. O que precisamos para a melhor experiência (checklist)

**Produto**
- [ ] Fatia vertical no nível da referência (título + fase 1 + card de share) antes de escalar
- [ ] Primeira vitória em ≤ 20 s; sessão do diário em 60–120 s; jornada de 20–25 min, pausável
- [ ] Modo diário viral (`docs/VIRAL-DESIGN.md`), com duelo e placar de grupo
- [ ] Share em todos os momentos de orgulho e nunca no meio da jogada

**Craft**
- [ ] Mundo do título com nota ≥ 4 em todos os itens da rubrica
- [ ] 13 cenários de fase no mesmo estilo
- [ ] Sprites com hue shift, rim e contorno seletivo; VFX com rampa e brilho em 3 camadas
- [ ] Passe de feel em cada fase (P6) e passe de interação em cada tela (P8)
- [ ] Som em camadas e trilha adaptativa

**Qualidade**
- [ ] 60 fps num Android médio, primeira tela < 150 KB gzip, 3D carregado depois
- [ ] Teste em aparelhos reais: Android de entrada, iPhone SE, navegador interno do WhatsApp e do Instagram
- [ ] axe sem violação séria, teclado completo, movimento reduzido, no máximo 3 clarões por segundo
- [ ] Zero erro de console; e2e de fumaça no CI

**Conteúdo e lei**
- [ ] Toda carta revisada pelo P14 e por advogado
- [ ] Responsável preenchido, rótulo de IA, nenhuma recompensa por voto, LGPD

**Evolução**
- [ ] Playtest com 5 eleitores indecisos reais por rodada (P13 ao vivo): onde travam, o que lembram, se mandariam
- [ ] Métricas: conclusão da fase 1, conclusão da jornada, share por momento, k-factor, D1/D7
- [ ] Cadência: rodada → crítico (P12) → 3 mudanças → rodada

---

## 5. Ordem de trabalho recomendada

1. Fatia vertical: P1 + P2 → P12 → ajustes → P7 no HUD do título → P10 no card do nível 13.
2. Escala: P3 para cada fase em paralelo; P6 em cada minijogo.
3. Polimento: P8 em todas as telas; P9 em todos os eventos; P15 no começo.
4. Viral: P11 → MVP do diário → playtest → medir → iterar.
5. Antes de publicar: P14 em todo o conteúdo, P13 em aparelhos reais e o checklist da §4.
