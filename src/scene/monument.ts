// O monumento "13" em three.js, renderizado em pixel nativo (pipeline Dead Cells / HD-2D, x-craft §3.2):
// - lajes de pedra extrudadas com bisel, câmera ortográfica fixa (nada de sub-texel), sem MSAA;
// - material toon de 4–5 faixas que já devolve cores da paleta (pedra na frente, vermelho nas laterais,
//   placas pintadas de vermelho na base), rachaduras de 1 px com lábio aceso numa textura texel = pixel;
// - fitas de energia com largura (núcleo white → sparkle → redGlow → redHot → red), 200–300° de arco,
//   cintilação a cada 3 quadros, metade de trás escondida pela pedra (depth test, sem depth write);
// - pós em 1 passe: quantiza para a paleta (vizinho mais próximo), contorno escuro por salto de
//   profundidade, rim red-hot de 1 px do lado dos anéis e halo pontilhado crimson em volta das fitas.
// A bandeira e a coroa são desenhadas à mão em 2D por cima (props.ts), ancoradas por `anchors()`.
import * as THREE from 'three'
import { PALETTE } from '../lib/palette'
import { mulberry32 } from '../lib/rng'
import { DARKER, type K, KEYS } from './pal'
import { CENTER_X, D, MAX_RANK, PIECES, PITCH, type PieceDef, RINGS, type RingSpec, YAW } from './shape13'

const BEVEL = 0.12
const INSET = 0.025

// ---------- GLSL: paleta como constantes ----------
const v3 = (k: K) => {
  const n = PALETTE[k]
  const f = (x: number) => (x / 255).toFixed(5)
  return `vec3(${f((n >> 16) & 255)},${f((n >> 8) & 255)},${f(n & 255)})`
}
const PAL_GLSL = KEYS.map((k) => `const vec3 C_${k} = ${v3(k)};`).join('\n')
const BAYER_GLSL = `
float bayer4(vec2 p){
  ivec2 q = ivec2(mod(p, 4.0));
  int i = q.y * 4 + q.x;
  int m[16] = int[16](0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5);
  return (float(m[i]) + 0.5) / 16.0;
}`

const RING_LIGHT_GLSL = `
uniform mat4 uRingInv[3];
uniform vec4 uRingP[3]; // R, head, arc, intensidade
float ringLight(vec3 pw){
  float acc = 0.0;
  for (int i = 0; i < 3; i++) {
    vec3 q = (uRingInv[i] * vec4(pw, 1.0)).xyz;
    float rr = length(q.xz);
    float d = length(vec2(rr - uRingP[i].x, q.y));
    float a = fract(atan(q.z, q.x) / 6.2831853);
    float s = fract(uRingP[i].y - a) / uRingP[i].z;
    float along = s < 1.0 ? 1.0 - s * 0.7 : 0.15;
    acc += clamp(1.0 - d / 1.5, 0.0, 1.0) * along * uRingP[i].w;
  }
  return acc;
}`

const STONE_VS = `
varying vec3 vObj;
varying vec3 vWorld;
varying vec3 vView;
void main(){
  vObj = position;
  vec4 w = modelMatrix * vec4(position, 1.0);
  vWorld = w.xyz;
  vec4 mv = viewMatrix * w;
  vView = mv.xyz;
  gl_Position = projectionMatrix * mv;
}`

const STONE_FS = `
${PAL_GLSL}
${BAYER_GLSL}
${RING_LIGHT_GLSL}
uniform sampler2D uTex;
uniform vec2 uOff;
uniform float uPaint;
uniform float uY0;
uniform vec3 uKey;
uniform mat3 uObjRot;
uniform float uRubble;
varying vec3 vObj;
varying vec3 vWorld;
varying vec3 vView;

vec3 rampStone(int b){ return b <= 0 ? C_stone1 : b == 1 ? C_stone2 : b == 2 ? C_stone3 : C_stoneHi; }
vec3 rampRed(int b){ return b <= 0 ? C_blood1 : b == 1 ? C_crimsonDeep : b == 2 ? C_crimson : b == 3 ? C_red : C_redHot; }
vec3 rampLitStone(int b){ return b <= 0 ? C_crimson : b == 1 ? C_red : b == 2 ? C_redHot : C_redGlow; }
vec3 rampLitRed(int b){ return b <= 1 ? C_red : b == 2 ? C_redHot : b == 3 ? C_redGlow : C_emberBright; }

void main(){
  vec3 nV = normalize(cross(dFdx(vView), dFdy(vView)));
  vec3 nW = normalize(cross(dFdx(vWorld), dFdy(vWorld)));
  if (nV.z < 0.0) { nW = -nW; }
  vec3 nO = uObjRot * nW;
  vec4 tx = texelFetch(uTex, ivec2(mod(gl_FragCoord.xy + uOff, 256.0)), 0);
  float crack = tx.r;
  float speck = tx.g;
  float tone = tx.b;
  float lam = dot(nW, uKey);
  float rl = ringLight(vWorld);
  bool lit = rl > 0.32 + bayer4(gl_FragCoord.xy) * 0.5;
  int kind;
  int band;
  vec3 col;
  if (uRubble > 0.5) {
    band = lam > 0.7 ? 3 : lam > 0.45 ? 2 : lam > 0.2 ? 1 : 0;
    if (crack > 0.9) band = 0;
    col = lit ? rampLitStone(band) : rampStone(band);
    gl_FragColor = vec4(col, 1.0);
    return;
  }
  if (nO.z > 0.75) {
    // frente: placas entre rachaduras, cada uma com seu tom
    float redChance = uPaint * 0.85 + clamp(0.3 - vObj.y * 0.045, 0.0, 0.3);
    kind = tone < redChance ? 1 : 0;
    float v = 0.55 + (lam - 0.6) * 0.8 + (tone - 0.5) * 0.55 + vObj.y * 0.015;
    if (vObj.y - uY0 < 0.22) v -= 0.25;
    band = int(clamp(v, 0.0, 0.999) * 4.0);
    if (kind == 1) band += 1;
    if (speck > 0.975) band += 1;
    if (speck < 0.025) band -= 1;
    if (crack > 0.4 && crack < 0.6) band += 1;
    if (crack > 0.2 && crack < 0.3) band -= 1;
    band = clamp(band, 0, kind == 1 ? 4 : 3);
    if (crack > 0.9) col = kind == 1 ? C_blood0 : C_stone0;
    else if (lit) col = kind == 1 ? rampLitRed(band) : rampLitStone(band);
    else col = kind == 1 ? rampRed(band) : rampStone(band);
  } else if (nO.y > 0.75) {
    // topo: pedra mais clara, musgo pontilhado onde o tom é alto
    band = tone > 0.35 ? 3 : 2;
    if (crack > 0.9) band = 1;
    col = rampStone(band);
    if (tone > 0.72 && bayer4(gl_FragCoord.xy) < (tone - 0.6) * 2.5) col = speck > 0.5 ? C_green : C_vine1;
    if (lit) col = rampLitStone(band);
  } else if (nO.y < -0.6) {
    col = speck > 0.85 ? C_blood1 : C_blood0;
  } else if (abs(nO.x) > 0.75) {
    // laterais pintadas de vermelho, salpicadas
    float v = 0.5 + lam * 0.35 + (tone - 0.5) * 0.3 + rl * 0.5;
    band = int(clamp(v, 0.0, 0.999) * 4.0);
    if (speck > 0.9) band += 1;
    if (speck < 0.07) band -= 1;
    band = clamp(band, 0, 4);
    col = lit ? rampLitRed(band) : rampRed(band);
    if (crack > 0.9 && tone > 0.5) col = C_blood0;
  } else {
    // bisel: degrau de luz que faz a geometria ler (lábio claro em cima/esquerda, escuro embaixo/direita)
    if (nO.x > 0.3) {
      col = lam > 0.2 ? C_redHot : C_red;
      if (lit) col = C_redGlow;
    } else if (nO.y < -0.3) {
      col = C_blood1;
    } else {
      band = lam > 0.75 ? 3 : lam > 0.5 ? 2 : lam > 0.25 ? 1 : 0;
      col = lit ? rampLitStone(band) : rampStone(band);
      if (nO.y > 0.3 && nO.x < -0.2) col = C_stoneHi;
    }
  }
  gl_FragColor = vec4(col, 1.0);
}`

const LEAF_VS = `
varying vec3 vWorld;
varying vec3 vView;
varying float vShade;
void main(){
  vec4 p = vec4(position, 1.0);
#ifdef USE_INSTANCING
  p = instanceMatrix * p;
#endif
  vShade = 0.5;
#ifdef USE_INSTANCING_COLOR
  vShade = instanceColor.r;
#endif
  vec4 w = modelMatrix * p;
  vWorld = w.xyz;
  vec4 mv = viewMatrix * w;
  vView = mv.xyz;
  gl_Position = projectionMatrix * mv;
}`

const LEAF_FS = `
${PAL_GLSL}
${BAYER_GLSL}
${RING_LIGHT_GLSL}
uniform vec3 uKey;
varying vec3 vWorld;
varying vec3 vView;
varying float vShade;
void main(){
  vec3 nV = normalize(cross(dFdx(vView), dFdy(vView)));
  vec3 nW = normalize(cross(dFdx(vWorld), dFdy(vWorld)));
  if (nV.z < 0.0) nW = -nW;
  float lam = dot(nW, uKey);
  float v = 0.3 + lam * 0.65 + (vShade - 0.5) * 0.5;
  int b = int(clamp(v, 0.0, 0.999) * 4.0);
  vec3 col = b <= 0 ? C_vine0 : b == 1 ? C_vine1 : b == 2 ? C_green : C_leafHi;
  float rl = ringLight(vWorld);
  if (rl > 0.55 + bayer4(gl_FragCoord.xy) * 0.4 && b >= 2) col = b == 3 ? C_redHot : C_crimson;
  gl_FragColor = vec4(col, 1.0);
}`

const RIBBON_VS = `
attribute float aT;
attribute float aSide;
uniform float uR;
uniform float uHead;
uniform float uArc;
uniform float uW;
uniform vec2 uRes;
varying float vS;
varying float vSide;
vec3 ringPos(float t){ float a = t * 6.2831853; return vec3(cos(a) * uR, 0.0, sin(a) * uR); }
void main(){
  vec4 p0 = projectionMatrix * modelViewMatrix * vec4(ringPos(aT), 1.0);
  vec4 p1 = projectionMatrix * modelViewMatrix * vec4(ringPos(aT + 0.003), 1.0);
  vec2 s0 = p0.xy / p0.w * 0.5 * uRes;
  vec2 s1 = p1.xy / p1.w * 0.5 * uRes;
  vec2 tg = normalize(s1 - s0 + vec2(1e-5, 0.0));
  vec2 nr = vec2(-tg.y, tg.x);
  float s = fract(uHead - aT) / uArc;
  vS = s;
  float w = max(1.0, uW * pow(max(0.0, 1.0 - s), 0.6));
  p0.xy += nr * aSide * w * 0.5 / (0.5 * uRes) * p0.w;
  vSide = aSide;
  gl_Position = p0;
}`

const RIBBON_FS = `
${PAL_GLSL}
${BAYER_GLSL}
uniform float uFlick;
uniform float uFlare;
varying float vS;
varying float vSide;
void main(){
  float s = vS - uFlare * 0.15;
  if (vS > 1.0) discard;
  if (s > 0.78 && bayer4(gl_FragCoord.xy) < (s - 0.78) / 0.22) discard;
  float v = abs(vSide);
  float k = clamp((1.0 - s) / 0.42, 0.0, 1.0);
  vec3 col;
  if (v < 0.18 * k) col = uFlick > 0.5 ? C_sparkle : C_white;
  else if (v < 0.36 * k) col = uFlick > 0.5 ? C_white : C_sparkle;
  else if (v < 0.56 * k) col = C_redGlow;
  else if (v < 0.8 * k + 0.2) col = uFlick > 0.5 ? C_red : C_redHot;
  else col = s > 0.7 ? C_crimson : C_red;
  gl_FragColor = vec4(col, 0.5);
}`

const POST_VS = `
void main(){ gl_Position = vec4(position.xy, 0.0, 1.0); }`

const POST_FS = `
${BAYER_GLSL}
uniform sampler2D tC;
uniform sampler2D tD;
uniform vec3 uPal[32];
uniform int uDark[32];
uniform int uCrimson;
uniform int uCrimsonDeep;
uniform int uRedHot;
uniform float uEps;
uniform ivec2 uSize;
vec4 C(ivec2 p){ return texelFetch(tC, clamp(p, ivec2(0), uSize - 1), 0); }
float Dp(ivec2 p){ return texelFetch(tD, clamp(p, ivec2(0), uSize - 1), 0).r; }
bool isRing(vec4 c){ return c.a > 0.3 && c.a < 0.7; }
bool isSolid(vec4 c){ return c.a > 0.9; }
int nearest(vec3 c){
  int bi = 0; float bd = 1e9;
  for (int i = 0; i < 32; i++) { vec3 d = c - uPal[i]; float dd = dot(d, d); if (dd < bd) { bd = dd; bi = i; } }
  return bi;
}
void main(){
  ivec2 p = ivec2(gl_FragCoord.xy);
  vec4 c = C(p);
  if (c.a < 0.1) {
    bool n1 = isRing(C(p + ivec2(1,0))) || isRing(C(p - ivec2(1,0))) || isRing(C(p + ivec2(0,1))) || isRing(C(p - ivec2(0,1)));
    bool n2 = isRing(C(p + ivec2(2,0))) || isRing(C(p - ivec2(2,0))) || isRing(C(p + ivec2(0,2))) || isRing(C(p - ivec2(0,2)))
      || isRing(C(p + ivec2(1,1))) || isRing(C(p - ivec2(1,1))) || isRing(C(p + ivec2(1,-1))) || isRing(C(p - ivec2(1,-1)));
    float b = bayer4(gl_FragCoord.xy);
    if (n1 && b < 0.5) { gl_FragColor = vec4(uPal[uCrimson], 1.0); return; }
    if ((n1 || n2) && b < 0.25) { gl_FragColor = vec4(uPal[uCrimsonDeep], 1.0); return; }
    gl_FragColor = vec4(0.0);
    return;
  }
  int idx = nearest(c.rgb);
  if (isSolid(c)) {
    float d = Dp(p);
    bool edge = false;
    ivec2 dirs[4] = ivec2[4](ivec2(1,0), ivec2(-1,0), ivec2(0,1), ivec2(0,-1));
    for (int i = 0; i < 4; i++) {
      vec4 cn = C(p + dirs[i]);
      if (!isSolid(cn)) continue;
      float dn = Dp(p + dirs[i]);
      vec4 co = C(p - dirs[i]);
      float trend = isSolid(co) ? d - Dp(p - dirs[i]) : 0.0;
      if ((d - dn) - max(trend, 0.0) > uEps) edge = true;
    }
    bool bgR = C(p + ivec2(1,0)).a < 0.1;
    bool bgD = C(p - ivec2(0,1)).a < 0.1;
    if (edge) idx = uDark[uDark[idx]];
    else if (bgR) idx = uRedHot;
    else if (bgD) idx = uDark[idx];
  }
  gl_FragColor = vec4(uPal[idx], 1.0);
}`

/** textura de pedra: placas de Voronoi, rachaduras de 1 px com lábio, salpico e tom por placa */
function stoneTexture(ppu: number) {
  const S = 256
  const G = Math.max(4, Math.round(S / (ppu * 1.35)))
  const cell = S / G
  const r = mulberry32(1302)
  const pts: [number, number][] = []
  for (let j = 0; j < G; j++)
    for (let i = 0; i < G; i++) pts.push([(i + 0.15 + r() * 0.7) * cell, (j + 0.15 + r() * 0.7) * cell])
  const id = new Int32Array(S * S)
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      const ci = Math.floor(x / cell)
      const cj = Math.floor(y / cell)
      let best = 1e9
      let bi = 0
      for (let dj = -1; dj <= 1; dj++)
        for (let di = -1; di <= 1; di++) {
          const ii = (ci + di + G) % G
          const jj = (cj + dj + G) % G
          const pt = pts[jj * G + ii] as [number, number]
          const px = pt[0] + (ci + di - ii) * cell
          const py = pt[1] + (cj + dj - jj) * cell
          // métrica levemente anisotrópica: placas mais largas que altas, como lajes
          const dd = (x - px) ** 2 + ((y - py) * 1.25) ** 2
          if (dd < best) {
            best = dd
            bi = jj * G + ii
          }
        }
      id[y * S + x] = bi
    }
  const tone = Array.from({ length: G * G }, () => r())
  const data = new Uint8Array(S * S * 4)
  const at = (x: number, y: number) => id[((y + S) % S) * S + ((x + S) % S)] as number
  const pairSkip = (a: number, b: number) => {
    const h = Math.sin(Math.min(a, b) * 12.9898 + Math.max(a, b) * 78.233) * 43758.5453
    return h - Math.floor(h) < 0.22
  }
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      const o = (y * S + x) * 4
      const a = at(x, y)
      const rr = at(x + 1, y)
      const uu = at(x, y + 1)
      let crack = 0
      if ((a !== rr && !pairSkip(a, rr)) || (a !== uu && !pairSkip(a, uu))) crack = 255
      data[o] = crack
      data[o + 1] = Math.floor(r() * 256)
      data[o + 2] = Math.floor((tone[a] ?? 0.5) * 255)
      data[o + 3] = 255
    }
  // lábio aceso: o pixel logo abaixo da rachadura (parede da fenda que pega a luz da lua)
  for (let y = 1; y < S; y++)
    for (let x = 0; x < S - 1; x++) {
      const o = (y * S + x) * 4
      if (data[o] !== 255) continue
      const below = ((y - 1) * S + x) * 4
      if (data[below] === 0) data[below] = 128
    }
  // lascas: entalhes mais escuros
  for (let i = 0; i < 90; i++) {
    const x = Math.floor(r() * (S - 2))
    const y = Math.floor(r() * (S - 2))
    for (const [dx, dy] of [
      [0, 0],
      [1, 0],
      [0, 1],
    ] as const) {
      const o = ((y + dy) * S + x + dx) * 4
      if (data[o] === 0) data[o] = 64
    }
  }
  const tex = new THREE.DataTexture(data, S, S, THREE.RGBAFormat, THREE.UnsignedByteType)
  tex.magFilter = THREE.NearestFilter
  tex.minFilter = THREE.NearestFilter
  tex.needsUpdate = true
  return tex
}

function pieceShape(p: PieceDef) {
  const [bl, br, tr, tl] = p.ch ?? [0, 0, 0, 0]
  const x0 = p.x0 + INSET + BEVEL
  const y0 = p.y0 + INSET + BEVEL
  const x1 = p.x1 - INSET - BEVEL
  const y1 = p.y1 - INSET - BEVEL
  const s = new THREE.Shape()
  s.moveTo(x0 + bl, y0)
  s.lineTo(x1 - br, y0)
  if (br) s.lineTo(x1, y0 + br)
  s.lineTo(x1, y1 - tr)
  if (tr) s.lineTo(x1 - tr, y1)
  s.lineTo(x0 + tl, y1)
  if (tl) s.lineTo(x0, y1 - tl)
  s.lineTo(x0, y0 + bl)
  return s
}

interface Leaf {
  piece: number
  ax: number
  ay: number
  m: THREE.Matrix4
}

export interface Anchors {
  flag: { x: number; y: number } | null
  crown: { x: number; y: number }
  heads: { x: number; y: number; front: boolean; dx: number; dy: number }[]
  edges: { x: number; y: number }[]
}

export class Monument3D {
  readonly canvas: HTMLCanvasElement
  readonly w: number
  readonly h: number
  /** pixel da origem (pé do monumento, centro) dentro do canvas */
  origin = { x: 0, y: 0 }
  onLand?: (x: number, y: number) => void
  private renderer: THREE.WebGLRenderer
  private scene = new THREE.Scene()
  private camera: THREE.OrthographicCamera
  private group = new THREE.Group()
  private rt: THREE.WebGLRenderTarget
  private postScene = new THREE.Scene()
  private postCam = new THREE.Camera()
  private pieces: { mesh: THREE.Mesh; def: PieceDef; vis: boolean; t0: number }[] = []
  private rubble: THREE.Mesh[] = []
  private leaves!: THREE.InstancedMesh
  private leafData: Leaf[] = []
  private ribbons: { spec: RingSpec; mat: THREE.ShaderMaterial; holder: THREE.Object3D }[] = []
  private ringUniforms = {
    uRingInv: { value: [new THREE.Matrix4(), new THREE.Matrix4(), new THREE.Matrix4()] },
    uRingP: { value: [new THREE.Vector4(), new THREE.Vector4(), new THREE.Vector4()] },
  }
  private key = new THREE.Vector3(-0.6, 0.72, 0.5).normalize()
  private progress = -1
  private flare = 0
  private now = 0
  private animUntil = 0
  private ppu: number

  constructor(ppu: number) {
    this.ppu = ppu
    this.w = Math.ceil(14.8 * ppu)
    this.h = Math.ceil(11.4 * ppu)
    const canvas = document.createElement('canvas')
    this.canvas = canvas
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,
      alpha: true,
      premultipliedAlpha: true,
      powerPreference: 'low-power',
      preserveDrawingBuffer: true,
    })
    this.renderer.setPixelRatio(1)
    this.renderer.setSize(this.w, this.h, false)
    this.renderer.setClearColor(0x000000, 0)
    this.renderer.outputColorSpace = THREE.LinearSRGBColorSpace

    const depth = new THREE.DepthTexture(this.w, this.h)
    depth.magFilter = THREE.NearestFilter
    depth.minFilter = THREE.NearestFilter
    this.rt = new THREE.WebGLRenderTarget(this.w, this.h, {
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      generateMipmaps: false,
      depthTexture: depth,
      colorSpace: THREE.NoColorSpace,
    })

    const hw = this.w / 2 / ppu
    const hh = this.h / 2 / ppu
    this.camera = new THREE.OrthographicCamera(-hw, hw, hh, -hh, 1, 80)
    const target = new THREE.Vector3(0, 3.95, 0)
    this.camera.position.set(0, target.y + Math.sin(PITCH) * 40, Math.cos(PITCH) * 40)
    this.camera.lookAt(target)
    this.camera.updateMatrixWorld()
    this.scene.add(this.group)
    this.group.rotation.y = YAW
    this.group.updateMatrixWorld()

    this.buildPieces()
    this.buildLeaves()
    this.buildRibbons()
    this.buildPost()
    this.origin = this.project(new THREE.Vector3(0, 0, 0))
  }

  private buildPieces() {
    const tex = stoneTexture(this.ppu)
    const objRot = new THREE.Matrix3().setFromMatrix4(new THREE.Matrix4().makeRotationY(-YAW))
    const r = mulberry32(77)
    const mats: THREE.ShaderMaterial[] = []
    for (const def of PIECES) {
      const geo = new THREE.ExtrudeGeometry(pieceShape(def), {
        depth: D - BEVEL * 2,
        bevelEnabled: true,
        bevelThickness: BEVEL,
        bevelSize: BEVEL,
        bevelSegments: 1,
        curveSegments: 1,
      })
      geo.translate(-CENTER_X, 0, -(D - BEVEL * 2) / 2)
      const mat = new THREE.ShaderMaterial({
        vertexShader: STONE_VS,
        fragmentShader: STONE_FS,
        uniforms: {
          uTex: { value: tex },
          uOff: { value: new THREE.Vector2(Math.floor(r() * 256), Math.floor(r() * 256)) },
          uPaint: { value: def.paint ?? 0 },
          uY0: { value: def.y0 },
          uKey: { value: this.key },
          uObjRot: { value: objRot },
          uRubble: { value: 0 },
          ...this.ringUniforms,
        },
      })
      mats.push(mat)
      const mesh = new THREE.Mesh(geo, mat)
      mesh.visible = false
      this.group.add(mesh)
      this.pieces.push({ mesh, def, vis: false, t0: -1 })
    }
    // entulho caído no morro (some conforme o monumento se reconstrói)
    const rubbleMat = (mats[1] as THREE.ShaderMaterial).clone()
    rubbleMat.uniforms = { ...(mats[1] as THREE.ShaderMaterial).uniforms, uRubble: { value: 1 } }
    for (let i = 0; i < 9; i++) {
      const s = 0.35 + r() * 0.55
      const shape = new THREE.Shape()
      shape.moveTo(0, 0)
      shape.lineTo(s, 0)
      shape.lineTo(s, s * 0.7)
      shape.lineTo(s * 0.2, s * 0.8)
      shape.lineTo(0, s * 0.5)
      const geo = new THREE.ExtrudeGeometry(shape, {
        depth: s * 0.8,
        bevelEnabled: true,
        bevelThickness: 0.06,
        bevelSize: 0.06,
        bevelSegments: 1,
      })
      const m = new THREE.Mesh(geo, rubbleMat)
      const side = i % 2 === 0 ? -1 : 1
      m.position.set(side * (3.8 + r() * 2.6), 0.02, -0.4 + r() * 2.2)
      m.rotation.set(r() * 0.4, r() * 6.28, r() * 0.5)
      this.group.add(m)
      this.rubble.push(m)
    }
  }

  private buildLeaves() {
    const r = mulberry32(4242)
    const front = D / 2 + 0.06
    const add = (piece: number, ax: number, ay: number, x: number, y: number, z: number, s: number) => {
      const m = new THREE.Matrix4().compose(
        new THREE.Vector3(x - CENTER_X, y, z),
        new THREE.Quaternion().setFromEuler(new THREE.Euler(r() * 3, r() * 3, r() * 3)),
        new THREE.Vector3(s, s * (0.75 + r() * 0.4), s),
      )
      this.leafData.push({ piece, ax, ay, m })
    }
    PIECES.forEach((p, pi) => {
      const w = p.x1 - p.x0
      // musgo no topo
      const nTop = Math.round(w * (2 + r() * 6))
      for (let i = 0; i < nTop; i++) {
        const x = p.x0 + 0.15 + r() * (w - 0.3)
        const z = -D / 2 + r() ** 0.6 * D
        add(pi, x, p.y1 + 0.05, x, p.y1 + 0.02, z, 0.24 + r() * 0.22)
      }
      // tufos que escorrem pela frente
      const drapes = r() < 0.75 ? 1 + Math.floor(r() * (w > 2 ? 3 : 2)) : 0
      for (let d = 0; d < drapes; d++) {
        const x0 = p.x0 + 0.25 + r() * (w - 0.5)
        const len = 0.5 + r() * Math.min(3.2, p.y1 - p.y0 + 1.2)
        const ph = r() * 6
        for (let k = 0; k * 0.17 < len; k++) {
          const y = p.y1 - k * 0.17
          const t = (k * 0.17) / len
          const x = x0 + Math.sin(k * 0.8 + ph) * 0.12
          const s = (0.3 - t * 0.17) * (0.8 + r() * 0.4)
          add(pi, x0, p.y1 + 0.05, x, y, front + r() * 0.08, s)
          if (r() < 0.45) add(pi, x0, p.y1 + 0.05, x + (r() - 0.5) * 0.35, y - 0.05, front + 0.04, s * 0.8)
        }
      }
      // trepadeira pela lateral direita
      if (r() < 0.55) {
        const z0 = -D / 2 + 0.3 + r() * (D - 0.6)
        const len = 0.6 + r() * (p.y1 - p.y0)
        for (let k = 0; k * 0.18 < len; k++)
          add(
            pi,
            p.x1,
            p.y1 + 0.05,
            p.x1 + 0.08,
            p.y1 - k * 0.18,
            z0 + Math.sin(k) * 0.15,
            0.24 - (k * 0.18 * 0.1) / len,
          )
      }
    })
    // moitas na base e dentro da curva de baixo do 3
    const bush = (cx: number, cy: number, cz: number, rad: number, n: number) => {
      for (let i = 0; i < n; i++) {
        const a = r() * Math.PI
        const d = Math.sqrt(r())
        add(
          -1,
          -99,
          -99,
          cx + Math.cos(a) * rad * 1.4 * d,
          cy + Math.sin(a) * rad * d,
          cz + (r() - 0.3) * rad,
          0.26 + r() * 0.2,
        )
      }
    }
    bush(7.2, 1.5, front - 0.4, 0.7, 26)
    bush(5.4, 1.55, 0.2, 0.55, 16)
    bush(0.6, 0.95, front - 0.3, 0.5, 14)
    bush(3.6, 0.95, front - 0.2, 0.45, 12)
    bush(9.6, 1.5, front - 0.6, 0.5, 12)

    const geo = new THREE.IcosahedronGeometry(0.5, 0)
    const mat = new THREE.ShaderMaterial({
      vertexShader: LEAF_VS,
      fragmentShader: LEAF_FS,
      uniforms: { uKey: { value: this.key }, ...this.ringUniforms },
    })
    this.leaves = new THREE.InstancedMesh(geo, mat, this.leafData.length)
    const col = new THREE.Color()
    this.leafData.forEach((l, i) => {
      col.setRGB(r(), 0, 0)
      this.leaves.setColorAt(i, col)
      this.leaves.setMatrixAt(i, l.m)
    })
    this.leaves.frustumCulled = false
    this.group.add(this.leaves)
  }

  private buildRibbons() {
    const N = 360
    const aT = new Float32Array((N + 1) * 2)
    const aSide = new Float32Array((N + 1) * 2)
    const pos = new Float32Array((N + 1) * 2 * 3)
    const idx: number[] = []
    for (let i = 0; i <= N; i++) {
      aT[i * 2] = i / N
      aT[i * 2 + 1] = i / N
      aSide[i * 2] = -1
      aSide[i * 2 + 1] = 1
      if (i < N) {
        const a = i * 2
        idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2)
      }
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    geo.setAttribute('aT', new THREE.BufferAttribute(aT, 1))
    geo.setAttribute('aSide', new THREE.BufferAttribute(aSide, 1))
    geo.setIndex(idx)
    for (const spec of RINGS) {
      const mat = new THREE.ShaderMaterial({
        vertexShader: RIBBON_VS,
        fragmentShader: RIBBON_FS,
        uniforms: {
          uR: { value: spec.R },
          uHead: { value: spec.ph },
          uArc: { value: spec.arc },
          uW: { value: spec.w },
          uRes: { value: new THREE.Vector2(this.w, this.h) },
          uFlick: { value: 0 },
          uFlare: { value: 0 },
        },
        depthWrite: false,
        depthTest: true,
        side: THREE.DoubleSide,
        blending: THREE.NoBlending,
      })
      const holder = new THREE.Object3D()
      holder.position.set(0, spec.y, 0)
      holder.rotation.set(spec.tx, 0, spec.tz)
      const mesh = new THREE.Mesh(geo, mat)
      mesh.frustumCulled = false
      mesh.renderOrder = 10
      holder.add(mesh)
      this.scene.add(holder)
      this.ribbons.push({ spec, mat, holder })
    }
  }

  private buildPost() {
    const pal = KEYS.map((k) => {
      const n = PALETTE[k]
      return new THREE.Vector3(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255)
    })
    const dark = KEYS.map((k) => KEYS.indexOf(DARKER[k]))
    const mat = new THREE.ShaderMaterial({
      vertexShader: POST_VS,
      fragmentShader: POST_FS,
      uniforms: {
        tC: { value: this.rt.texture },
        tD: { value: this.rt.depthTexture },
        uPal: { value: pal },
        uDark: { value: dark },
        uCrimson: { value: KEYS.indexOf('crimson') },
        uCrimsonDeep: { value: KEYS.indexOf('crimsonDeep') },
        uRedHot: { value: KEYS.indexOf('redHot') },
        uEps: { value: 0.18 / 79 },
        uSize: { value: [this.w, this.h] },
      },
      depthTest: false,
      depthWrite: false,
      blending: THREE.NoBlending,
    })
    const post = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat)
    post.frustumCulled = false
    this.postScene.add(post)
  }

  /** mundo → pixel do canvas (y para baixo) */
  project(v: THREE.Vector3) {
    const p = v.clone().project(this.camera)
    return { x: ((p.x + 1) / 2) * this.w, y: ((1 - p.y) / 2) * this.h }
  }

  private local(x: number, y: number, z: number) {
    return new THREE.Vector3(x - CENTER_X, y, z).applyMatrix4(this.group.matrixWorld)
  }

  setFlare(k: number) {
    this.flare = k
  }

  /** 0 = ruína (topo desmoronado), 1 = inteiro. Com `animate`, as lajes novas caem no lugar com quique. */
  setProgress(p: number, animate = false) {
    p = Math.max(0, Math.min(1, p))
    if (p === this.progress) return
    this.progress = p
    const level = p * MAX_RANK + 1e-6
    for (const pc of this.pieces) {
      const vis = pc.def.rank === 0 || pc.def.rank <= level
      if (vis && !pc.vis) pc.t0 = animate ? this.now + 0.15 + pc.def.rank * 0.05 : -1
      pc.vis = vis
      pc.mesh.visible = vis
    }
    const nRubble = Math.round((1 - p) * this.rubble.length)
    this.rubble.forEach((m, i) => {
      m.visible = i < nRubble
    })
    this.updateLeaves()
    if (animate) this.animUntil = this.now + 1.4
  }

  private covered(x: number, y: number, self: number) {
    return this.pieces.some((pc, i) => {
      if (i === self || !pc.vis) return false
      const d = pc.def
      return x > d.x0 && x < d.x1 && y > d.y0 - 0.02 && y < d.y1
    })
  }

  private updateLeaves() {
    const zero = new THREE.Matrix4().makeScale(0, 0, 0)
    this.leafData.forEach((l, i) => {
      const pc = l.piece >= 0 ? this.pieces[l.piece] : null
      const vis = (!pc || pc.vis) && !this.covered(l.ax, l.ay, l.piece)
      this.leaves.setMatrixAt(i, vis ? l.m : zero)
    })
    this.leaves.instanceMatrix.needsUpdate = true
  }

  anchors(): Anchors {
    let flag: { x: number; y: number } | null = null
    let top = -1
    for (let i = 1; i <= 3; i++) {
      const pc = this.pieces[i]
      if (pc?.vis && pc.def.y1 > top) top = pc.def.y1
    }
    if (top > 0) flag = this.project(this.local(1.75, top + 0.05, -0.2))
    const crown = this.project(this.local(7.1, 9.55, 0))
    const heads = this.ribbons.map((rb) => {
      const a = (rb.mat.uniforms.uHead?.value as number) * Math.PI * 2
      const R = rb.spec.R
      const da = 0.05 * Math.sign(rb.spec.speed)
      const p = new THREE.Vector3(Math.cos(a) * R, 0, Math.sin(a) * R).applyMatrix4(rb.holder.matrixWorld)
      const p2 = new THREE.Vector3(Math.cos(a + da) * R, 0, Math.sin(a + da) * R).applyMatrix4(
        rb.holder.matrixWorld,
      )
      const s = this.project(p)
      const s2 = this.project(p2)
      return { x: s.x, y: s.y, front: p.z > 0.3, dx: s2.x - s.x, dy: s2.y - s.y }
    })
    const edges: { x: number; y: number }[] = []
    for (const pc of this.pieces) {
      if (!pc.vis) continue
      const d = pc.def
      edges.push(this.project(this.local(d.x0 + 0.1, d.y1 - 0.05, D / 2)))
      edges.push(this.project(this.local(d.x1 - 0.05, d.y1 - 0.05, D / 2)))
    }
    return { flag, crown, heads, edges }
  }

  get animating() {
    return this.now < this.animUntil
  }

  render(t: number) {
    this.now = t
    const step = Math.floor(t * 60)
    // lajes caindo no lugar com quique (ease-out-bounce) e poeira no pouso
    for (const pc of this.pieces) {
      if (pc.t0 < 0) {
        pc.mesh.position.y = 0
        continue
      }
      const k = Math.min(1, Math.max(0, (t - pc.t0) / 0.6))
      pc.mesh.position.y = (1 - bounce(k)) * 5
      pc.mesh.visible = pc.vis && t >= pc.t0
      if (k >= 1) {
        pc.t0 = -1
        const d = pc.def
        const p = this.project(this.local((d.x0 + d.x1) / 2, d.y0, D / 2))
        this.onLand?.(p.x, p.y)
      }
    }
    this.ribbons.forEach((rb, i) => {
      const u = rb.mat.uniforms as Record<string, { value: number }>
      const sp = rb.spec.speed * (1 + this.flare * 0.8)
      const head = rb.spec.ph + t * sp
      if (u.uHead) u.uHead.value = head
      if (u.uFlick) u.uFlick.value = Math.floor(step / 3) % 2
      if (u.uFlare) u.uFlare.value = this.flare
      if (u.uW) u.uW.value = rb.spec.w * (1 + this.flare * 0.5)
      rb.holder.rotation.y = Math.sin(t * 0.13 + i * 2) * 0.25
      rb.holder.updateMatrixWorld()
      this.ringUniforms.uRingInv.value[i]?.copy(rb.holder.matrixWorld).invert()
      this.ringUniforms.uRingP.value[i]?.set(rb.spec.R, head, rb.spec.arc, 1 + this.flare)
    })
    this.renderer.setRenderTarget(this.rt)
    this.renderer.clear()
    this.renderer.render(this.scene, this.camera)
    this.renderer.setRenderTarget(null)
    this.renderer.render(this.postScene, this.postCam)
  }

  dispose() {
    this.rt.dispose()
    this.renderer.dispose()
    this.renderer.forceContextLoss()
  }
}

function bounce(k: number) {
  const n = 7.5625
  const d = 2.75
  if (k < 1 / d) return n * k * k
  if (k < 2 / d) return n * (k - 1.5 / d) ** 2 + 0.75
  if (k < 2.5 / d) return n * (k - 2.25 / d) ** 2 + 0.9375
  return n * (k - 2.625 / d) ** 2 + 0.984375
}
