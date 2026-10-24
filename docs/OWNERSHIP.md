# Donos de arquivo (trabalho em paralelo)

| Área | Dono | Arquivos |
|---|---|---|
| Motor e contrato | diretor (sessão principal) | `src/engine/*`, `src/state/*`, `src/app/App.tsx`, `src/app/nav.ts`, `src/main.tsx`, `src/app/screens/Play.tsx` (lógica), `src/games/index.ts`, `src/games/mapa.ts` |
| Minijogos A | gameplay-engineer A | `src/games/{swipe,ir,fogo,whack,ritmo,defesa}.ts`, `src/games/kit-a.ts` |
| Minijogos B | gameplay-engineer B | `src/games/{linha,memoria,raiox,escudo,pegar,chefe}.ts`, `src/games/kit-b.ts` |
| Mundo e arte | pixel-art-director | `src/scene/*`, `src/lib/sprites.ts` (sem renomear sprites existentes), `src/app/screens/Map.tsx`, `src/ui/WorldStage.tsx`, `public/og.png`, `public/icon-*.png` |
| Interface e telas | ui-engineer | `src/ui/*` (menos `WorldStage.tsx`), `src/app/screens/{Title,Onboard,Result,Final,Daily,Placar,Colecao,Votar,Sobre}.tsx`, estilo do HUD de `Play.tsx` |
| Compartilhar | growth-share-engineer | `src/share/*` |
| API e infraestrutura | backend-engineer | `worker/*`, `server/*`, `src/lib/api.ts`, `tests/*`, `.github/*`, `README*.md`, `docs/DEPLOY*.md` |
| Som | sound-designer | `src/audio/*`, `public/audio/*` |
| Conteúdo | fact-checker | `src/content/*` (só com fonte) |

Precisa de algo fora da sua área? Não edite: descreva no relatório final o que precisa e por quê.
