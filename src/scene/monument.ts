// O monumento "13" em voxels: pedra rachada, interior vermelho, mata crescendo,
// anéis de energia e a coroa. Renderizado em baixa resolução para virar pixel art.
import * as THREE from 'three'
import type { PixelFit } from '../lib/pixel'
import { mulberry32 } from '../lib/rng'
import type { Layout } from './backdrop'

export const GLYPH_1 = ['.XXX.', 'XXXX.', '.XXX.', '.XXX.', '.XXX.', '.XXX.', '.XXX.', '.XXX.', 'XXXXX']
export const GLYPH_3 = [
  'XXXXX.',
  'XXXXXX',
  '....XX',
  '....XX',
  '.XXXX.',
  '....XX',
  '....XX',
  'XXXXXX',
  'XXXXX.',
]

const CELL = 3
const CELL_Y = 4
const DEPTH = 6
const GAP = 4

interface Vox {
  x: number
  y: number
  z: number
  rank: number
  color: THREE.Color
  leaf: boolean
}

export class Monument {
  renderer: THREE.WebGLRenderer
  scene = new THREE.Scene()
  camera = new THREE.PerspectiveCamera(30, 1, 1, 600)
  group = new THREE.Group()
  private stone!: THREE.InstancedMesh
  private leaves!: THREE.InstancedMesh
  private stoneVox: Vox[] = []
  private leafVox: Vox[] = []
  private appear: Float32Array = new Float32Array(0)
  private leafAppear: Float32Array = new Float32Array(0)
  private rings: THREE.LineLoop[] = []
  private dots: THREE.Points[] = []
  private dotData: { a: number; r: number; tilt: number; h: number; sp: number }[][] = []
  private crown = new THREE.Group()
  private flagGeo!: THREE.PlaneGeometry
  private flagBase: Float32Array = new Float32Array(0)
  private progress = 0
  private crownT = -1
  private burst: THREE.Points | null = null
  private burstVel: Float32Array = new Float32Array(0)
  private burstT = 0
  private size = { w: 37, h: 27 }
  private dummy = new THREE.Object3D()
  private now = 0

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,
      alpha: true,
      powerPreference: 'low-power',
      preserveDrawingBuffer: false,
    })
    this.renderer.setPixelRatio(1)
    this.renderer.setClearColor(0x000000, 0)
    this.scene.add(this.group)
    this.buildLights()
    this.buildVoxels()
    this.buildRings()
    this.buildCrown()
    this.buildFlag()
  }

  private buildLights() {
    this.scene.add(new THREE.AmbientLight(0x5a4050, 1.1))
    const key = new THREE.DirectionalLight(0xfff0dc, 2.6)
    key.position.set(-20, 35, 60)
    this.scene.add(key)
    const red1 = new THREE.PointLight(0xff2a20, 40, 70, 1.2)
    red1.position.set(-26, 4, 14)
    this.scene.add(red1)
    const red2 = new THREE.PointLight(0xff3a2a, 30, 70, 1.2)
    red2.position.set(28, 16, 12)
    this.scene.add(red2)
    const rim = new THREE.DirectionalLight(0xff4a30, 1.4)
    rim.position.set(40, 10, -30)
    this.scene.add(rim)
  }

  private buildVoxels() {
    const r = mulberry32(13)
    const grid = new Map<string, boolean>()
    const key = (x: number, y: number, z: number) => `${x},${y},${z}`
    const put = (glyph: string[], ox: number) => {
      glyph.forEach((row, gy) => {
        for (let gx = 0; gx < row.length; gx++) {
          if (row[gx] !== 'X') continue
          for (let a = 0; a < CELL; a++)
            for (let b = 0; b < CELL_Y; b++)
              for (let z = 0; z < DEPTH; z++) {
                const x = ox + gx * CELL + a
                const y = (glyph.length - 1 - gy) * CELL_Y + b
                grid.set(key(x, y, z), true)
              }
        }
      })
    }
    const w1 = (GLYPH_1[0]?.length ?? 5) * CELL
    put(GLYPH_1, 0)
    put(GLYPH_3, w1 + GAP)
    const totalW = w1 + GAP + (GLYPH_3[0]?.length ?? 6) * CELL
    const totalH = GLYPH_1.length * CELL_Y
    this.size = { w: totalW, h: totalH }

    // rachaduras: caminhadas aleatórias na face da frente
    const cracks = new Set<string>()
    for (let c = 0; c < 9; c++) {
      let x = Math.floor(r() * totalW)
      let y = Math.floor(r() * totalH)
      for (let s = 0; s < 14 + r() * 12; s++) {
        cracks.add(`${x},${y}`)
        x += r() < 0.5 ? (r() < 0.5 ? -1 : 1) : 0
        y += r() < 0.65 ? -1 : 0
        if (r() < 0.12) cracks.add(`${x + 1},${y}`)
      }
    }

    const greens = ['#4fae3f', '#23561f', '#6cc24a', '#2f7a2a', '#3b8f31']
    const has = (x: number, y: number, z: number) => grid.has(key(x, y, z))

    for (const k of grid.keys()) {
      const [x, y, z] = k.split(',').map(Number) as [number, number, number]
      const surface =
        !has(x + 1, y, z) ||
        !has(x - 1, y, z) ||
        !has(x, y + 1, z) ||
        !has(x, y - 1, z) ||
        !has(x, y, z + 1) ||
        !has(x, y, z - 1)
      if (!surface) continue
      const edge = !has(x + 1, y, z) || !has(x - 1, y, z) || !has(x, y + 1, z)
      // desgaste: arestas lascadas
      if (edge && z >= DEPTH - 1 && r() < 0.1) continue
      const front = z >= DEPTH - 2
      const crack = front && cracks.has(`${x},${y}`)
      if (crack && z === DEPTH - 1 && r() < 0.7) continue
      let col: string
      // manchas grandes e suaves, como na referência: poucos tons, nada de ruído por voxel
      const tone = Math.sin(x * 0.31 + y * 0.17) + Math.sin(x * 0.11 - y * 0.29 + 1.7) + r() * 0.35
      if (crack) col = '#4a3a34'
      else if (front) {
        const lowRed = y < 5 && r() < 0.6 - y * 0.1
        const patch = Math.sin(x * 0.45 + y * 0.3) + Math.sin(y * 0.8 - x * 0.2) > 1.75
        col =
          lowRed || patch
            ? tone > 0.4
              ? '#d91a22'
              : '#b8141b'
            : tone > 0.9
              ? '#efe6d6'
              : tone > -0.4
                ? '#e0d5c3'
                : '#c9bba6'
      } else col = tone > 0.6 ? '#e3242b' : tone > -0.6 ? '#b8141b' : '#8e1218'
      this.stoneVox.push({
        x,
        y,
        z,
        rank: r() * 0.3 + (y / totalH) * 0.7,
        color: new THREE.Color(col),
        leaf: false,
      })
      // mata no topo e escorrendo pela frente
      if (!has(x, y + 1, z) && r() < 0.42) {
        this.leafVox.push({
          x,
          y: y + 0.85,
          z,
          rank: r() * 0.3 + (y / totalH) * 0.7,
          color: new THREE.Color(greens[Math.floor(r() * 5)] ?? '#4fae3f'),
          leaf: true,
        })
      }
    }
    for (let v = 0; v < 16; v++) {
      const x = Math.floor(r() * totalW)
      let y = totalH - 1
      while (y > 0 && !has(x, y, DEPTH - 1)) y--
      const len = 3 + Math.floor(r() * 9)
      for (let i = 0; i < len && y - i > 0; i++) {
        if (!has(x, y - i, DEPTH - 1)) break
        this.leafVox.push({
          x: x + (r() - 0.5) * 0.6,
          y: y - i,
          z: DEPTH - 0.4,
          rank: r() * 0.3 + ((y - i) / totalH) * 0.7,
          color: new THREE.Color(greens[Math.floor(r() * 5)] ?? '#4fae3f'),
          leaf: true,
        })
      }
    }

    const geo = new THREE.BoxGeometry(1, 1, 1)
    this.stone = new THREE.InstancedMesh(geo, new THREE.MeshLambertMaterial(), this.stoneVox.length)
    this.leaves = new THREE.InstancedMesh(geo, new THREE.MeshLambertMaterial(), this.leafVox.length)
    this.appear = new Float32Array(this.stoneVox.length).fill(-1)
    this.leafAppear = new Float32Array(this.leafVox.length).fill(-1)
    this.stoneVox.forEach((v, i) => {
      this.stone.setColorAt(i, v.color)
    })
    this.leafVox.forEach((v, i) => {
      this.leaves.setColorAt(i, v.color)
    })
    const holder = new THREE.Group()
    holder.position.set(-totalW / 2, 0, -DEPTH / 2)
    holder.add(this.stone, this.leaves)
    this.group.add(holder)

    // brilho vermelho no chão
    const glow = new THREE.Mesh(
      new THREE.CircleGeometry(1, 24),
      new THREE.MeshBasicMaterial({
        color: 0xff2a2a,
        transparent: true,
        opacity: 0.18,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    )
    glow.rotation.x = -Math.PI / 2
    glow.scale.set(totalW * 0.75, totalW * 0.45, 1)
    glow.position.y = -0.4
    this.group.add(glow)
  }

  private buildRings() {
    const cy = this.size.h * 0.45
    const specs = [
      { rx: this.size.w * 0.78, ry: 7, y: cy - 6, tilt: 0.16, sp: 0.5 },
      { rx: this.size.w * 0.66, ry: 6, y: cy + 4, tilt: -0.22, sp: -0.7 },
      { rx: this.size.w * 0.9, ry: 9, y: cy - 1, tilt: 0.05, sp: 0.35 },
    ]
    specs.forEach((s, i) => {
      const loop: THREE.Vector3[] = []
      for (let k = 0; k <= 160; k++) {
        const a = (k / 160) * Math.PI * 2
        loop.push(new THREE.Vector3(Math.cos(a), Math.sin(a), 0))
      }
      const ring = new THREE.LineLoop(
        new THREE.BufferGeometry().setFromPoints(loop),
        new THREE.LineBasicMaterial({
          color: i === 1 ? 0xff7060 : 0xff2a2a,
          transparent: true,
          opacity: 0.85,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        }),
      )
      ring.scale.set(s.rx, s.ry * 2.2, 1)
      ring.rotation.x = Math.PI / 2 - 0.12
      ring.rotation.z = s.tilt
      ring.position.y = s.y
      ring.userData = s
      this.rings.push(ring)
      this.group.add(ring)

      const n = 110
      const pos = new Float32Array(n * 3)
      const col = new Float32Array(n * 3)
      const r = mulberry32(100 + i)
      const data: { a: number; r: number; tilt: number; h: number; sp: number }[] = []
      const palette = [new THREE.Color('#ff3b3b'), new THREE.Color('#ffd6c8'), new THREE.Color('#ff7a3d')]
      for (let k = 0; k < n; k++) {
        data.push({
          a: r() * Math.PI * 2,
          r: 0.92 + r() * 0.16,
          tilt: s.tilt,
          h: (r() - 0.5) * 1.6,
          sp: s.sp * (0.8 + r() * 0.6),
        })
        const c = palette[k % 3] ?? palette[0]
        if (c) col.set([c.r, c.g, c.b], k * 3)
      }
      const geo = new THREE.BufferGeometry()
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
      geo.setAttribute('color', new THREE.BufferAttribute(col, 3))
      const pts = new THREE.Points(
        geo,
        new THREE.PointsMaterial({
          size: i === 2 ? 2 : 1,
          sizeAttenuation: false,
          vertexColors: true,
          transparent: true,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        }),
      )
      pts.userData = s
      this.dots.push(pts)
      this.dotData.push(data)
      this.group.add(pts)
    })
  }

  private buildCrown() {
    const golds = [0xf5c04a, 0xffe29a, 0xc8901e]
    const mats = golds.map((c) => new THREE.MeshLambertMaterial({ color: c, emissive: 0x5a3a08 }))
    const gem = new THREE.MeshLambertMaterial({ color: 0xe3242b, emissive: 0x5a0a0a })
    const box = new THREE.BoxGeometry(1, 1, 1)
    const R = 4.2
    for (let a = 0; a < 28; a++) {
      const ang = (a / 28) * Math.PI * 2
      for (let y = 0; y < 2; y++) {
        const m = new THREE.Mesh(box, mats[(a + y) % 3])
        m.position.set(Math.cos(ang) * R, y, Math.sin(ang) * R)
        this.crown.add(m)
      }
      if (a % 7 === 0) {
        const g = new THREE.Mesh(box, gem)
        g.position.set(Math.cos(ang) * (R + 0.3), 0.5, Math.sin(ang) * (R + 0.3))
        g.scale.setScalar(0.9)
        this.crown.add(g)
      }
    }
    for (let p = 0; p < 5; p++) {
      const ang = (p / 5) * Math.PI * 2
      for (let y = 2; y < 5; y++) {
        const m = new THREE.Mesh(box, mats[y % 3])
        m.position.set(Math.cos(ang) * R, y, Math.sin(ang) * R)
        m.scale.setScalar(1 - (y - 2) * 0.18)
        this.crown.add(m)
      }
      const ball = new THREE.Mesh(box, mats[1])
      ball.position.set(Math.cos(ang) * R, 5.3, Math.sin(ang) * R)
      ball.scale.setScalar(0.8)
      this.crown.add(ball)
    }
    this.crown.rotation.x = 0.25
    this.crown.visible = false
    this.group.add(this.crown)
  }

  private buildFlag() {
    const w1 = (GLYPH_1[0]?.length ?? 5) * CELL
    const poleX = -this.size.w / 2 + w1 * 0.35
    const poleH = 11
    const pole = new THREE.Mesh(
      new THREE.BoxGeometry(0.6, poleH, 0.6),
      new THREE.MeshLambertMaterial({ color: 0xc9b48a }),
    )
    pole.position.set(poleX, this.size.h + poleH / 2 - 1, 0)
    this.group.add(pole)
    const tip = new THREE.Mesh(
      new THREE.BoxGeometry(1.1, 1.1, 1.1),
      new THREE.MeshLambertMaterial({ color: 0xf5c04a, emissive: 0x3a2a08 }),
    )
    tip.position.set(poleX, this.size.h + poleH - 1, 0)
    this.group.add(tip)

    const c = document.createElement('canvas')
    c.width = 40
    c.height = 28
    const g = c.getContext('2d')
    if (g) {
      g.fillStyle = '#1f8a3a'
      g.fillRect(0, 0, 40, 28)
      g.fillStyle = '#f7d61c'
      g.beginPath()
      g.moveTo(20, 3)
      g.lineTo(37, 14)
      g.lineTo(20, 25)
      g.lineTo(3, 14)
      g.closePath()
      g.fill()
      g.fillStyle = '#1b347a'
      g.beginPath()
      g.arc(20, 14, 7, 0, Math.PI * 2)
      g.fill()
      g.fillStyle = '#f4efe6'
      g.fillRect(13, 12, 14, 2)
      for (const [x, y] of [
        [17, 16],
        [21, 17],
        [24, 15],
        [19, 18],
        [16, 10],
      ] as const)
        g.fillRect(x, y, 1, 1)
    }
    const tex = new THREE.CanvasTexture(c)
    tex.magFilter = THREE.NearestFilter
    tex.minFilter = THREE.NearestFilter
    tex.colorSpace = THREE.SRGBColorSpace
    this.flagGeo = new THREE.PlaneGeometry(10, 7, 16, 8)
    this.flagGeo.translate(5, 0, 0)
    this.flagBase = Float32Array.from(this.flagGeo.attributes.position?.array ?? [])
    const flag = new THREE.Mesh(
      this.flagGeo,
      new THREE.MeshLambertMaterial({ map: tex, side: THREE.DoubleSide }),
    )
    flag.position.set(poleX + 0.3, this.size.h + poleH - 4.5, 0)
    flag.rotation.y = -0.35
    this.group.add(flag)
  }

  /** 0 = ruína, 1 = monumento inteiro. Com `animate`, os voxels novos sobem do chão. */
  setProgress(p: number, animate = false) {
    const prev = this.progress
    this.progress = p
    const thr = 0.78 + 0.24 * p
    const prevThr = 0.78 + 0.24 * prev
    const t = this.now
    this.stoneVox.forEach((v, i) => {
      const vis = v.rank < thr
      if (!vis) this.appear[i] = -1
      else if (animate && v.rank >= prevThr)
        this.appear[i] = t + 0.2 + (v.rank - prevThr) * 5 + Math.random() * 0.3
      else this.appear[i] = 0
    })
    this.leafVox.forEach((v, i) => {
      const vis = v.rank < thr - 0.04
      this.leafAppear[i] = vis ? (animate && v.rank >= prevThr - 0.04 ? t + 0.8 + v.rank * 1.5 : 0) : -1
    })
    this.animating = this.writeInstances(t) || animate
    if (p >= 1 && !this.crown.visible) {
      this.crown.visible = true
      this.crownT = animate ? t : t - 10
    }
  }

  celebrate() {
    this.crown.visible = true
    this.crownT = this.now
    const n = 260
    const pos = new Float32Array(n * 3)
    this.burstVel = new Float32Array(n * 3)
    const col = new Float32Array(n * 3)
    const golds = [new THREE.Color('#f5c04a'), new THREE.Color('#ffe29a'), new THREE.Color('#ff3b3b')]
    for (let i = 0; i < n; i++) {
      pos.set([0, this.size.h + 10, 0], i * 3)
      const a = Math.random() * Math.PI * 2
      const e = Math.random() * 1.2 - 0.2
      const s = 10 + Math.random() * 18
      this.burstVel.set(
        [Math.cos(a) * Math.cos(e) * s, Math.sin(e) * s + 8, Math.sin(a) * Math.cos(e) * s],
        i * 3,
      )
      const c = golds[i % 3] ?? golds[0]
      if (c) col.set([c.r, c.g, c.b], i * 3)
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3))
    if (this.burst) this.group.remove(this.burst)
    this.burst = new THREE.Points(
      geo,
      new THREE.PointsMaterial({
        size: 2,
        sizeAttenuation: false,
        vertexColors: true,
        transparent: true,
        depthWrite: false,
      }),
    )
    this.burstT = this.now
    this.group.add(this.burst)
  }

  private writeInstances(t: number) {
    const d = this.dummy
    const ease = (k: number) => 1 - (1 - k) ** 3
    let dirty = false
    this.stoneVox.forEach((v, i) => {
      const a = this.appear[i] ?? -1
      if (a < 0) {
        d.position.set(v.x, v.y, v.z)
        d.scale.setScalar(0)
      } else {
        const k = a === 0 ? 1 : Math.min(1, Math.max(0, (t - a) / 0.6))
        d.position.set(v.x, v.y - (1 - ease(k)) * 14, v.z)
        d.scale.setScalar(k <= 0 ? 0 : 1)
        if (k < 1) dirty = true
      }
      d.updateMatrix()
      this.stone.setMatrixAt(i, d.matrix)
    })
    this.leafVox.forEach((v, i) => {
      const a = this.leafAppear[i] ?? -1
      const k = a < 0 ? 0 : a === 0 ? 1 : Math.min(1, Math.max(0, (t - a) / 0.5))
      d.position.set(v.x, v.y, v.z)
      d.scale.setScalar(0.72 * k)
      d.updateMatrix()
      this.leaves.setMatrixAt(i, d.matrix)
      if (k > 0 && k < 1) dirty = true
    })
    this.stone.instanceMatrix.needsUpdate = true
    this.leaves.instanceMatrix.needsUpdate = true
    return dirty
  }

  private animating = false

  resize(f: PixelFit, L: Layout) {
    this.renderer.setSize(f.W, f.H, false)
    const aspect = f.W / f.H
    this.camera.aspect = aspect
    const fovR = (this.camera.fov * Math.PI) / 180
    const fracH = L.portrait ? 0.24 : 0.4
    const fracW = L.portrait ? 0.8 : 0.42
    const needH = this.size.h / fracH
    const needW = this.size.w / fracW
    const visH = Math.max(needH, needW / aspect)
    const dist = visH / 2 / Math.tan(fovR / 2)
    this.camera.position.set(dist * 0.16, this.size.h * 0.3, dist)
    this.camera.lookAt(0, this.size.h * 0.55, 0)
    this.camera.clearViewOffset()
    this.camera.updateProjectionMatrix()
    this.camera.updateMatrixWorld()
    const base = new THREE.Vector3(0, 0, 0).project(this.camera)
    const frac = (1 - base.y) / 2
    const shift = L.baseY - frac
    this.camera.setViewOffset(f.W, f.H, 0, -shift * f.H, f.W, f.H)
    this.camera.updateProjectionMatrix()
  }

  /** Posição em tela (fração) de um ponto do monumento, para alinhar efeitos 2D. */
  screenOf(x: number, y: number, z = 0) {
    const v = new THREE.Vector3(x, y, z).applyMatrix4(this.group.matrixWorld).project(this.camera)
    return { x: (v.x + 1) / 2, y: (1 - v.y) / 2 }
  }

  get crownPoint() {
    const w1 = (GLYPH_1[0]?.length ?? 5) * CELL
    return { x: -this.size.w / 2 + w1 + GAP + 8, y: this.size.h + 9 }
  }

  update(t: number, px: number, py: number) {
    this.now = t
    this.group.rotation.y = Math.sin(t * 0.25) * 0.1 + px * 0.12
    this.group.rotation.x = py * 0.04
    if (this.animating || this.burst) this.animating = this.writeInstances(t)
    for (const ring of this.rings) {
      const s = ring.userData as { sp: number; tilt: number }
      ring.rotation.z = s.tilt + Math.sin(t * s.sp) * 0.06
      ;(ring.material as THREE.LineBasicMaterial).opacity = 0.6 + Math.sin(t * 3 + s.sp * 10) * 0.25
    }
    this.dots.forEach((pts, i) => {
      const s = pts.userData as { rx: number; ry: number; y: number; tilt: number }
      const data = this.dotData[i]
      const pos = pts.geometry.attributes.position as THREE.BufferAttribute
      if (!data) return
      const cosT = Math.cos(s.tilt)
      const sinT = Math.sin(s.tilt)
      for (let k = 0; k < data.length; k++) {
        const d = data[k]
        if (!d) continue
        const a = d.a + t * d.sp
        const x = Math.cos(a) * s.rx * d.r
        const z = Math.sin(a) * s.ry * d.r * 2.2
        const yy = d.h + Math.sin(a * 3 + t) * 0.4
        pos.setXYZ(k, x * cosT - yy * sinT, s.y + x * sinT + yy * cosT, z)
      }
      pos.needsUpdate = true
    })
    // coroa
    if (this.crown.visible) {
      const cp = this.crownPoint
      const k = this.crownT < 0 ? 1 : Math.min(1, (t - this.crownT) / 2.4)
      const bounce = k < 1 ? (1 - k) ** 2 * 40 - Math.sin(k * Math.PI * 3) * (1 - k) * 2 : 0
      this.crown.position.set(cp.x, cp.y + bounce + Math.sin(t * 1.6) * 0.6, 0)
      this.crown.rotation.y = t * 0.6
    }
    // bandeira
    const pos = this.flagGeo.attributes.position as THREE.BufferAttribute
    for (let i = 0; i < pos.count; i++) {
      const bx = this.flagBase[i * 3] ?? 0
      const by = this.flagBase[i * 3 + 1] ?? 0
      pos.setZ(i, Math.sin(bx * 0.7 - t * 3.2 + by * 0.1) * (bx / 10) * 1.1)
      pos.setY(i, by - (bx / 10) * 0.5)
    }
    pos.needsUpdate = true
    // explosão dourada
    if (this.burst) {
      const dt = t - this.burstT
      const bp = this.burst.geometry.attributes.position as THREE.BufferAttribute
      for (let i = 0; i < bp.count; i++) {
        const vx = this.burstVel[i * 3] ?? 0
        const vy = this.burstVel[i * 3 + 1] ?? 0
        const vz = this.burstVel[i * 3 + 2] ?? 0
        bp.setXYZ(i, vx * dt, this.size.h + 10 + vy * dt - 9 * dt * dt, vz * dt)
      }
      bp.needsUpdate = true
      ;(this.burst.material as THREE.PointsMaterial).opacity = Math.max(0, 1 - dt / 3)
      if (dt > 3) {
        this.group.remove(this.burst)
        this.burst = null
      }
    }
    this.renderer.render(this.scene, this.camera)
  }

  startAnim() {
    this.animating = true
  }

  dispose() {
    this.renderer.dispose()
  }
}
