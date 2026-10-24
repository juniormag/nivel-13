# Modos novos · "Convence o Tio" e "Onde Foi?"

Pedido: um modo simples de convencer um familiar a votar no 13, e um mapa dos casos do bolsonarismo. A mecânica tem que ser a mais fácil de entender, divertida, com potencial de viralizar e ensinando o que melhorou no país e o que piorou com o bolsonarismo. A eleição é domingo 25/10/2026, 8h–17h (Brasília): os dois modos precisam funcionar hoje, em 60 segundos, com um toque por decisão.

## 1. Convence o Tio (o modo principal)

**Pitch:** "Seu tio mandou isso no grupo. Responde direito e ele muda de ideia."

**Por que funciona:** todo brasileiro tem essa conversa no WhatsApp da família. O jogo ensina *o que* dizer (o fato, com fonte) e *como* dizer (com respeito, dado e coisa do dia a dia). A pesquisa de persuasão em VIRAL-DESIGN §1.3 diz que ofensa fecha a conversa e dado próximo da vida da pessoa abre. E o que se compartilha no fim é útil de verdade: as respostas prontas para mandar no grupo real.

**Laço (60 s):**
1. Escolha o parente (5 personagens fictícios em pixel, cada um com uma preocupação): Tio Zé (gasolina e emprego), Tia Cida (família e fé), Vô Lauro (aposentadoria e remédio), Prima Bia (vive de vídeo curto e recebe muita fake), Mãe (preço do mercado).
2. Tela de chat no estilo de mensageiro (genérico, sem marca de app real). O parente manda uma dúvida comum.
3. Aparecem 2 respostas. O jogador arrasta para a direita para mandar, ou toca. Uma é a boa (fato curto, tom gentil, fonte em 1 linha). A outra é uma armadilha de **tom** ("grosso"), de **fonte** ("todo mundo sabe", sem dado) ou de **assunto** (foge da preocupação dele). As armadilhas **nunca** trazem número falso nem fake news, para não espalhar desinformação nem em print.
4. Resposta boa: o parente reage ("Hmm, isso eu não sabia 🤔"), o medidor "Convencido" sobe, e o fato abre com a fonte. Armadilha: o parente fecha a cara ("Lá vem você...") e uma dica de 1 linha ensina por quê ("Ofender fecha a conversa. Dado com fonte abre.").
5. 5 mensagens por parente. No fim: "Tá bom, vou olhar o 13 com carinho" (venceu) ou "Vamos falar disso no almoço" (perdeu, com a dica principal). Nunca dizemos que alguém real votou.

**Share (3 artefatos):**
- Card de resultado (Story e Feed): "Convenci o Tio Zé em 5 mensagens 💬" + grade de emoji (🟩 boa, 🟥 armadilha) + link.
- **"Mandar no grupo da família"**: uma mensagem pronta de WhatsApp com as 5 respostas boas do parente escolhido, fontes e o link. É o artefato mais importante: transforma jogada em conversa real.
- Desafio: "Duvido você convencer a Tia Cida" (link `?t=tia`).

**Aprender:** cada resposta boa é uma carta de fato da Coleção. Os 5 parentes juntos cobrem mercado, emprego, imposto, saúde, educação, fome, segurança, democracia e fake news.

## 2. Onde Foi? (o mapa)

**Pitch:** "Toque no mapa onde aconteceu." Igual ao MapTap: uma pista e um toque no mapa do Brasil. Quanto mais perto, mais pontos.

**Duas cores de pino:**
- 🟩 **Avanço** (o que melhorou): por exemplo, onde o Brasil saiu do Mapa da Fome primeiro, a queda do desmatamento na Amazônia, obras e programas com dado oficial.
- 🟥 **Caso** (o que piorou com o bolsonarismo): 8 de Janeiro em Brasília, a crise de oxigênio em Manaus, a crise Yanomami em Roraima, as joias no aeroporto de Guarulhos, e outros casos com status jurídico exato.

**Nome:** o mapa se chama "Onde Foi?" e o lado vermelho, "casos". **Não** usamos "Mapa do crime": parte dos casos não tem condenação (há indiciamento, investigação e até arquivamento), e chamar tudo de crime é impreciso e arrisca processo. Cada pino vermelho mostra o selo de status exato (Condenado · STF, Indiciado · PF, Investigado, Arquivado), como nas cartas de fato.

**Laço (60 s):** 6 pinos por partida (3 verdes e 3 vermelhos, alternados). Pista em 1 frase, toque no mapa, revelação com linha até o ponto certo, distância, pontos e o fato em 2 linhas com fonte e status. No fim: "Seu mapa" com os 6 pinos e a grade de share (`🟩📍 120 km · 🟥📍 30 km ...`).

**Share:** grade de emoji com distâncias (estilo MapTap), card com o mapa de pinos e desafio "faz melhor que eu" (`?o=<semente>` com a mesma partida).

## 3. Guardrails (valem para os dois)
- Todo fato tem fonte, data e status jurídico exato; o fact-checker revisa (`review: 'ok'`) e só rodada revisada entra no jogo.
- Personagens fictícios, sem rosto ou nome de pessoa real nos parentes; pessoas reais só citadas nos fatos, sem imagem gerada, sem frase inventada.
- Nenhuma recompensa por voto. Nada de dado pessoal: o parente escolhido e as respostas não são gravados no servidor.
- Rótulo de IA e responsável em todo card de share.

## 4. Contrato técnico
- Conteúdo (dono: fact-checker): `src/content/tio.ts` (`PARENTES`, `TIO_MSGS`) e `src/content/onde.ts` (`PINS`). Tipos no topo de cada arquivo.
- Telas: `src/app/screens/Tio.tsx` + `src/modes/tio/*` e `src/app/screens/Onde.tsx` + `src/modes/onde/*`. Rotas `tio` e `onde` em `src/app/nav.ts` e `App.tsx`. Links: `?t=<parente>` e `?o=<semente>`.
- Reuso: `src/lib/score.ts` (haversine e curva), `src/content/brazil.ts` (contorno do Brasil), `src/share/*` (cards, ShareSheet), `src/viral/share.ts` (WhatsApp e cópia), `src/ui/*` (PixelButton, frames), `src/audio` (`sfx`).
