// Fase 5 · Carteira Assinada: vagas aparecem nas janelas; o golpe do emprego falso também.
// Prédio procedural à noite: a janela acende antes (antecipação) e a cor da luz já diz o que vem.
import { Container, Graphics, type Sprite, type Text, type Texture } from 'pixi.js'
import type { GameCtx, MicroGame } from '../engine/types'
import {
  Combo,
  clamp01,
  curve,
  ENERGY,
  Field,
  frameAt,
  GOLD,
  Grid,
  glowTex,
  gridTex,
  label,
  lerp,
  P,
  popScale,
  setSquash,
  shade,
  shadowTex,
  spr,
  subTex,
  TapBuffer,
} from './kit-a'

interface Item {
  good: boolean
  t0: number
  life: number
  hitT: number
}

interface Win {
  x: number
  y: number
  w: number
  h: number
  item: Item | null
  /** 0..1 luz acesa (desce devagar depois que o item sai) */
  light: number
  crackT: number
  /** cor da última luz (para apagar na mesma cor) */
  kind: 'gold' | 'red'
  off: Texture
  pane: Sprite
  spr: Sprite
  pix: Text
}

/** carteira de trabalho azul 16×18 com rim light */
function carteiraTex() {
  return gridTex('whack-carteira', () => {
    const m = new Grid(16, 18)
    m.rect(2, 1, 12, 16, 1)
    m.rect(2, 1, 2, 16, 2)
    const g = shade(m, {
      1: { ramp: [P.void, P.blue0, P.blue0, P.blue1, P.blue1], rim: P.sparkle },
      2: { ramp: [P.void, P.blue0, P.blue0, P.blue0] },
    })
    // brasão dourado e linhas de texto
    g.rect(7, 4, 4, 4, P.gold)
    g.rect(8, 5, 2, 2, P.goldHi)
    g.set(7, 4, P.gold1)
    g.rect(6, 10, 6, 1, P.goldHi)
    g.rect(6, 12, 6, 1, P.stone3)
    g.rect(6, 14, 4, 1, P.stone3)
    return g
  })
}

/** golpe 16×18: celular vermelho com "R$" e sinal de alerta */
function golpeTex() {
  return gridTex('whack-golpe', () => {
    const m = new Grid(16, 18)
    m.rect(3, 1, 10, 16, 1)
    m.rect(5, 3, 6, 10, 2)
    const g = shade(m, {
      1: { ramp: [P.blood0, P.blood1, P.crimsonDeep, P.crimson, P.red], rim: P.redHot },
      2: { ramp: [P.void, P.blood0, P.blood1, P.blood1], outline: null },
    })
    // triângulo de alerta
    for (let y = 0; y < 5; y++)
      g.rect(8 - Math.floor(y / 2), 5 + y, 1 + Math.floor(y / 2) * 2, 1, P.emberBright)
    g.rect(8, 6, 1, 2, P.void)
    g.set(8, 9, P.void)
    g.rect(7, 14, 2, 1, P.stone2)
    return g
  })
}

/** quadros de luz da janela: apagada, acesa boa (ouro) e acesa de golpe (sangue) */
function windowTex(w: number, h: number, kind: 'off' | 'gold' | 'red', lvl: number) {
  return gridTex(`whack-win${w}x${h}${kind}${lvl}`, () => windowGrid(w, h, kind, lvl))
}

function windowGrid(w: number, h: number, kind: 'off' | 'gold' | 'red', lvl: number) {
  {
    const g = new Grid(w, h, -1)
    const ramp =
      kind === 'gold'
        ? [P.gold0, P.gold1, P.gold, P.goldHi, P.sparkle]
        : kind === 'red'
          ? [P.blood0, P.blood1, P.crimsonDeep, P.crimson, P.red]
          : [P.night, P.dusk, P.hazeDark, P.hazeDark, P.haze]
    const top = Math.max(0, Math.min(ramp.length - 1, lvl))
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        // luz vem de cima (luminária): gradiente em faixas, transição pontilhada
        const k = y / h
        let i = Math.round(top - k * 3)
        if ((x + y) % 2 && Math.abs(k * 3 - Math.round(k * 3)) < 0.18) i--
        g.set(x, y, ramp[Math.max(0, i)] ?? P.night)
      }
    // reflexo diagonal no vidro
    for (let i = 0; i < Math.min(w, h) - 4; i++)
      if (i % 5 < 2) g.set(w - 3 - i, 2 + i, kind === 'off' ? P.haze : P.sparkle)
    // peitoril
    for (let x = 0; x < w; x++) g.set(x, h - 1, P.stone1)
    return g
  }
}

/** janela apagada com vida: 0 vazia, 1 cortinas, 2 persiana, 3 vaso de planta */
function offTex(w: number, h: number, deco: number) {
  return gridTex(`whack-off${w}x${h}d${deco}`, () => {
    const g = windowGrid(w, h, 'off', 1)
    if (deco === 1)
      for (let y = 0; y < h - 1; y++) {
        const cw = Math.max(2, Math.round(w * 0.22 - (y < h / 2 ? 0 : 1)))
        for (let x = 0; x < cw; x++) {
          g.set(x, y, x === cw - 1 ? P.blood0 : P.blood1)
          g.set(w - 1 - x, y, x === cw - 1 ? P.blood0 : P.blood1)
        }
      }
    else if (deco === 2)
      for (let y = 1; y < h * 0.55; y += 2) for (let x = 0; x < w; x++) g.set(x, y, P.hazeDark)
    else if (deco === 3) {
      const px = Math.round(w * 0.25)
      g.rect(px, h - 5, 4, 4, P.emberDark)
      g.rect(px, h - 5, 4, 1, P.gold0)
      g.ellipse(px + 1.5, h - 8, 3, 2.5, P.vine1)
      g.set(px, h - 9, P.green)
    }
    return g
  })
}

export default function whack(): MicroGame {
  let c: GameCtx
  const root = new Container()
  const items = new Container()
  let field: Field
  let combo: Combo
  const wins: Win[] = []
  const tap = new TapBuffer(0.1)
  let spawn = 0.8
  let bx = 0
  let by = 0
  let bw = 0
  let bh = 0
  let cw = 0
  let ch = 0
  let good: Texture
  let bad: Texture
  let neon: Text
  let beacon: Sprite
  const winTex: Record<string, Texture> = {}
  const facade = new Graphics()
  const cracks = new Graphics()

  const lit = (kind: 'off' | 'gold' | 'red', lvl: number) => winTex[`${kind}${lvl}`] as Texture

  function drawFacade() {
    const g = facade
    g.clear()
    // corpo do prédio em rampa noturna, com rim light vermelho à direita e topo claro
    g.rect(bx - 3, by - 3, bw + 6, bh + 3).fill(P.void)
    g.rect(bx, by, bw, bh).fill(P.dusk)
    for (let x = bx + 4; x < bx + bw - 2; x += 6) g.rect(x, by + 2, 1, bh - 2).fill(P.night)
    g.rect(bx, by, bw, 2).fill(P.haze)
    g.rect(bx, by, 1, bh).fill(P.hazeDark)
    g.rect(bx + bw - 1, by, 1, bh).fill(P.crimson)
    g.rect(bx + bw - 2, by, 1, bh).fill(P.blood1)
    // marquise e porta
    const dx = Math.round(bx + bw / 2 - 8)
    g.rect(dx - 3, by + bh - 14, 22, 2).fill(P.stone2)
    g.rect(dx, by + bh - 12, 16, 12).fill(P.void)
    g.rect(dx + 1, by + bh - 11, 14, 11).fill(P.gold0)
    g.rect(dx + 7, by + bh - 11, 1, 11).fill(P.void)
    // letreiro VAGAS
    g.rect(bx + bw / 2 - 22, by - 13, 44, 11).fill(P.void)
    g.rect(bx + bw / 2 - 21, by - 12, 42, 9).fill(P.blood0)
    g.rect(bx + bw / 2 - 12, by - 2, 1, 2).fill(P.stone1)
    g.rect(bx + bw / 2 + 11, by - 2, 1, 2).fill(P.stone1)
    // antena
    g.rect(bx + bw - 10, by - 16, 1, 13).fill(P.stone1)
    // molduras das janelas
    for (const w of wins) g.rect(w.x - 1, w.y - 1, w.w + 2, w.h + 2).fill(P.void)
  }

  function drawCracks() {
    cracks.clear()
    for (const w of wins) {
      if (w.crackT < 0 || c.time - w.crackT > 1.2) continue
      const cx = w.x + w.w / 2
      const cy = w.y + w.h / 2
      for (let a = 0; a < 5; a++) {
        const ang = a * 1.3 + 0.4
        for (let r = 0; r < Math.min(w.w, w.h) / 2 - 1; r++)
          cracks.rect(
            Math.round(cx + Math.cos(ang) * r),
            Math.round(cy + Math.sin(ang) * r + (r % 3 === 0 ? 1 : 0)),
            1,
            1,
          )
      }
    }
    cracks.fill(P.stoneHi)
  }

  function hitAt(x: number, y: number) {
    const w = wins.find((o) => x >= o.x - 4 && x <= o.x + o.w + 4 && y >= o.y - 4 && y <= o.y + o.h + 4)
    const it = w?.item
    if (!w || !it || it.hitT > 0 || c.time < it.t0) return false
    it.hitT = c.time
    const cx = w.x + w.w / 2
    const cy = w.y + w.h / 2
    if (it.good) {
      c.addScore(60, cx, w.y - 4)
      combo.hit(cx, w.y - 12)
      c.fx.ring(cx, cy, P.goldHi, 22)
      field.blast(cx, cy, 16, 60, GOLD, { add: true })
      field.blast(cx, cy, 8, 40, [P.sparkle, P.blue1, P.blue0])
      field.sparkle(cx + 6, cy - 6)
      c.sfx('coin', { x: cx, combo: combo.n })
    } else {
      w.crackT = c.time
      combo.reset()
      field.blast(cx, cy, 14, 60, [P.stoneHi, P.stone3, P.stone2], { grav: 180 })
      field.blast(cx, cy, 10, 50, ENERGY, { add: true })
      c.sfx('shatter', { x: cx })
      c.hit(cx, cy)
    }
    return true
  }

  return {
    duration: 25,
    goal: 1000,
    init(ctx) {
      c = ctx
      c.stage.addChild(root)
      field = new Field(c)
      field.trail = GOLD
      combo = new Combo(c, field, 1.5)
      good = carteiraTex()
      bad = golpeTex()
      const portrait = c.W < c.H
      const cols = portrait ? 3 : 5
      const rows = portrait ? 4 : 3
      const availH = c.bottom - c.top - 30
      cw = Math.min(30, Math.floor((c.W - 30) / cols) - 4)
      ch = Math.min(28, Math.floor((availH - 18) / rows) - 6)
      bw = cols * (cw + 6) + 10
      bh = rows * (ch + 6) + 22
      bx = Math.round(c.W / 2 - bw / 2)
      by = Math.round(c.top + 20 + (availH - bh) / 2)
      for (const kind of ['off', 'gold', 'red'] as const)
        for (let l = 0; l < 5; l++) winTex[`${kind}${l}`] = windowTex(cw, ch, kind, l)
      for (let r = 0; r < rows; r++)
        for (let k = 0; k < cols; k++) {
          const x = bx + 8 + k * (cw + 6)
          const y = by + 8 + r * (ch + 6)
          const s = spr(good, x + cw / 2, y + ch, 0.5, 1)
          s.visible = false
          const pix = label('PIX?', P.white)
          pix.visible = false
          pix.x = Math.round(x + cw / 2)
          pix.y = y + 5
          const off = offTex(cw, ch, Math.floor(c.rnd() * 4))
          const pane = spr(off, x, y, 0, 0)
          wins.push({
            off,
            x,
            y,
            w: cw,
            h: ch,
            item: null,
            light: 0,
            crackT: -1,
            kind: 'gold',
            pane,
            spr: s,
            pix,
          })
        }
      drawFacade()
      const panes = new Container()
      for (const w of wins) {
        panes.addChild(w.pane)
        items.addChild(w.spr)
      }
      for (const w of wins) items.addChild(w.pix)
      // vizinhos em silhueta (plano de trás) e postes no primeiro plano: profundidade
      const back = new Graphics()
      let nx = 0
      while (nx < c.W) {
        const w2 = 14 + Math.floor(c.rnd() * 18)
        const h2 = Math.round(bh * (0.45 + c.rnd() * 0.45))
        if (nx + w2 < bx - 2 || nx > bx + bw + 2) {
          back.rect(nx, by + bh - h2, w2, h2).fill(P.night)
          back.rect(nx, by + bh - h2, w2, 1).fill(P.hazeDark)
          for (let k = 0; k < (w2 * h2) / 70; k++)
            back
              .rect(
                nx + 2 + Math.floor(c.rnd() * (w2 - 4)),
                by + bh - h2 + 3 + Math.floor(c.rnd() * (h2 - 5)),
                1,
                1,
              )
              .fill(c.rnd() < 0.7 ? P.gold1 : P.ember)
        }
        nx += w2 + 2
      }
      const front = new Graphics()
      for (const lx of [Math.round(bx - 10), Math.round(bx + bw + 9)]) {
        front.rect(lx, by + bh - 26, 1, 27).fill(P.void)
        front.rect(lx - 2, by + bh - 27, 5, 2).fill(P.void)
        front.rect(lx - 1, by + bh - 25, 3, 1).fill(P.goldHi)
      }
      const lamps = [Math.round(bx - 10), Math.round(bx + bw + 9)].map((lx) => {
        const s = spr(glowTex(6, [P.white, P.goldHi, P.gold, P.gold1, P.gold0]), lx, by + bh - 24)
        s.blendMode = 'add'
        s.alpha = 0.5
        return s
      })
      // luz do letreiro escorrendo na fachada (pontilhado vermelho logo abaixo)
      const spill = new Graphics()
      for (let x = Math.round(bx + bw / 2 - 20); x < bx + bw / 2 + 20; x++)
        if (x % 2 === 0) spill.rect(x, by + 1, 1, 1).fill(P.crimson)
      neon = label('VAGAS', P.redHot)
      neon.x = Math.round(bx + bw / 2)
      neon.y = by - 8
      beacon = spr(glowTex(3, ENERGY), bx + bw - 10, by - 17)
      beacon.blendMode = 'add'
      const shadow = spr(shadowTex(Math.round(bw + 20)), bx + bw / 2, by + bh + 1)
      root.addChild(
        back,
        shadow,
        facade,
        spill,
        panes,
        items,
        cracks,
        field.root,
        neon,
        beacon,
        front,
        ...lamps,
        combo.text,
      )
    },
    update(dt) {
      const d = curve(c.time, 25)
      spawn -= dt
      if (spawn <= 0) {
        spawn = lerp(0.8, 0.34, d)
        const free = wins.filter((w) => !w.item && w.light < 0.05)
        const w = free[Math.floor(c.rnd() * free.length)]
        // a luz acende antes de o item subir e a cor já avisa: ouro = vaga (0,15 s), sangue = golpe (0,3 s)
        if (w) {
          const good = c.rnd() > lerp(0.22, 0.36, d)
          w.item = { good, t0: c.time + (good ? 0.15 : 0.3), life: lerp(1.5, 0.85, d), hitT: -1 }
        }
      }
      tap.poll(c.time, hitAt)
      for (const w of wins) {
        const it = w.item
        if (it) {
          const age = c.time - it.t0
          if (it.hitT > 0 && c.time - it.hitT > 0.3) w.item = null
          else if (it.hitT < 0 && age > it.life) w.item = null
        }
        const on = !!w.item && w.item.hitT < 0
        w.light = on ? 1 : Math.max(0, w.light - dt * 2.5)
        const cur = w.item
        // acende piscando (2 cintilações em 0,15 s), apaga em degraus na mesma cor
        if (cur) w.kind = cur.good ? 'gold' : 'red'
        const flick = !!cur && c.time < cur.t0 && frameAt(c.time, 30, 2) === 0
        const lvl = flick ? 2 : cur ? 4 : Math.round(w.light * 4)
        w.pane.texture = lvl <= 0 ? w.off : lit(w.kind, lvl)
        if (!cur || c.time < cur.t0) {
          w.spr.visible = false
          w.pix.visible = false
          continue
        }
        const age = c.time - cur.t0
        // sobe de trás do peitoril (recorte por linhas, sem máscara), desce ao sair
        const tex = cur.good ? good : bad
        const th = tex.frame.height
        const rise = clamp01(age / 0.12)
        const leave = clamp01((age - cur.life + 0.15) / 0.15)
        let vis = Math.round(th * rise * (1 - leave))
        let yo = 0
        if (cur.hitT > 0) {
          const k = c.time - cur.hitT
          vis = th
          yo = cur.good ? -Math.round(k * 80) : Math.round(k * 30)
        }
        w.spr.visible = vis > 0
        w.spr.texture = subTex(cur.good ? 'g' : 'b', tex, 0, 0, tex.frame.width, Math.max(1, vis))
        w.spr.x = Math.round(w.x + w.w / 2)
        w.spr.y = Math.round(w.y + w.h - 2 + yo)
        if (cur.hitT > 0 && cur.good) {
          const [sx, sy] = popScale(c.time - cur.hitT)
          setSquash(w.spr, sx, sy)
        } else setSquash(w.spr, 1, 1)
        w.spr.alpha = cur.hitT > 0 && !cur.good ? (frameAt(c.time, 20, 2) ? 1 : 0.4) : 1
        w.pix.visible = !cur.good && cur.hitT < 0 && rise >= 1 && leave <= 0
      }
      drawCracks()
      // letreiro neon: 2 cores alternando a cada 4 quadros, com falha ocasional
      neon.style.fill = frameAt(c.time, 15, 2) ? P.redHot : P.red
      neon.alpha = c.rnd() < 0.01 ? 0.4 : 1
      beacon.alpha = frameAt(c.time, 1.5, 2) ? 0.7 : 0.1
      if (c.rnd() < 0.08) field.ember(bx + c.rnd() * bw, by + bh, ENERGY)
      combo.update()
      field.update(dt)
    },
    move(x, y) {
      field.pointer(x, y)
    },
    down(x, y) {
      field.pointer(x, y, true)
      if (!hitAt(x, y)) {
        tap.push(x, y, c.time)
        c.sfx('tap')
      }
    },
    clear() {
      let n = 0
      for (const w of wins) {
        if (!w.item || w.item.hitT > 0) continue
        if (w.item.good) c.addScore(60, w.x + w.w / 2, w.y)
        else field.blast(w.x + w.w / 2, w.y + w.h / 2, 8, 40, [P.stone3, P.stone2])
        w.item.hitT = c.time
        n++
      }
      return n > 0
    },
    timeUp() {
      return true
    },
    dispose() {
      root.destroy({ children: true })
    },
  }
}
