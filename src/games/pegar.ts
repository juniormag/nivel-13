// Fase 12 · Farmácia Popular: pegue os remédios e as casas; deixe o boato cair no chão.
// Cesta com squash no pegar, sombras no chão que mostram onde cada item vai cair, boato piscando
// em vermelho e balançando (dá para reconhecer pelo movimento), prateleiras de farmácia ao fundo.
import { Container, Graphics, Sprite, type Texture } from 'pixi.js'
import type { GameCtx, MicroGame } from '../engine/types'
import { bake, Debris, Embers, easeOutBack, P, ramp, Sparkles, squashTo, stop } from './kit-b'

type Kind = 'remedio' | 'casa' | 'fake'
interface Item {
  x: number
  x0: number
  y: number
  vy: number
  kind: Kind
  s: Sprite
  phase: number
  alive: boolean
}

const DUR = 25
const BW = 32
const BH = 14

function capsuleTex() {
  return bake('capsula', 14, 7, (p) => {
    p.rect(1, 1, 6, 5, P.red)
    p.rect(0, 2, 1, 3, P.red)
    p.rect(7, 1, 6, 5, P.stoneHi)
    p.rect(13, 2, 1, 3, P.stoneHi)
    p.rect(1, 1, 5, 1, P.redGlow)
    p.rect(1, 5, 6, 1, P.crimson)
    p.rect(7, 5, 6, 1, P.stone3)
    p.rect(7, 1, 1, 5, P.stone2)
    p.dot(2, 2, P.white)
    p.outline(P.void)
  })
}

function blisterTex() {
  return bake('blister', 14, 9, (p) => {
    p.rect(0, 0, 14, 9, P.stone3)
    p.rect(0, 0, 14, 1, P.stoneHi)
    p.rect(13, 0, 1, 9, P.stone2)
    p.rect(0, 8, 14, 1, P.stone2)
    for (let j = 0; j < 2; j++)
      for (let i = 0; i < 3; i++) {
        const x = 2 + i * 4
        const y = 2 + j * 3
        p.rect(x, y, 3, 2, P.red)
        p.dot(x, y, P.redGlow)
        p.dot(x + 2, y + 1, P.crimson)
      }
    p.outline(P.void)
  })
}

function houseTex() {
  return bake('casa13', 15, 13, (p) => {
    // telhado
    for (let i = 0; i < 6; i++) p.rect(7 - i, i, i * 2 + 1, 1, i < 2 ? P.redHot : P.red)
    p.rect(0, 5, 15, 1, P.crimson)
    p.rect(12, 1, 2, 3, P.stone2)
    // paredes
    p.rect(2, 6, 11, 7, P.stoneHi)
    p.rect(10, 6, 3, 7, P.stone3)
    p.rect(2, 12, 11, 1, P.stone2)
    // porta e janela acesa
    p.rect(4, 8, 3, 5, P.gold0)
    p.dot(6, 10, P.gold)
    p.rect(9, 8, 3, 3, P.gold)
    p.dot(9, 8, P.goldHi)
    p.outline(P.void, P.blood0)
  })
}

function fakeTex(alarm: boolean) {
  return bake(`fake13${alarm ? 'a' : ''}`, 14, 12, (p) => {
    p.rect(0, 0, 14, 12, P.stone3)
    p.rect(0, 0, 14, 1, P.stoneHi)
    p.rect(1, 1, 12, 3, alarm ? P.redHot : P.red)
    p.rect(2, 2, 2, 1, P.white)
    for (let j = 0; j < 3; j++) p.rect(2, 6 + j * 2, 10 - (j % 2) * 3, 1, P.stone1)
    // canto dobrado
    p.rect(12, 10, 2, 2, P.stone1)
    p.dot(12, 10, P.stone2)
    p.outline(alarm ? P.redHot : P.void)
  })
}

function basketTex() {
  return bake('cesta', BW, BH, (p) => {
    p.rect(1, 2, BW - 2, BH - 2, P.red)
    // trama
    for (let y = 4; y < BH - 1; y += 3)
      for (let x = 2 + (y % 2) * 2; x < BW - 2; x += 4) p.rect(x, y, 2, 1, P.crimson)
    p.rect(1, BH - 2, BW - 2, 1, P.crimsonDeep)
    p.rect(BW - 3, 3, 2, BH - 4, P.crimson)
    // borda
    p.rect(0, 0, BW, 3, P.redGlow)
    p.rect(0, 2, BW, 1, P.crimsonDeep)
    p.rect(1, 0, BW - 2, 1, P.sparkle)
    // cruz da farmácia
    const cx = Math.floor(BW / 2)
    p.rect(cx - 1, 4, 3, 8, P.stoneHi)
    p.rect(cx - 4, 7, 9, 3, P.stoneHi)
    p.dot(cx - 1, 4, P.white)
    p.rect(cx + 1, 5, 1, 7, P.stone3)
    p.outline(P.void, P.blood0)
  })
}

function shelfTex(h: number) {
  return bake(`shelf${h}`, 22, h, (p) => {
    p.rect(0, 0, 22, h, P.night)
    p.rect(0, 0, 1, h, P.hazeDark)
    p.rect(21, 0, 1, h, P.void)
    const cols = [P.crimsonDeep, P.blue0, P.stone1, P.vine1, P.haze, P.blood1]
    let k = 0
    for (let y = 4; y < h - 4; y += 12) {
      p.rect(1, y + 9, 20, 2, P.hazeDark)
      p.rect(1, y + 9, 20, 1, P.haze)
      let x = 2
      while (x < 19) {
        const w = 3 + ((k * 7) % 3)
        const bh = 5 + ((k * 5) % 4)
        p.rect(x, y + 9 - bh, Math.min(w, 20 - x), bh, cols[k % cols.length] ?? P.haze)
        p.rect(x, y + 9 - bh, Math.min(w, 20 - x), 1, P.stone1)
        x += w + 1
        k++
      }
    }
  })
}

export default function pegar(): MicroGame {
  let c: GameCtx
  const root = new Container()
  const props = new Container()
  const shadows = new Graphics()
  const itemLayer = new Container()
  const sign = new Graphics()
  const basket = new Sprite()
  const debris = new Debris(60)
  let embers: Embers
  let sparkles: Sparkles
  let items: Item[] = []
  let bx = 0
  let prevBx = 0
  let target = 0
  let spawn = 0.5
  let keyDir = 0
  let by = 0
  let floorY = 0
  let catchT = -10
  let badT = -10
  let combo = 0
  let medTex: Texture[] = []

  function spawnItem() {
    const k = ramp(c.time, DUR, 8)
    const r = c.rnd()
    const fakeP = 0.18 + 0.1 * k
    const kind: Kind = r < fakeP ? 'fake' : r < fakeP + 0.13 ? 'casa' : 'remedio'
    const tex =
      kind === 'fake'
        ? fakeTex(false)
        : kind === 'casa'
          ? houseTex()
          : (medTex[Math.floor(c.rnd() * medTex.length)] ?? capsuleTex())
    const s = new Sprite(tex)
    itemLayer.addChild(s)
    const x = 14 + c.rnd() * (c.W - 28)
    items.push({
      x,
      x0: x,
      y: c.top - 8,
      vy: 40 + 45 * k + c.rnd() * 20,
      kind,
      s,
      phase: c.rnd() * 6,
      alive: true,
    })
  }

  function caught(it: Item) {
    it.alive = false
    if (it.kind === 'fake') {
      combo = 0
      badT = c.time
      c.fx.burst(it.x, it.y, P.redHot, 12, 60)
      debris.burst(it.x, it.y, [P.stone3, P.red, P.stoneHi], 8, 60, c.rnd, floorY, 0.9)
      c.hit(it.x, it.y)
      return
    }
    combo++
    catchT = c.time
    const pts = it.kind === 'casa' ? 50 : 25
    c.addScore(pts, it.x, by - 16)
    c.fx.burst(it.x, by - 4, it.kind === 'casa' ? P.goldHi : P.leafHi, 8, 50)
    sparkles.spawn(Math.round(bx + (it.x > bx ? 8 : -8)), by - 6, it.kind === 'casa' ? 8 : 0)
    for (let i = 0; i < 4; i++) embers.spark(it.x, by - 4, 30)
    c.sfx('coin')
    if (it.kind === 'casa') stop(c, 50)
    if (combo > 0 && combo % 5 === 0) {
      c.fx.float(`COMBO ${combo}`, Math.round(bx), by - 28, P.goldHi)
      c.fx.ring(Math.round(bx), by - 2, P.gold, 22)
    }
  }

  return {
    duration: DUR,
    goal: 750,
    init(ctx) {
      c = ctx
      c.stage.addChild(root)
      bx = target = prevBx = c.W / 2
      by = c.bottom - 16
      floorY = by + 8
      medTex = [capsuleTex(), blisterTex()]
      basket.texture = basketTex()

      // prateleiras ao fundo nas laterais (profundidade) e chão
      const sh = Math.min(120, floorY - c.top - 10)
      for (const x of [2, c.W - 24]) {
        const s = new Sprite(shelfTex(sh))
        s.x = x
        s.y = floorY - sh
        s.alpha = 0.85
        props.addChild(s)
      }
      const floor = new Graphics()
      floor.rect(0, floorY, c.W, c.bottom + 30 - floorY).fill(P.night)
      for (let x = 0; x < c.W; x += 8) floor.rect(x, floorY + 1, 7, 1).fill(P.dusk)
      floor.rect(0, floorY, c.W, 1).fill(P.hazeDark)
      props.addChild(floor)
      embers = new Embers(
        c,
        { x0: 0, y0: c.top, x1: c.W, y1: floorY },
        { ambient: 14, ramp: [P.white, P.leafHi, P.green, P.vine1] },
      ).listen()
      sparkles = new Sparkles(c.reduced)
      sign.blendMode = 'add'
      root.addChild(props, sign, shadows, itemLayer, basket, debris.root, embers.root, sparkles.root)
    },
    update(dt) {
      const k = ramp(c.time, DUR, 8)
      target += keyDir * 170 * dt
      target = Math.max(16, Math.min(c.W - 16, target))
      prevBx = bx
      bx += (target - bx) * Math.min(1, dt * 16)
      const vx = dt > 0 ? (bx - prevBx) / dt : 0
      spawn -= dt
      if (spawn <= 0) {
        spawn = 0.62 - 0.3 * k
        spawnItem()
      }
      shadows.clear()
      for (const it of items) {
        if (!it.alive) continue
        it.y += it.vy * dt
        if (it.kind === 'fake') it.x = it.x0 + Math.sin(c.time * 5 + it.phase) * 4
        // pegar: faixa vertical generosa e 2 px de folga lateral (regra 31)
        if (it.y > by - 9 && it.y < by + 4 && Math.abs(it.x - bx) < 19) caught(it)
        else if (it.y > floorY - 2) {
          it.alive = false
          if (it.kind === 'fake') {
            debris.burst(it.x, floorY - 2, [P.stone3, P.stone2, P.red], 6, 40, c.rnd, floorY, 1)
            c.fx.ring(it.x, floorY - 1, P.leafHi, 8)
          } else c.fx.burst(it.x, floorY - 2, P.stone2, 4, 25)
        }
        if (!it.alive) continue
        const w = it.s.texture.width
        const h = it.s.texture.height
        it.s.x = Math.round(it.x - w / 2)
        it.s.y = Math.round(it.y - h / 2)
        if (it.kind === 'fake') it.s.texture = fakeTex(Math.floor(c.time * 7 + it.phase) % 2 === 0)
        // sombra no chão cresce conforme o item se aproxima
        const near = Math.max(0, Math.min(1, (it.y - c.top) / (floorY - c.top)))
        const sw = 2 + Math.round(near * 8)
        shadows
          .rect(Math.round(it.x - sw / 2), floorY + 1, sw, 1)
          .fill({ color: it.kind === 'fake' ? P.crimsonDeep : P.void, alpha: 0.4 + near * 0.5 })
      }
      const dead = items.filter((i) => !i.alive)
      for (const d of dead) d.s.destroy()
      if (dead.length) items = items.filter((i) => i.alive)

      // cesta: squash no pegar (1,2 × 0,8 por 60 ms, volta em 120 ms com overshoot), estica ao correr
      const t = c.time - catchT
      let sx = 1
      let sy = 1
      if (t < 0.06) {
        sx = 1.2
        sy = 0.8
      } else if (t < 0.18) {
        const e = easeOutBack((t - 0.06) / 0.12, 2.2)
        sx = 1.2 - 0.2 * e
        sy = 0.8 + 0.2 * e
      } else if (Math.abs(vx) > 140) {
        sx = 1.08
        sy = 0.93
      }
      squashTo(basket, bx, by + BH - 4, BW, BH, sx, sy)
      basket.tint = c.time - badT < 0.12 && Math.floor((c.time - badT) * 30) % 2 === 0 ? P.redHot : 0xffffff
      shadows.rect(Math.round(bx - BW / 2 + 2), floorY + 1, BW - 4, 1).fill(P.void)
      shadows.rect(Math.round(bx - BW / 2 + 4), floorY + 2, BW - 8, 1).fill({ color: P.void, alpha: 0.6 })

      // cruz verde de farmácia piscando no alto
      sign.clear()
      const on = Math.floor(c.time * 1.5) % 4 !== 0
      const sx0 = 8
      const sy0 = c.top + 6
      sign.rect(sx0 + 3, sy0, 3, 9).fill({ color: on ? P.leafHi : P.vine1, alpha: 0.7 })
      sign.rect(sx0, sy0 + 3, 9, 3).fill({ color: on ? P.leafHi : P.vine1, alpha: 0.7 })
      if (on) sign.rect(sx0 + 4, sy0 + 4, 1, 1).fill(P.white)

      embers.update(dt, c.time)
      sparkles.update(dt)
      debris.update(dt)
    },
    down(x) {
      target = x
    },
    move(x) {
      target = x
    },
    key(k, down) {
      if (k === 'ArrowLeft' || k === 'a') keyDir = down ? -1 : keyDir === -1 ? 0 : keyDir
      if (k === 'ArrowRight' || k === 'd') keyDir = down ? 1 : keyDir === 1 ? 0 : keyDir
    },
    clear() {
      const fakes = items.filter((i) => i.kind === 'fake')
      if (!fakes.length) return false
      for (const f of fakes) {
        c.fx.burst(f.x, f.y, P.redHot, 6)
        debris.burst(f.x, f.y, [P.stone3, P.red], 5, 50, c.rnd, floorY, 0.8)
        f.alive = false
        f.s.destroy()
      }
      items = items.filter((i) => i.kind !== 'fake')
      return true
    },
    timeUp() {
      return true
    },
    dispose() {
      embers?.destroy()
      root.destroy({ children: true })
      items = []
    },
  }
}
