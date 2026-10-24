# Versionamento · nivel-13

<!-- Já vem pronto. Ajuste só se o projeto tiver um motivo. O porquê de tudo isto está em method/02-processo.md. -->

Cada rodada de trabalho vira uma **versão autocontida**: navegável, comparável, e congelada quando a próxima começa. Versões antigas ficam no ar, intactas, para comparar e voltar atrás.

## Versão ou rodada?

| Mudou | É |
|---|---|
| A direção, ou o sistema (tipo, cor, grade, motion) | **Versão nova** (v3 → v4) |
| Ajustes dentro da mesma direção, a pedido da crítica | **Rodada** dentro da versão (4.1, 4.2) |
| Correção de bug numa versão já mostrada | Correção na própria versão, registrada no brief dela |

## Estrutura

| Peça | Onde | Regra |
|---|---|---|
| Registro | `lib/versions.ts` | Fonte única: id, título, data, status, resumo, rotas, pastas e brief de cada versão. Uma só com `current: true` (e `status: 'atual'`). |
| Rotas | `app/<id>/` (ex.: `app/v4/`) | Cada versão tem a sua raiz. Rotas de versão arquivada não se editam. |
| Componentes | `components/<id>/` | Código novo da versão na pasta dela. Pode importar de versões anteriores; nunca as edita. |
| CSS | escopo `.<id>` na raiz da versão + prefixo de classe próprio (`v4-`) | Nada vaza entre versões. |
| Brief | `briefs/BRIEF-<id>.md` | Régua viva (gostou, criticou, pediu, repetido), decisões, rodadas. |
| Índice | `/` | Lista todas as versões lendo o registro. |
| Menu | `<StudioTools versions={studioVersions} />` › Versões | Menu da barra que lista as versões e marca a da página atual. |

```ts
// lib/versions.ts
export type RoundStatus = 'atual' | 'anterior' | 'aprovada' | 'rascunho'

export interface Round {
  id: `v${number}`                  // 'v4'
  title: string                     // nome curto da direção ou da rodada
  date: string                      // AAAA-MM-DD
  status: RoundStatus
  current?: boolean                 // exatamente uma versão com current: true
  summary: string                   // uma frase: o que esta versão testa ou decide
  routes: { label: string; href: string }[]   // [{ label: 'Landing', href: '/v4' }]
  folders: string[]                 // ['app/v4', 'components/v4']
  brief: string                     // 'briefs/BRIEF-v4.md'
}

export const versions: Round[] = [
  { id: 'v1', title: '{{}}', date: '2026-10-24', status: 'atual', current: true, summary: '{{}}',
    routes: [{ label: 'Landing', href: '/v1' }], folders: ['app/v1', 'components/v1'], brief: 'briefs/BRIEF-v1.md' },
]
```

O mesmo arquivo exporta `currentRound`, `roundOf(pathname)` e `studioVersions` (o formato do menu Versões).

## Criar uma versão nova

No Claude Code, `/round` faz os passos abaixo.

1. Copie o bloco da versão atual em `lib/versions.ts`, mude o id, marque `status: 'atual'` e `current: true`, e passe a anterior para `status: 'anterior'` (sem `current`).
2. Crie `briefs/BRIEF-<id>.md` a partir do anterior: leve a régua inteira (gostou, criticou), zere "pediu" e "repetido" e preencha com a crítica recebida.
3. Crie `app/<id>/` e `components/<id>/`. Para começar da anterior, **copie** (nunca mova) e troque o escopo e o prefixo de CSS.
4. Ponha o escopo `.<id>` na raiz do layout da versão.
5. Rode a verificação (1440 e 390, com e sem movimento reduzido) na versão nova **e** numa antiga, para garantir que nada vazou.
6. Publique: o link principal abre o índice, com a versão `current` em destaque.

## Regras

- **Versão arquivada é somente leitura.** Se uma correção num componente compartilhado mudaria o visual de uma versão antiga, a correção vai para a pasta da versão nova.
- **Prefixo de classe único por versão.** Classe genérica compartilhada entre versões já quebrou layout em projeto real.
- **Tokens por versão** quando o sistema muda: `components/<id>/tokens.ts` e variáveis dentro do escopo `.<id>`.
- **Dado ilustrativo continua marcado** como ilustrativo em todas as versões.
- **Arquivo:** quando o número de versões pesar no deploy, as antigas vão para um link de arquivo separado; o link principal fica com a atual e o índice.

## Brief de versão (esqueleto)

```md
# nivel-13 {{id}} · "{{título}}"

Leia antes: VERSIONING.md, briefs/BRIEF-{{anterior}}.md, DESIGN.md. Este documento vence onde divergir.
Rotas: /{{id}}/… Código novo só em app/{{id}}/** e components/{{id}}/**.

## Régua
Gostou: …
Criticou (nunca repetir): …
Pediu agora: …
Repetido (prioridade máxima): …

## Decisões desta versão
…

## Rodada {{id}}.1
…
```
