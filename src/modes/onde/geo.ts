// Geografia do Onde Foi?: enquadramento do mapa, UFs e a grade de pixels do Brasil.
// Funções puras (sem DOM): o desenho fica em draw.ts e os testes rodam em Node.
// As divisas entre estados são APROXIMADAS (Voronoi de alguns pontos por UF, recortado pelo contorno de
// src/content/brazil.ts). Servem só para o traço sutil do mapa e para a lista de UFs; a pontuação usa
// sempre a coordenada exata de quem toca e do pino.
import { inBrazil } from '../../content/brazil'

export interface Pt {
  lon: number
  lat: number
}

/** Enquadramento: o contorno do Brasil com 1 grau de folga em cada lado (os pinos da borda não cortam). */
export const VIEW = { lon0: -75.4, lon1: -33.4, lat0: 6.4, lat1: -35.0 } as const

const W_LON = VIEW.lon1 - VIEW.lon0
const H_LAT = VIEW.lat1 - VIEW.lat0

/** Grau → pixel lógico (contínuo) numa grade L×L. */
export const toXY = (p: Pt, L: number): [number, number] => [
  ((p.lon - VIEW.lon0) / W_LON) * L,
  ((p.lat - VIEW.lat0) / H_LAT) * L,
]

/** Pixel lógico (contínuo) → grau. */
export const fromXY = (x: number, y: number, L: number): Pt => ({
  lon: VIEW.lon0 + (x / L) * W_LON,
  lat: VIEW.lat0 + (y / L) * H_LAT,
})

export type Region = 'Norte' | 'Nordeste' | 'Centro-Oeste' | 'Sudeste' | 'Sul'

export interface UfInfo {
  uf: string
  name: string
  region: Region
  /** centro aproximado do território (usado na pontuação da lista) */
  center: Pt
}

export const UF_LIST: UfInfo[] = [
  { uf: 'AC', name: 'Acre', region: 'Norte', center: { lon: -70.5, lat: -9.1 } },
  { uf: 'AM', name: 'Amazonas', region: 'Norte', center: { lon: -64.7, lat: -4.2 } },
  { uf: 'AP', name: 'Amapá', region: 'Norte', center: { lon: -51.9, lat: 1.4 } },
  { uf: 'PA', name: 'Pará', region: 'Norte', center: { lon: -52.3, lat: -3.8 } },
  { uf: 'RO', name: 'Rondônia', region: 'Norte', center: { lon: -62.8, lat: -10.9 } },
  { uf: 'RR', name: 'Roraima', region: 'Norte', center: { lon: -61.4, lat: 2.1 } },
  { uf: 'TO', name: 'Tocantins', region: 'Norte', center: { lon: -48.3, lat: -10.2 } },
  { uf: 'AL', name: 'Alagoas', region: 'Nordeste', center: { lon: -36.6, lat: -9.6 } },
  { uf: 'BA', name: 'Bahia', region: 'Nordeste', center: { lon: -41.7, lat: -12.5 } },
  { uf: 'CE', name: 'Ceará', region: 'Nordeste', center: { lon: -39.6, lat: -5.1 } },
  { uf: 'MA', name: 'Maranhão', region: 'Nordeste', center: { lon: -45.3, lat: -5.1 } },
  { uf: 'PB', name: 'Paraíba', region: 'Nordeste', center: { lon: -36.8, lat: -7.1 } },
  { uf: 'PE', name: 'Pernambuco', region: 'Nordeste', center: { lon: -37.9, lat: -8.3 } },
  { uf: 'PI', name: 'Piauí', region: 'Nordeste', center: { lon: -42.9, lat: -7.4 } },
  { uf: 'RN', name: 'Rio Grande do Norte', region: 'Nordeste', center: { lon: -36.6, lat: -5.8 } },
  { uf: 'SE', name: 'Sergipe', region: 'Nordeste', center: { lon: -37.4, lat: -10.6 } },
  { uf: 'DF', name: 'Distrito Federal', region: 'Centro-Oeste', center: { lon: -47.8, lat: -15.8 } },
  { uf: 'GO', name: 'Goiás', region: 'Centro-Oeste', center: { lon: -49.6, lat: -16.0 } },
  { uf: 'MS', name: 'Mato Grosso do Sul', region: 'Centro-Oeste', center: { lon: -54.8, lat: -20.3 } },
  { uf: 'MT', name: 'Mato Grosso', region: 'Centro-Oeste', center: { lon: -55.9, lat: -12.9 } },
  { uf: 'ES', name: 'Espírito Santo', region: 'Sudeste', center: { lon: -40.7, lat: -19.6 } },
  { uf: 'MG', name: 'Minas Gerais', region: 'Sudeste', center: { lon: -44.6, lat: -18.5 } },
  { uf: 'RJ', name: 'Rio de Janeiro', region: 'Sudeste', center: { lon: -42.7, lat: -22.2 } },
  { uf: 'SP', name: 'São Paulo', region: 'Sudeste', center: { lon: -48.6, lat: -22.2 } },
  { uf: 'PR', name: 'Paraná', region: 'Sul', center: { lon: -51.6, lat: -24.6 } },
  { uf: 'RS', name: 'Rio Grande do Sul', region: 'Sul', center: { lon: -53.3, lat: -29.7 } },
  { uf: 'SC', name: 'Santa Catarina', region: 'Sul', center: { lon: -50.5, lat: -27.2 } },
]

export const REGIONS: Region[] = ['Norte', 'Nordeste', 'Centro-Oeste', 'Sudeste', 'Sul']

export const ufInfo = (uf: string) => UF_LIST.find((u) => u.uf === uf)

/** Pontos de cada UF (lon, lat) para o Voronoi das divisas. O DF é um retângulo à parte. */
const SEEDS: Record<string, [number, number][]> = {
  AC: [
    [-70.5, -9.0],
    [-68.5, -10.0],
    [-72.5, -8.5],
  ],
  AM: [
    [-64, -4],
    [-68, -5],
    [-61, -2],
    [-60, -7],
    [-66, -1],
    [-70, -2.5],
    [-71.5, -6.5],
    [-63, -6.5],
  ],
  RR: [
    [-61.5, 2.5],
    [-60.7, 0.5],
    [-63.5, 3.5],
  ],
  AP: [
    [-51.5, 1.5],
    [-52, 0.3],
    [-51.2, 3],
  ],
  PA: [
    [-52, -4],
    [-49, -3],
    [-55, -5],
    [-54, -1],
    [-50.5, -7.5],
    [-56, -7],
    [-48, -1.8],
    [-54.5, 1.0],
  ],
  RO: [
    [-63, -10.5],
    [-62, -12],
    [-64, -9],
  ],
  MT: [
    [-55, -13],
    [-58, -12],
    [-53, -15],
    [-56, -10],
    [-54, -16.5],
    [-59, -15],
    [-52, -11.5],
  ],
  TO: [
    [-48.3, -10],
    [-48.3, -7],
    [-47.8, -12.5],
  ],
  MA: [
    [-45, -5],
    [-44.5, -3],
    [-46.5, -7.5],
    [-44.3, -6.5],
  ],
  PI: [
    [-42.5, -6],
    [-42.3, -8.3],
    [-41.6, -4],
    [-45, -9.8],
  ],
  CE: [
    [-39.5, -5],
    [-39.5, -7],
    [-40.5, -3.5],
  ],
  RN: [
    [-36.5, -5.8],
    [-37.5, -5.5],
  ],
  PB: [
    [-36.5, -7.2],
    [-38, -7],
  ],
  PE: [
    [-37, -8.4],
    [-40, -8.0],
    [-35.5, -8.2],
    [-38.5, -8.3],
  ],
  AL: [
    [-36.5, -9.6],
    [-36, -9.4],
  ],
  SE: [[-37.3, -10.6]],
  BA: [
    [-41, -12.5],
    [-44, -12],
    [-40, -15],
    [-39.5, -11],
    [-42.5, -10],
    [-45.5, -12.5],
    [-39.5, -17],
    [-38.7, -13],
    [-43.5, -14.2],
  ],
  MG: [
    [-44.5, -18.5],
    [-43.5, -20],
    [-46, -19.5],
    [-47.5, -18],
    [-42.5, -17],
    [-45, -16],
    [-42, -19.5],
    [-45.5, -21.5],
    [-49, -19.5],
  ],
  ES: [
    [-40.5, -19.5],
    [-40.7, -20.5],
    [-40.2, -18.5],
  ],
  RJ: [
    [-42.7, -22.5],
    [-43.4, -22.8],
    [-41.5, -22],
    [-44.3, -22.6],
  ],
  SP: [
    [-48.5, -22.5],
    [-47, -23],
    [-50.5, -21.5],
    [-46.3, -23.6],
    [-48.3, -24.3],
    [-51.5, -22],
    [-47.5, -21],
  ],
  PR: [
    [-51.5, -24.5],
    [-49.5, -25],
    [-53.5, -25],
    [-52, -23.3],
  ],
  SC: [
    [-50.5, -27.3],
    [-49, -27],
    [-52.5, -27],
    [-53.3, -26.6],
  ],
  RS: [
    [-53, -29.5],
    [-51.5, -30],
    [-55, -29.5],
    [-52.5, -28],
    [-53, -32],
    [-50.5, -29.5],
  ],
  MS: [
    [-54.5, -20.5],
    [-55.5, -19],
    [-54, -22.5],
    [-56.5, -21],
    [-52.5, -19],
    [-57, -19.5],
  ],
  GO: [
    [-49.5, -16],
    [-50.5, -14],
    [-49.5, -17.8],
    [-51.5, -17],
    [-47.5, -14.5],
    [-46.8, -15.2],
    [-47.9, -17.0],
  ],
}

const SEED_LIST: { uf: string; lon: number; lat: number }[] = Object.entries(SEEDS).flatMap(([uf, pts]) =>
  pts.map(([lon, lat]) => ({ uf, lon, lat })),
)

const DF_BOX = { lon0: -48.29, lon1: -47.31, lat0: -15.5, lat1: -16.05 }

/** UF aproximada de um ponto (null fora do contorno). */
export function ufAt(p: Pt): string | null {
  if (!inBrazil(p.lon, p.lat)) return null
  return ufNear(p)
}

/** UF aproximada mais próxima, mesmo fora do contorno (litoral e ilhas). */
export function ufNear(p: Pt): string {
  if (p.lon >= DF_BOX.lon0 && p.lon <= DF_BOX.lon1 && p.lat <= DF_BOX.lat0 && p.lat >= DF_BOX.lat1) return 'DF'
  let best = 'DF'
  let bd = Number.POSITIVE_INFINITY
  for (const s of SEED_LIST) {
    const d = (s.lon - p.lon) ** 2 + (s.lat - p.lat) ** 2
    if (d < bd) {
      bd = d
      best = s.uf
    }
  }
  return best
}

const UF_INDEX = new Map(UF_LIST.map((u, i) => [u.uf, i + 1]))
export const ufIndex = (uf: string) => UF_INDEX.get(uf) ?? 0
export const ufByIndex = (i: number) => UF_LIST[i - 1]?.uf ?? null

const gridCache = new Map<number, Uint8Array>()

/** Grade L×L: 0 = fora do Brasil, n = índice (1..27) da UF em UF_LIST. */
export function landGrid(L: number): Uint8Array {
  const hit = gridCache.get(L)
  if (hit) return hit
  const g = new Uint8Array(L * L)
  for (let y = 0; y < L; y++)
    for (let x = 0; x < L; x++) {
      const uf = ufAt(fromXY(x + 0.5, y + 0.5, L))
      if (uf) g[y * L + x] = ufIndex(uf)
    }
  if (gridCache.size > 6) gridCache.clear()
  gridCache.set(L, g)
  return g
}
