// Peças desenhadas pixel a pixel em código: Cristo, bandeira (ciclo de pano), coroa,
// gaivotas e o brilho de 4 pontas. Tudo na paleta, sem escala em tempo de execução.
import { Buf, dith, HEX, type K } from './pal'

/** Brilho de 3 camadas em volta do que já está no buffer (regra 15): anel 1 px pontilhado + anel 2 px ralo. */
export function haloAround(b: Buf, inner: K, outer: K, density = 0.5) {
  const src = b.d.slice()
  const w = b.w
  const h = b.h
  const on = (x: number, y: number) => x >= 0 && y >= 0 && x < w && y < h && (src[y * w + x] ?? 0) !== 0
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      if (on(x, y)) continue
      const n1 = on(x - 1, y) || on(x + 1, y) || on(x, y - 1) || on(x, y + 1)
      if (n1) {
        if ((x + y) & 1 || density > 0.9) b.set(x, y, inner)
        continue
      }
      const n2 =
        on(x - 2, y) || on(x + 2, y) || on(x, y - 2) || on(x, y + 2) || on(x - 1, y - 1) || on(x + 1, y + 1)
      if (n2 && dith(x, y, density * 0.5)) b.set(x, y, outer)
    }
}

/** Cristo Redentor iluminado de frente-esquerda, com halo dourado. Altura `h` em px (≥ 10). */
export function christ(h: number) {
  const pad = 3
  const span = Math.round(h * 0.86) | 1
  const W = span + pad * 2
  const H = h + pad * 2
  const b = new Buf(W, H)
  const cx = Math.floor(W / 2)
  const top = pad
  const armY = top + Math.round(h * 0.2)
  const armT = h >= 16 ? 2 : 1
  // cabeça
  b.rect(cx - 1, top, 2, 2, 'sparkle')
  b.set(cx, top + 1, 'stone3')
  // braços abertos
  b.rect(cx - (span >> 1), armY, span, armT, 'sparkle')
  b.rect(cx + 1, armY, span >> 1, armT, 'stone3')
  b.set(cx - (span >> 1), armY + armT, 'gold1')
  b.set(cx + (span >> 1), armY + armT, 'gold1')
  if (armT > 1) b.rect(cx - (span >> 1) + 1, armY + armT, span - 2, 1, 'gold1')
  // manto, alargando para baixo
  const bodyTop = top + 2
  const bodyBot = top + h - 2
  for (let y = bodyTop; y < bodyBot; y++) {
    const t = (y - bodyTop) / (bodyBot - bodyTop)
    const half = 1 + Math.round(t * (h >= 16 ? 1.6 : 1))
    for (let x = cx - half; x <= cx + half - 1; x++) {
      const k: K = x < cx - 1 ? 'sparkle' : x < cx ? 'stoneHi' : x < cx + 1 ? 'stone3' : 'stone2'
      b.set(x, y, k)
    }
  }
  // pedestal
  b.rect(cx - 2, bodyBot, 4, 2, 'stone2')
  b.rect(cx - 2, bodyBot, 2, 1, 'goldHi')
  haloAround(b, 'gold1', 'gold0', 0.6)
  return { c: b.canvas(), ax: cx, ay: H - pad }
}

/**
 * Bandeira do Brasil em pano, `n` quadros de ondulação (regra: 4–6 quadros a 10 fps).
 * Desenhada já deformada, coluna a coluna, com faixas de sombra na dobra.
 */
export function flagFrames(w: number, h: number, n = 6) {
  const frames: HTMLCanvasElement[] = []
  const amp = Math.max(1, Math.round(h * 0.09))
  for (let f = 0; f < n; f++) {
    const b = new Buf(w + 1, h + amp * 2 + 2)
    const ph = (f / n) * Math.PI * 2
    for (let x = 0; x < w; x++) {
      const u = x / (w - 1)
      // ondulação cresce para longe do mastro
      const wave = Math.sin(u * 5.2 - ph) * u
      const dy = Math.round(wave * amp + u * amp * 0.6)
      const slope = Math.cos(u * 5.2 - ph) * u
      const shade = slope > 0.35 ? 1 : slope < -0.35 ? -1 : 0
      for (let y = 0; y < h; y++) {
        const v = y / (h - 1)
        // losango e globo em coordenadas do pano
        const du = Math.abs(u - 0.5) / 0.44
        const dv = Math.abs(v - 0.5) / 0.4
        const rx = (u - 0.5) * (w / h)
        const ry = v - 0.5
        const inGlobe = rx * rx + ry * ry < 0.24 * 0.24
        const band = inGlobe && Math.abs(ry - rx * 0.35 + 0.02) < 0.045
        let k: K
        if (inGlobe) k = band ? 'stoneHi' : rx + ry * 0.4 > 0.06 ? 'blue0' : 'blue1'
        else if (du + dv < 1) k = 'gold'
        else k = 'green'
        // estrelinhas
        if (inGlobe && !band && (x * 7 + y * 13) % 11 === 0) k = 'stoneHi'
        // luz: dobra virada para a lua clareia, a outra escurece (hue shift)
        if (shade > 0) k = k === 'green' ? 'leafHi' : k === 'gold' ? 'goldHi' : k === 'blue0' ? 'blue1' : k
        if (shade < 0)
          k =
            k === 'green'
              ? 'vine1'
              : k === 'gold'
                ? 'gold1'
                : k === 'blue0'
                  ? 'night'
                  : k === 'stoneHi'
                    ? 'stone2'
                    : k
        if (y === h - 1 || x === w - 1) k = k === 'green' || k === 'leafHi' ? 'vine1' : k
        b.set(x, y + dy + amp, k)
      }
    }
    frames.push(b.canvas())
  }
  return { frames, yOff: amp }
}

/** Coroa dourada com 5 pontas e gemas; `sq` achata (squash) mantendo a área. */
export function crown(w: number, sq = 1) {
  const W0 = Math.max(13, Math.round(w * (sq > 1 ? 1 / Math.sqrt(sq) : 1 / sq)))
  const H0 = Math.max(9, Math.round(w * 0.62 * sq))
  const pad = 3
  const b = new Buf(W0 + pad * 2, H0 + pad * 2)
  const ox = pad
  const oy = pad
  const bandH = Math.max(3, Math.round(H0 * 0.34))
  const bandY = oy + H0 - bandH
  // aro
  for (let x = 0; x < W0; x++)
    for (let y = 0; y < bandH; y++) {
      const u = x / (W0 - 1)
      const k: K =
        y === 0 ? 'goldHi' : y === bandH - 1 ? 'gold1' : u < 0.3 ? 'goldHi' : u > 0.75 ? 'gold1' : 'gold'
      b.set(ox + x, bandY + y, k)
    }
  // pontas
  const spikes = 5
  for (let s = 0; s < spikes; s++) {
    const cxp = ox + Math.round(((s + 0.5) / spikes) * (W0 - 1))
    const tall = s === 2 ? 1 : s === 1 || s === 3 ? 0.82 : 0.66
    const sh = Math.round((H0 - bandH) * tall)
    const base = Math.max(2, Math.round(W0 / spikes / 2))
    for (let y = 0; y < sh; y++) {
      const t = 1 - y / sh
      const half = Math.max(0, Math.round(base * t))
      for (let x = -half; x <= half; x++) {
        const k: K = x < 0 ? 'goldHi' : x === 0 ? 'gold' : 'gold1'
        b.set(cxp + x, bandY - 1 - y, k)
      }
    }
    // bolinha na ponta
    const ty = bandY - sh - 1
    b.set(cxp, ty, 'sparkle')
    b.set(cxp - 1, ty, 'goldHi')
    b.set(cxp + 1, ty, 'gold')
    b.set(cxp, ty - 1, 'goldHi')
  }
  // reflexo vermelho dos anéis embaixo do aro
  for (let x = 1; x < W0 - 1; x++) b.set(ox + x, bandY + bandH - 1, x % 5 === 2 ? 'redHot' : 'crimson')
  // gemas vermelhas no aro
  for (let s = 0; s < 3; s++) {
    const gx = ox + Math.round(((s * 2 + 0.5) / spikes) * (W0 - 1))
    const gy = bandY + Math.floor(bandH / 2)
    b.set(gx, gy, 'redHot')
    b.set(gx + 1, gy, 'crimson')
    b.set(gx, gy - 1, 'redGlow')
  }
  // brilho na borda do aro
  b.set(ox + 2, bandY + 1, 'white')
  // contorno seletivo: escuro só embaixo/direita
  const src = b.d.slice()
  for (let y = 0; y < b.h; y++)
    for (let x = 0; x < b.w; x++) {
      if (src[y * b.w + x]) continue
      const up = src[(y - 1) * b.w + x]
      const left = src[y * b.w + x - 1]
      if ((y > 0 && up) || (x > 0 && left)) b.set(x, y, 'gold0')
    }
  haloAround(b, 'gold1', 'gold0', 0.55)
  return b.canvas()
}

/** Gaivota clara (iluminada pela lua), 3 quadros de batida a 8 fps. */
export const BIRD = [
  ['k...k', '.k.k.', '..k..'],
  ['.....', 'kk.kk', '..k..'],
  ['.....', '..k..', 'kk.kk'],
]
export function drawBird(g: CanvasRenderingContext2D, x: number, y: number, f: number, k: K = 'stone3') {
  const fr = BIRD[f % BIRD.length] ?? BIRD[0] ?? []
  g.fillStyle = HEX[k]
  fr.forEach((row, yy) => {
    for (let xx = 0; xx < row.length; xx++) if (row[xx] === 'k') g.fillRect(x + xx - 2, y + yy - 1, 1, 1)
  })
  g.fillStyle = HEX.stoneHi
  g.fillRect(x, y + (f === 2 ? 0 : 1), 1, 1)
}

/**
 * Brilho de 4 pontas, ciclo de 6 quadros (regra 26):
 * ponto → + 3×3 → estrela 5×5 → estrela 7×7 com pontas douradas → 3×3 → some.
 */
export function drawSparkle(g: CanvasRenderingContext2D, x: number, y: number, frame: number) {
  x = Math.round(x)
  y = Math.round(y)
  const p = (dx: number, dy: number, k: K) => {
    g.fillStyle = HEX[k]
    g.fillRect(x + dx, y + dy, 1, 1)
  }
  const arms = (n: number, k: K) => {
    p(-n, 0, k)
    p(n, 0, k)
    p(0, -n, k)
    p(0, n, k)
  }
  switch (frame) {
    case 0:
      p(0, 0, 'sparkle')
      break
    case 1:
    case 4:
      arms(1, 'goldHi')
      p(0, 0, 'white')
      break
    case 2:
      arms(1, 'sparkle')
      arms(2, 'goldHi')
      p(0, 0, 'white')
      break
    case 3:
      arms(1, 'sparkle')
      arms(2, 'goldHi')
      arms(3, 'gold')
      p(0, 0, 'white')
      break
    default:
      break
  }
}
