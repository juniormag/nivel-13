# Design viral · "Chuta Aí!" (Brasil em Números) + Tira-teima + Placar do Grupo + Papo de Almoço

Autor: game-director · Data: sábado, 24/10/2026 · Status: proposta para implementar hoje
Leia junto com: `docs/GAME-DESIGN.md`, `docs/research/share.md`, `src/content/facts.ts`, `src/content/statements.ts`.

---

## 0. Resumo e o relógio

**Decisão em uma frase:** o Desafio do Dia vira **Chuta Aí!**, um jogo diário de 5 chutes sobre números reais do Brasil ("quanto você acha que é o desemprego hoje?"). O jogador chuta num slider ou toca no mapa, vê a revelação com fonte e recebe nota por proximidade. Depois compartilha um placar sem spoiler que leva uma **pergunta** para o grupo da família. Três camadas sociais em volta: **Tira-teima** (duelo 1 a 1 pelo link), **Placar do Grupo** (ranking do grupo de WhatsApp por código) e **Papo de Almoço** (treino de conversa respeitosa que termina numa mensagem privada pronta, escolhida pela preocupação da pessoa).

**O relógio manda no escopo.** A data de hoje e a do segundo turno estão em `src/config.ts`:

| Dado | Valor | Fonte |
|---|---|---|
| Segundo turno | **amanhã, domingo 25/10/2026**, das 8h às 17h | `CONFIG.electionAt` |
| 1º turno (04/10) | Flávio 47,03% x Lula 45,16% dos válidos, diferença de **~2,2 milhões** de votos (56.104.503 x 53.879.538) | [O Povo](https://mais.opovo.com.br/reportagens-especiais/resultado-presidente-eleicoes-2026/2026/10/04/como-o-br-votou-para-presidente-no-1-turno-das-eleicoes-2026.html), [Portal de Prefeitura](https://portaldeprefeitura.com.br/bastidores-da-politica/eleicoes-2026-com-100-das-secoes-totalizadas-flavio-tem-4703-e/633498/) |
| Abstenção no 1º turno | **33,4 milhões (21,08%)**, a maior desde 1998 | [DGABC](https://www.dgabc.com.br/Noticia/4350968/primeiro-turno-de-2026-tem-maior-abstencao-desde-1998-com-mais-de-33-milhoes-ausentes), [Gazeta SP](https://www.gazetasp.com.br/politica/abstencao-no-1o-turno-chega-a-21-e-bate-recorde-desde-1998-334-milhoes-nao-votaram/) |
| Votos do 3º ao 5º colocado | Cury 3,45 mi + Renan Santos 2,68 mi + Caiado 2,61 mi = **~8,7 milhões** | mesmas fontes do 1º turno |
| Indecisos | Datafolha de 08/10: Flávio 49% x Lula 45% em votos totais, **~1% indecisos** | [O Liberal](https://www.oliberal.com/politica/em-votos-totais-flavio-bolsonaro-tem-49-ante-45-de-lula-no-2-turno-aponta-datafolha-1.1179030), [Quaest 10 a 13/10](https://tribunadejundiai.com.br/politica/quaest-segundo-turno-flavio-bolsonaro-tem-46-e-lula-44/) |
| Dia da eleição | É crime publicar **conteúdo novo** ou impulsionar na internet no dia da eleição. O que já foi publicado antes pode continuar no ar (Lei 9.504, art. 39, §5º, IV) | [Planalto · Lei 9.504](https://www.planalto.gov.br/ccivil_03/leis/l9504.htm), [Band](https://www.band.com.br/politica/eleicoes/2026/boca-de-urna-e-condutas-proibidas-o-que-evitar-no-domingo-de-eleicao), [TSE Res. 23.738](https://sintse.tse.jus.br/documentos/2024/Out/1/diario-da-justica-eletronico-tse/republicacao-resolucao-no-23-738-de-27-de-fevereiro-de-2024-calendario-eleitoral-eleicoes-2024) |

Consequências diretas:
1. **A janela de persuasão é de umas 18 horas.** Quase não há indeciso declarado. Os votos em jogo estão em três lugares: quem tende ao 13 e pode faltar (turnout), os ~8,7 milhões que votaram em terceiros no 1º turno, e o voto mole. A abstenção (33,4 mi) é 15 vezes a diferença do 1º turno (2,2 mi). **Comparecimento é a alavanca principal**, e o jogo precisa terminar todo dia num plano de voto.
2. **O MVP sai hoje até as 15h** (horário de Brasília) para pegar o pico de sábado à noite no WhatsApp. O que for para o ar em 25/10 tem de estar publicado **hoje**: as rodadas do domingo ficam no bundle de hoje, sem deploy no domingo e sem impulsionamento. O jurídico confirma o enquadramento antes da meia-noite (ver §3.6).
3. O laço de 7 dias (§2.2) continua especificado porque o pedido o descreve e porque serve para reaproveitar o jogo depois. Mas a régua de sucesso hoje é a do dia 1 (§6).

---

## 1. Síntese da pesquisa

### 1.1 Jogos virais: o que fizeram e por que espalharam

| Jogo | Mecânica | Como espalhou | Lição para nós | Fontes |
|---|---|---|---|---|
| **Wordle** | 1 palavra por dia, igual para todos, 6 tentativas | Grade de emoji copiável e sem spoiler. Os jogadores da Nova Zelândia já digitavam a grade à mão e Wardle automatizou. Foi de 90 jogadores (01/11/2021) para mais de 300 mil (02/01/2022) e ~2 milhões semanas depois. Wardle não pôs link no texto porque ficaria "feio" e o mistério puxava curiosidade | Um quebra-cabeça por dia para todos + grade compacta que gera pergunta ("o que é isso?") | [Wikipedia](https://en.wikipedia.org/wiki/Wordle), [Boston.com/NYT](https://www.boston.com/news/national-news/2022/01/04/he-made-wordle-for-his-partner-now-its-an-online-hit/), [CUNY](https://pressbooks.cuny.edu/inspire/part/the-wordle-effect-how-five-letters-changed-the-internet/) |
| **Termo** (term.ooo) | Wordle em português | Lançado em 05/01/2022 por Fernando Serboncini: 20 mil jogadores na 1ª hora e ~460 a 500 mil por dia em fevereiro de 2022. Prova de que o formato funciona em PT-BR e no Twitter/WhatsApp brasileiro | Idioma e referência local multiplicam a adoção | [Wikipedia](https://en.wikipedia.org/wiki/Termo_(video_game)), [Tecnoblog](https://tecnoblog.net/noticias/wordle-jogo-sensacao-do-twitter-ganha-versao-brasileira-termooo/), [O Povo](https://www.opovo.com.br/noticias/tecnologia/2022/01/27/wordle-termo-e-letreco-como-jogar-e-dicas-do-game-que-e-febre-no-twitter.html) |
| **Letreco** | Outro Wordle brasileiro, lançado na mesma onda | Dividiu a febre com o Termo em janeiro de 2022 | O mercado brasileiro absorve vários diários ao mesmo tempo | [O Povo](https://www.opovo.com.br/noticias/tecnologia/2022/01/27/wordle-termo-e-letreco-como-jogar-e-dicas-do-game-que-e-febre-no-twitter.html) |
| **Contexto** | Palavra secreta; cada chute recebe uma posição por proximidade semântica | Nota por **proximidade**, não acerto/erro, e por isso o "quase" vira conversa. Não achei números de crescimento verificáveis nem a autoria | Nota contínua gera mais conversa que certo/errado | [WWWhatsnew](https://wwwhatsnew.com/2024/01/03/contexto-me-el-juego-de-adivinar-palabras-en-espanol/) (só a mecânica) |
| **MapTap** | 5 lugares por dia, ligados a fatos "neste dia na história"; toque no globo; 0 a 100 por toque conforme a distância; rodadas finais valem mais (fontes citam pesos 1-1-2-3-3) e o total vai até 1.000; modo versus de 20 s com amigos | Texto copiável para grupos ("meu novo Wordle", TechCrunch, jun/2026). Fóruns mostram a colagem diária com emoji por rodada e "Final score". 4,9 estrelas na App Store. Inspirou clones (o GeoSports teve 79 jogadores no dia 1 e 575 no dia 2). Não há número oficial de usuários | Nota por proximidade + pesos crescentes + fato real + versus com amigos | [TechCrunch](https://techcrunch.com/2026/06/18/maptap-a-daily-geography-game-is-my-new-wordle/), [Google Play](https://play.google.com/store/apps/details?id=gg.maptap.app), [NPR/KVCR](https://kvcr.org/news/npr-top-stories/2026-09-05/daily-puzzle-games-history-geography), [Dailydle](https://www.dailydle.org/games/maptap), [fórum](https://forum.endeavouros.com/t/map-tap-another-daily-challenge/78877?page=33), [GeoSports](https://fmsnewsletter.beehiiv.com/p/geosports) |
| **Worldle** | Silhueta de país; cada erro mostra distância e direção | Quase 950 mil usuários por dia poucos dias após o lançamento (fev/2022) | Distância e seta transformam erro em pista e em surpresa | [Wikipedia](https://en.wikipedia.org/wiki/Worldle) |
| **Connections** (NYT) | 16 palavras em 4 grupos | 2º jogo mais jogado do NYT; grade colorida de 4 linhas | A grade também mostra o *caminho* e não só o resultado | [Yahoo](https://au.news.yahoo.com/connections-york-times-most-played-202419838.html) |
| **Framed / Bandle / Costcodle** | Variações temáticas do diário (filme, música, preço) | Nichos com fãs que já conversam sobre o tema. Não achei números públicos | Tema que o público já discute (preço, salário, imposto) já vem com conversa pronta | [GameSpot](https://www.gamespot.com/articles/framed-is-a-wordle-like-with-scenes-from-movies/1100-6501819/) |
| **The Higher Lower Game** | Qual tem mais buscas no Google? | 4,8 milhões de partidas, depois 50 milhões (jul/2016); vídeo do PewDiePie com 7 milhões de views. Comparar números é divertido e assistível | Estimar números reais é diversão de massa, não só de nerd | [The Drum](https://www.thedrum.com/news/2016/07/12/code-computerlove-s-higher-or-lower-search-game-app-goes-viral), [Code Computerlove](https://www.codecomputerlove.com/blog/the-higher-lower-game-goes-viral) |
| **Gapminder / Factfulness** | 12 perguntas de 3 opções sobre o mundo | As pessoas acertaram 2,2 de 12 em média, abaixo do acaso (4). Só 10% superaram o acaso. "O problema não é falta de conhecimento, é conhecimento errado" | O erro é **sistemático e pessimista**, e é aí que mora a surpresa | [Gapminder](https://www.gapminder.org/ignorance/studies/gms/) |
| **BeReal** | 1 aviso por dia, 2 minutos para postar | Crescimento de 315% em 2022 (Apptopia). O ritual diário igual para todos cria o "você já fez o de hoje?" | Hora marcada e janela curta geram conversa sincronizada | [BYU](https://universe.byu.edu/2022/10/24/not-another-social-network-bereal-draws-massive-crowds-offering-a-unique-social-media-experience), [Apptopia](https://apptopia.com/en/blog/social-app-of-the-moment-bereal-grows-users-315-ytd/) |
| **Spotify Wrapped** | Estatística pessoal em cards 9:16 | 500 milhões+ de shares no 1º dia em 2025 | Dado **sobre mim** + card pronto + botão em cada card | `docs/research/share.md` §4 |
| **Duolingo** | Sequência com marcos e "Friend Streak" | Quem tem sequência com amigo tem 22% mais chance de fazer a lição do dia | Compromisso social segura o D1 | `docs/research/share.md` §4 |
| **Quick, Draw!** | Desenhe em 20 s, a IA adivinha | Rodadas curtíssimas com resultado surpreendente e engraçado | Rodada de até 20 s, sem cadastro | (referência de design; sem números verificados aqui) |

### 1.2 Os padrões que vamos usar

1. **Um por dia, igual para todo o Brasil.** É o que cria assunto ("você já fez o de hoje?"). Wordle, Termo, MapTap, BeReal.
2. **1 a 3 minutos.** Cabe na fila do mercado. Cinco rodadas de ~18 s.
3. **Nota por proximidade, não certo/errado.** Contexto, MapTap e Worldle. O "quase" rende conversa, e ninguém sai zerado.
4. **Grade de emoji sem spoiler + uma linha humana.** Wordle. O mistério da grade puxa o clique.
5. **Pesos crescentes.** MapTap (1-1-2-3-3). Mantém a tensão até a última rodada.
6. **Revelação-surpresa.** Gapminder e Higher Lower. O erro pessimista é sistemático, então a surpresa é garantida.
7. **Comparar com quem a gente conhece.** Versus do MapTap e Friend Streak do Duolingo. Placar de grupo é o Wordle dos grupos de família.
8. **Sequência com congelamento.** Duolingo. Já existe no jogo (1 por semana).
9. **Dado sobre mim.** Wrapped. Já temos a calculadora do IR (fase 3), o momento de share mais forte do jogo.
10. **Link com OG próprio e texto curto.** `docs/research/share.md` §0.7.

### 1.3 O que muda opinião e voto: evidência

| Achado | O que diz | Limite | Uso no design | Fonte |
|---|---|---|---|---|
| **Chutar antes de ver** | Gerar uma previsão antes de ver um número melhora a memória do resultado, sobretudo quando ele surpreende (erro de previsão) | Literatura mista: há estudos com curva em U | O chute vem **antes** da revelação, sempre | [Brod, Hasselhorn e Bunge 2018](https://doi.org/10.1016/j.learninstruc.2018.01.013), [estudo de 2022 sobre previsão de fatos numéricos (conferir)](https://pmc.ncbi.nlm.nih.gov/articles/PMC9722848) |
| **Lacuna de percepção** | Erro sistemático e pessimista sobre indicadores | | As rodadas escolhem números em que o erro é provável | [Gapminder](https://www.gapminder.org/ignorance/studies/gms/) |
| **A lacuna no Brasil** | Genial/Quaest (mai/2026): 46% veem piora da economia em 12 meses e 69% dizem que o preço da comida subiu. Datafolha (mar/2026): 48% esperam alta do desemprego. Enquanto isso o desemprego está no menor nível da série (5,1% no fim de 2025) | Percepção de preço é vivida e não é "erro": o mercado está mesmo mais caro que há 3 anos | Desemprego e IR são as rodadas de maior surpresa. Inflação entra com empatia ("subiu menos, não caiu") | [Canal Rural/Quaest](https://www.canalrural.com.br/economia/pesquisa-genial-quaest-mostra-que-46-veem-piora-da-economia-em-12-meses/), [Forbes/Datafolha](https://forbes.com.br/forbes-money/2026/03/brasileiros-estao-mais-pessimistas-com-a-economia-aponta-datafolha/), `facts.ts#emprego` |
| **Checagem muda crença, não voto** | Checagens deixaram as crenças mais corretas, inclusive entre eleitores de Trump, sem mudar a avaliação do candidato | Efeito do fato sozinho sobre o voto ≈ 0 | O fato é a porta de entrada. Quem move voto é o **mensageiro próximo** e a ação concreta | [Nyhan, Porter, Reifler e Wood 2019](https://papers.ssrn.com/abstract=2995128) |
| **Corrigir número não muda atitude** | Corrigir a superestimação de imigrantes mudou pouco as atitudes | Mesmo limite | Não prometer "conversão por dado". O número abre conversa | [Sides e Citrin, resumo](https://lexisnexis.com/community/insights/legal/immigration/b/outsidenews/posts/americans-drastically-overestimate-how-many-unauthorized-immigrants-are-in-the-country-and-they-don-t-want-to-know-the-truth) |
| **Deep canvassing** | Escutar sem julgar, trocar histórias e deixar a pessoa chegar à conclusão: mudança durável aos 3 meses (Science, 2016). Em 2020, por telefone, ~3,1 pontos de margem por 100 conversas (5 pontos entre independentes), resultado preliminar e não revisado por pares | Exige conversa real de 10 min ou mais. Um jogo não substitui isso | O Papo de Almoço **treina o jogador** (o mensageiro), não o tio | [Berkeley](https://news.berkeley.edu/2020/06/26/want-to-persuade-an-opponent-try-listening-berkeley-scholar-says/), [Wikipedia](https://en.wikipedia.org/wiki/Deep_canvassing), [People's Action PDF](https://assets.documentcloud.org/documents/7208847/People-s-Action-Deep-Canvass-Political.pdf) |
| **Contato de campanha comum** | A melhor estimativa do efeito de anúncio e contato de campanha sobre a escolha de candidato em eleição geral é **zero** (meta-análise de 49 experimentos) | | Não somos mais um anúncio: o conteúdo viaja de pessoa para pessoa | [Wikipedia, deep canvassing](https://en.wikipedia.org/wiki/Deep_canvassing) |
| **Laços fortes** | 61 milhões de usuários no Facebook (2010): a transmissão social superou o efeito direto da mensagem, quase toda entre amigos próximos | Efeito por pessoa pequeno, somado grande | Grupo da família e duelo 1 a 1, nunca disparo em massa | [Bond et al. 2012, Nature](https://www.nature.com/articles/nature11421) |
| **Organização relacional** | SMS de amigo para amigo: ~8 pontos a mais de comparecimento contra 0,3 de SMS de campanha (dado do fornecedor; o artigo acadêmico confirma "efeito grande"). "Capitães" com lista de conhecidos: +13% | Números de fornecedor exigem cautela | O jogo arma o jogador para mandar mensagem **pessoal** a 3 pessoas | [Schein et al.](https://www.cs.columbia.edu/~blei/papers/ScheinVafaSridharVeitchQuinnMoffetBleiGreen2021.pdf), [Impactive](https://impactive.io/blog/largest-ever-study-on-relational-organizing-shows-8-3-percent-increase-in-turnout), [Turnout Nation](https://politics.media.mit.edu/papers/Turnout_Nation.pdf) |
| **Plano de voto** | Perguntar quando, de onde e como a pessoa vai votar: +4,1 pontos de comparecimento (+9,1 em casa de eleitor único) | Sem efeito em casas com vários eleitores | Card "Meu plano de domingo" ao fim de cada partida em 24 e 25/10 | [Nickerson e Rogers 2010](https://marketing.wharton.upenn.edu/wp-content/uploads/2016/10/nickerson20and20rogers_FINAL.pdf) |
| **Pressão social** | Carta mostrando se os vizinhos votaram: +8,1 pontos, mas muita gente pediu para sair da lista | Gera rejeição e expõe pessoas | **Não usamos** pressão individual. Só norma descritiva agregada ("12 mil pessoas do seu estado já fizeram plano") | [J-PAL](https://www.povertyactionlab.org/evaluation/social-pressure-and-voter-turnout-united-states) |
| **"Ser eleitor"** | Falar em identidade ("ser eleitor") aumentou o comparecimento em 2011 | Réplica grande (2014) não achou efeito | Copy pode usar "eleitor", mas não apostamos nisso | [Bryan et al. 2011](https://pmc.ncbi.nlm.nih.gov/articles/PMC3150938), [réplica LSE](https://researchonline.lse.ac.uk/id/eprint/85000) |
| **Prebunking em jogo** | Bad News: 1 partida reduziu em 21% a confiança em fake news. Harmony Square: −16% de confiabilidade percebida e −11% de vontade de compartilhar, sem diferença entre esquerda e direita. Go Viral!: efeito por até 3 meses | Efeitos medidos em autorrelato | A rodada 5 é Fato ou Fake, sobre boatos de véspera de eleição | [Cambridge](https://www.cam.ac.uk/stories/goviral), [Gates Cambridge](https://gatescambridge.org/about/news/online-game-helps-players-to-spot-fake-news), [Harmony Square](https://doi.org/10.37016/mr-2020-47), [Nieman Lab](https://www.niemanlab.org/reading/this-game-inoculates-its-players-against-political-misinformation/) |
| **Metapercepção** | Corrigir a crença exagerada sobre o quanto o outro lado apoia violência reduziu o apoio à violência | | Tom: o outro lado é a tia do almoço, não inimigo | [Mernyk et al. 2022, PNAS](https://doi.org/10.1073/pnas.2116851119) |

**Brasil, especificamente:**
- WhatsApp era fonte de notícia para 2 em cada 5 brasileiros em 2022, e 53% confiavam em notícia recebida por ele ([Poder360/Reuters DNR](https://www.poder360.com.br/poder-midia/so-10-dos-brasileiros-leem-jornal-impresso-diz-estudo/), [Gazeta SP](https://www.gazetasp.com.br/brasil/53-dos-brasileiros-confia-em-noticias-via-whatsapp-diz-estudo/)).
- Grupos de família são o tipo de grupo que mais espalha boato (estudo da USP sobre o caso Marielle, [Brasil de Fato](https://brasildefato.com.br/2018/04/23/entre-grupos-de-whatsapp-o-de-familias-e-o-que-mais-dissemina-fake-news-diz-estudo/)). O próprio TSE tratou o "tio do zap" (eleitor mais velho) como público vulnerável ([Gazeta do Povo](https://www.gazetadopovo.com.br/vida-e-cidadania/tse-pode-lancar-campanha-contra-fake-news-aos-tios-do-zap/)), e a "Tia Vera" do TRE-SE, uma série de áudios no WhatsApp, aumentou em 39,7% a intenção de checar ([TRE-SE](https://www.tre-se.jus.br/institucional/governanca-e-gestao/gestao-da-inovacao/9se/acoes-paginas-internas/tia-vera-arquivos/relatorio-de-projeto-tia-vera-cnj)). **Lição: falar com o tio por afeto, nunca zombar dele.** No produto, o nome "tio do zap" não aparece.
- Preocupações (Quaest, abr/2026, antes do 1º turno): violência 27%, corrupção 19%, problemas sociais 16%, saúde 14%, economia 9% ([Correio da Manhã PDF](https://digital.correiodamanha.com.br/jornalcorreiodamanha/2026/04/20/213323/pdf/2004cmanha05.pdf)). Endividamento, saúde e segurança aparecem como temas que decidem voto ([Metrópoles](https://www.metropoles.com/brasil/dividas-seguranca-saude-pode-decidir-voto-outubro)). No dia a dia, porém, o que aparece é o bolso: comida, poder de compra e emprego (Quaest de maio, acima). Não achei pesquisa com recorte só dos indecisos no 2º turno. Os relatórios completos de Quaest e Datafolha de 22 e 24/10 devem ser consultados.
- Comparecimento: no 2º turno de 2022, a abstenção foi de 20,59% e o resultado saiu por 2.139.645 votos ([TSE](https://www.tse.jus.br/comunicacao/noticias/2022/Outubro/100-das-secoes-totalizadas-confira-como-ficou-o-quadro-eleitoral-apos-o-2o-turno)). Em 2026, a campanha mira os 33 milhões de ausentes ([Correio da Manhã](https://www.correiodamanha.com.br/politica/2026/10/324793-lula-muda-estrategia-e-mira-33-milhoes-de-ausentes-para-tentar-virar-eleicao-no-2-turno.html)).

---

## 2. A mecânica escolhida

### 2.0 Avaliação da proposta candidata ("Brasil em Números" / "Mapa do 13" + "Desafie seu tio" + "Placar do grupo")

| Ideia | Veredito | Por quê |
|---|---|---|
| Estimar um indicador real, nota por proximidade, revelação com fonte | **Aceito, é o núcleo** | Junta os padrões 1 a 6 com a evidência de previsão-surpresa e de lacuna de percepção |
| "Tocar onde no Brasil aconteceu" | **Aceito como tempero, no máximo 1 rodada por dia** | É divertido (MapTap), mas o "onde" persuade pouco: o que pesa é o "quanto". O mapa vira aquecimento e orgulho regional. **Fica fora do MVP de hoje** |
| Dois diários (Fato ou Fake + Brasil em Números) | **Rejeito: um diário só** | Dois diários dividem atenção e sequência. O Chuta Aí **substitui o formato** do Desafio do Dia e a rodada 5 é Fato ou Fake. A sequência atual continua |
| Share "Errei por 7 pontos 🟥🟨🟩" | **Mudo** | A grade fica, mas a linha humana vira uma **pergunta-gancho** ("Errei o desemprego feio. Quanto você chuta?"). Quem recebe chuta de cabeça antes de clicar, e esse é o chute que persuade |
| "Desafie seu tio" | **Aceito, com outro nome: Tira-teima** | "Tio" dito pela campanha soa como deboche. "Tira-teima" é expressão de família e funciona com qualquer parente |
| "Placar do grupo" por código | **Aceito, com privacidade** | Sem nome de grupo livre e sem nenhum dado de voto no placar (§5.3) |
| "Conversa com o tio" (deep canvassing) | **Aceito como Papo de Almoço, em módulo de 60 a 90 s depois da partida.** No MVP só entra o compositor de mensagem | Não há evidência de que um jogo treine deep canvassing. A evidência é que **o mensageiro próximo** move voto, então o módulo existe para melhorar a mensagem que o jogador manda |

### 2.1 Nomes e pitch

- **Chuta Aí!** · *Brasil em Números*. Pitch: **"5 números do Brasil por dia. Chuta, descobre e desafia a família."**
- **Tira-teima**: duelo 1 a 1 com as mesmas 5 rodadas. "Fiz 1.040. Tira-teima?"
- **Placar do Grupo**: ranking do dia e da semana do grupo de WhatsApp por código.
- **Papo de Almoço**: treino de conversa que termina numa mensagem privada pronta.
- **Meu plano de domingo**: card de plano de voto (24 e 25/10). Sem recompensa nenhuma.

### 2.2 O laço

**Dia 1 (primeiro contato, quase sempre por link num grupo):**
1. Link `jogo.com.br/c/5?g=CAPI47` → preview OG "Chuta Aí #5 · Placar do Grupo Capivara-47". Toque.
2. **0 a 3 s:** a rodada 1 já aparece com o slider na tela. Não há onboarding antes de jogar: apelido e avatar ficam para depois do resultado.
3. **~90 s:** 5 rodadas. A primeira é fácil (vitória antes de 20 s).
4. Resultado: total contando, grade, "você foi melhor que 64% do Brasil hoje" e, se veio por link, a comparação com quem convidou.
5. Painel de share que não bloqueia: **Mandar no grupo** (texto), **Tira-teima** (link de duelo), **Story** (PNG 9:16).
6. "Entrar no placar do grupo?" (só se veio com `?g=`). Toque explícito. Aparece só o apelido.
7. **Papo de Almoço** (opcional): "Tem alguém que você quer chamar pra conversar?" → preocupação → mensagem privada.
8. **Meu plano de domingo** (só em 24/10 e 25/10): horário, documento e com quem vai. Gera card.
9. Saída: "Amanhã: um número sobre o seu salário" + convite para a Jornada de 13 fases.

**Dia 2 (amanhã, no calendário real é o domingo da eleição):** o jogador volta pelo placar do grupo (alguém postou "Falta você") ou pela sequência. Em 25/10 roda o **Modo Dia de Votar**: 5 rodadas cívicas, todas publicadas hoje (§4.2), com o plano de voto em destaque. Nenhuma rodada nova, nenhum deploy e nenhum impulsionamento no dia.

**Dia 7 (no laço genérico, para reaproveitar depois da eleição):**
- Card de **sequência de 7** (Duolingo).
- **Campeão da semana do grupo**: card automático na abertura de domingo, "Tia Lu venceu a semana no Grupo Capivara-47".
- **Retrospectiva da semana** (estilo Wrapped): "Você chutou 35 números. O que mais te surpreendeu: desemprego (você chutou 11%, era 5,3%)". Esse card é sobre **mim**, então compartilha bem.

### 2.3 Estrutura da rodada (tempos)

| t | O que acontece | Regra |
|---|---|---|
| 0 ms | Pergunta (até 2 linhas) + slider ou mapa ou opções, já interativos | Primeiro toque em até 3 s. O polegar fantasma balança 1 vez se não houver toque em 2 s |
| 0 a ~10 s | Jogador ajusta o chute. Valor grande acima do slider, botões −/+ de 44 px | **Sem cronômetro.** Público 55+ não pode ser punido por lentidão |
| toque em **Chutar** | Trava e entra em suspense de 600 ms: agulha varre do chute até a resposta, com tique sonoro subindo | Hit-stop de 60 ms na chegada |
| +600 ms | Revelação: número real grande, distância ("você chutou 11%: 5,7 pontos acima"), pontos contando por 400 ms, emoji, texto de até 2 linhas e chip da fonte (toque abre o link) | Acerto em cheio 🎯: partícula dourada. Erro grande: tremor curto, nunca vermelho de "fracasso" |
| +1.200 ms | "Brasil chutou" (quando houver histograma): "7 em cada 10 chutaram acima" | Prova social e surpresa |
| +1.400 ms | Botão **Próxima** aparece | Total de ~18 s por rodada; partida de 90 a 120 s |

Entradas:
- **Número:** slider horizontal com polegar de 48 px, escala linear ou log conforme a rodada. Começa no **meio da escala**, nunca perto da resposta (anti-ancoragem). A faixa de cada rodada põe a resposta entre 20% e 80% do slider, salvo quando a escala é natural (0 a 100%).
- **Mapa:** silhueta do Brasil em pixel (`src/content/brazil.ts`), toque → pino → **Confirmar**. Sem zoom: a escala é o país.
- **Escolha / Fato ou Fake:** 2 a 4 botões grandes.

### 2.4 Pontuação

```ts
// src/lib/score.ts (função pura, com testes em tests/score.test.ts)
export const WEIGHTS = [2, 2, 3, 3, 3] as const // soma 13 → máximo 1.300 pontos

/** x: 0 = dentro da tolerância, 1 = longe demais. */
const curve = (x: number) => (x <= 0 ? 100 : Math.max(5, Math.round(95 * (1 - Math.min(1, x)) ** 1.4)))

export function roundScore(r: Round, guess: number | { lon: number; lat: number } | number /* índice */): number {
  switch (r.kind) {
    case 'number': {
      const g = guess as number
      if (r.scale === 'log') {
        const e = Math.abs(Math.log(g / r.answer))
        return curve((e - Math.log(r.tol)) / (Math.log(r.zero) - Math.log(r.tol)))
      }
      const e = Math.abs(g - r.answer)
      return curve((e - r.tol) / (r.zero - r.tol))
    }
    case 'map': {
      const km = haversineKm(guess as { lon: number; lat: number }, r.target)
      return curve((km - r.tolKm) / (r.zeroKm - r.tolKm))
    }
    case 'choice':
      return guess === r.correct ? 100 : 5
  }
}
export const total = (s: number[]) => s.reduce((a, v, i) => a + v * WEIGHTS[i], 0)
export const emoji = (s: number) => (s === 100 ? '🎯' : s >= 70 ? '🟩' : s >= 35 ? '🟨' : '🟥')
```

- `tol` é a faixa de nota cheia. No modo log, é uma razão (1,15 = ±15%).
- `zero` é a distância em que a nota cai para o piso. No modo log, é uma razão (5 = errar por 5 vezes).
- **Piso de 5 pontos:** ninguém zera rodada, e o pior total possível é 65. "Errar nunca trava."
- Curva de expoente 1,4: x = 0,25 dá 63 pontos e x = 0,5 dá 36. Generoso perto e firme longe.
- **13 como teto simbólico:** pesos somam 13, máximo 1.300. A pontuação nunca tem ligação com voto, plano de voto ou movimento.

### 2.5 Artefatos de share

**Texto (principal, WhatsApp).** Usa `navigator.share({ text })` e cai para `wa.me/?text=`. URL sempre na última linha para gerar o preview.

```
Chuta Aí #5 · 1.040 de 1.300
🎯🟩🟨🟥🟩
Errei o desemprego feio 😅 Quanto você chuta?
🔥 3 dias
jogo.com.br/c/5?d=K7Q2PX&s=wa
```

Regras da linha-gancho (gerada a partir do `theme` de cada rodada, sem números):
- Pior rodada com nota < 35: `Errei {theme} feio 😅 Quanto você chuta?`
- Alguma rodada 🎯: `Cravei {theme} 🎯 Duvido você.`
- Senão: `Quase gabaritei. Tira-teima?`
- Nunca mostra o valor da resposta nem a direção do erro (sem spoiler).

**Texto do Placar do Grupo** (botão "Postar no grupo", só depois de jogar):

```
Placar do Grupo Capivara-47 · Chuta Aí #5
🥇 Tia Lu 1.180
🥈 Júnior 1.040
🥉 Vô Zé 860
Falta você 👀
jogo.com.br/c/5?g=CAPI47&s=wa_grupo
```

**Texto do Tira-teima** (no fim de um duelo):

```
Tira-teima Chuta Aí #5
Eu 1.040 x 1.180 Tia Lu
🟩🟩🟨🟥🟩
🟩🎯🟩🟨🟩
Revanche amanhã?
jogo.com.br/c/6?d=Q4M8ZT
```

**Imagem (Story / Status)**, seguindo `docs/research/share.md` §0.1 e §0.2: 1080×1920, lógico 180×320 ×6, PNG sem alpha, menor que 1 MB.
- y 0 a 270: só arte (céu noturno, anéis vermelhos).
- Zona central (x 65 a 1015, y 270 a 1250): "CHUTA AÍ #5", total gigante "1.040" em `--gold`, 5 blocos pixel 24×24 lógicos com a cor da nota e o ícone do tema de cada rodada (moeda, carteira, remédio, urna, fake), a sequência 🔥 e a linha-gancho.
- Zona macia (y 1250 a 1540): "jogo.com.br" desenhado na arte, mais **rótulo de IA e responsável** (`CONFIG.aiLabel`, `responsavelText()`, regra 4).
- Variante feed 1080×1350 para chat.
- Pré-render enquanto o total conta (regra 1 do share.md: `navigator.share` é a primeira chamada assíncrona do clique).

**OG (preview do link)**: 1200×630, até 300 KB, PNG-8.
- `/c/{n}` → `og:title` "Chuta Aí #5: 5 números do Brasil. Quanto você chuta?" e `og:image` `/og/c-5.png` (estático, gerado no build).
- `/c/{n}?d=CODE` → mesmo `og:image`, e o `og:title` dinâmico (só HTML, sem gerar imagem): "Júnior fez 1.040 no Chuta Aí #5. Tira-teima?"
- `og:description` sempre carrega a identificação: "Propaganda eleitoral · {responsável} · Conteúdo produzido com uso de IA". Assim todo preview no WhatsApp leva a identificação, e o texto do jogador fica curto. **Validar com o jurídico** (§3.6).

**Formato dos links**

| Parâmetro | Exemplo | Significado |
|---|---|---|
| caminho `/c/{n}` | `/c/5` | Chuta Aí número n (n = `dailyNumber()`, época 2026-10-20). Rota do worker com OG próprio; redireciona para `/?c=5…` |
| `d` | `d=K7Q2PX` | Código do duelo (6 caracteres, alfabeto `ABCDEFGHJKMNPQRSTUVWXYZ23456789`) |
| `g` | `g=CAPI47` | Código do grupo (mesmo alfabeto) |
| `s` | `s=wa`, `wa_grupo`, `wa_status`, `ig_story`, `tio` | Superfície (atribuição) |
| `v` | `v=b` | Variante de teste A/B do texto (§6) |
| `r` | (existente) | Corrente de convites. O duelo e o grupo já carregam o dono no servidor, então `r` é opcional |

### 2.6 Dinâmicas sociais

**Tira-teima (duelo)**
- Criar: botão no resultado → `POST /api/duelo` com o dia e as 5 notas → código → share.
- Receber: quem abre `?d=` cai **direto na rodada 1 daquele dia** (mesmo que já seja outro dia; o duelo fixa o número). Faixa no topo: "Júnior fez 1.040. Sua vez."
- Fim: tela lado a lado com as 5 rodadas (grade x grade), vencedor com coroa pixel, botões **Revanche** (cria o duelo inverso para o próximo dia) e **Desafiar outra pessoa**.
- Quem criou o duelo vê na próxima abertura: "3 pessoas aceitaram seu tira-teima. Você venceu 2."
- Por que espalha: rivalidade 1 a 1 com alguém próximo (laço forte, Bond 2012) e um motivo pessoal para clicar ("ele me desafiou").

**Placar do Grupo**
- Criar: "Criar placar do grupo" → `POST /api/grupo` → nome **gerado** (animal + número: "Grupo Capivara-47"; sem texto livre) + código.
- Entrar: link `?g=` → joga → "Entrar no placar do Grupo Capivara-47? Aparece só o seu apelido." → toque.
- Tela: abas **Hoje** e **Semana** (soma de 7 dias), mais a sequência de cada um. Máximo de 50 membros.
- Postar: texto de placar (acima), gerado só por quem joga e enviado pelo próprio jogador.
- Por que espalha: o placar no grupo cobra quem falta ("Falta você 👀"), repõe o assunto todo dia e mistura gerações (sobrinho x avó) sem falar de política.

**Corrente** (já existe)
- Aceitar um duelo ou entrar num grupo e **terminar o Chuta Aí** conta como elo para quem convidou (mesma lógica de `/api/complete`, limitada a 300 por dia). Nunca conta declaração de voto.

**Brasil chutou** (agregado anônimo)
- Histograma por rodada: "7 em cada 10 chutaram o desemprego acima do real." Mostra que o erro é de todo mundo (sem vergonha) e é surpreendente o bastante para render print.

### 2.7 Retenção

- **Sequência** com 1 congelamento por semana (já existe em `save.daily`). A sequência do Fato ou Fake migra para o Chuta Aí sem zerar.
- **Arquivo dos dias anteriores**, só para quem chega por duelo antigo. Não conta para a sequência.
- **Teaser de amanhã**: "Amanhã: um número sobre o seu salário" (tema, nunca a resposta).
- **Placar do grupo** com virada semanal no domingo.
- **Sem notificação push** e sem pedir permissão. A volta vem do grupo, que é onde o público já está.

### 2.8 Por que cada parte espalha

| Parte | Gatilho de share | Padrão | Evidência |
|---|---|---|---|
| 5 números iguais para o Brasil | "Você já fez o de hoje?" | 1 | Wordle, Termo, BeReal |
| Nota por proximidade + pesos | Orgulho do 🎯, graça do "errei feio" | 3, 5 | MapTap, Contexto |
| Revelação-surpresa | "Não acredito que é só isso" | 6 | Gapminder, Higher Lower |
| Linha-gancho com pergunta | Quem recebe chuta antes de clicar | 4 | Brod 2018 (previsão) |
| Tira-teima | Rivalidade pessoal | 7 | Versus do MapTap, Bond 2012 |
| Placar do Grupo | Cobrança do grupo, rotina diária | 7, 8 | Friend Streak do Duolingo |
| Card Story com total | Status, "olha minha nota" | 9 | Wrapped |
| Retrospectiva semanal | Dado sobre mim | 9 | Wrapped |
| Papo de Almoço | Mensagem pronta para uma pessoa | relacional | Schein et al., Kalla e Broockman |

---

## 3. Desenho de persuasão

### 3.1 Teoria da mudança (do toque ao voto)

1. **Chute → surpresa → memória.** O chute pessimista encontra um número melhor (desemprego, IR, Farmácia). O erro de previsão fixa o número (Brod 2018).
2. **Credibilidade.** Toda revelação tem fonte tocável, e o jogo também **desmente exageros contra o outro lado** (rodada r22: "Flávio foi condenado nas rachadinhas?" → Fake). Sem isso, o tio descarta tudo como propaganda.
3. **Ponte para o bolso.** A revelação diz o que o número muda na vida ("até R$ 5 mil, IR zero, inclusive no 13º") e leva à calculadora da fase 3 (dado sobre mim).
4. **Mensageiro próximo.** Fato sozinho não move voto (Nyhan et al. 2019). Quem move é o sobrinho no grupo, o duelo e a mensagem privada do Papo de Almoço (Bond 2012, deep canvassing, organização relacional).
5. **Ação.** O plano de voto fecha cada partida em 24 e 25/10 (Nickerson e Rogers 2010). A rodada Fato ou Fake vacina contra o boato de véspera (Harmony Square).

### 3.2 Segmentos e o que cada um recebe

| Segmento | Tamanho | Objetivo | O que o jogo faz |
|---|---|---|---|
| A. Tende ao 13, risco de faltar | parte dos 33,4 mi | **Comparecer** | Rodada de abstenção (r19), boatos sobre votar (r29, r30), plano de voto, "documento com foto basta" |
| B. Votou em terceiros ou está mole | ~8,7 mi (terceiros) + voto mole | **Considerar o 13** | Bolso primeiro (IR, emprego, Farmácia, renda). Depois credibilidade (r22) |
| C. Vota Flávio, firme | ~49% | **Não é alvo de conversão.** Respeito, credibilidade e paz no grupo | Jogo divertido para todos, correção de exageros contra Flávio, zero humilhação |
| Jogador (militante ou simpatizante) | quem compartilha | **Ser bom mensageiro** | Papo de Almoço, mensagens privadas, tom de afeto |

### 3.3 Tom

- **Curioso, não professoral.** "Chuta aí" e não "você sabia?".
- **Errar é de todo mundo.** "7 em cada 10 erraram para cima" e não "você foi enganado".
- **Empatia com o que a pessoa vive.** Inflação: "Se o mercado parece caro, não é impressão: os preços subiram menos, não caíram." Nunca diga que a sensação está errada.
- **Firme nos fatos jurídicos, com status exato.** "Condenado" só com condenação; "investigação" é investigação; "nunca virou réu" quando é o caso.
- **Nenhum xingamento ou rótulo** (gado, bolsominion, petralha, já bloqueados em `cleanName`). Nada de "tio do zap" na interface.
- **Humor leve consigo mesmo** (o jogador errando), nunca com o eleitor do outro lado.

### 3.4 Ranking dos fatos por poder persuasivo esperado (indeciso e voto mole)

Critérios, de 1 a 3 cada: **R** relevância pessoal (bolso, saúde, família); **S** tamanho provável da surpresa (lacuna de percepção); **C** credibilidade e baixa reatância (dado oficial, sem disputa partidária); **P** pressa (vale para amanhã). A nota é a soma.

| # | Fato (`facts.ts` id ou rodada NOVA) | R | S | C | P | Total | Por quê | Uso |
|---|---|---|---|---|---|---|---|---|
| 1 | `ir` (IR zero até R$ 5 mil) | 3 | 3 | 3 | 3 | **12** | Dinheiro no bolso todo mês, vale para 15,6 mi. Muita gente não sabe a faixa nem que vale no 13º. Liga à calculadora | Rodada 1 de hoje, Papo de Almoço "imposto" |
| 2 | `emprego` (menor desemprego da série) | 3 | 3 | 3 | 2 | **11** | Maior lacuna medida: 48% esperavam alta do desemprego (Datafolha, mar/2026) | Rodada 2 de hoje |
| 3 | `farmacia` (100% grátis) | 3 | 2 | 3 | 2 | **10** | Saúde é preocupação de 14%, e o público mais velho usa remédio contínuo | Rodada 3 de hoje |
| 4 | NOVO r19 (33,4 mi não votaram x 2,2 mi de diferença) | 2 | 3 | 3 | 3 | **11** | Cívico e apartidário: mostra que cada voto pesa. Mobiliza sem reatância | Rodada 4 de hoje (turnout) |
| 5 | NOVO r15 (inflação de 2025: 4,26%, comida em casa +1,43%) | 3 | 2 | 2 | 2 | **9** | Custo de vida é a dor nº 1 do dia a dia, mas a experiência vivida contradiz o número, então há risco de reatância. Usar só com a frase empática | Troca opcional da rodada 3 se o fact-checker liberar até 12h |
| 6 | NOVO r14 e r16 (mínimo R$ 1.621; renda recorde R$ 3.722) | 3 | 2 | 3 | 1 | **9** | Bolso, acima da inflação | Pool |
| 7 | `fome` (fora do Mapa da Fome) | 2 | 2 | 2 | 1 | **7** | Forte moralmente; o "é da ONU" gera alguma desconfiança | Pool |
| 8 | `pedemeia` | 2 | 2 | 3 | 1 | **8** | Famílias com adolescente; pouco conhecido fora delas | Pool |
| 9 | NOVO r17 (mortes violentas −8,2%) | 3 | 3 | 2 | 1 | **9** | Segurança é a preocupação nº 1 (27%). Precisa ser honesta: feminicídio e morte por policial subiram, e segurança é sobretudo estadual, então **não atribuir a governo** | Pool, com ressalva no texto |
| 10 | `checagem` + r22 (Flávio não foi condenado nas rachadinhas) | 1 | 2 | 3 | 2 | **8** | Não persuade sozinho, mas **destrava a credibilidade** de todo o resto com o grupo C | Uma rodada por semana |
| 11 | `floresta` | 1 | 2 | 3 | 1 | **7** | Baixa saliência para o indeciso; bom para jovens | Pool |
| 12 | `oitodejaneiro` | 2 | 1 | 2 | 1 | **6** | Democracia move o centro, mas gera reatância à direita | Pool (mapa de aquecimento) |
| 13 | `soberania` (tarifaço, Eduardo) | 2 | 1 | 2 | 1 | **6** | O tarifaço pegou exportador e agro, um ângulo "Brasil primeiro" | Pool |
| 14 | `julgamento` | 1 | 1 | 2 | 1 | **5** | Já é conhecido e muito reativo para o grupo C. Serve para memória, não para converter | Pool, fora das primeiras semanas |
| 15 | `joias` | 1 | 1 | 2 | 1 | **5** | Indiciamento com caso aberto: mais fraco | Pool (mapa) |
| 16 | `mansao`, `rachadinha` | 1 | 2 | 1 | 1 | **5** | Corrupção pesa 19%, mas são investigação e denúncia arquivada. O eleitor C lê como perseguição. Juridicamente delicado | Pool, sempre com o status completo |

**Ordem do dia de hoje:** bolso (IR) → surpresa (desemprego) → saúde (Farmácia) → comparecimento (abstenção) → vacina contra boato (Fato ou Fake do 1º turno).

### 3.5 Papo de Almoço (módulo de conversa)

**Objetivo:** fazer o jogador mandar uma mensagem **privada, pessoal e respeitosa** para 1 a 3 pessoas, em vez de despejar link no grupo. Inspirado no deep canvassing (escutar, não julgar, contar uma história, deixar a pessoa concluir).

Fluxo (60 a 90 s), com uma personagem pixel neutra e genérica (nunca uma pessoa real):
1. **Quem?** Chips: mãe, pai, tia, tio, avó, vizinho, colega. O rótulo serve só para o texto e **não é gravado**.
2. **O que preocupa essa pessoa?** Chips: preço do mercado, emprego, imposto, remédio e saúde, segurança, corrupção, "não quer saber de política".
3. **Três falas da personagem**, cada uma com 3 respostas possíveis. Exemplo:
   - Personagem: "Tá tudo caro, ninguém aguenta."
   - (a) "Mentira, a inflação foi só 4,26%." → a barra "Conversa aberta" desce: "Discordar de cara fecha a porta."
   - (b) "Tá mesmo. O que mais pesou pra você?" → a barra sobe: "Perguntar abre a conversa."
   - (c) "Quem votou nele que aguente." → a barra despenca: "Ironia encerra a conversa."
   - Depois: contar uma experiência própria → oferecer **um** número "que eu descobri jogando" com a fonte → convidar a pessoa a chutar.
4. **A nota é a barra "Conversa aberta", não uma vitória.** Não há "convenceu o tio".
5. **Compositor:** mensagem editável por preocupação. Envio 1 a 1 via `wa.me/?text=` (sem número; o próprio jogador escolhe o contato). Exemplos:
   - Imposto: "Oi tia, lembrei de você. Sabia que quem ganha até R$ 5 mil não paga mais IR desde janeiro, inclusive no 13º? Fiz a conta do meu aqui, faz a sua: jogo.com.br/?go=ir&s=tio"
   - Emprego: "Pai, chuta aí: quanto você acha que tá o desemprego hoje? Eu chutei 11% e errei feio. Joga esse aqui e me diz: jogo.com.br/c/5?d=K7Q2PX&s=tio"
   - Remédio: "Mãe, o remédio da pressão sai de graça no Farmácia Popular? Descobri que desde 2025 todos os itens são grátis. Fonte no link: jogo.com.br/c/5?s=tio"
   - Não quer saber de política: "Vô, tem um joguinho de chutar números do Brasil, aposto que você ganha de mim: jogo.com.br/c/5?d=K7Q2PX" (só o duelo, sem pauta)
6. **No MVP de hoje entra só o passo 5** (compositor com as 6 preocupações). O diálogo completo fica para a v2.

### 3.6 Guardrails

**Legais (validar com o jurídico hoje, antes das 18h):**
- **Art. 299 do Código Eleitoral** (compra de voto): nenhum ponto, badge, sequência, sorteio ou vantagem ligados a voto, plano de voto, "vou votar" ou movimento. O plano de voto é card pessoal, sem placar ([Código Eleitoral](https://www.planalto.gov.br/ccivil_03/leis/l4737compilado.htm)).
- **Lei 9.504, art. 39, §5º, IV:** nada novo e nenhum impulsionamento em 25/10. As rodadas de domingo saem no deploy de hoje. Flag de servidor `ELECTION_DAY=1` (no worker, sem deploy de front) desliga sozinha à 0h de 25/10 o **CTA de share com conteúdo de campanha**, caso o jurídico entenda necessário. Decisão do jurídico: o jogador compartilhar a própria nota no domingo é manifestação individual permitida? Até a resposta, o padrão é manter o share de texto e esconder o card Story com o 13.
- **Identificação da propaganda:** responsável e rótulo de IA no rodapé, em todo card e no `og:description` (Res. TSE 23.610; regra 4 do repositório).
- **LGPD:** opinião política é dado sensível (art. 5º, II, e art. 11, [Lei 13.709](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm)). O placar do grupo e o duelo **nunca** guardam nem mostram movimento ou voto. O histograma "Brasil chutou" não tem id. Apelido é opcional. Haverá rota para apagar os próprios dados e expurgo total em 30/11/2026.
- **Sem astroturfing:** nenhuma conta falsa, nenhum robô postando em grupo, nenhum disparo em massa, nenhuma leitura de contatos. Todo envio sai do toque do jogador, pelo sistema ou pelo `wa.me`.

**De conteúdo:**
- Toda rodada vem de `src/content/` com fonte, data e status. As rodadas **NOVAS** só vão ao ar depois do fact-checker (§4).
- A revelação nunca extrapola a fonte. "Menor da série" só quando a fonte diz.
- Segurança e inflação: sempre com a ressalva honesta ("feminicídios subiram"; "subiu menos, não caiu").
- Pelo menos 1 rodada por semana corrige um exagero contra o outro lado.

**De design (sem padrões escuros):**
- Sem cronômetro, sem "só hoje", sem culpa ("você vai deixar o Brasil assim?").
- Pedido de share só no fim. Nunca no meio de uma rodada e nunca em modal.
- Placar sem vergonha pública: quem não jogou não aparece como "faltou", aparece só quem jogou.
- O slider começa no meio; a resposta nunca é sugerida.

---

## 4. Conteúdo: 31 rodadas prontas

Legenda: **Tipo** `number` (escala `lin` ou `log`), `map` ou `choice`. **tol/zero**: no `lin`, na unidade; no `log`, razão; no `map`, km. **NOVO** = fato que ainda não está em `src/content/`, encontrado nesta pesquisa e **pendente do fact-checker** (abrir o link, conferir número e data e incluir em `facts.ts` antes de publicar). Texto da revelação com até ~100 caracteres (2 linhas em 390 px).

### 4.1 Tabela

| id | Pergunta | Tipo | Resposta | Unid. | Faixa do slider | tol / zero | Revelação (≤ 2 linhas) | theme (gancho) | Fonte (nome · URL · data) | Base |
|---|---|---|---|---|---|---|---|---|---|---|
| r01 | Até quanto de salário por mês ficou sem Imposto de Renda em 2026? | number lin | 5000 | R$/mês | 1.000 a 15.000 | 250 / 5.000 | Até R$ 5 mil/mês, IR zero desde jan/2026, inclusive no 13º. Até R$ 7.350, imposto menor. | o IR | Câmara · Lei 15.270/2025 · https://www2.camara.leg.br/legin/fed/lei/2025/lei-15270-26-novembro-2025-798354-publicacaooriginal-177117-pl.html · 26/11/2025 | `ir` |
| r02 | Quantos brasileiros pagam menos ou nada de IR com a nova lei? | number log | 15.600.000 | pessoas | 1 mi a 100 mi | 1,15 / 5 | Cerca de 15,6 milhões pagam menos ou nada de IR em 2026, estima o DIEESE. | o IR | DIEESE · Nota técnica 290 · https://www.dieese.org.br/notatecnica/2026/notaTec290isencaoIR.pdf · 2026 | `ir` |
| r03 | Acima de quanto por ano a pessoa passou a pagar um imposto mínimo? | number log | 600.000 | R$/ano | 50 mil a 5 mi | 1,2 / 8 | Quem ganha mais de R$ 600 mil por ano passou a ter imposto mínimo. É o que paga a isenção. | o imposto dos ricos | Câmara · Lei 15.270/2025 · (URL de r01) · 26/11/2025 | `ir`, s24 |
| r04 | Quanto você acha que está o desemprego no Brasil? | number lin | 5,3 | % | 0 a 25 | 0,5 / 10 | 5,3% no trimestre até agosto de 2026: o menor para o período desde 2012 (IBGE). | o desemprego | DGABC · menor taxa para o trimestre até agosto · https://www.dgabc.com.br/Noticia/4349737/taxa-de-desemprego-no-brasil-e-a-menor-para-trimestre-ate-agosto-desde-2012-mostra-ibge · set/2026 | `emprego` |
| r05 | Toque no estado com o MENOR desemprego do Brasil. | map | SC (lon −50,4, lat −27,3) | ponto | Brasil | 150 / 1.500 km | Santa Catarina: 2,1%. A média do Brasil foi 5,4% no 2º trimestre de 2026 (IBGE). | o mapa do emprego | Mercado & Consumo/Agência Brasil · https://mercadoeconsumo.com.br/14/08/2026/economia/em-11-estados-desemprego-esta-abaixo-da-media-do-pais-veja-quais/ · 14/08/2026 | **NOVO** |
| r06 | Em que ano a ONU tirou o Brasil do Mapa da Fome (de novo)? | number lin | 2025 | ano | 2000 a 2026 | 0 / 10 | Em 2025 a ONU tirou o Brasil do Mapa da Fome. Em 2026, o novo relatório confirmou. | o Mapa da Fome | O Povo · Brasil sai do Mapa da Fome · https://www.opovo.com.br/noticias/brasil/2025/07/28/brasil-sai-do-mapa-da-fome-anuncia-onu.html · 28/07/2025 | `fome` |
| r07 | Um país sai do Mapa da Fome quando a subnutrição fica abaixo de quantos %? | number lin | 2,5 | % | 0 a 30 | 0,5 / 12 | A linha é 2,5% da população subnutrida. O Brasil ficou abaixo dela em 2025. | o Mapa da Fome | O Povo · (URL de r06) · 28/07/2025 | `fome` |
| r08 | Quantos anos seguidos o desmatamento na Amazônia caiu? | number lin | 4 | anos | 0 a 10 | 0 / 4 | Quatro anos seguidos de queda. 2025 teve a menor área desmatada em 11 anos (INPE). | a floresta | O Liberal · PRODES 2025 · https://www.oliberal.com/variedades/desmatamento-na-amazonia-em-2025-caiu-11-08-em-relacao-a-2024-afirma-prodes-inpe-1.1084212 · out/2025 | `floresta` |
| r09 | Quanto o desmatamento na Amazônia caiu em 2025, em %? | number lin | 11,08 | % | 0 a 50 | 1,5 / 20 | Caiu 11,08% em 2025: 5.796 km², a menor área em 11 anos (PRODES/INPE). | a floresta | Olhar Digital · https://olhardigital.com.br/2025/10/30/ciencia-e-espaco/area-desmatada-na-amazonia-e-a-menor-em-11-anos-diz-inpe/ · 30/10/2025 | `floresta` |
| r10 | Quanto dos remédios do Farmácia Popular sai de graça hoje? | choice | Todos | | Uns 25% / Metade / Uns 75% / Todos | | Todos: desde fev/2025, os 41 itens saem de graça. | o Farmácia Popular | Ministério da Saúde · 100% de gratuidade · fev/2025 (ver src/content/rounds.ts) | `farmacia` |
| r11 | Quantas pessoas pegaram remédio no Farmácia Popular em 2025? | number log | 27.000.000 | pessoas | 1 mi a 100 mi | 1,15 / 5 | Mais de 27 milhões de pessoas usaram o Farmácia Popular em 2025. | o Farmácia Popular | Ministério da Saúde via imprensa · **URL a confirmar** (candidatas: https://diariodocomercio.com.br/mix/governo-anuncia-fechamento-da-farmacia-popular-em-quase-10-mil-locais/ ; https://diariodopara.com.br/seu-bolso/farmacia-popular-41-itens-de-graca-podem-fazer-familia-economizar-ate-r-88-mil-por-ano/) · 2026 | **NOVO** |
| r12 | Quantos alunos o Pé-de-Meia alcançou em 2024? | number log | 4.000.000 | alunos | 100 mil a 30 mi | 1,15 / 5 | Quase 4 milhões de alunos em 2024. O dinheiro cai com frequência e aprovação. | o Pé-de-Meia | O Povo · quase 4 milhões · https://www.opovo.com.br/noticias/brasil/2024/08/08/pe-de-meia-alcancara-quase-4-milhoes-de-estudantes-ate-setembro.html · 08/08/2024 | `pedemeia` |
| r13 | Quanto um aluno pode juntar no Pé-de-Meia nos 3 anos do ensino médio? | number lin | 9200 | R$ | 0 a 30.000 | 500 / 10.000 | Até R$ 9.200 por aluno nos 3 anos, somando parcelas, depósitos anuais e o Enem. | o Pé-de-Meia | DGABC · Pé-de-Meia 2026 · https://www.dgabc.com.br/Noticia/4343163/pe-de-meia-2026-nascidos-em-marco-e-abril-recebem-parcela-nesta-terca-feira-26 · 2026 (+ MEC https://www.gov.br/mec/pt-br/pe-de-meia) | **NOVO** |
| r14 | Quanto é o salário mínimo em 2026? | number lin | 1621 | R$ | 1.000 a 3.000 | 20 / 400 | R$ 1.621 desde jan/2026: +6,79%, acima da inflação de 2025 (4,26%). | o salário mínimo | Bahia Notícias · Decreto 12.797 · https://www.bahianoticias.com.br/noticia/311858-salario-minimo-para-2026-e-fixado-em-r-1621-com-reajuste-de-679 · 24/12/2025 (+ Congresso em Foco https://www.congressoemfoco.com.br/noticia/115146/governo-oficializa-reajuste-do-salario-minimo-para-r-1-621-em-2026) | **NOVO** |
| r15 | Quanto foi a inflação oficial de 2025? | number lin | 4,26 | % | 0 a 20 | 0,4 / 8 | 4,26% em 2025, a menor desde 2018. Comida em casa subiu 1,43%: subiu menos, não caiu. | a inflação | Itatiaia · IPCA 2025 · https://www.itatiaia.com.br/economia/inflacao-fecha-2025-em-4-26-dentro-da-meta-e-abaixo-do-esperado-pelo-mercado/ · 09/01/2026 | **NOVO** |
| r16 | Qual é o salário médio do trabalhador brasileiro? | number lin | 3722 | R$/mês | 1.000 a 8.000 | 150 / 2.000 | R$ 3.722 no 1º tri de 2026: recorde da série do IBGE, 5,5% acima da inflação. | o salário médio | JB · salário médio recorde · https://www.jb.com.br/economia/2026/04/1059466-salario-medio-do-trabalhador-amplia-recorde-e-chega-a-rs-3.html · abr/2026 | **NOVO** |
| r17 | Em 2025, as mortes violentas no Brasil... | choice | "Caíram uns 8%" (índice 2 de: Subiram uns 8% / Ficaram iguais / Caíram uns 8% / Caíram uns 30%) | | | | Caíram 8,2%: a menor taxa desde 2012. Feminicídios e mortes por policiais subiram. | a segurança | JB · Anuário FBSP · https://www.jb.com.br/brasil/2026/07/1060384-brasil-tem-menor-taxa-de-mortes-violentas-intencionais-desde-2012.html · 23/07/2026 (+ Diario de Pernambuco https://diariodepernambuco.com.br/brasil/2026/07/11719408-mortes-violentas-caem-82-no-pais-em-2025-feminicidios-aumentam-4.html) | **NOVO** |
| r18 | Quanto o PIB do Brasil cresceu em 2024? | number lin | 3,4 | % | −5 a 10 | 0,4 / 4 | Cresceu 3,4% em 2024 e 2,3% em 2025, segundo o IBGE. | o PIB | Poder360 · PIB 2025 · https://www.poder360.com.br/poder-economia/pib-do-brasil-cresce-23-em-2025/ · 03/03/2026 | s29 (URL **NOVA**) |
| r19 | Quantos eleitores NÃO votaram no 1º turno de 2026? | number log | 33.400.000 | eleitores | 1 mi a 100 mi | 1,1 / 4 | 33,4 milhões não votaram (21%). A diferença entre os 2 primeiros foi de 2,2 milhões. | a abstenção | DGABC · maior abstenção desde 1998 · https://www.dgabc.com.br/Noticia/4350968/primeiro-turno-de-2026-tem-maior-abstencao-desde-1998-com-mais-de-33-milhoes-ausentes · 10/2026 (conferir no portal de resultados do TSE) | **NOVO** |
| r20 | Por quantos votos foi decidido o 2º turno de 2022? | number log | 2.139.645 | votos | 10 mil a 20 mi | 1,15 / 6 | Lula 50,9% x Bolsonaro 49,1%: 2,1 milhões de votos, menos de 2 em cada 100. | o 2º turno | TSE · 100% das seções totalizadas · https://www.tse.jus.br/comunicacao/noticias/2022/Outubro/100-das-secoes-totalizadas-confira-como-ficou-o-quadro-eleitoral-apos-o-2o-turno · 31/10/2022 | **NOVO** |
| r21 | A quantos anos de prisão o STF condenou Jair Bolsonaro? | number lin | 27,25 | anos | 0 a 50 | 1 / 15 | 27 anos e 3 meses, por 4 a 1 na 1ª Turma do STF, em 11/09/2025. Está inelegível. | o julgamento | Itatiaia · 27 anos e 3 meses · https://www.itatiaia.com.br/politica/stf-condena-bolsonaro-a-27-anos-e-3-meses-pela-trama-golpista/ · 11/09/2025 | `julgamento` |
| r22 | Fato ou Fake: Flávio Bolsonaro foi condenado no caso das rachadinhas. | choice | Fake (índice 1 de: Fato / Fake) | | | | Fake. Foi denunciado em 2020, o STJ anulou provas e o caso foi arquivado. Nunca virou réu. | as rachadinhas | Congresso em Foco · STJ e as rachadinhas · https://congressoemfoco.com.br/noticia/22183/stj-nega-flavio-bolsonaro-rachadinhas · 2021 | `rachadinha`, s06 |
| r23 | Toque onde a Receita apreendeu as joias sauditas, em 2021. | map | Guarulhos/SP (lon −46,47, lat −23,43) | ponto | Brasil | 60 / 1.500 km | Aeroporto de Guarulhos (SP), out/2021. A PF indiciou Jair e mais 11; o caso segue aberto. | as joias | Band · PGR pede arquivamento · https://www.band.com.br/noticias/pgr-pede-arquivamento-de-inquerito-sobre-desvio-de-joias-por-bolsonaro-202603051112 · 05/03/2026 | `joias` |
| r24 | Quanto custou a casa de Flávio Bolsonaro em Brasília? | number log | 6.000.000 | R$ | 100 mil a 50 mi | 1,15 / 6 | Cerca de R$ 6 mi, R$ 3,1 mi pelo BRB. A PF apura o financiamento; Flávio nega irregularidade. | a casa de Brasília | Diario de Pernambuco · PF apura financiamento · https://www.diariodepernambuco.com.br/politica/2026/10/11725606-pf-apura-condicoes-de-financiamento-do-brb-a-flavio-bolsonaro-para-mansao-de-rs-6-milhoes.html · out/2026 | `mansao` |
| r25 | Toque onde golpistas invadiram os Três Poderes em 8/1/2023. | map | Brasília (lon −47,86, lat −15,80) | ponto | Brasil | 60 / 1.500 km | Praça dos Três Poderes, Brasília. Dias depois a PF achou a "minuta do golpe". | o 8 de janeiro | Itatiaia · (URL de r21) · 11/09/2025 | `oitodejaneiro` |
| r26 | De quanto foi a tarifa dos EUA sobre produtos brasileiros em 2025? | number lin | 50 | % | 0 a 100 | 3 / 40 | 50%, anunciada em julho de 2025. Eduardo Bolsonaro atuou nos EUA por sanções ao Brasil. | o tarifaço | STF · condenação de Eduardo · https://noticias.stf.jus.br/postsnoticias/stf-condena-eduardo-bolsonaro-por-coacao-no-curso-do-processo-sobre-tentativa-de-golpe/ · 16/06/2026 | `soberania`, s20 |
| r27 | Desde que ano o Brasil usa urna eletrônica sem fraude comprovada? | number lin | 1996 | ano | 1980 a 2022 | 0 / 12 | Desde 1996. Nenhuma auditoria achou fraude, nem a das Forças Armadas em 2022. | a urna | TSE · Fato ou Boato · https://www.justicaeleitoral.jus.br/fato-ou-boato/ · 2026 | s08 |
| r28 | Até que idade o voto é obrigatório? | number lin | 70 | anos | 50 a 90 | 0 / 15 | De 18 a 70 anos. Quem não votar justifica, inclusive pelo app e-Título. | o voto | TSE · (URL de r27) · 2026 | s27 |
| r29 | Fato ou Fake: quem não votou no 1º turno não pode votar no 2º. | choice | Fake (1) | | | | Fake. Cada turno é uma eleição: quem faltou no 1º pode e deve votar no 2º. | o 2º turno | TSE · (URL de r27) · 2026 | s28 |
| r30 | Fato ou Fake: dá para votar só com documento oficial com foto, sem o título. | choice | Fato (0) | | | | Fato. RG, CNH, passaporte, carteira de trabalho ou e-Título com foto. | o documento | TSE · (URL de r27) · 2026 | s17 |
| r31 | Até que horas dá para votar no domingo? | choice | 17h (índice 2 de: 15h / 16h / 17h / 18h) | | | | Das 8h às 17h, horário de Brasília, no Brasil todo. | o horário | TSE · horário unificado · **URL específica a confirmar** · 2026 (valor igual a `CONFIG.electionLabel`) | **NOVO** |

Observações para o fact-checker:
- r04: a carta `emprego` cita 5,1% (fim de 2025) e 5,3% (até agosto de 2026). A rodada usa o mais recente. Se sair PNAD nova até a publicação, atualizar.
- r05: a Agência Brasil (CUT) tem a mesma matéria: https://www.cut.org.br/noticias/em-11-estados-desemprego-esta-abaixo-da-media-do-pais-veja-quais-9a79/amp
- r16: uma fonte cita R$ 3.765 para o mesmo trimestre. Conferir no comunicado do IBGE.
- r19: total de votos e abstenção conferidos em 3 veículos. Conferir no portal de resultados do TSE e checar se "diferença de 2,2 mi" bate (56.104.503 − 53.879.538 = 2.224.965).
- r17: o anuário dá "menor desde 2012" (alguns veículos dizem 13 ou 14 anos). Usar "menor taxa desde 2012", que é a frase do anuário.

### 4.2 Calendário

| Nº | Data | R1 (×2) | R2 (×2) | R3 (×3) | R4 (×3) | R5 (×3) | Observação |
|---|---|---|---|---|---|---|---|
| #5 | **sáb 24/10 (HOJE, MVP)** | r01 IR | r04 desemprego | r10 Farmácia (ou r15 se liberado) | r19 abstenção | r29 Fake do 1º turno | Sem mapa. Só fatos já em `src/content`, exceto r19 (NOVO, prioridade 1 do fact-checker) |
| #6 | **dom 25/10 (Modo Dia de Votar)** | r31 horário | r30 documento | r28 idade | r20 margem de 2022 | r27 urna | **Publicado hoje.** Conteúdo cívico. Fim com "Meu plano de domingo" |
| #7 | (laço pós) | r25 mapa 8/1 | r15 inflação | r14 mínimo | r05 mapa SC | r22 rachadinhas Fake | |
| #8 | | r06 fome | r16 renda | r12 Pé-de-Meia | r23 mapa joias | r17 segurança | |
| #9 | | r08 floresta | r02 IR beneficiados | r18 PIB | r24 casa | r21 julgamento | |
| #10 | | r07 linha da fome | r03 imposto mínimo | r13 Pé-de-Meia R$ | r11 Farmácia pessoas | r26 tarifaço | |
| reserva | | r09 | | | | | |

### 4.3 Forma TypeScript (`src/content/rounds.ts`, dono: fact-checker)

```ts
import type { Source } from './facts'

interface RoundBase {
  id: string
  q: string
  /** até ~100 caracteres */
  reveal: string
  /** usado na linha-gancho do share: "Errei {theme} feio" */
  theme: string
  icon: string
  factId?: string
  statementId?: string
  sources: Source[]
  /** fato que não está em facts.ts: só publica com review === 'ok' */
  isNew?: boolean
  review: 'ok' | 'pendente'
}
export interface NumberRound extends RoundBase {
  kind: 'number'
  answer: number
  unit: string
  fmt: 'pct' | 'brl' | 'int' | 'year' | 'mi'
  min: number
  max: number
  step: number
  scale: 'lin' | 'log'
  /** lin: na unidade; log: razão (1,15 = ±15%) */
  tol: number
  zero: number
}
export interface MapRound extends RoundBase {
  kind: 'map'
  target: { lon: number; lat: number }
  label: string
  tolKm: number
  zeroKm: number
}
export interface ChoiceRound extends RoundBase {
  kind: 'choice'
  options: string[]
  correct: number
}
export type Round = NumberRound | MapRound | ChoiceRound

export const ROUNDS: Round[] = [
  {
    id: 'r01', kind: 'number', q: 'Até quanto de salário por mês ficou sem Imposto de Renda em 2026?',
    answer: 5000, unit: 'R$/mês', fmt: 'brl', min: 1000, max: 15000, step: 100, scale: 'lin', tol: 250, zero: 5000,
    reveal: 'Até R$ 5 mil/mês, IR zero desde jan/2026, inclusive no 13º. Até R$ 7.350, imposto menor.',
    theme: 'o IR', icon: 'moeda', factId: 'ir', review: 'ok',
    sources: [{ name: 'Câmara · Lei 15.270/2025', url: 'https://www2.camara.leg.br/legin/fed/lei/2025/lei-15270-26-novembro-2025-798354-publicacaooriginal-177117-pl.html', date: '26/11/2025' }],
  },
  {
    id: 'r19', kind: 'number', q: 'Quantos eleitores NÃO votaram no 1º turno de 2026?',
    answer: 33_400_000, unit: 'eleitores', fmt: 'mi', min: 1_000_000, max: 100_000_000, step: 100_000, scale: 'log', tol: 1.1, zero: 4,
    reveal: '33,4 milhões não votaram (21%). A diferença entre os 2 primeiros foi de 2,2 milhões.',
    theme: 'a abstenção', icon: 'urna', isNew: true, review: 'pendente',
    sources: [{ name: 'DGABC · maior abstenção desde 1998', url: 'https://www.dgabc.com.br/Noticia/4350968/primeiro-turno-de-2026-tem-maior-abstencao-desde-1998-com-mais-de-33-milhoes-ausentes', date: 'out/2026' }],
  },
  {
    id: 'r29', kind: 'choice', q: 'Fato ou Fake: quem não votou no 1º turno não pode votar no 2º.',
    options: ['Fato', 'Fake'], correct: 1,
    reveal: 'Fake. Cada turno é uma eleição: quem faltou no 1º pode e deve votar no 2º.',
    theme: 'o 2º turno', icon: 'fake', statementId: 's28', review: 'ok',
    sources: [{ name: 'TSE · Fato ou Boato', url: 'https://www.justicaeleitoral.jus.br/fato-ou-boato/', date: '2026' }],
  },
  // ... demais rodadas da tabela 4.1
]

/** data (AAAA-MM-DD, Brasília) → 5 ids, na ordem dos pesos [2,2,3,3,3] */
export const DAYS: Record<string, [string, string, string, string, string]> = {
  '2026-10-24': ['r01', 'r04', 'r10', 'r19', 'r29'],
  '2026-10-25': ['r31', 'r30', 'r28', 'r20', 'r27'],
}
```

Teste de conteúdo (`tests/rounds.test.ts`): todo `factId` existe em `FACTS`; todo `statementId` existe; todo dia publicado tem 5 rodadas com `review: 'ok'`; `reveal.length <= 110`; a resposta fica entre `min` e `max` e, quando a escala não é natural, entre 20% e 80% do slider; nenhum texto contém travessão (U+2014).

---

## 5. Especificação para engenharia

### 5.1 Arquivos e donos (ver `docs/OWNERSHIP.md`)

| Área | Dono | Arquivos |
|---|---|---|
| Conteúdo | fact-checker | `src/content/rounds.ts` (novo), novos fatos em `facts.ts` |
| Pontuação | diretor (sessão principal) | `src/lib/score.ts` (novo), `src/state/save.ts` (campos novos), `src/app/nav.ts` (telas novas) |
| Telas | ui-engineer | `src/app/screens/Daily.tsx` (vira o Chuta Aí), `src/ui/Chute.tsx` (slider), `src/ui/ChoiceButtons.tsx`, `src/app/screens/Duelo.tsx`, `src/app/screens/Grupo.tsx`, `src/app/screens/Papo.tsx`, `src/app/screens/Plano.tsx` |
| Mapa | pixel-art-director + diretor | `src/games/mapaTap.ts` (canvas 2D ou Pixi pequeno, silhueta de `brazil.ts`, toque → lon/lat) |
| Share | growth-share-engineer | `src/share/types.ts` (novos `Moment`), `src/share/chute.ts` (textos), card Story, `public/og/c-{n}.png` |
| API | backend-engineer | `worker/schema.sql`, `worker/src/index.ts`, `src/lib/api.ts`, `tests/api.test.ts` |

### 5.2 Telas e componentes

1. **Daily (Chuta Aí)**: `RoundView` (cabeçalho "1/5 ×2", pergunta, entrada) → `Reveal` → … → `ChuteResult` (total contando, grade, percentil, sequência, painel de share com Mandar no grupo, Tira-teima, Story e Copiar). Daí seguem `GroupJoinToast` (se veio `g`), "Papo de Almoço" e "Meu plano de domingo".
2. **Chute (slider)**: `min`, `max`, `step` e `scale`; valor formatado (`fmt`); botões −/+; teclado com setas no desktop; `aria-valuetext` com unidade; `prefers-reduced-motion` desliga a varredura da agulha (mostra direto).
3. **MapaTap**: canvas no tamanho lógico, escala inteira e `nearest`. Toque → pino 3×3 → **Confirmar**. Revelação: linha pontilhada pino → alvo e km.
4. **Duelo**: faixa "Fulano fez X. Sua vez." durante as rodadas; tela final lado a lado; Revanche.
5. **Grupo**: Hoje / Semana, lista (avatar, apelido, total, 🔥), "Postar no grupo", "Sair do grupo".
6. **Papo de Almoço (MVP)**: 6 chips de preocupação → mensagem editável → "Mandar no WhatsApp" (`wa.me`).
7. **Plano de domingo**: 3 perguntas (que horas, qual documento, com quem) → card 1080×1920 "Meu plano: 10h, com RG, com a minha mãe". Fica **só no aparelho** e não vai para a API.
8. **Estado (`save.ts`)**: `chute: Record<date, { s: number[]; guesses: (number|null)[] }>`, `groups: string[]`, `duels: { made: string[]; got: string[] }`, `plano: { hora: string; doc: string; com: string } | null` (local). A sequência continua em `daily.streak`.
9. **Navegação**: `Screen` ganha `'duelo' | 'grupo' | 'papo' | 'plano'`. Entrada por URL: `?c=5` abre o Daily daquele número; `d` e `g` ficam guardados em `params`.

### 5.3 API (Hono no worker + D1)

Esquema novo (`worker/schema.sql`):

```sql
-- Chuta Aí: nota por aparelho e dia (id aleatório do aparelho, como em `daily`)
CREATE TABLE IF NOT EXISTS chute (
  id TEXT NOT NULL, date TEXT NOT NULL, s TEXT NOT NULL, total INTEGER NOT NULL, via TEXT,
  PRIMARY KEY (id, date)
);
CREATE INDEX IF NOT EXISTS chute_date_total ON chute (date, total);
-- "Brasil chutou": só contagem por faixa, sem id
CREATE TABLE IF NOT EXISTS chute_hist (
  date TEXT NOT NULL, round INTEGER NOT NULL, bucket INTEGER NOT NULL, n INTEGER NOT NULL,
  PRIMARY KEY (date, round, bucket)
);
CREATE TABLE IF NOT EXISTS duelo (
  code TEXT PRIMARY KEY, owner TEXT NOT NULL, date TEXT NOT NULL, s TEXT NOT NULL,
  total INTEGER NOT NULL, created INTEGER NOT NULL, accepts INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS duelo_resp (
  code TEXT NOT NULL, id TEXT NOT NULL, s TEXT NOT NULL, total INTEGER NOT NULL, PRIMARY KEY (code, id)
);
CREATE TABLE IF NOT EXISTS grupo (code TEXT PRIMARY KEY, nome TEXT NOT NULL, created INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS grupo_membro (
  code TEXT NOT NULL, id TEXT NOT NULL, joined INTEGER NOT NULL, PRIMARY KEY (code, id)
);
CREATE INDEX IF NOT EXISTS grupo_membro_id ON grupo_membro (id);
-- contadores de eventos, sem id
CREATE TABLE IF NOT EXISTS ev (day TEXT NOT NULL, e TEXT NOT NULL, k TEXT NOT NULL DEFAULT '', n INTEGER NOT NULL, PRIMARY KEY (day, e, k));
```

Rotas:

| Método e rota | Corpo / query | Resposta | Regras |
|---|---|---|---|
| `POST /api/chute` | `{ id, date, s:[5×0..100], b:[5×−10..10], via? }` | `{ ok, pct }` (percentil do dia) | `date` entre ontem e amanhã (como `/api/daily`); `total` **calculado no servidor** com os pesos; `INSERT OR IGNORE` (1 por aparelho e dia); incrementa `chute_hist` por faixa `b`; se `via` tem `d` ou `g` e é a primeira vez do aparelho, aplica a lógica de corrente de `/api/complete` |
| `GET /api/chute/:date` | | `{ plays, hist: number[5][21], totals: number[14] }` | `cache-control: public, max-age=60` (sobrescreve o `no-store` geral só nesta rota) |
| `POST /api/duelo` | `{ id, date, s }` | `{ code }` | 6 caracteres do alfabeto sem ambíguos; até 20 duelos por aparelho e dia |
| `GET /api/duelo/:code` | | `{ date, n, s, total, name, avatar }` | `name` e `avatar` vêm de `players` (apelido opcional); **o id nunca sai** |
| `POST /api/duelo/:code/resp` | `{ id, s }` | `{ ok, them: { s, total }, me: { total } }` | 1 resposta por aparelho; `accepts++`; o dono não responde ao próprio duelo |
| `GET /api/duelo/mine?id=` | | `[{ code, accepts, wins }]` | Só agregados |
| `POST /api/grupo` | `{ id }` | `{ code, nome }` | `nome` = animal de lista fixa + número de 2 dígitos; até 10 grupos por aparelho |
| `POST /api/grupo/:code/entrar` | `{ id }` | `{ ok, nome }` | Até 50 membros; só depois de toque explícito |
| `POST /api/grupo/:code/sair` | `{ id }` | `{ ok }` | |
| `GET /api/grupo/:code?date=&id=` | | `{ nome, hoje:[{ name, avatar, total, streak, me }], semana:[…], membros }` | Junta `grupo_membro` × `chute` × `players`. **Nunca junta `movimento`.** Sem id na saída; `me` só se o id da query for membro |
| `POST /api/apagar` | `{ id }` | `{ ok }` | Apaga as linhas do aparelho em `players`, `chute`, `duelo*`, `grupo_membro`, `likes`, `daily` e, via HMAC, em `movimento` (LGPD, art. 18) |
| `POST /api/ev` | `{ e, k? }` | `{ ok }` | Lista branca de eventos (§5.5); sem id; limite por IP como hoje |
| `GET /c/:n` | `?d=&g=&s=` | HTML com OG + `location.replace('/?c=n&…')` | `og:title` dinâmico para duelo; `og:image` estático `/og/c-{n}.png` |

Privacidade e segurança:
- Os códigos têm 31⁶ ≈ 887 milhões de combinações, e a leitura por código (`GET`) tem limite de 60 por minuto por IP (HMAC, como hoje) contra varredura.
- Apelido passa por `cleanName`. O nome do grupo é gerado, nunca livre.
- O placar e o duelo mostram só apelido, avatar, nota e sequência. Nenhuma UF no grupo (evita reidentificação em grupos pequenos).
- `chute_hist` não tem id. `ev` não tem id.
- Expurgo: cron do worker (`[triggers] crons`) apaga tudo em **30/11/2026**. Isso fica escrito na tela Sobre.
- Rotas de escrita continuam com o middleware de limite e corpo de até 2 KB.

### 5.4 URLs

```
https://jogo.com.br/c/5                      → Chuta Aí #5 (OG estático)
https://jogo.com.br/c/5?d=K7Q2PX&s=wa         → duelo; cai direto na rodada 1 do #5
https://jogo.com.br/c/5?g=CAPI47&s=wa_grupo   → placar do grupo; convite para entrar depois de jogar
https://jogo.com.br/c/5?d=K7Q2PX&g=CAPI47     → os dois (duelo dentro do grupo)
https://jogo.com.br/?go=ir&s=tio              → atalho para a calculadora do IR (fase 3)
```

**MVP sem backend de duelo** (se o backend-engineer não fechar a tempo): `?d=` passa a carregar um token autossuficiente `v1.<n>.<5 notas em base36, 2 caracteres cada>.<apelido opcional>`, por exemplo `?d=v1.5.2s2s1e0r2s.Junior`. A comparação acontece só no cliente. Adulterar o token não traz vantagem nenhuma (é um jogo, sem prêmio). Quando o backend entrar, códigos de 6 caracteres substituem o token, e o cliente aceita os dois.

### 5.5 Eventos de análise (contadores agregados, sem id)

`landing` (k = `s` + tem `d` + tem `g`), `round_start` (k = i), `round_lock` (k = i + faixa de tempo), `source_open` (k = id da rodada), `day_complete` (k = faixa do total), `share_open` (k = text, story, duel ou group), `share_done`, `share_abort`, `wa_text_click`, `duel_create`, `duel_land`, `duel_complete`, `group_create`, `group_join`, `group_post`, `papo_open`, `papo_concern` (k = preocupação), `papo_send`, `plano_create`, `streak_freeze`, `jornada_from_daily`.

Retenção D1 e D7 sai da tabela `chute` (id aleatório do aparelho por data, o mesmo modelo da tabela `daily` existente). O K-fator sai de `chute.via` (primeira partida por link) dividido por quem compartilhou.

### 5.6 Corte de MVP (sai hoje, sábado 24/10)

| Hora (BRT) | Entrega | Dono | Pronto quando |
|---|---|---|---|
| 09h a 10h | `rounds.ts` com #5 e #6 + r19, r20 e r31 conferidos | fact-checker | `review: 'ok'` nas 10 rodadas; teste de conteúdo verde |
| 09h a 10h | `score.ts` + testes | diretor | Testes de borda (tol, zero, log, piso) |
| 10h a 13h | Daily com slider, escolha, revelação, resultado e texto de share (`navigator.share` → `wa.me`) | ui-engineer + growth | Partida de 5 rodadas em ≤ 2 min num Android médio, 60 fps, alvos ≥ 44 px |
| 12h a 13h | Duelo por token no cliente (`?d=v1…`) e tela de comparação | ui-engineer | Abrir o link cai direto na rodada 1 |
| 11h a 14h | `POST /api/chute`, `GET /api/chute/:date` (percentil e Brasil chutou), grupo (3 rotas) | backend | `pnpm test` verde; testes de privacidade (sem id na saída) |
| 13h a 14h | Compositor do Papo de Almoço (6 preocupações) + card do plano de domingo | ui-engineer | Mensagem abre no WhatsApp com texto editável |
| 14h a 15h | `/c/:n` com OG e `public/og/c-5.png` e `c-6.png` | growth + backend | Preview correto no WhatsApp Android e iOS |
| 15h | **Deploy** + screenshots Playwright 390×844 e 1440×900 + typecheck, lint e build | todos | |
| 18h | Jurídico valida §3.6 (domingo, identificação, plano) | jurídico | Flag `ELECTION_DAY` configurada |
| **23h59** | Último deploy permitido. Nada de deploy em 25/10 | | |

**Fica fora hoje:** rodadas de mapa, diálogo do Papo de Almoço, OG dinâmico com imagem, retrospectiva semanal, duelo com backend (se o token bastar), card Story do Chuta Aí (o texto vem primeiro; se der tempo, reaproveitar o renderizador de `src/share/cards.ts`).

---

## 6. Métricas e plano A/B

### 6.1 Metas

Não há benchmark público confiável de D1 e K para jogos diários web. As metas abaixo são hipóteses a corrigir com os dados da primeira noite.

| Métrica | Definição | Meta de hoje | Por quê |
|---|---|---|---|
| Conclusão | `day_complete` / `round_start` (i=0) | ≥ 85% | 5 rodadas curtas, sem cronômetro |
| Sessão mediana | da 1ª rodada ao resultado | ≤ 120 s | Padrão 2 |
| **Taxa de share** | completos com `share_done` ou `wa_text_click` / completos | ≥ 25% | Grade + gancho + duelo |
| Landings por share | `landing` com `s` / shares | ≥ 2,5 | Grupo de família tem 10 a 50 pessoas |
| Landing → conclusão | `day_complete` com `via` / `landing` com `s` | ≥ 50% | Cai direto na rodada 1 |
| **K-fator** | share × landings/share × conclusão | **≥ 0,4 hoje; ≥ 0,8 com o placar de grupo** | K > 1 é raro. Com K de 0,8 e semente de 50 mil, a cascata soma ~250 mil jogadores (50 mil / (1 − 0,8)) |
| Aceite de duelo | `duel_complete` / `duel_land` | ≥ 40% | Motivo pessoal |
| Entrada no grupo | `group_join` / `landing` com `g` | ≥ 30% | |
| D1 | jogou em d e d+1 / jogou em d | ≥ 35% (24→25/10) | Domingo tem motivo extra (votar) |
| D7 | jogou em d e d+7 | ≥ 15% (laço pós) | |
| Fonte aberta | `source_open` / revelações | ≥ 3% | Termômetro de credibilidade |
| **Papo enviado** | `papo_send` / completos | ≥ 10% | Mensagem 1 a 1 é o que move voto |
| **Plano criado** | `plano_create` / completos em 24 e 25/10 | ≥ 20% | Nickerson e Rogers |
| Surpresa | % de chutes de r04 acima de 7% | (medir) | Valida a lacuna de percepção |

### 6.2 Testes A/B

Divisão determinística por `hash(id) % 2` (sem cadastro), variante no link (`v=a|b`) para medir landings por share. Todas as variantes são factuais; não se testa engano, pressão ou culpa.

| # | Hipótese | A | B | Métrica principal | Amostra |
|---|---|---|---|---|---|
| 1 | Pergunta no texto puxa mais cliques que só a nota | `Errei o desemprego feio 😅 Quanto você chuta?` | `Fiz 1.040 de 1.300 no Chuta Aí.` | landings por share | ~1.250 shares por braço para ver 25% → 30% (α 0,05, poder 0,8) |
| 2 | Duelo primeiro aumenta o K | Botão principal "Mandar no grupo" | Botão principal "Tira-teima" | K-fator | ~2.000 completos por braço |
| 3 | Comparecimento antes do bolso aumenta o plano de voto sem perder conclusão | ordem #5 atual | r19 vira rodada 1 | `plano_create` / completos | ~1.250 por braço |
| 4 | Ponte "o que isso muda pra você" aumenta o Papo | revelação seca | revelação + 1 linha "No seu bolso: …" (só r01, r04, r10) | `papo_send` | ~3.000 por braço (efeito pequeno) |

Leitura às 21h de hoje: o vencedor de 1 e 2 vira padrão no último deploy das 23h. Os testes 3 e 4 continuam no laço pós-eleição.

### 6.3 O que este documento não verificou

- Os números da MapTap (pesos 1-1-2-3-3, total 1.000, formato exato do texto) vêm de guias de terceiros e de colagens em fórum. O site oficial não abriu deste ambiente.
- O crescimento do Contexto e números do Framed, Bandle e Costcodle não foram encontrados.
- Os resultados de 2020 do deep canvassing (3,1 pontos) não têm versão revisada por pares.
- Não achei pesquisa sobre a preocupação **dos indecisos** no 2º turno de 2026. Consultar os relatórios completos de Quaest e Datafolha de 22 e 24/10.
- As rodadas **NOVAS** (r05, r11, r13 a r17, r19, r20, r31 e a URL de r18) dependem do fact-checker. Para r11 e r31 falta a URL exata.
- O enquadramento jurídico do domingo (share do jogador, card com o 13) depende do jurídico.
