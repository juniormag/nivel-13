// Fase 10 · Raio-X: as malas passam pelo scanner; segure só as que trazem joias.
// Dentro da janela do scanner a mala vira raio-X (azul da paleta, linhas de varredura); joia aparece
// como objeto denso e brilhante. Mala retida sobe com squash, carimbo "RETIDA" e hit-stop.
// Feel (números), curva ramp() de kit-b (10 s fáceis, pico aos 70%): esteira 26 → 56 px/s; intervalo entre malas
// (0,95..1,85 s) × (1 − 0,42 × k); 34% com joia. Toque: ±6 px na horizontal e toda a altura do scanner.
// Retida: carimbo 80 ms depois (antecipação), hit-stop 100 ms, tremor vertical, mala sobe 46 px em 550 ms com
// stretch 0,87 × 1,15; joia voa ao painel em 380 ms. Sequência de joias: +5 por passo (até +30). Mala limpa: −30.
import { Container, Graphics, Sprite, type Text } from 'pixi.js'
import type { GameCtx, MicroGame } from '../engine/types'
import {
  bake,
  block,
  clamp01,
  css,
  Debris,
  Embers,
  easeInQuad,
  easeOutQuad,
  energyDot,
  joy,
  label,
  P,
  ptex,
  ramp,
  ScorePops,
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
  let scores: ScorePops
  /** joias retidas em sequência (bônus de +5 por passo, até +30) */
  let streak = 0
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
  let pops: { s: Sprite; t: number; x: number; y: number; slot: number }[] = []
  // painel "RETIDAS" no alto: cada joia retida voa até um espaço do painel
  const monitor = new Graphics()
  let monLabel: Text
  let monX = 0
  let monY = 0
  let monW = 0
  let SLOTS = 9
  let filled = 0
  let reserved = 0
  let slotPop = -10
  const slotPos = (i: number) => ({ x: monX + 50 + (i % SLOTS) * 7, y: monY + 8 })

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
      streak++
      scores.score(70 + Math.min(30, (streak - 1) * 5), cx, y - 14, streak, embers)
      c.sfx('coin', { x: cx, combo: streak })
      // carimbo bate 80 ms depois do toque (antecipação), com hit-stop no contato
      timers.after(0.08, () => {
        b.stamp = stamp('RETIDA', P.red)
        b.stamp.scale.set(2)
        stop(c, 100)
        joy(c, 2, 140)
        c.fx.ring(cx, y + 8, P.goldHi, 28)
        c.fx.burst(cx, y + 6, P.sparkle, 12, 60)
        sparkles.spawn(cx - 12, y - 2, 10)
        sparkles.spawn(cx + 13, y + 4, 0)
        embers.blast(cx, y, 140, 60)
        c.sfx('stamp', { x: cx })
        const pop = new Sprite(ptex(b.items.includes('joia') ? 'joia' : 'colar', JEWEL_REAL))
        fxLayer.addChild(pop)
        pops.push({ s: pop, t: c.time, x: cx, y: y - 4, slot: reserved++ })
      })
    } else {
      b.checked = c.time
      streak = 0
      c.addScore(-30, cx, top - 18)
      c.sfx('error', { x: cx })
      c.fx.shake(2, 120)
      c.fx.burst(cx, y + 6, P.redHot, 6, 40)
      b.stamp = stamp('LIMPA', P.green)
      b.stamp.y = beltY - BAG_H / 2
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

  function drawMonitor() {
    const g = monitor
    g.clear()
    // cabos até o teto
    g.rect(monX + 8, c.top - 4, 1, monY - c.top + 4).fill(P.stone0)
    g.rect(monX + monW - 9, c.top - 4, 1, monY - c.top + 4).fill(P.stone0)
    // moldura com bisel: claro em cima/esquerda, escuro embaixo/direita
    g.rect(monX - 1, monY - 1, monW + 2, 18).fill(P.void)
    g.rect(monX, monY, monW, 16).fill(P.stone1)
    g.rect(monX, monY, monW, 1).fill(P.stone3)
    g.rect(monX, monY, 1, 16).fill(P.stone2)
    g.rect(monX + 1, monY + 15, monW - 1, 1).fill(P.stone0)
    g.rect(monX + 2, monY + 2, monW - 4, 12).fill(P.blue0)
    for (let y = monY + 3; y < monY + 14; y += 2) g.rect(monX + 2, y, monW - 4, 1).fill(P.night)
    for (let i = 0; i < SLOTS; i++) {
      const p = slotPos(i)
      const on = i < filled
      const fresh = on && i === filled - 1 && c.time - slotPop < 0.07
      if (on) {
        // gema lapidada: coroa dourada, corpo claro e ponta
        const body = fresh ? P.white : P.sparkle
        g.rect(p.x - 1, p.y - 3, 3, 1).fill(P.goldHi)
        g.rect(p.x - 2, p.y - 2, 5, 1).fill(body)
        g.rect(p.x - 1, p.y - 1, 3, 1).fill(body)
        g.rect(p.x, p.y, 1, 1).fill(body)
        g.rect(p.x - 1, p.y - 2, 1, 1).fill(P.white)
        g.rect(p.x + 2, p.y - 2, 1, 1).fill(P.blue1)
      } else g.rect(p.x - 1, p.y - 1, 3, 3).fill(P.blue1)
    }
    if (filled > SLOTS) {
      monLabel.text = `RETIDAS +${filled - SLOTS}`
    }
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
      monW = Math.min(124, c.W - 12)
      SLOTS = Math.floor((monW - 54) / 7)
      monX = Math.round(c.W / 2 - monW / 2)
      monY = Math.max(c.top + 10, top - 48)
      monLabel = label('RETIDAS', P.blue1)
      monLabel.anchor.set(0, 0.5)
      monLabel.x = monX + 5
      monLabel.y = monY + 8
      embers = new Embers(
        c,
        { x0: 0, y0: c.top, x1: c.W, y1: beltY },
        { ambient: 14, ramp: [P.white, P.sparkle, P.blue1, P.blue0] },
      ).listen()
      sparkles = new Sparkles(c.reduced)
      scores = new ScorePops(c)
      // pista do toque: faixa escura sob a área de toque
      const lane = block(P.void, c.W, 1, 0.5)
      lane.y = beltY + 22
      root.addChild(
        monitor,
        monLabel,
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
        scores.root,
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
              c.sfx('tick', { x: sx1 })
            }
          }
          if (b.x > c.W + 2) {
            b.seized = -2
            if (b.jewel) {
              c.fx.burst(c.W - 4, beltY - 10, P.redHot, 10, 50)
              streak = 0
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
            b.stamp.y = beltY - Math.round(BAG_H / 2) + 1
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
      // sobe 12 px, segura um instante e voa em arco até o painel
      for (const p of pops) {
        const t = c.time - p.t
        const sp = slotPos(p.slot)
        let x = p.x
        let y = p.y - 12 * easeOutQuad(clamp01(t / 0.18))
        if (t > 0.28) {
          const k = easeInQuad(clamp01((t - 0.28) / 0.38))
          x = p.x + (sp.x - p.x) * k
          y = p.y - 12 + (sp.y - p.y + 12) * k - Math.sin(k * Math.PI) * 18
        }
        p.s.x = Math.round(x - p.s.width / 2)
        p.s.y = Math.round(y - p.s.height / 2)
        if (Math.floor(t * 12) !== Math.floor((t - dt) * 12) && t < 0.66) embers.spark(x, y, 6)
      }
      const old = pops.filter((p) => c.time - p.t > 0.66)
      for (const p of old) {
        const sp = slotPos(p.slot)
        filled++
        slotPop = c.time
        sparkles.spawn(sp.x, sp.y, 6)
        c.fx.burst(sp.x, sp.y, P.sparkle, 6, 30)
        p.s.destroy()
      }
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
      drawMonitor()
      drawBelt()
      drawCurtains()
      embers.update(dt, c.time)
      sparkles.update(dt)
      scores.update(dt)
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
