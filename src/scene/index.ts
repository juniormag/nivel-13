// Barril público da cena: o share e o runner importam daqui (via import.meta.glob).
// Nada aqui puxa o three de forma estática: o monumento 3D é carregado sob demanda pelo World.
export { renderLevelBackdrop } from './levels'
export { renderHeroStill, World } from './world'
