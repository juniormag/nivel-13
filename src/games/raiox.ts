// Fase 10 · Raio-X: as malas passam pelo scanner; segure só as que trazem joias.
// Dentro da janela do scanner a mala vira raio-X (azul da paleta, linhas de varredura); joia aparece
// como objeto denso e brilhante. Mala retida sobe com squash, carimbo "RETIDA" e hit-stop.
import { Container, Graphics, Sprite, type Text } from 'pixi.js'
import type { GameCtx, MicroGame } from '../engine/types'
import {
  bake,
  block,
  clamp01,
  css,
  Debris,
  Embers,
  easeOutQuad,
  energyDot,
  label,
  P,
  ptex,
  ramp,
  Sparkles,
  squashTo,
  stop,
  Timers,
} from './kit-b'

interface Bag {
  x: number
  items: string[]
  jewel: boolean
  /** -1 na esteira; >0 retida (tempo); -2 saiu */
  seized: number
  checked: number
  w: number
  body: Sprite
  xray: Container
  stamp: Container | null
  alarmed: boolean
}

const CLEAN = ['camisa', 'livro', 'camera', 'sapato']
const BAG_W = 30
const BAG_H = 22
const DUR = 30

// cores das malas: [base, sombra, luz]
const BAGS: [number, number, number][] = [
  [P.crimsonDeep, P.blood1, P.crimson],
  [P.blue0, P.night, P.blue1],
  [P.haze, P.hazeDark, P.stone1],
  [P.gold1, P.gold0, P.gold],
  [P.vine1, P.vine0, P.green],
]

function bagTex(i: number) {
  const [base, dark, hi] = BAGS[i] ?? BAGS[0] ?? [P.haze, P.hazeDark, P.stone1]
  return bake(`bag${i}`, BAG_W, BAG_H, (p) => {
    // alça
    p.rect(11, 0, 8, 2, P.stone0)
    p.rect(11, 0, 2, 4, P.stone0)
    p.rect(17, 0, 2, 4, P.stone0)
    p.rect(12, 0, 6, 1, P.stone2)
    // corpo
    p.rect(1, 4, BAG_W - 2, BAG_H - 5, base)
    p.rect(1, 4, BAG_W - 2, 1, hi)
    p.rect(1, 4, 1, BAG_H - 6, hi)
    p.rect(1, BAG_H - 3, BAG_W - 2, 2, dark)
    p.rect(BAG_W - 3, 5, 2, BAG_H - 7, dark)
    // tiras e cantoneiras
    p.rect(8, 4, 2, BAG_H - 5, dark)
    p.rect(BAG_W - 10, 4, 2, BAG_H - 5, dark)
    p.dot(8, 5, hi)
    p.dot(BAG_W - 10, 5, hi)
    for (const [x, y] of [
      [1, 4],
      [BAG_W - 4, 4],
      [1, BAG_H - 4],
      [BAG_W - 4, BAG_H - 4],
    ] as const) {
      p.rect(x, y, 3, 3, P.stone2)
      p.dot(x, y, P.stone3)
    }
    // etiqueta
    if (i % 2 === 0) {
      p.rect(12, 9, 5, 4, P.stoneHi)
      p.rect(12, 12, 5, 1, P.stone3)
    }
    p.outline(P.void, P.stone0)
  })
}

function xrayBagTex() {
  return bake('bagxray', BAG_W, BAG_H, (p) => {
    p.rect(11, 0, 8, 2, P.blue1)
    p.rect(11, 0, 2, 4, P.blue1)
    p.rect(17, 0, 2, 4, P.blue1)
    p.rect(1, 4, BAG_W - 2, BAG_H - 5, P.blue0)
    // linhas de varredura (CRT): uma linha escura sim, outra não
    for (let y = 5; y < BAG_H - 1; y += 2) p.rect(2, y, BAG_W - 4, 1, P.night)
    // estrutura metálica da mala (densa) em azul claro
    p.rect(1, 4, BAG_W - 2, 1, P.blue1)
    p.rect(1, BAG_H - 2, BAG_W - 2, 1, P.blue1)
    p.rect(1, 4, 1, BAG_H - 5, P.blue1)
    p.rect(BAG_W - 2, 4, 1, BAG_H - 5, P.blue1)
    p.rect(8, 5, 1, BAG_H - 7, P.blue0)
    p.outline(P.night)
  })
}

const XR_CLEAN: Record<string, string> = {}
const XR_JEWEL: Record<string, string> = {}
for (const ch of 'kwgGDrRpyYobBeEuUcsSx') {
  XR_CLEAN[ch] = ch === 'k' ? css(P.blue1) : css(P.blue0)
  XR_JEWEL[ch] = ch === 'w' || ch === 'c' ? css(P.white) : css(P.sparkle)
}
const JEWEL_REAL = { k: css(P.gold1), c: css(P.sparkle), w: css(P.white), x: css(P.gold) }

export default function raiox(): MicroGame {
  let c: GameCtx
  const root = new Container()
  const bagLayer = new Container()
  const xrayLayer = new Container()
  const fxLayer = new Container()
  const mask = new Graphics()
  const scanner = new Graphics()
  const beam = new Graphics()
  const glow = new Graphics()
  const belt = new Graphics()
  const curtains = new Graphics()
  const timers = new Timers()
  const debris = new Debris(40)
  let embers: Embers
  let sparkles: Sparkles
  let rayLabel: Text
  let bags: Bag[] = []
  let spawn = 0.4
  let beltY = 0
  let sx0 = 0
  let sx1 = 0
  let top = 0
  let speed = 28
  let beltOff = 0
  let revealAll = 0
  let jewelsIn = 0
  let pops: { s: Sprite; t: number; x: number; y: number }[] = []

  function makeBag(): Bag {
    const jewel = c.rnd() < 0.34
    const items = [CLEAN[Math.floor(c.rnd() * 4)] ?? 'camisa', CLEAN[Math.floor(c.rnd() * 4)] ?? 'livro']
    if (jewel) items[Math.floor(c.rnd() * 2)] = c.rnd() < 0.5 ? 'joia' : 'colar'
    const body = new Sprite(bagTex(Math.floor(c.rnd() * BAGS.length)))
    const xray = new Container()
    xray.addChild(new Sprite(xrayBagTex()))
    items.forEach((it, i) => {
      const isJ = it === 'joia' || it === 'colar'
      const s = new Sprite(ptex(it, isJ ? XR_JEWEL : XR_CLEAN))
      s.x = 4 + i * 13
      s.y = 7
      xray.addChild(s)
    })
    bagLayer.addChild(body)
    xrayLayer.addChild(xray)
    return {
      x: -BAG_W - 4,
      items,
      jewel,
      seized: -1,
      checked: -10,
      w: BAG_W,
      body,
      xray,
      stamp: null,
      alarmed: false,
    }
  }

  function stamp(text: string, color: number) {
    const s = new Container()
    const t = label(text, color, 8, P.void)
    const w = Math.ceil(t.width) + 6
    const g = new Graphics()
    g.rect(-Math.floor(w / 2) - 1, -7, w + 2, 13).fill(P.void)
    g.rect(-Math.floor(w / 2), -6, w, 11).stroke({ color, width: 1, alignment: 1 })
    s.addChild(g, t)
    fxLayer.addChild(s)
    return s
  }

  function seize(b: Bag) {
    if (b.seized !== -1) return
    const cx = Math.round(b.x + b.w / 2)
    const y = beltY - BAG_H
    if (b.jewel) {
      b.seized = c.time
      c.addScore(70, cx, y - 14)
      c.sfx('coin')
      // carimbo bate 80 ms depois do toque (antecipação), com hit-stop no contato
      timers.after(0.08, () => {
        b.stamp = stamp('RETIDA', P.red)
        b.stamp.scale.set(2)
        stop(c, 100)
        c.fx.shake(2, 140)
        c.fx.ring(cx, y + 8, P.goldHi, 28)
        c.fx.burst(cx, y + 6, P.sparkle, 12, 60)
        sparkles.spawn(cx - 12, y - 2, 10)
        sparkles.spawn(cx + 13, y + 4, 0)
        embers.blast(cx, y, 140, 60)
        c.sfx('boom')
        const pop = new Sprite(ptex(b.items.includes('joia') ? 'joia' : 'colar', JEWEL_REAL))
        fxLayer.addChild(pop)
        pops.push({ s: pop, t: c.time, x: cx, y: y - 4 })
      })
    } else {
      b.checked = c.time
      c.addScore(-30, cx, y - 10)
      c.sfx('bad')
      c.fx.shake(2, 120)
      c.fx.burst(cx, y + 6, P.redHot, 6, 40)
      b.stamp = stamp('LIMPA', P.green)
      timers.after(0.6, () => {
        b.stamp?.destroy({ children: true })
        b.stamp = null
      })
    }
  }

  function pickAt(x: number, y: number) {
    let best: Bag | null = null
    let bd = 1e9
    for (const b of bags) {
      if (b.seized !== -1 || c.time - b.checked < 0.6) continue
      if (x < b.x - 6 || x > b.x + b.w + 6) continue
      if (y < top - 12 || y > beltY + 16) continue
      const d = Math.abs(x - (b.x + b.w / 2))
      if (d < bd) {
        bd = d
        best = b
      }
    }
    return best
  }

  function drawScanner() {
    const g = scanner
    g.clear()
    const h = beltY - top
    // capô e colunas em pedra/metal, luz vindo da esquerda e rim vermelho à direita
    g.rect(sx0 - 6, top - 10, sx1 - sx0 + 12, 10).fill(P.stone1)
    g.rect(sx0 - 6, top - 10, sx1 - sx0 + 12, 1).fill(P.stone3)
    g.rect(sx0 - 6, top - 2, sx1 - sx0 + 12, 2).fill(P.stone0)
    g.rect(sx0 - 6, top - 10, 1, 10).fill(P.stone2)
    g.rect(sx1 + 5, top - 10, 1, 10).fill(P.redHot)
    g.rect(sx0 - 6, top, 5, h).fill(P.stone1)
    g.rect(sx0 - 6, top, 1, h).fill(P.stone2)
    g.rect(sx0 - 2, top, 1, h).fill(P.stone0)
    g.rect(sx1 + 1, top, 5, h).fill(P.stone1)
    g.rect(sx1 + 1, top, 1, h).fill(P.stone0)
    g.rect(sx1 + 5, top, 1, h).fill(P.redHot)
    // contorno
    g.rect(sx0 - 7, top - 11, sx1 - sx0 + 14, 1).fill(P.void)
    g.rect(sx0 - 7, top - 11, 1, h + 11).fill(P.void)
    g.rect(sx1 + 6, top - 11, 1, h + 11).fill(P.void)
    // janela escura do monitor
    g.rect(sx0 - 1, top, sx1 - sx0 + 2, h).fill({ color: P.night, alpha: 0.55 })
    // lâmpada de alarme no capô
    const on = jewelsIn > 0 && Math.floor(c.time * 8) % 2 === 0
    const lx = sx1 - 3
    g.rect(lx - 2, top - 15, 5, 4).fill(P.void)
    g.rect(lx - 1, top - 14, 3, 3).fill(on ? P.redHot : P.blood1)
    if (on) g.rect(lx - 1, top - 14, 1, 1).fill(P.white)
  }

  function drawBelt() {
    const g = belt
    g.clear()
    g.rect(0, beltY, c.W, 7).fill(P.stone0)
    g.rect(0, beltY, c.W, 1).fill(P.stone2)
    const off = Math.floor(beltOff % 6)
    for (let x = off - 6; x < c.W; x += 6) g.rect(x, beltY + 2, 3, 1).fill(P.stone1)
    g.rect(0, beltY + 6, c.W, 1).fill(P.void)
    // roletes girando em 2 quadros
    const ph = Math.floor(beltOff / 3) % 2
    for (let x = 4; x < c.W; x += 12) {
      g.rect(x, beltY + 7, 5, 4).fill(P.void)
      g.rect(x + 1, beltY + 7, 3, 3).fill(P.stone1)
      g.rect(x + 1 + ph * 2, beltY + 8, 1, 1).fill(P.stone3)
    }
    // pés e sombra no chão (profundidade)
    for (let x = 10; x < c.W; x += 46) g.rect(x, beltY + 11, 2, 10).fill(P.stone0)
    g.rect(0, beltY + 21, c.W, 1).fill({ color: P.void, alpha: 0.7 })
    // sombras das malas
    for (const b of bags) {
      if (b.seized > 0) continue
      g.rect(Math.round(b.x) + 1, beltY, b.w - 2, 1).fill(P.void)
    }
  }

  function drawCurtains() {
    const g = curtains
    g.clear()
    const h = beltY - top
    for (const ex of [sx0 - 1, sx1 - 2]) {
      for (let k = 0; k < 3; k++) {
        const x = ex + k
        // tira empurrada quando há mala embaixo
        let cut = h
        for (const b of bags)
          if (b.seized === -1 && x >= b.x && x < b.x + b.w) cut = Math.min(cut, h - BAG_H - 2)
        g.rect(x, top, 1, cut).fill(k % 2 ? P.stone0 : P.haze)
        if (cut < h) g.rect(x, top + cut, 1, 1).fill(P.stone2)
      }
    }
  }

  return {
    duration: DUR,
    goal: 650,
    init(ctx) {
      c = ctx
      c.stage.addChild(root)
      beltY = Math.round(c.top + (c.bottom - c.top) * 0.58)
      const sw = Math.round(Math.min(90, c.W * 0.4))
      sx0 = Math.round(c.W / 2 - sw / 2)
      sx1 = sx0 + sw
      top = beltY - BAG_H - 14
      mask.rect(sx0, top, sx1 - sx0, beltY - top).fill(0xffffff)
      xrayLayer.mask = mask
      beam.blendMode = 'add'
      glow.blendMode = 'add'
      rayLabel = label('RAIO-X', P.blue1)
      rayLabel.x = Math.round(c.W / 2) - 4
      rayLabel.y = top - 6
      embers = new Embers(
        c,
        { x0: 0, y0: c.top, x1: c.W, y1: beltY },
        { ambient: 14, ramp: [P.white, P.sparkle, P.blue1, P.blue0] },
      ).listen()
      sparkles = new Sparkles(c.reduced)
      // pista do toque: faixa escura sob a área de toque
      const lane = block(P.void, c.W, 1, 0.5)
      lane.y = beltY + 22
      root.addChild(
        belt,
        lane,
        scanner,
        bagLayer,
        xrayLayer,
        mask,
        beam,
        curtains,
        glow,
        rayLabel,
        debris.root,
        fxLayer,
        embers.root,
        sparkles.root,
      )
    },
    update(dt) {
      timers.update(dt)
      const k = ramp(c.time, DUR)
      speed = 26 + 30 * k
      beltOff += speed * dt
      revealAll = Math.max(0, revealAll - dt)
      spawn -= dt
      if (spawn <= 0) {
        const last = bags[bags.length - 1]
        if (!last || last.x > 6 || last.seized !== -1) {
          spawn = (0.95 + c.rnd() * 0.9) * (1 - 0.42 * k)
          bags.push(makeBag())
        }
      }
      jewelsIn = 0
      for (const b of bags) {
        if (b.seized === -1) {
          b.x += speed * dt
          const inScan = b.x + b.w > sx0 && b.x < sx1
          if (inScan && b.jewel) {
            jewelsIn++
            if (!b.alarmed) {
              b.alarmed = true
              c.sfx('tick')
            }
          }
          if (b.x > c.W + 2) {
            b.seized = -2
            if (b.jewel) {
              c.fx.burst(c.W - 4, beltY - 10, P.redHot, 10, 50)
              c.hit(c.W - 6, beltY - 10)
            }
          }
        }
        const bx = Math.round(b.x)
        // erro: a mala limpa dá um pulinho de 4 px e volta
        const hop =
          c.time - b.checked < 0.3 ? -Math.round(Math.sin(((c.time - b.checked) / 0.3) * Math.PI) * 4) : 0
        if (b.seized > 0) {
          const t = c.time - b.seized
          const lift = easeOutQuad(clamp01(t / 0.55)) * 46
          // estica ao sair da esteira (scaleY 1.15 / scaleX 0.87) e volta
          const st = t < 0.08 ? 1 : t < 0.2 ? 1 - (t - 0.08) / 0.12 : 0
          squashTo(b.body, bx + b.w / 2, beltY - lift, BAG_W, BAG_H, 1 - 0.13 * st, 1 + 0.15 * st)
          b.body.alpha = clamp01((0.95 - t) / 0.3)
          b.xray.visible = false
          if (b.stamp) {
            b.stamp.x = bx + b.w / 2
            b.stamp.y = Math.round(beltY - lift - BAG_H / 2)
            if (t > 0.16) b.stamp.scale.set(1)
            b.stamp.alpha = b.body.alpha
          }
        } else {
          b.body.x = bx
          b.body.y = beltY - BAG_H + hop
          b.xray.x = bx
          b.xray.y = beltY - BAG_H + hop
          if (b.stamp) {
            b.stamp.x = bx + b.w / 2
            b.stamp.y = beltY - BAG_H - 8
          }
        }
      }
      const gone = bags.filter((b) => b.seized === -2 || (b.seized > 0 && c.time - b.seized > 1))
      for (const b of gone) {
        b.body.destroy()
        b.xray.destroy({ children: true })
        b.stamp?.destroy({ children: true })
      }
      if (gone.length) bags = bags.filter((b) => !gone.includes(b))

      // joia saltando da mala retida
      for (const p of pops) {
        const t = c.time - p.t
        p.s.x = Math.round(p.x - p.s.width / 2)
        p.s.y = Math.round(p.y - 30 * easeOutQuad(clamp01(t / 0.5)))
        p.s.alpha = clamp01((1.1 - t) / 0.3)
        if (Math.floor(t * 10) !== Math.floor((t - dt) * 10) && t < 0.8)
          sparkles.spawn(p.x + (c.rnd() - 0.5) * 12, p.s.y + c.rnd() * 6, 0)
      }
      const old = pops.filter((p) => c.time - p.t > 1.1)
      for (const p of old) p.s.destroy()
      if (old.length) pops = pops.filter((p) => !old.includes(p))

      // máscara: só a janela do scanner, ou a tela toda com a dica
      mask.clear()
      if (revealAll > 0) mask.rect(0, top - 40, c.W, beltY - top + 40).fill(0xffffff)
      else mask.rect(sx0, top, sx1 - sx0, beltY - top).fill(0xffffff)

      // feixe de varredura: núcleo claro, halo azul, pontilhado
      beam.clear()
      const h = beltY - top
      const by = top + Math.floor((c.time * 34) % h)
      beam.rect(sx0, by, sx1 - sx0, 1).fill({ color: P.sparkle, alpha: 0.7 })
      beam.rect(sx0, by - 1, sx1 - sx0, 1).fill({ color: P.blue1, alpha: 0.5 })
      beam.rect(sx0, by + 1, sx1 - sx0, 1).fill({ color: P.blue1, alpha: 0.5 })
      for (let x = sx0 + (by % 2); x < sx1; x += 2) {
        beam.rect(x, by - 2, 1, 1).fill({ color: P.blue1, alpha: 0.35 })
        beam.rect(x, by + 2, 1, 1).fill({ color: P.blue1, alpha: 0.35 })
      }
      // cintilação da janela
      beam.rect(sx0, top, sx1 - sx0, h).fill({ color: P.blue0, alpha: 0.18 + Math.sin(c.time * 6) * 0.04 })

      // alarme: halo vermelho no capô quando há joia dentro
      glow.clear()
      if (jewelsIn > 0) {
        const pulse = Math.floor(c.time * 8) % 2 === 0
        if (pulse) {
          energyDot(glow, sx1 - 2, top - 13, P.white, P.redHot, P.crimson)
          glow.rect(sx0, top, sx1 - sx0, 1).fill({ color: P.redHot, alpha: 0.6 })
        }
      }
      // brilho de joia dentro do raio-X
      if (!c.reduced)
        for (const b of bags)
          if (
            b.jewel &&
            b.seized === -1 &&
            (revealAll > 0 || (b.x + b.w > sx0 && b.x < sx1)) &&
            c.rnd() < dt * 3
          ) {
            const i = b.items.findIndex((it) => it === 'joia' || it === 'colar')
            sparkles.spawn(
              Math.round(b.x + 9 + i * 13 + (c.rnd() - 0.5) * 6),
              beltY - BAG_H + 8 + Math.round(c.rnd() * 6),
              0,
            )
          }
      drawScanner()
      drawBelt()
      drawCurtains()
      embers.update(dt, c.time)
      sparkles.update(dt)
      debris.update(dt)
    },
    down(x, y) {
      const b = pickAt(x, y)
      if (b) seize(b)
      else {
        c.sfx('tap')
        c.fx.ring(x, y, P.stone2, 6)
      }
    },
    key(k, down) {
      if (!down) return
      if (k !== ' ' && k !== 'Enter' && k !== 'ArrowDown' && k !== 'f' && k !== 'j') return
      const mid = (sx0 + sx1) / 2
      let best: Bag | null = null
      let bd = 1e9
      for (const b of bags) {
        if (b.seized !== -1 || c.time - b.checked < 0.6) continue
        if (b.x + b.w < sx0 - 4 || b.x > sx1 + 4) continue
        const d = Math.abs(b.x + b.w / 2 - mid)
        if (d < bd) {
          bd = d
          best = b
        }
      }
      if (best) seize(best)
      else c.sfx('tap')
    },
    hint() {
      revealAll = 4
      return true
    },
    clear() {
      const js = bags.filter((b) => b.seized === -1 && b.jewel && b.x > -20)
      if (!js.length) return false
      for (const b of js) seize(b)
      return true
    },
    timeUp() {
      return true
    },
    dispose() {
      timers.clear()
      embers?.destroy()
      root.destroy({ children: true })
      bags = []
      pops = []
    },
  }
}
