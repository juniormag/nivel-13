// Fase 7 · 8 de Janeiro: rasgue as minutas do golpe antes que alcancem a Praça dos Três Poderes.
// Prédios procedurais (pedra com rim light) que racham em estágios, minutas que tremulam em 6 quadros,
// aviso no topo antes de cada minuta entrar e mira no prédio-alvo quando ela chega perto.
import { Container, Graphics, type Sprite, type Texture } from 'pixi.js'
import type { GameCtx, MicroGame } from '../engine/types'
import { mulberry32 } from '../lib/rng'
import { Flyers, finale, HandHint, HitFlash, LastFrame, showRight, solidTex } from './fx-b'
import {
  Booms,
  boomFrames,
  Combo,
  curve,
  ENERGY,
  FIRE,
  Field,
  frameAt,
  Grid,
  gridTex,
  lerp,
  P,
  PAPER,
  rowsTex,
  SMOKE,
  shade,
  shadowTex,
  spr,
  subTex,
  TapBuffer,
} from './kit-a'

/*
 * Números do feel: spawn 1,3 s → 0,45 s pela curva (10 s fáceis, pico em 21 s), velocidade
 * 22 → 38 px/s (+0–8), toque com raio 15 px e buffer de 100 ms, colisão só depois de 3 quadros
 * em contato (a minuta encosta, treme e só então explode), aviso 0,35 s antes de cada minuta entrar.
 */

type Kind = 'stf' | 'congresso' | 'planalto'

interface Minuta {
  x: number
  y: number
  tx: number
  ty: number
  sp: number
  ph: number
  target: number
  contact: number
  s: Sprite
}

interface Building {
  x: number
  w: number
  h: number
  kind: Kind
  dmg: number
  shudder: number
  s: Sprite
}

const STONE = [P.stone0, P.stone1, P.stone2, P.stone3, P.stoneHi]
const STONE_HURT = [P.stone0, P.stone1, P.stone1, P.stone2, P.stone3]

/** espessura da lateral em três quartos (px), proporcional ao prédio */
const sideOf = (w: number) => Math.max(3, Math.min(7, Math.round(w / 9)))

function buildingTex(kind: Kind, w: number, h: number, stage: number) {
  return gridTex(`defesa3q-${kind}${w}x${h}s${stage}`, () => {
    const D = sideOf(w)
    const W0 = w + 4
    const W = W0 + D
    const H = h + 12
    const m = new Grid(W, H)
    const base = H - 1
    if (kind === 'stf') {
      m.rect(1, base - h - 1, w + 2, 2, 2)
      m.rect(3, base - h + 1, w - 2, h - 3, 1)
      m.rect(1, base - 2, w + 2, 2, 2)
    } else if (kind === 'planalto') {
      m.rect(1, base - h - 1, w + 2, 2, 2)
      m.rect(4, base - h + 1, w - 4, h - 6, 3)
      m.rect(1, base - 5, w + 2, 2, 2)
      m.rect(5, base - 3, w - 6, 3, 1)
    } else {
      const cx = Math.round(W0 / 2)
      // cúpula convexa (Senado) à direita e côncava (Câmara) à esquerda, antes da laje
      const R = Math.max(5, Math.round(w * 0.12))
      const lx = Math.round(w * 0.2) + 2
      const rx = W0 - Math.round(w * 0.2) - 2
      m.ellipse(rx, base - 6, R * 0.85, R * 0.7, 4)
      const ry = Math.max(3, Math.round(R * 0.55))
      for (let i = 0; i <= ry; i++) {
        const half = Math.max(1, Math.round(R * Math.sqrt(1 - (i / (ry + 1)) ** 2)))
        m.rect(lx - half, base - 8 - ry + i, half * 2, 1, 3)
      }
      m.rect(lx - 1, base - 8, 2, 2, 3)
      m.rect(1, base - 6, w + 2, 6, 1)
      m.rect(cx - 5, base - h - 2, 4, h - 4, 2)
      m.rect(cx + 1, base - h - 2, 4, h - 4, 2)
      m.rect(cx - 1, base - Math.round(h * 0.55), 2, 2, 2)
    }
    const ramp = stage >= 2 ? STONE_HURT : STONE
    const g = shade(
      m,
      {
        1: { ramp, rim: P.redHot, grain: 0.1 + stage * 0.06 },
        2: { ramp, rim: P.redHot, grain: 0.06 },
        3: {
          ramp: kind === 'planalto' ? [P.void, P.night, P.dusk, P.hazeDark, P.haze] : ramp,
          rim: P.redHot,
        },
        4: { ramp, rim: P.redHot, grain: 0.05 },
      },
      kind.length,
    )
    // detalhes: colunas, janelas e o ornamento do STF
    if (kind === 'stf') {
      for (let x = 5; x < w; x += 4) for (let y = base - h + 2; y < base - 2; y++) g.set(x, y, P.stone2)
      g.rect(Math.round(W0 / 2) - 1, base - h - 4, 2, 3, P.gold)
      g.set(Math.round(W0 / 2) - 1, base - h - 4, P.goldHi)
    } else if (kind === 'planalto') {
      for (let x = 4; x < w + 1; x += 5)
        for (let y = base - h + 1; y < base - 5; y++) g.set(x + (y > base - 8 ? 1 : 0), y, P.stone3)
      for (let x = 6; x < w - 2; x += 3) if ((x * 7) % 5 < 2) g.set(x, base - h + 3, P.gold)
    } else {
      const cx = Math.round(W0 / 2)
      for (let y = base - h; y < base - 6; y += 3) {
        g.rect(cx - 4, y, 2, 1, P.stone2)
        g.rect(cx + 2, y, 2, 1, P.stone2)
      }
      for (let x = 3; x < w; x += 3) if (x < cx - 6 || x > cx + 6) g.set(x, base - 3, P.gold1)
    }
    // rachaduras por estágio: 2 / 4 / 7 linhas; no 2 cai um pedaço; no 3 brasa dentro das fendas
    const r = mulberry32(w * 7 + h)
    const n = [0, 2, 4, 7][Math.min(3, stage)] ?? 0
    for (let k = 0; k < n; k++) {
      let x = Math.round(3 + r() * (W0 - 6))
      let y = base - Math.round(r() * h)
      for (let i = 0; i < 4 + r() * 7; i++) {
        if (g.get(x, y, -1) !== -1) g.set(x, y, stage >= 3 && i % 3 === 1 ? P.ember : P.stone0)
        x += r() < 0.5 ? -1 : 1
        y += r() < 0.7 ? 1 : 0
      }
    }
    if (stage >= 2) {
      const left = r() < 0.5
      const x0 = left ? 1 : W0 - 6
      for (let y = 0; y < 4; y++)
        for (let x = 0; x < 5 - y; x++) {
          const px = left ? x0 + x : x0 + 4 - x
          const top = (() => {
            for (let yy = 0; yy < H; yy++) if (g.get(px, yy, -1) !== -1) return yy
            return H
          })()
          if (top < H) g.set(px, top, -1)
        }
    }
    // lateral em três quartos (lição da ref v2): granito vermelho pontilhado acompanhando a silhueta,
    // subindo para o fundo, com rim red-hot na aresta de fora e topo aceso
    const rise = Math.max(1, Math.round(D * 0.5))
    const xr: number[] = []
    for (let y = 0; y < H; y++) {
      let r0 = -1
      // no Congresso a lateral sai só das torres e da laje (a cúpula é redonda, não ganha face)
      const xs = kind === 'congresso' && y < base - 6 ? Math.round(W0 / 2) + 5 : W0 - 1
      for (let x = xs; x >= 0; x--)
        if (g.get(x, y, -1) !== -1) {
          r0 = x
          break
        }
      xr.push(r0)
    }
    const side = new Grid(W, H, -1)
    for (let y = 0; y < H; y++) {
      const x0 = xr[y] ?? -1
      if (x0 < 0) continue
      for (let i = 1; i <= D; i++) {
        const yy = y - Math.round((i / D) * rise)
        const top = (xr[y - 1] ?? -1) < x0 - 1 || y === 0
        let k: number = (i + y) % 3 === 0 || (i * 7 + y * 3) % 5 === 0 ? P.blood0 : P.blood1
        if (stage >= 2 && (i * 5 + y) % 7 === 0) k = P.void
        if (top) k = P.crimson
        if (i === D) k = stage >= 3 && y % 3 === 0 ? P.ember : P.redHot
        if (yy >= 0) side.set(x0 + i, yy, k)
      }
    }
    for (let i = 0; i < side.d.length; i++)
      if ((side.d[i] ?? -1) >= 0 && (g.d[i] ?? -1) < 0) g.d[i] = side.d[i] ?? -1
    return g
  })
}

/**
 * minuta 16×20 tremulando em 6 quadros a 10 fps: frente, frente inclinada (cisalhada), estreita,
 * de lado, verso estreito e verso inclinado. O verso mostra o texto e o carimbo vazando do papel.
 */
function paperFrames(hot = false): Texture[] {
  // largura, cisalhamento (px no topo), verso?
  const spec: [number, number, boolean][] = [
    [12, 0, false],
    [11, 3, false],
    [6, 1, false],
    [2, 0, false],
    [6, -1, true],
    [11, -3, true],
  ]
  return spec.map(([w, sh, back], f) =>
    gridTex(`defesa-paper3-${f}${hot ? 'h' : ''}`, () => paperGrid(w, sh, back, hot)),
  )
}

function paperGrid(w: number, sh: number, back: boolean, hot: boolean) {
  {
    const m = new Grid(16, 20)
    const H = 16
    for (let y = 0; y < H; y++) {
      const off = Math.round(sh * (1 - y / (H - 1)))
      const x0 = Math.round(8 - w / 2) + off
      m.rect(x0, 2 + y, w, 1, 1)
    }
    if (w >= 8) m.set(Math.round(8 - w / 2) + sh + w - 1, 2, 0)
    const g = shade(m, {
      1: {
        ramp: back
          ? [P.stone1, P.stone2, P.stone2, P.stone3, P.stoneHi]
          : [P.stone1, P.stone2, P.stone3, P.stoneHi, P.stoneHi],
        rim: P.redHot,
      },
    })
    if (w >= 6) {
      const ink = back ? P.stone2 : P.stone1
      for (let y = 0; y < H; y++) {
        const off = Math.round(sh * (1 - y / (H - 1)))
        const x0 = Math.round(8 - w / 2) + off
        const row = y + 2
        if ([4, 6, 8, 10].includes(row))
          for (let x = x0 + 2; x < x0 + w - 2; x++)
            if ((x - x0 + row) % 6 && (!back || x % 2)) g.set(x, row, ink)
        // carimbo vermelho "GOLPE" (no verso vaza mais escuro)
        if (row >= 12 && row <= 14 && w >= 8)
          for (let x = x0 + 2; x < x0 + w - 2; x++)
            g.set(
              x,
              row,
              back
                ? P.crimsonDeep
                : row === 13 && x > x0 + 2 && x < x0 + w - 3
                  ? hot
                    ? P.redGlow
                    : P.redHot
                  : hot
                    ? P.red
                    : P.crimson,
            )
      }
    }
    return g
  }
}

export default function defesa(): MicroGame {
  let c: GameCtx
  const root = new Container()
  const papers = new Container()
  let field: Field
  let booms: Booms
  let combo: Combo
  let ms: Minuta[] = []
  let bs: Building[] = []
  const pool: Sprite[] = []
  const halves: { s: Sprite; x: number; y: number; vx: number; vy: number; t: number }[] = []
  const warns: { x: number; t: number; target: number }[] = []
  let frames: Texture[] = []
  let framesHot: Texture[] = []
  let tearFlash: Texture
  let flyers: Flyers
  const flash = new HitFlash(4)
  const last = new LastFrame(30)
  let hand: HandHint
  let lastX = 0
  let lastY = 0
  /** o erro ensina: o toque que não pegou nada acende a minuta mais perto */
  function teach() {
    let best: Minuta | null = null
    let bd = 1e9
    for (const m of ms) {
      if (m.sp <= 0) continue
      const d = Math.hypot(m.x - lastX, m.y - lastY)
      if (d < bd) {
        bd = d
        best = m
      }
    }
    if (best) showRight(c, best.x, best.y)
  }
  let smokeBoom: Texture[] = []
  let spawn = 1
  let ground = 0
  const tap = new TapBuffer(0.1)
  const marks = new Graphics()

  function setStage(b: Building) {
    b.s.texture = buildingTex(b.kind, Math.round(b.w), b.h, Math.min(3, b.dmg))
  }

  function spawnMinuta(x: number, target: number) {
    const b = bs[target]
    const s = pool.find((k) => !k.visible)
    if (!b || !s) return
    s.visible = true
    const d = curve(c.time, 30)
    ms.push({
      x,
      y: c.top - 6,
      tx: b.x + b.w / 2,
      ty: ground - b.h / 2 - (b.kind === 'congresso' ? 6 : 2),
      sp: 22 + 16 * d + c.rnd() * 8,
      ph: c.rnd() * 6,
      target,
      contact: 0,
      s,
    })
  }

  function tear(m: Minuta) {
    m.sp = -1
    m.s.visible = false
    // 1 quadro branco no lugar da minuta, hit-stop curto e um selo dourado voando até o placar
    flash.show(tearFlash, m.x, m.y)
    c.fx.hitstop(50)
    flyers.send(m.x, m.y, { arc: 16, dur: 0.4 })
    const n = combo.hit(m.x, m.y - 14)
    c.addScore(30, m.x, m.y - 6)
    c.fx.ring(m.x, m.y, n >= 5 ? P.redHot : P.stoneHi, 16)
    field.blast(m.x, m.y, 12, 55, PAPER, { grav: 60, drag: 2.5, life: 0.8 })
    field.blast(m.x, m.y, 6, 45, ENERGY, { add: true })
    // as duas metades voam para lados opostos
    const full = frames[0] as Texture
    const free = halves.filter((h) => h.t < 0)
    for (const [i, h] of free.slice(0, 2).entries()) {
      h.t = 0
      h.x = m.x + (i ? 3 : -3)
      h.y = m.y
      h.vx = (i ? 1 : -1) * (35 + c.rnd() * 20)
      h.vy = -30 - c.rnd() * 20
      h.s.texture = subTex(`paperhalf${i}`, full, i ? 7 : 0, 0, 7, 18)
      h.s.visible = true
    }
    c.sfx('shatter', { x: m.x })
    c.sfx('good', { x: m.x, combo: n })
  }

  function hitAt(x: number, y: number) {
    let best: Minuta | null = null
    let bd = 15
    for (const m of ms) {
      if (m.sp <= 0) continue
      const d = Math.hypot(m.x - x, m.y - y)
      if (d < bd) {
        bd = d
        best = m
      }
    }
    if (!best) return false
    tear(best)
    ms = ms.filter((o) => o.sp > 0)
    return true
  }

  return {
    duration: 30,
    goal: 750,
    init(ctx) {
      c = ctx
      c.stage.addChild(root)
      field = new Field(c)
      field.trail = PAPER
      booms = new Booms(4)
      smokeBoom = boomFrames(FIRE, SMOKE)
      combo = new Combo(c, field)
      frames = paperFrames()
      framesHot = paperFrames(true)
      tearFlash = solidTex('minuta', () => paperGrid(12, 0, false, false))
      // selo dourado 7×7 (recompensa que viaja)
      flyers = new Flyers(
        c,
        rowsTex('defesa-selo', ['..yYy..', '.yYsYy.', 'yYsysYy', 'YsyYysY', 'yYsysYy', '.yYsYy.', '..yYy..']),
        10,
      )
      flyers.trail = (x, y) => {
        if (c.rnd() < 0.4)
          field.spawn(x, y, { life: 0.22, ramp: [P.goldHi, P.gold, P.gold1], add: true, drag: 2 })
      }
      ground = c.bottom - 18
      const span = Math.min(c.W - 12, 280)
      // prédios crescem com a altura disponível (no celular em pé, a praça ocupa o terço de baixo)
      const hs = Math.max(0.9, Math.min(1.7, (c.bottom - c.top) / 200))
      const x0 = c.W / 2 - span / 2
      const mk = (x: number, w: number, h: number, kind: Kind): Building => ({
        x: Math.round(x),
        w: Math.round(w),
        h,
        kind,
        dmg: 0,
        shudder: -1,
        s: spr(buildingTex(kind, Math.round(w), h, 0), Math.round(x) - 2, ground + 1, 0, 1),
      })
      bs = [
        mk(x0, span * 0.22, Math.round(18 * hs), 'stf'),
        mk(x0 + span * 0.3, span * 0.4, Math.round(40 * hs), 'congresso'),
        mk(x0 + span * 0.76, span * 0.24, Math.round(15 * hs), 'planalto'),
      ]
      // chão: esplanada escura, espelho d'água com reflexo e grade de primeiro plano
      const floor = new Graphics()
      // sem preenchimento opaco: o cenário da fase aparece por trás (camada do jogo transparente)
      floor.rect(0, ground, c.W, 3).fill(P.stone0)
      floor.rect(0, ground, c.W, 1).fill(P.blood1)
      floor.rect(0, ground + 3, c.W, 4).fill(P.blue0)
      for (let x = 0; x < c.W; x += 7) floor.rect(x + ((x / 7) % 2) * 3, ground + 4, 2, 1).fill(P.blue1)
      for (const b of bs) floor.rect(b.x + 2, ground + 5, Math.max(2, b.w - 4), 1).fill(P.stone1)
      const fence = new Graphics()
      for (let x = 2; x < c.W; x += 6) fence.rect(x, ground + 10, 1, 6).fill(P.void)
      fence.rect(0, ground + 11, c.W, 1).fill(P.void)
      for (let i = 0; i < 18; i++) {
        const s = spr(frames[0] as Texture, 0, 0)
        s.visible = false
        papers.addChild(s)
        pool.push(s)
      }
      for (let i = 0; i < 8; i++) {
        const s = spr(frames[0] as Texture, 0, 0)
        s.visible = false
        papers.addChild(s)
        halves.push({ s, x: 0, y: 0, vx: 0, vy: 0, t: -1 })
      }
      root.addChild(floor)
      for (const b of bs) root.addChild(spr(shadowTex(b.w + 8), b.x + b.w / 2, ground + 1), b.s)
      hand = new HandHint(c, 4)
      root.addChild(
        marks,
        papers,
        field.root,
        booms.root,
        flash.root,
        flyers.root,
        combo.text,
        fence,
        hand.root,
      )
    },
    update(dt) {
      const d = curve(c.time, 30)
      spawn -= dt
      if (spawn <= 0) {
        spawn = lerp(1.3, 0.45, d)
        // aviso de 0,35 s no topo antes de a minuta entrar
        warns.push({ x: 8 + c.rnd() * (c.W - 16), t: 0, target: Math.floor(c.rnd() * 3) })
      }
      for (let i = warns.length - 1; i >= 0; i--) {
        const w = warns[i]
        if (!w) continue
        w.t += dt
        if (w.t >= 0.35) {
          spawnMinuta(w.x, w.target)
          warns.splice(i, 1)
        }
      }
      tap.poll(c.time, hitAt, teach)
      // demonstração: a mão segue a primeira minuta até o primeiro toque
      const first = ms.find((m) => m.sp > 0)
      hand.update(first ? { x: first.x, y: first.y } : null)
      for (const m of ms) {
        const dx = m.tx - m.x
        const dy = m.ty - m.y
        const dist = Math.hypot(dx, dy) || 1
        if (dist < 5) {
          // 3 quadros de contato antes de contar (perdão), tremendo no lugar
          m.contact++
          if (m.contact >= 3) {
            m.sp = -1
            m.s.visible = false
            const b = bs[m.target]
            if (b) {
              b.dmg++
              b.shudder = c.time
              setStage(b)
            }
            booms.play(m.x, m.y, smokeBoom)
            field.blast(m.x, m.y, 14, 60, [P.stone3, P.stone2, P.stone1, P.stone0], { grav: 180 })
            field.blast(m.x, m.y, 10, 50, FIRE, { add: true })
            combo.reset()
            c.sfx('stone', { x: m.x })
            c.hit(m.x, m.y)
          }
        } else {
          m.x += (dx / dist) * m.sp * dt + Math.sin(c.time * 3 + m.ph) * 12 * dt
          m.y += (dy / dist) * m.sp * dt
        }
        // o carimbo pulsa a 4 fps; perto do alvo pulsa mais rápido (telegrafa o impacto)
        const near = Math.hypot(m.tx - m.x, m.ty - m.y) < 40
        const set = frameAt(c.time + m.ph, near ? 10 : 4, 2) ? framesHot : frames
        m.s.texture = set[frameAt(c.time + m.ph, 10, frames.length)] as Texture
        m.s.x = Math.round(m.x) + (m.contact ? (m.contact % 2 ? 1 : -1) : 0)
        m.s.y = Math.round(m.y + Math.sin(c.time * 6 + m.ph) * 1.5)
      }
      ms = ms.filter((m) => m.sp > 0)

      // avisos: seta piscando no topo; mira vermelha no prédio quando a minuta está a < 40 px
      marks.clear()
      for (const w of warns) {
        if (frameAt(w.t, 12, 2)) continue
        const x = Math.round(w.x)
        const y = c.top + 1
        marks
          .rect(x - 2, y, 5, 1)
          .rect(x - 1, y + 1, 3, 1)
          .rect(x, y + 2, 1, 1)
      }
      marks.fill(P.redHot)
      for (const b of bs) {
        const threat = ms.some((m) => m.target === bs.indexOf(b) && Math.hypot(m.tx - m.x, m.ty - m.y) < 40)
        if (!threat || frameAt(c.time, 8, 2)) continue
        const x0 = b.x - 3
        const x1 = b.x + b.w + 2
        const y0 = ground - b.h - 4
        const y1 = ground
        for (const [cx, cy, sx, sy] of [
          [x0, y0, 1, 1],
          [x1, y0, -1, 1],
          [x0, y1, 1, -1],
          [x1, y1, -1, -1],
        ] as const)
          marks.rect(Math.min(cx, cx + sx * 3), cy, 4, 1).rect(cx, Math.min(cy, cy + sy * 3), 1, 4)
      }
      marks.fill(P.red)

      for (const b of bs) {
        const sh = c.time - b.shudder < 0.15 && b.shudder > 0
        b.s.x = b.x - 2 + (sh ? (frameAt(c.time, 30, 2) ? 1 : -1) : 0)
        // prédio ferido solta fumaça; muito ferido, brasas
        if (b.dmg >= 2 && c.rnd() < 0.15)
          field.spawn(b.x + c.rnd() * b.w, ground - b.h, { vy: -10, vx: 4, life: 1.2, ramp: SMOKE, wob: 4 })
        if (b.dmg >= 3 && c.rnd() < 0.15) field.ember(b.x + c.rnd() * b.w, ground - b.h * c.rnd())
      }
      for (const h of halves) {
        if (h.t < 0) continue
        h.t += dt
        h.vy += 200 * dt
        h.x += h.vx * dt
        h.y += h.vy * dt
        h.s.x = Math.round(h.x)
        h.s.y = Math.round(h.y)
        h.s.alpha = h.t > 0.35 ? 0.5 : 1
        if (h.t > 0.55) {
          h.t = -1
          h.s.visible = false
        }
      }
      combo.update()
      field.update(dt)
      booms.update(dt)
      flash.update(dt)
      flyers.update(dt)
      // final de fase: a Praça resistiu, chuva dourada sobre o Congresso
      last.check(c, () => {
        const b = bs[1]
        if (b) finale(c, b.x + b.w / 2, ground - b.h)
        c.sfx('perfect', { x: c.W / 2 })
      })
    },
    move(x, y) {
      field.pointer(x, y)
    },
    down(x, y) {
      field.pointer(x, y, true)
      hand.dismiss()
      lastX = x
      lastY = y
      if (!hitAt(x, y)) {
        tap.push(x, y, c.time)
        c.sfx('tap')
      }
    },
    clear() {
      if (!ms.length) return false
      for (const m of ms) {
        field.blast(m.x, m.y, 8, 50, PAPER, { grav: 60 })
        m.s.visible = false
      }
      c.addScore(ms.length * 30)
      ms = []
      return true
    },
    timeUp() {
      return true
    },
    dispose() {
      root.destroy({ children: true })
    },
  }
}
