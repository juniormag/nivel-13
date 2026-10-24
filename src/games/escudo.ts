// Fase 11 · Soberania: gire o escudo em volta do Brasil e bloqueie tarifas e sanções.
// Brasil em pixels (cores da bandeira) no centro, arco de escudo dourado com brilho em 3 camadas,
// setas de tarifa com rastro de energia e aviso na borda antes de entrarem. Bloqueio perfeito solta ouro.
// Feel (números), curva ramp(): intervalo max(0,42, 1,08 − 0,62k) s; velocidade 44 + 40k (+0..14) px/s; dispersão
// 0,8 + 1,2k rad em volta do nordeste (70% → 50%). Arco 1,25 rad + 0,1 rad de folga; a seta ainda pode ser bloqueada
// por 50 ms (3 quadros) depois de cruzar o raio. Perfeito (centro 18% do arco): +45, hit-stop 60 ms; normal +30;
// sequência +2 por passo (até +20). Aviso pisca na borda da arena enquanto a seta está fora.
import { Container, Graphics, Sprite, type Texture } from 'pixi.js'
import { inBrazil, LAT0, LAT1, LON0, LON1 } from '../content/brazil'
import type { GameCtx, MicroGame } from '../engine/types'
import { FlyToHud, graniteAt, TutorialHand } from './fx-c'
import {
  bake,
  bakeRotated,
  Debris,
  Embers,
  Explosions,
  energyDot,
  joy,
  P,
  ramp,
  ScorePops,
  Sparkles,
  stop,
} from './kit-b'

interface Shot {
  a: number
  r: number
  sp: number
  s: Sprite
  warned: boolean
}

const DUR = 30
const ARC = 1.25
const GRACE = 0.1
const DIRS = 16

function arrowTex() {
  return bake('tarifa16', 17, 9, (p) => {
    // haste
    p.rect(0, 3, 11, 3, P.crimson)
    p.rect(0, 3, 11, 1, P.redHot)
    p.rect(0, 5, 11, 1, P.crimsonDeep)
    // ponta
    for (let i = 0; i < 5; i++) p.rect(10 + i, i, 1, 9 - i * 2, i === 4 ? P.sparkle : P.red)
    p.rect(10, 1, 4, 1, P.redGlow)
    p.dot(15, 4, P.white)
    // penas
    p.rect(0, 1, 3, 1, P.crimsonDeep)
    p.rect(0, 7, 3, 1, P.crimsonDeep)
    p.outline(P.void, P.blood0)
  })
}

export default function escudo(): MicroGame {
  let c: GameCtx
  const root = new Container()
  const arena = new Graphics()
  const map = new Sprite()
  const wounds = new Graphics()
  const shieldG = new Graphics()
  const shieldGlow = new Graphics()
  const trails = new Graphics()
  const warn = new Graphics()
  const shotLayer = new Container()
  const debris = new Debris(60)
  let embers: Embers
  let sparkles: Sparkles
  let scores: ScorePops
  let booms: Explosions
  let fly: FlyToHud
  let hand: TutorialHand
  /** o erro ensina: onde o escudo devia estar quando a última seta passou */
  let miss = { a: 0, t: -10 }
  /** primeiro golpe só ensina; o arco fantasma dele fica 1,6 s */
  let taught = false
  let missLong = false
  const MAP_T = 3
  /** bloqueios seguidos (bônus +2 por passo, até +20) */
  let streak = 0
  let cx = 0
  let cy = 0
  let R = 30
  let Ro = 60
  let S = 40
  let ang = -Math.PI / 4
  let shots: Shot[] = []
  let spawn = 1.1
  let keyDir = 0
  let dragging = false
  let hitFlash = -10
  let santos = { x: 0, y: 0 }
  const dirTex: Texture[] = []
  let hurt: { x: number; y: number; t: number }[] = []

  const angDiff = (a: number, b: number) => Math.atan2(Math.sin(a - b), Math.cos(a - b))

  function mapTex() {
    return bake(`brasil3q${S}`, S + 2 + MAP_T, S + 2 + MAP_T, (p) => {
      const inside = (i: number, j: number) => {
        if (i < 0 || j < 0 || i >= S || j >= S) return false
        const lon = LON0 + ((i + 0.5) / S) * (LON1 - LON0)
        const lat = LAT0 + ((j + 0.5) / S) * (LAT1 - LAT0)
        return inBrazil(lon, lat)
      }
      // três quartos: o mapa é uma peça grossa; a lateral (verde escuro em granito) aparece embaixo à direita
      for (let d = MAP_T; d >= 1; d--)
        for (let j = 0; j < S; j++)
          for (let i = 0; i < S; i++)
            if (inside(i, j))
              p.dot(
                i + 1 + d,
                j + 1 + d,
                d === MAP_T ? P.gold1 : graniteAt(i + d, j + d, P.vine0, P.void, P.vine1),
              )
      const mx = S * 0.56
      const my = S * 0.4
      for (let j = 0; j < S; j++)
        for (let i = 0; i < S; i++) {
          if (!inside(i, j)) continue
          let col: number = P.green
          // losango e globo da bandeira
          const rx = Math.abs(i - mx) / (S * 0.36) + Math.abs(j - my) / (S * 0.22)
          if (rx < 1) col = P.gold
          if (rx < 1 && rx > 0.86) col = P.gold1
          const d = Math.hypot(i - mx, j - my)
          if (d < S * 0.12) col = P.blue0
          if (d < S * 0.12 && Math.abs(j - my + (i - mx) * 0.25) < 1) col = P.stoneHi
          if (d < S * 0.12 && (i * 7 + j * 3) % 11 === 0) col = P.sparkle
          // luz em cima/esquerda, sombra embaixo/direita
          if (col === P.green) {
            if (!inside(i - 1, j) || !inside(i, j - 1)) col = P.leafHi
            else if (!inside(i + 1, j) || !inside(i, j + 1) || !inside(i + 1, j + 1)) col = P.vine1
          }
          p.dot(i + 1, j + 1, col)
        }
      p.outline(P.void, P.vine0)
      p.rim(P.goldHi, 't')
    })
  }

  function drawArena() {
    arena.clear()
    // disco escuro atrás do Brasil: centro legível sobre qualquer cenário
    for (let y = -R - 6; y <= R + 6; y++) {
      const hw = Math.round(Math.sqrt(Math.max(0, (R + 6) * (R + 6) - y * y)))
      arena.rect(cx - hw, cy + y, hw * 2 + 1, 1)
    }
    arena.fill({ color: P.night, alpha: 0.7 })
    // mar pontilhado em volta do mapa
    for (let y = -R + 3; y <= R - 3; y += 1)
      for (let x = -R + 3; x <= R - 3; x += 1) {
        const d = Math.hypot(x, y)
        if (d > R - 3 || d < S * 0.5 || (x + y) % 2 !== 0) continue
        if ((x * 3 + y * 5) % 7 === 0) arena.rect(cx + x, cy + y, 1, 1)
      }
    arena.fill({ color: P.blue0, alpha: 0.9 })
    // anéis guia
    const ring = (r: number, step: number) => {
      const n = Math.round(r * 6.28)
      for (let i = 0; i < n; i += step) {
        const a = (i / n) * Math.PI * 2
        arena.rect(Math.round(cx + Math.cos(a) * r), Math.round(cy + Math.sin(a) * r), 1, 1)
      }
    }
    ring(R, 1)
    arena.fill(P.hazeDark)
    ring(Ro, 3)
    arena.fill(P.dusk)
  }

  function drawShield() {
    const g = shieldG
    const gl = shieldGlow
    g.clear()
    gl.clear()
    const white = c.time - hitFlash < 0.034
    const red = !white && c.time - hitFlash < 0.05
    const step = 1 / (R + 3)
    const half = ARC / 2
    // halo pontilhado (aditivo, ≤ 70%)
    for (let a = -half - 0.04; a <= half + 0.04; a += step) {
      const ca = Math.cos(ang + a)
      const sa = Math.sin(ang + a)
      for (const rr of [R - 3, R + 3]) {
        const x = Math.round(cx + ca * rr)
        const y = Math.round(cy + sa * rr)
        if ((x + y) % 2 === 0) gl.rect(x, y, 1, 1)
      }
    }
    gl.fill({ color: P.gold, alpha: 0.45 })
    for (let a = -half; a <= half; a += step) {
      const ca = Math.cos(ang + a)
      const sa = Math.sin(ang + a)
      g.rect(Math.round(cx + ca * (R + 2)), Math.round(cy + sa * (R + 2)), 1, 1)
    }
    g.fill(white ? P.white : red ? P.redHot : P.gold1)
    for (let a = -half; a <= half; a += step) {
      const ca = Math.cos(ang + a)
      const sa = Math.sin(ang + a)
      g.rect(Math.round(cx + ca * (R + 1)), Math.round(cy + sa * (R + 1)), 1, 1)
      g.rect(Math.round(cx + ca * (R - 1)), Math.round(cy + sa * (R - 1)), 1, 1)
    }
    g.fill(white ? P.white : red ? P.redHot : P.gold)
    for (let a = -half + 0.03; a <= half - 0.03; a += step) {
      g.rect(Math.round(cx + Math.cos(ang + a) * R), Math.round(cy + Math.sin(ang + a) * R), 1, 1)
    }
    g.fill(white ? P.white : P.goldHi)
    // pontas e um brilho que corre pelo arco
    for (const e of [-half, half])
      energyDot(gl, cx + Math.cos(ang + e) * R, cy + Math.sin(ang + e) * R, P.white, P.goldHi, P.gold)
    const run = -half + ((c.time * 1.4) % 1) * ARC
    energyDot(gl, cx + Math.cos(ang + run) * R, cy + Math.sin(ang + run) * R, P.white, P.goldHi, P.gold1)
  }

  /** arco fantasma dourado onde o escudo devia estar (0,7 s depois do dano), pontilhado e piscando */
  function drawMiss() {
    const t = c.time - miss.t
    const life = missLong ? 1.6 : 0.7
    if (t > life || (Math.floor(t * 10) % 2 === 1 && t > life - 0.4)) return
    const g = shieldGlow
    const half = ARC / 2
    for (let a = -half; a <= half; a += 2 / (R + 3)) {
      const x = Math.round(cx + Math.cos(miss.a + a) * R)
      const y = Math.round(cy + Math.sin(miss.a + a) * R)
      g.rect(x, y, 1, 1)
    }
    g.fill({ color: P.goldHi, alpha: 0.7 })
  }

  function block(s: Shot, perfect: boolean) {
    const x = Math.round(cx + Math.cos(s.a) * R)
    const y = Math.round(cy + Math.sin(s.a) * R)
    hitFlash = c.time
    const ox = Math.cos(s.a)
    const oy = Math.sin(s.a)
    // a seta se quebra e os pedaços ricocheteiam para fora
    for (let i = 0; i < 6; i++)
      debris.spawn(
        x + ox * 4,
        y + oy * 4,
        i % 2 ? P.red : P.crimson,
        ox * (40 + c.rnd() * 50) + (c.rnd() - 0.5) * 40,
        oy * (40 + c.rnd() * 50) - 20,
        2,
        1,
        0.6,
      )
    embers.blast(x, y, 120, 40)
    if (perfect) {
      streak++
      scores.score(
        45 + Math.min(20, (streak - 1) * 2),
        x + Math.round(ox * 12),
        y + Math.round(oy * 12),
        streak,
        embers,
      )
      scores.add('PERFEITO', x + Math.round(ox * 12), y + Math.round(oy * 12) - 10, P.goldHi, false)
      joy(c, 2, 160)
      stop(c, 60)
      c.fx.burst(x, y, P.goldHi, 14, 70)
      c.fx.ring(x, y, P.gold, 18)
      sparkles.spawn(x, y, 9)
      fly.send(x, y, 3)
      c.sfx('perfect', { x, combo: streak })
    } else {
      streak++
      scores.score(
        30 + Math.min(20, (streak - 1) * 2),
        x + Math.round(ox * 12),
        y + Math.round(oy * 12),
        streak,
        embers,
      )
      c.fx.burst(x, y, P.gold, 8, 50)
      c.fx.ring(x, y, P.goldHi, 10)
      c.sfx('shield', { x, combo: streak })
    }
  }

  return {
    duration: DUR,
    goal: 750,
    init(ctx) {
      c = ctx
      c.stage.addChild(root)
      cx = Math.round(c.W / 2)
      cy = Math.round((c.top + c.bottom) / 2)
      R = Math.round(Math.min(c.W, c.bottom - c.top) * 0.24)
      Ro = Math.round(Math.min(c.W / 2 - 6, (c.bottom - c.top) / 2 - 6))
      S = Math.round(R * 1.36)
      map.texture = mapTex()
      map.x = Math.round(cx - (S + 2) / 2) - 1
      map.y = Math.round(cy - (S + 2) / 2) - 1
      santos = {
        x: map.x + 1 + Math.round(((-46.3 - LON0) / (LON1 - LON0)) * S),
        y: map.y + 1 + Math.round(((-24.0 - LAT0) / (LAT1 - LAT0)) * S),
      }
      const base = arrowTex()
      for (let i = 0; i < DIRS; i++) dirTex.push(bakeRotated('tarifa16', base, (i / DIRS) * Math.PI * 2))
      drawArena()
      shieldGlow.blendMode = 'add'
      trails.blendMode = 'add'
      embers = new Embers(c, { x0: 0, y0: c.top, x1: c.W, y1: c.bottom }, { ambient: 22 }).listen()
      sparkles = new Sparkles(c.reduced)
      scores = new ScorePops(c)
      booms = new Explosions(c)
      fly = new FlyToHud(c)
      // demonstração: a mão gira em volta do Brasil nos 3 primeiros segundos
      hand = new TutorialHand(c, { kind: 'circle', x: cx, y: cy, r: R + 10 })
      root.addChild(
        arena,
        embers.root,
        trails,
        map,
        wounds,
        shotLayer,
        warn,
        shieldGlow,
        shieldG,
        debris.root,
        sparkles.root,
        booms.root,
        scores.root,
        fly.root,
        hand.root,
      )
    },
    update(dt) {
      ang += keyDir * 4.2 * dt
      const k = ramp(c.time, DUR)
      spawn -= dt
      if (spawn <= 0) {
        spawn = Math.max(0.42, 1.08 - 0.62 * k) * (0.85 + c.rnd() * 0.3)
        // a maioria vem do norte (alto à direita); a dispersão cresce com a dificuldade
        const spread = 0.8 + 1.2 * k
        const a = c.rnd() < 0.7 - 0.2 * k ? -Math.PI / 4 + (c.rnd() - 0.5) * spread : c.rnd() * Math.PI * 2
        const dirI =
          Math.round((((a + Math.PI) % (Math.PI * 2)) + Math.PI * 2) / ((Math.PI * 2) / DIRS)) % DIRS
        const s = new Sprite(dirTex[dirI])
        s.anchor.set(0.5)
        shotLayer.addChild(s)
        shots.push({ a, r: Math.hypot(c.W, c.H) * 0.55, sp: 44 + 40 * k + c.rnd() * 14, s, warned: false })
      }
      trails.clear()
      warn.clear()
      for (const s of shots) {
        const prev = s.r
        s.r -= s.sp * dt
        const ca = Math.cos(s.a)
        const sa = Math.sin(s.a)
        if (prev > R - s.sp * 0.05 && s.r <= R && s.r > R - s.sp * 0.05 - s.sp * dt) {
          const d = Math.abs(angDiff(s.a, ang))
          if (d < ARC / 2 + GRACE) {
            s.sp = 0
            block(s, d < ARC * 0.18)
            continue
          }
        }
        if (s.r < S * 0.42) {
          s.sp = 0
          const x = Math.round(cx + ca * s.r)
          const y = Math.round(cy + sa * s.r)
          streak = 0
          booms.spawn(x, y, 6)
          c.fx.ring(x, y, P.red, 16)
          hurt.push({ x, y, t: c.time })
          miss = { a: s.a, t: c.time }
          // o primeiro golpe da fase ensina sem tirar vida: arco fantasma + dica (exceção autorizada pelo diretor)
          if (!taught) {
            taught = true
            miss = { a: s.a, t: c.time - 0.2 }
            missLong = true
            c.sfx('error', { x })
            c.fx.float(
              'BLOQUEIE AQUI',
              Math.round(cx + Math.cos(s.a) * (R + 16)),
              Math.round(cy + Math.sin(s.a) * (R + 16)),
              P.goldHi,
            )
          } else c.hit(x, y)
          continue
        }
        s.s.x = Math.round(cx + ca * s.r)
        s.s.y = Math.round(cy + sa * s.r)
        // rastro: brasa → vermelho → sangue, pontilhado e cintilando
        for (let i = 1; i <= 9; i++) {
          const rr = s.r + 5 + i * 2
          const x = Math.round(cx + ca * rr)
          const y = Math.round(cy + sa * rr)
          const col = i < 3 ? P.emberBright : i < 5 ? P.redHot : i < 7 ? P.red : P.crimson
          if (i > 4 && (i + Math.floor(c.time * 15)) % 2 === 0) continue
          trails.rect(x, y, 1, 1).fill({ color: col, alpha: 0.7 - i * 0.05 })
        }
        // aviso: seta piscando na borda da arena do lado de onde vem; nos últimos 0,5 s antes do escudo
        // ela fica fixa, maior e com núcleo branco (telegrafia de 0,5 s)
        const eta = (s.r - R) / Math.max(1, s.sp)
        if (s.r > Ro + 4 || eta < 0.5) {
          const urgent = eta < 0.5
          if (urgent || Math.floor(c.time * 8) % 2 === 0) {
            const x = Math.round(cx + ca * Ro)
            const y = Math.round(cy + sa * Ro)
            const n = urgent ? 4 : 3
            // chevron apontando para o centro
            for (let k = 0; k < n; k++)
              for (let q = -k; q <= k; q++) {
                const px = Math.round(x - ca * k + -sa * q)
                const py = Math.round(y - sa * k + ca * q)
                warn
                  .rect(px, py, 1, 1)
                  .fill(k === 0 ? (urgent ? P.white : P.redHot) : urgent ? P.redHot : P.red)
              }
            warn.rect(Math.round(x + ca * 2), Math.round(y + sa * 2), 1, 1).fill(P.blood0)
          }
        }
      }
      const dead = shots.filter((s) => s.sp === 0)
      for (const s of dead) s.s.destroy()
      if (dead.length) shots = shots.filter((s) => s.sp > 0)
      // feridas no mapa: pixels vermelhos que apagam em 0,8 s
      wounds.clear()
      hurt = hurt.filter((h) => c.time - h.t < 0.8)
      for (const h of hurt) {
        const a = 1 - (c.time - h.t) / 0.8
        for (let i = -2; i <= 2; i++)
          wounds.rect(h.x + i, h.y - (i % 2), 1, 1).fill({ color: P.redHot, alpha: a })
        wounds.rect(h.x, h.y, 1, 1).fill({ color: P.white, alpha: a })
      }
      // Porto de Santos piscando em dourado
      const on = Math.floor(c.time * 2) % 2 === 0
      wounds.rect(santos.x, santos.y, 1, 1).fill(on ? P.goldHi : P.gold1)
      if (!c.reduced && c.rnd() < dt * 1.2)
        sparkles.spawn(map.x + 2 + Math.round(c.rnd() * S), map.y + 2 + Math.round(c.rnd() * S * 0.8), 0)
      drawShield()
      drawMiss()
      fly.update(dt)
      hand.update(dt)
      embers.update(dt, c.time)
      sparkles.update(dt)
      scores.update(dt)
      booms.update(dt)
      debris.update(dt)
    },
    down(x, y) {
      dragging = true
      ang = Math.atan2(y - cy, x - cx)
    },
    move(x, y) {
      if (dragging) ang = Math.atan2(y - cy, x - cx)
    },
    up() {
      dragging = false
    },
    key(k, down) {
      if (k === 'ArrowLeft' || k === 'a') keyDir = down ? -1 : keyDir === -1 ? 0 : keyDir
      if (k === 'ArrowRight' || k === 'd') keyDir = down ? 1 : keyDir === 1 ? 0 : keyDir
    },
    clear() {
      if (!shots.length) return false
      for (const s of shots) {
        const x = Math.round(cx + Math.cos(s.a) * s.r)
        const y = Math.round(cy + Math.sin(s.a) * s.r)
        c.fx.burst(x, y, P.gold, 6)
        sparkles.spawn(x, y, 0)
        s.s.destroy()
      }
      c.addScore(shots.length * 30)
      shots = []
      return true
    },
    timeUp() {
      return true
    },
    dispose() {
      hand?.destroy()
      embers?.destroy()
      root.destroy({ children: true })
      shots = []
    },
  }
}
