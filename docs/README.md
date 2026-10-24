# Kickoff

> PT-BR. English version: [README.en.md](README.en.md).

Todo projeto novo nasce com estes documentos. `pnpm novo <projeto>` copia esta pasta para `projects/<projeto>/` e preenche os campos `{{…}}` que já conhece (nome, cliente, data). O resto se preenche no ritual abaixo.

## Os documentos

| Arquivo | Para quê | Quem escreve | Quando |
|---|---|---|---|
| [`BRIEF.md`](BRIEF.md) | Problema, público, objetivos, restrições, referências, métrica de sucesso | Designer líder, com o cliente na sala | Kickoff; revisado ao fim da descoberta |
| [`PRODUCT.md`](PRODUCT.md) | Contexto do produto para pessoas e agentes: fatos, pessoas, superfícies, restrições | Designer + Claude a partir do material do cliente | Kickoff; atualizado quando um fato muda |
| [`DESIGN.md`](DESIGN.md) | Registro das decisões do sistema (tipo, cor, espaço, motion), com o porquê | Quem decide; Claude atualiza ao fim de cada rodada | Da direção em diante |
| [`PRINCIPIOS.md`](PRINCIPIOS.md) | Princípios do projeto, cada um com teste e contraexemplo | Time, depois da primeira crítica | Fim da descoberta ou da v1 |
| [`VERSIONING.md`](VERSIONING.md) | Como as rodadas v1 … vN convivem e o menu de versões | Já vem pronto; ajuste se precisar | Kickoff |
| [`DECISIONS.md`](DECISIONS.md) | Decisões de produto e arquitetura no formato ADR | Quem decide | Sempre que uma decisão puder ser questionada depois |
| [`CRITIQUE.md`](CRITIQUE.md) | Template de rodada de crítica com níveis P0–P3 | Quem conduz a crítica | Antes de cada rodada ir ao cliente |
| [`QA.md`](QA.md) | Definição de pronto, para marcar com evidência | Quem entrega | Antes de cada entrega |
| [`FILM-BRIEF.md`](FILM-BRIEF.md) | Roteiro em batidas de um filme | Quem dirige o filme | Quando houver filme |

## O ritual: os primeiros 90 minutos

O kickoff é a reunião que mais economiza tempo no projeto inteiro. A meta é sair com o problema escrito numa frase, os critérios de sucesso combinados, a primeira régua de gosto e a data da primeira rodada.

### Antes (30 min, sem o cliente)

- [ ] `pnpm novo nivel-13` e `pnpm --filter @projects/nivel-13 dev`: o repositório já está de pé e roda.
- [ ] Ler tudo que o cliente mandou. Anotar em `PRODUCT.md` os fatos que já dá para afirmar.
- [ ] Separar 6–10 referências candidatas (sites, marcas, produtos) com print.
- [ ] Escrever as perguntas que o material não responde.
- [ ] Abrir `BRIEF.md` na tela que vai ser compartilhada.

### 0–10 min · Abertura

- Objetivo da reunião em uma frase.
- **Quem decide** do lado do cliente (uma pessoa) e quem precisa ser ouvido.
- Como trabalhamos: rodadas versionadas, link de preview, menu de versões, crítica com perguntas específicas. Mostre um projeto anterior rodando por 2 minutos.

### 10–30 min · O problema

Preencha `BRIEF.md` **ao vivo**, na tela, com as palavras do cliente.

- O problema na fórmula: *quem* precisa *fazer o quê* porque *motivo*, mas hoje *obstáculo*.
- Para quem: no máximo três públicos, cada um com o job principal ("Quando…, quero…, para…").
- O que acontece se não fizermos nada?

Se a frase do problema contém a solução ("precisamos de um site novo"), pergunte "por quê?" até não conter.

### 30–45 min · Sucesso e restrições

- **Como saberemos que deu certo?** Uma métrica principal, com número e prazo. Para marca, o que for observável.
- Prazos fixos (lançamento, evento, conselho).
- Restrições: técnica (plataforma, CMS, time que vai manter), legal (dados, setor regulado), de marca (o que não pode mudar), de conteúdo (o que existe e o que não existe).

### 45–65 min · Referências: ama e odeia

O momento mais valioso do kickoff. Mostre as referências e peça reação.

- Para cada uma: ama, odeia ou indiferente, e **o que exatamente**. "A calma", "o número grande no topo", "a foto parece banco de imagem".
- Peça ao cliente duas referências dele, inclusive concorrentes que ele inveja.
- Anote tudo literalmente na seção "Referências" do `BRIEF.md`. Essa é a primeira régua (gostou / criticou) do `BRIEF-v1.md`.

### 65–80 min · Riscos e decisões abertas

- O que pode dar errado? (conteúdo atrasado, aprovação em várias camadas, dependência técnica)
- Quais decisões já estão tomadas e não serão revisitadas? Registre em `DECISIONS.md`.
- Quem é dono de cada conteúdo (textos, fotos, dados) e quando chega.

### 80–90 min · Próximos passos

- Data da **v1** (normalmente 5–7 dias úteis depois).
- Ritmo de rodadas (ex.: uma por semana, com revisão às quintas).
- Forma de revisão: reunião com localhost compartilhado e/ou link de preview.
- Canal único de comunicação e quem responde.
- O que o cliente envia, e até quando.

### Depois (30 min, sem o cliente)

- [ ] Limpar o `BRIEF.md` e enviar para o "de acordo" do cliente.
- [ ] Pedir ao Claude: "Leia BRIEF.md e o material em `research/`. Complete PRODUCT.md, liste as perguntas em aberto e proponha 3 direções em uma frase cada." Revisar e cortar.
- [ ] Criar `BRIEF-v1.md` com a régua inicial (gostou, criticou, pediu).
- [ ] Registrar a primeira versão em `lib/versions.ts`.
- [ ] Commit: "kickoff: brief, produto e régua inicial".

## Convenções dos templates

- `{{campo}}` é um campo a preencher. `pnpm novo` preenche os que conhece; o resto fica para você.
- `<!-- comentário -->` é orientação. Apague depois de preencher.
- Escreva como fala. Documento que só o autor entende não serve para o time nem para o Claude.
- Datas no formato `AAAA-MM-DD`.
