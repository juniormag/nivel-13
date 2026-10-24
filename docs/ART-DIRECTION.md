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
