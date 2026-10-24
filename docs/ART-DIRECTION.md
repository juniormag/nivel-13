# Direção de arte

> PT-BR. Detalhes, números e fontes: [`docs/research/visual.md`](research/visual.md) (36 regras). Este arquivo é o resumo que vale para todo mundo.

**Frase do jogo:** "Um monumento em ruínas que se reconstrói a cada fato." Toda tela é noite, pedra e fogo vermelho; o dourado aparece só no que é conquista.

## O que precisamos igualar da referência
- Noite quase preta (≥ 45% da tela) e vermelho dominante (≤ 25%), com dourado (≤ 3%) só em coroa, brilhos, luzes da cidade e UI ativa, e verde (≤ 4%) em trepadeiras e bandeira.
- Monumento "13" de pedra branca rachada com laterais e base vermelhas e mata crescendo, renderizado em 3D *pixel nativo* (render target de baixa resolução, luz em 4–5 faixas, contorno de 1 px).
- Anéis de energia em 3D desenhados como traço de pixel, metade de trás escondida pelo monumento, com cintilação de 2 cores.
- Rio ao fundo em 6–7 camadas de parallax: lua em eclipse com coroa, nuvens acesas por baixo, Pão de Açúcar, Cristo iluminado, baía com reflexos, cidade, morro e mato de primeiro plano.
- Brilhos de 4 pontas com ciclo de 6 quadros e câmera respirando ±2 px.
- HUD de RPG: retrato, NÍVEL, XP, corações, atributos segmentados, menu com ▶ em faixa vermelha, Q W E R e minimapa.

## Regras rápidas
1. Resolução lógica: 480×270 no desktop e ~150–270 de largura no celular em pé. Escala sempre inteira e nearest.
2. Paleta única: `src/lib/palette.ts` (32 cores). Nenhum pixel fora dela nas camadas de arte.
3. Hue shift: sombra puxa para violeta e luz para laranja/amarelo, com 15–20° por degrau.
4. Contorno seletivo e rim light vermelho de 1 px do lado da energia.
5. Brilho em 3 camadas (núcleo, halo pontilhado, bloom opcional em baixa resolução), aditivo só em luz, com no máximo 70% de alfa.
6. Dither só em céu, halo, borda de nuvem e coroa da lua.
7. Animação em 8–12 fps (personagens) e 12–15 fps (efeitos); tweens de UI e câmera a 60 fps.
8. Juice: hit-stop de 50–220 ms, tremor pelo modelo trauma² (máximo 4 px), clarão branco e depois vermelho, contadores que sobem.
9. Movimento reduzido: sem tremor, sem clarão de tela, poucos brilhos. Nunca mais de 3 clarões por segundo.

## Lições de cenário (ref-13-v2)
Padrão para o título e para os fundos das 13 fases. Os ajudantes citados estão em `src/scene/backdrop.ts` e são opcionais (os padrões antigos não mudaram).
1. **De 6 a 7 planos, do claro e frio ao escuro e quente:** céu (`void`→`night`→`dusk`→`blood0`→`blood1`→`crimsonDeep` colado no horizonte), serra distante (`hazeDark`), morros médios (`dusk`/`night`), cidade, água, morro do herói (pedra `stone1`–`stone3`) e primeiro plano (`void`/`night`). Cada plano mais perto desce 1 degrau de valor; nunca dois planos vizinhos com o mesmo tom de corpo.
2. **Névoa sobe do pé, na cor do horizonte:** pontilhado de no máximo 55% nos últimos 3–3,5% da altura do plano, em `blood1` (serra) ou `blood0` (morros). Névoa fria lilás (`haze`) só onde não houver brasa. Ajudante: `ridge(..., { fog, fogH, fogMax })`.
3. **Aro de 1 px no cume, sem contorno escuro à distância:** serra com aro `crimsonDeep`, morros com `blood1`. Contorno preto só no morro do herói e nas pedras de perto.
4. **Faixa de água no horizonte é a parte mais clara do meio da tela:** 4–6% da altura, traços horizontais `ember`/`emberBright` com `goldHi` raro (≤ 3% da faixa) e 1 linha escura (`blood0`) a cada 3. Os morros médios e o marco (Pão de Açúcar) ficam em silhueta contra ela.
5. **Nuvens: poucos sopros grandes que se leem.** Raio de 4–8% da altura, 4–9 sopros por cacho, aro `redHot`/`red` de 1–2 px no alto-esquerda, corpo em 4 faixas (`crimson`→`crimsonDeep`→`blood1`→`blood0`) com pontilhado só numa faixa estreita entre tons, e a base chapada dos sopros de baixo acesa de `ember`. Ajudante: `cumulusLayer`. Nada de couve-flor com grão (é o que faz a nuvem virar borrão).
6. **Estratos colados no horizonte:** 1,5–6 px de espessura, mais finos e mais quentes quanto mais baixos (base `emberBright` perto do horizonte, `red` no alto). Ajudante: `stratusLayer`. Derivam a ~1 px/s; cúmulos a ~2 px/s, mesmo sentido.
7. **Cidade em 3 fileiras com hierarquia:** longe (corpo `blood0`, luzes fracas `emberDark`/`gold1`, 42%), meio (corpo `night`, 50%, `ember`→`goldHi`) e acesa (fachada `gold0` com aresta `emberDark`, 45%, para a orla e o pé dos morros). Janela de 1 px em grade de 2 px, o tom mais raro (`goldHi`/`sparkle`) só em ~5% delas. Ajudante: `cityRow(..., CITY.far|mid|lit|near, anchors, gap)`; `gap` 0,3 faz bairros em cachos com o morro aparecendo entre eles. Sem aresta clara dos dois lados (vira "aramado").
8. **Morros na frente da cidade:** cada faixa de cidade fica em cima de um morro escuro (`night`, manchas `void`), e o morro seguinte cobre o pé dela. Luz solta de rua em ~2,5% das linhas pares do morro.
9. **Orla legível:** areia curva de 2–4 px (`gold1`/`emberDark`, borda d'água `ember`/`emberBright`), postes a cada 3 px no calçadão, e a água lavando de laranja nos 9 px junto da areia.
10. **Água devolve luz em traços quebrados:** abaixo de cada poste, traços de 1–2 px a cada 2 linhas, 6–26 linhas de comprimento, esfriando `gold1`→`emberDark`→`blood1`; 1 em cada 3 pisca (animado). Água base `night`/`dusk`, mais clara perto da areia.
11. **Marco de silhueta clara:** Pão de Açúcar ~8% da altura com luzes da estação no cume; Corcovado com topo arredondado e encosta íngreme, pedra fria (`hazeDark`/`stone0`) mais clara que o céu e faceta quente (`stone1`/`gold0`) do lado da cidade; estrada em zigue-zague de pontos de luz a cada 2 px com a trilha em `blood1`. Cristo com envergadura ≈ altura, braço de 2–3 px, salmão (`stoneHi`/`redGlow`/`emberDark`).
12. **Pedra do herói iluminada, mato em cachos:** pedras grandes (raio 0,8–1,6 u) com faces até `stone3` (`drawRock(..., lift = 0.12)`), musgo de 1 px (`vine1`/`green`, `leafHi` raro) seguindo o topo, e cachos com 3 tons + 1 px de `leafHi` (`foliage`). Aro vermelho só no pixel de borda virado para a luz, e só até ~5 u do brilho (senão vira canteiro vermelho).
13. **Primeiro plano emoldura e protege a UI:** copas quase pretas (`void`/`night`, 1 px `vine0` nos topos; `DARK_CANOPY`) com 5% da altura no meio e até 38% no canto do menu. Atrás de texto de interface, nada mais claro que `night`.
14. **Vazio deliberado:** sem luz de cidade nem nuvem clara atrás do centro do monumento e do HUD; estrelas raras (1 a cada ~260 px² de céu) e só na metade de cima.
15. **Orçamento:** a reconstrução do fundo fica em ≤ 250 ms (ruído caro em cache por pixel, nada pintado duas vezes) e o quadro só desenha camadas assadas, reflexos e luzes piscando.
