// Fase 6 · Escola que Paga: duas pistas no ritmo do baião; cada acerto é uma presença no Pé-de-Meia.
// Notas com anel de aproximação que fecha exatamente no tempo, receptores que pulsam na batida,
// PERFEITO/BOM com pop, moedas voando até o cofrinho, combo com marcos.
import { Container, Graphics, type Sprite, type Text, type Texture } from 'pixi.js'
import { px } from '../engine/textures'
import type { GameCtx, MicroGame } from '../engine/types'
import {
  clamp01,
  coinFrames,
  curve,
  ENERGY,
  easeOutBack,
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
} from './kit-a'

type Lane = 0 | 1

interface Note {
  t: number
  lane: Lane
  judged: boolean
  missT: number
  s: Sprite
}

/** livro 14×14 com capa vermelha, lombada e páginas */
function bookTex() {
  return gridTex('ritmo-book', () => {
    const m = new Grid(14, 14)
    m.rect(2, 2, 10, 9, 1)
    m.rect(2, 2, 2, 9, 2)
    m.rect(3, 11, 9, 2, 3)
    const g = shade(m, {
      1: { ramp: [P.blood0, P.crimsonDeep, P.crimson, P.red, P.redGlow], rim: P.redHot },
      2: { ramp: [P.blood0, P.blood1, P.crimsonDeep, P.crimson] },
      3: { ramp: [P.stone1, P.stone2, P.stone3, P.stoneHi] },
    })
    g.rect(6, 4, 4, 1, P.goldHi)
    g.rect(6, 6, 3, 1, P.gold)
    return g
  })
}

/** cofrinho dourado 28×22 (Pé-de-Meia) */
function piggyTex() {
  return gridTex('ritmo-piggy', () => {
    const m = new Grid(28, 22)
    m.ellipse(13, 11, 10.5, 7.5, 1)
    m.ellipse(23, 11, 3, 2.6, 2)
    m.rect(7, 16, 3, 4, 3).rect(16, 16, 3, 4, 3)
    m.rect(8, 3, 3, 3, 3)
    const g = shade(m, {
      1: { ramp: [P.gold0, P.gold1, P.gold, P.goldHi, P.sparkle], rim: P.redHot, grain: 0.05 },
      2: { ramp: [P.gold0, P.gold1, P.gold, P.goldHi] },
      3: { ramp: [P.gold0, P.gold1, P.gold, P.gold] },
    })
    g.set(18, 8, P.void)
    g.rect(23, 10, 1, 2, P.gold0)
    g.rect(10, 4, 6, 1, P.void)
    g.set(3, 9, P.gold1)
    g.set(2, 8, P.gold1)
    return g
  })
}

/** receptor 22×22: anel de pedra com aro vermelho; `hot` = aceso na batida */
function receptorTex(hot: boolean) {
  return gridTex(`ritmo-rec${hot ? 1 : 0}`, () => {
    const m = new Grid(22, 22)
    m.ellipse(10.5, 10.5, 9.5, 9.5, 1)
    m.ellipse(10.5, 10.5, 6.5, 6.5, 0)
    const g = shade(m, {
      1: {
        ramp: hot
          ? [P.blood0, P.crimson, P.red, P.redHot, P.redGlow]
          : [P.void, P.stone0, P.stone1, P.stone2, P.stone3],
        rim: P.redHot,
      },
    })
    return g
  })
}

export default function ritmo(): MicroGame {
  let c: GameCtx
  const root = new Container()
  let field: Field
  const notes: Note[] = []
  const beat = 60 / 116
  const travel = 1.7
  let top = 0
  let lineY = 0
  let laneX: [number, number] = [0, 0]
  let combo = 0
  let misses = 0
  let total = 0
  let jar = 0
  let coins: Texture[] = []
  const rec: Sprite[] = []
  const recGlow: Sprite[] = []
  const press = [-1, -1]
  const missFlash = [-1, -1]
  const judges: { t: Text; at: number; perfect: boolean }[] = []
  const flyers: { s: Sprite; x0: number; y0: number; t: number }[] = []
  const bars: Sprite[] = []
  const rings = new Graphics()
  const lanes = new Graphics()
  const bar = new Graphics()
  let piggy: Sprite
  let piggyPop = -1
  let comboT: Text
  let recOn: Texture
  let recOff: Texture
  // buffer de 100 ms para toque adiantado
  const buffered: [number, number] = [-1, -1]
  let px0 = 0
  let py0 = 0

  const noteY = (n: Note) => top + (lineY - top) * (1 - (n.t - c.time) / travel)

  function drawBar() {
    const fill = Math.min(1, jar / Math.max(1, total * 0.8))
    const w = 30
    bar.clear()
    bar.rect(px0 - w / 2 - 1, py0 + 13, w + 2, 5).fill(P.void)
    bar.rect(px0 - w / 2, py0 + 14, w, 3).fill(P.blood1)
    bar.rect(px0 - w / 2, py0 + 14, Math.round(w * fill), 3).fill(P.gold)
    bar.rect(px0 - w / 2, py0 + 14, Math.round(w * fill), 1).fill(P.goldHi)
  }

  function judge(lane: Lane): boolean {
    const now = c.time
    let best: Note | null = null
    let bd = 0.17
    for (const n of notes) {
      if (n.judged || n.lane !== lane) continue
      const d = Math.abs(n.t - now)
      if (d < bd) {
        bd = d
        best = n
      }
    }
    if (!best) return false
    best.judged = true
    best.s.visible = false
    combo++
    jar++
    const perfect = bd < 0.075
    const x = laneX[lane]
    const pts = (perfect ? 100 : 60) + Math.min(combo, 20) * 2
    c.addScore(pts)
    c.fx.ring(x, lineY, perfect ? P.goldHi : P.stoneHi, perfect ? 20 : 14)
    field.blast(x, lineY, perfect ? 18 : 8, perfect ? 70 : 45, perfect ? GOLD : ENERGY, { add: true })
    if (perfect) field.sparkle(x + 8, lineY - 8)
    c.sfx(perfect ? 'coin' : 'good')
    const j = judges[lane]
    if (j) {
      j.at = now
      j.perfect = perfect
      j.t.text = perfect ? 'PERFEITO' : 'BOM'
      j.t.x = x
    }
    // a presença vira moeda que voa até o cofrinho
    const f = flyers.find((k) => k.t < 0)
    if (f) {
      f.t = 0
      f.x0 = x
      f.y0 = lineY
      f.s.visible = true
    }
    if (combo > 0 && combo % 10 === 0) {
      c.fx.ring(px0, py0, P.redHot, 30)
      c.fx.float(`COMBO ${combo}`, px0, py0 - 24, P.emberBright)
      field.blast(px0, py0, 20, 70, ENERGY, { add: true })
    }
    return true
  }

  function tapLane(lane: Lane) {
    press[lane] = c.time
    if (!judge(lane)) buffered[lane] = c.time + 0.1
  }

  return {
    duration: 26,
    goal: 2600,
    init(ctx) {
      c = ctx
      c.stage.addChild(root)
      field = new Field(c)
      coins = coinFrames()
      recOn = receptorTex(true)
      recOff = receptorTex(false)
      top = c.top + 6
      lineY = c.bottom - 30
      const off = Math.round(Math.min(48, c.W * 0.22))
      laneX = [Math.round(c.W / 2 - off), Math.round(c.W / 2 + off)]
      px0 = Math.round(c.W / 2)
      py0 = Math.round(lineY - 44)
      // partitura: fácil nos 10 s iniciais, colcheias crescem até o pico (~70%), alívio no fim
      let t = 2
      let lane: Lane = 0
      const book = bookTex()
      while (t < 25.5) {
        const s = spr(lane ? book : (coins[0] as Texture), laneX[lane], 0)
        s.visible = false
        notes.push({ t, lane, judged: false, missT: -1, s })
        const d = curve(t, 26)
        const r = c.rnd()
        lane = r < lerp(0.4, 0.6, d) ? (lane ? 0 : 1) : lane
        t += r < 0.35 * d ? beat / 2 : r > 1 - lerp(0.3, 0.1, d) ? beat * 2 : beat
      }
      total = notes.length

      // pistas: faixa escura, bordas, e marcas de compasso descendo
      for (const x of laneX) {
        lanes.rect(x - 13, top, 26, lineY - top + 12).fill({ color: P.night, alpha: 0.75 })
        lanes.rect(x - 14, top, 1, lineY - top + 12).fill(P.hazeDark)
        lanes.rect(x + 13, top, 1, lineY - top + 12).fill(P.hazeDark)
        lanes.rect(x - 13, top, 26, 1).fill(P.haze)
      }
      for (let i = 0; i < 16; i++) {
        const b = spr(px(), 0, 0, 0.5, 0.5)
        b.width = 24
        b.height = 1
        b.tint = P.hazeDark
        bars.push(b)
      }
      root.addChild(lanes, ...bars)
      for (const lane2 of [0, 1] as const) {
        const g = spr(glowTex(14, ENERGY), laneX[lane2], lineY)
        g.blendMode = 'add'
        g.alpha = 0
        recGlow.push(g)
        const r = spr(recOff, laneX[lane2], lineY)
        rec.push(r)
        const arrow = label(lane2 ? '→' : '←', P.stone2)
        arrow.x = laneX[lane2]
        arrow.y = lineY + 20
        const jt = label('', P.goldHi)
        jt.visible = false
        jt.y = lineY + 20
        judges.push({ t: jt, at: -9, perfect: false })
        root.addChild(g, r, arrow)
      }
      root.addChild(rings)
      for (const n of notes) root.addChild(n.s)
      const shadow = spr(shadowTex(26), px0, py0 + 11)
      piggy = spr(piggyTex(), px0, py0)
      comboT = label('', P.emberBright)
      comboT.x = px0
      comboT.y = py0 - 18
      root.addChild(shadow, piggy, bar, comboT)
      for (let i = 0; i < 8; i++) {
        const s = spr(coins[0] as Texture, 0, 0)
        s.visible = false
        root.addChild(s)
        flyers.push({ s, x0: 0, y0: 0, t: -1 })
      }
      root.addChild(field.root)
      for (const j of judges) root.addChild(j.t)
      drawBar()
    },
    update(dt) {
      const now = c.time
      // buffer: um toque até 100 ms adiantado ainda conta quando a nota entra na janela
      for (const lane of [0, 1] as const) {
        const until = buffered[lane]
        if (until > 0) {
          if (judge(lane)) buffered[lane] = -1
          else if (now > until) {
            buffered[lane] = -1
            c.sfx('tap')
          }
        }
      }
      for (const n of notes) {
        if (!n.judged && now - n.t > 0.18) {
          n.judged = true
          n.missT = now
          combo = 0
          misses++
          missFlash[n.lane] = now
          if (misses % 4 === 0) c.hit(laneX[n.lane], lineY)
          else c.sfx('tick')
        }
        const ahead = n.t - now
        if (!n.judged && ahead < travel && ahead > -0.2) {
          n.s.visible = true
          n.s.y = Math.round(noteY(n))
          if (n.lane === 0) n.s.texture = coins[frameAt(now + n.t, 10, coins.length)] as Texture
          n.s.alpha = 1
        } else if (n.missT > 0 && now - n.missT < 0.35) {
          // a nota perdida segue caindo e apaga em degraus
          n.s.visible = true
          n.s.y = Math.round(noteY(n))
          n.s.alpha = now - n.missT < 0.15 ? 0.6 : 0.3
          n.s.tint = P.stone2
        } else n.s.visible = false
      }
      // anel de aproximação: fecha no raio do receptor exatamente no tempo da nota
      rings.clear()
      for (const n of notes) {
        if (n.judged) continue
        const ahead = n.t - now
        if (ahead > 0.55 || ahead < -0.05) continue
        const r = 8 + Math.max(0, ahead) * 44
        const x = laneX[n.lane]
        const steps = Math.max(16, Math.round(r * 5))
        for (let i = 0; i < steps; i++) {
          const a = (i / steps) * Math.PI * 2
          rings.rect(Math.round(x + Math.cos(a) * r), Math.round(lineY + Math.sin(a) * r), 1, 1)
        }
        rings.fill({ color: n.lane ? P.redHot : P.goldHi, alpha: ahead < 0.12 ? 1 : 0.7 })
      }
      // marcas de compasso descendo na velocidade das notas
      const phase = (now % beat) / beat
      bars.forEach((b, i) => {
        const lane = i % 2
        const k = Math.floor(i / 2)
        const y = lineY - ((k + 1 - phase) * beat * (lineY - top)) / travel
        b.visible = y > top + 1 && y < lineY - 10
        b.x = laneX[lane as Lane]
        b.y = Math.round(y)
      })
      const onBeat = phase < 0.12
      for (const lane of [0, 1] as const) {
        const r = rec[lane]
        const g = recGlow[lane]
        if (!r || !g) continue
        const pressed = now - (press[lane] ?? -1) < 0.08
        const missed = now - (missFlash[lane] ?? -1) < 0.15
        r.texture = pressed || onBeat ? recOn : recOff
        r.tint = missed ? P.stone2 : 0xffffff
        r.y = lineY + (pressed ? 1 : 0)
        g.alpha = pressed ? 0.7 : onBeat ? 0.3 : 0
      }
      for (const j of judges) {
        const age = now - j.at
        j.t.visible = age < 0.5
        if (!j.t.visible) continue
        // pop: sobe 4 px com ease-out-back, 1 quadro branco no início
        j.t.y = Math.round(lineY + 20 - 4 * easeOutBack(clamp01(age / 0.15)))
        j.t.style.fill = age < 0.034 ? P.white : j.perfect ? P.goldHi : P.stoneHi
        j.t.alpha = age > 0.4 ? 0.5 : 1
      }
      for (const f of flyers) {
        if (f.t < 0) continue
        f.t += dt / 0.32
        const k = clamp01(f.t)
        f.s.x = Math.round(lerp(f.x0, px0, k))
        f.s.y = Math.round(lerp(f.y0, py0 - 6, k) - Math.sin(k * Math.PI) * 18)
        f.s.texture = coins[frameAt(now, 14, coins.length)] as Texture
        if (k >= 1) {
          f.t = -1
          f.s.visible = false
          piggyPop = now
          field.blast(px0, py0 - 8, 5, 30, GOLD, { add: true, life: 0.3 })
          drawBar()
        }
      }
      const [sx, sy] = popScale(piggyPop < 0 ? 1 : now - piggyPop)
      setSquash(piggy, sx, sy)
      comboT.text = combo > 3 ? `${combo}x` : ''
      if (c.rnd() < 0.06) field.ember(c.rnd() * c.W, c.bottom, ENERGY)
      field.update(dt)
    },
    down(x, y) {
      field.pointer(x, y, true)
      tapLane(x < c.W / 2 ? 0 : 1)
    },
    move(x, y) {
      field.pointer(x, y)
    },
    key(k, down) {
      if (!down) return
      if (k === 'ArrowLeft' || k === 'f' || k === 'a') tapLane(0)
      if (k === 'ArrowRight' || k === 'j' || k === 'l') tapLane(1)
    },
    clear() {
      const near = notes.filter((n) => !n.judged && n.t - c.time < travel && n.t - c.time > -0.1)
      if (!near.length) return false
      for (const n of near) {
        n.judged = true
        n.s.visible = false
        jar++
        c.addScore(100)
        field.blast(laneX[n.lane], noteY(n), 6, 40, GOLD, { add: true })
      }
      drawBar()
      return true
    },
    timeUp() {
      return jar >= total * 0.5
    },
    dispose() {
      root.destroy({ children: true })
    },
  }
}
