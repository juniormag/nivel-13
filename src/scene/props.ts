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

/**
 * Coroa dourada em três quartos (como na referência): aro curvo visto um pouco de baixo, boca elíptica
 * escura com brilho vermelho por dentro, 5 pontas com bolinha (a do meio mais alta) e gemas no aro.
 * `sq` achata (squash) mantendo a área.
 */
export function crown(w: number, sq = 1) {
  const W0 = Math.max(15, Math.round(w / Math.sqrt(sq)))
  const H0 = Math.max(11, Math.round(w * 0.64 * sq))
  const pad = 3
  const b = new Buf(W0 + pad * 2, H0 + pad * 2)
  const cx = pad + (W0 - 1) / 2
  const rx = (W0 - 1) / 2
  const ry = Math.max(2, Math.round(W0 * 0.13 * sq))
  const bandH = Math.max(3, Math.round(H0 * 0.26))
  const cy = pad + H0 - 1 - ry
  // borda de baixo do aro: metade da frente da elipse
  const front = (x: number) => cy + ry * Math.sqrt(Math.max(0, 1 - ((x - cx) / rx) ** 2))
  // boca da coroa (vista de baixo): anel dourado e miolo escuro com reflexo vermelho
  for (let y = 0; y < b.h; y++)
    for (let x = 0; x < b.w; x++) {
      const e = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2
      if (e > 1) continue
      const ei = ((x - cx) / (rx - 2)) ** 2 + ((y - cy) / Math.max(1, ry - 1.2)) ** 2
      if (ei <= 1) b.set(x, y, y > cy + ry * 0.2 ? 'crimson' : (x + y) % 3 === 0 ? 'blood1' : 'gold0')
      else b.set(x, y, y < cy ? 'gold1' : x < cx ? 'goldHi' : 'gold')
    }
  // aro curvo
  for (let x = 0; x < W0; x++) {
    const X = pad + x
    const yb = Math.round(front(X) - ry * 0.55)
    const u = x / (W0 - 1)
    for (let k = 0; k < bandH; k++) {
      const y = yb - k
      let c: K = u < 0.28 ? 'goldHi' : u > 0.72 ? 'gold1' : 'gold'
      if (k === 0) c = 'gold1'
      if (k === bandH - 1) c = 'goldHi'
      if (k === 1 && u > 0.1 && u < 0.9) c = 'gold0'
      b.set(X, y, c)
    }
  }
  // pontas
  const spikes = 5
  const topOf = (X: number) => Math.round(front(X) - ry * 0.55) - bandH + 1
  for (let s = 0; s < spikes; s++) {
    const u = (s + 0.5) / spikes
    const X = Math.round(pad + u * (W0 - 1))
    const tall = s === 2 ? 1 : s === 1 || s === 3 ? 0.84 : 0.7
    const base = topOf(X)
    const sh = Math.round((base - pad - 2) * tall)
    const half0 = Math.max(2, Math.round(W0 / spikes / 2) - (s === 0 || s === 4 ? 1 : 0))
    for (let y = 0; y < sh; y++) {
      const t = 1 - y / sh
      const half = Math.max(0, Math.round(half0 * t))
      for (let x = -half; x <= half; x++) {
        const c: K = x < 0 ? (s < 2 ? 'goldHi' : 'gold') : x === 0 ? 'gold' : s > 2 ? 'gold1' : 'gold'
        b.set(X + x, base - y, x === -half && half > 0 ? 'goldHi' : c)
      }
    }
    // bolinha na ponta
    const ty = base - sh
    b.set(X, ty, 'sparkle')
    b.set(X - 1, ty, 'goldHi')
    b.set(X + 1, ty, 'gold1')
    b.set(X, ty - 1, 'goldHi')
    b.set(X, ty + 1, 'gold')
  }
  // gemas no aro (a do meio maior)
  for (let s = 0; s < 3; s++) {
    const X = Math.round(pad + ((s + 0.5) / 3) * (W0 - 1))
    const Y = Math.round(front(X) - ry * 0.55) - Math.floor(bandH / 2)
    b.set(X, Y, 'redHot')
    b.set(X + 1, Y, 'crimson')
    b.set(X, Y - 1, 'redGlow')
    if (s === 1) {
      b.set(X - 1, Y, 'red')
      b.set(X, Y + 1, 'crimson')
    }
  }
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
export function drawSparkle(g: CanvasRenderingContext2D, x: number, y: number, frame: number, k = 1) {
  x = Math.round(x)
  y = Math.round(y)
  const p = (dx: number, dy: number, c: K) => {
    g.fillStyle = HEX[c]
    g.fillRect(x + dx, y + dy, 1, 1)
  }
  // braço de 1 px: núcleo → ponta, `k` estica sem engrossar
  const arm = (len: number, cols: K[]) => {
    for (let i = 1; i <= len * k; i++) {
      const c = cols[Math.min(cols.length - 1, Math.floor(((i - 1) / (len * k)) * cols.length))] ?? 'gold'
      p(-i, 0, c)
      p(i, 0, c)
      p(0, -i, c)
      p(0, i, c)
    }
  }
  switch (frame) {
    case 0:
      p(0, 0, 'sparkle')
      break
    case 1:
    case 4:
      arm(1, ['goldHi'])
      p(0, 0, 'white')
      break
    case 2:
      arm(2, ['sparkle', 'goldHi'])
      p(0, 0, 'white')
      break
    case 3:
      arm(3, ['sparkle', 'goldHi', 'gold'])
      if (k > 1) {
        p(-1, -1, 'goldHi')
        p(1, -1, 'goldHi')
        p(-1, 1, 'goldHi')
        p(1, 1, 'goldHi')
      }
      p(0, 0, 'white')
      break
    default:
      break
  }
}
