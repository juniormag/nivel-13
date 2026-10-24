// Celular pixel desenhado em código (sem marca de aparelho real) que mostra os toques de instalar.
// Tudo em unidades lógicas (u = 2 ou 3 px CSS). Molas para o que o dedo move, degraus para o que acende.
// Decorativo para leitor de tela: a informação está nos passos numerados ao lado.
import { AnimatePresence, motion, type Transition } from 'motion/react'
import type { CSSProperties, ReactNode } from 'react'
import { steps } from '../motion'
import {
  ADD,
  BATTERY,
  COMPASS,
  FINGER,
  FINGER_TIP,
  KEBAB,
  MEATBALL,
  SHARE,
  Sparkle,
  Sprite,
} from './sprites'
import { beatsOf, type Phase, type Variant } from './timeline'
import { useIconSrc } from './useIcon'

// tela: 66 × 120 u dentro de um corpo de 72 × 136 u
const SW = 66
const SH = 120
const OX = 3
const OY = 8

const SPRING: Transition = { type: 'spring', stiffness: 520, damping: 38, mass: 0.9 }
const SOFT: Transition = { type: 'spring', stiffness: 360, damping: 32 }
const SHEET_UP: Transition = { type: 'spring', stiffness: 420, damping: 36 }
const OUT: Transition = { duration: 0.14, ease: [0.4, 0, 1, 1] }

const TILE_COLORS = [
  'var(--blue-1)',
  'var(--green)',
  'var(--ember)',
  'var(--haze)',
  'var(--stone-2)',
  'var(--crimson)',
  'var(--gold-1)',
  'var(--vine-1)',
  'var(--blue-0)',
  'var(--ember-dark)',
  'var(--leaf-hi)',
  'var(--stone-1)',
]
const COLS = [4, 19, 34, 49]
const ROWS = [12, 30, 48, 66]
/** o 13 é o 13º app da tela */
const SLOT = { x: COLS[0] as number, y: ROWS[3] as number }

type Pt = { x: number; y: number }

function targets(v: Variant): { t1: Pt; t2: Pt; t3: Pt } {
  switch (v) {
    case 'ios':
      return { t1: { x: 33, y: 115 }, t2: { x: 30, y: 88 }, t3: { x: 54, y: 13 } }
    case 'ios26':
      return { t1: { x: 59, y: 113 }, t2: { x: 30, y: 88 }, t3: { x: 54, y: 13 } }
    case 'android':
      return { t1: { x: 59, y: 11 }, t2: { x: 40, y: 33 }, t3: { x: 50, y: 76 } }
    default:
      return { t1: { x: 59, y: 11 }, t2: { x: 40, y: 24 }, t3: { x: 52, y: 15 } }
  }
}

export function PhoneDemo({
  variant,
  phase,
  u,
  reduced,
}: {
  variant: Variant
  /** índice no roteiro (timeline.ts) */
  phase: number
  u: number
  reduced: boolean
}) {
  const beats = beatsOf(variant)
  const id: Phase = beats[phase]?.id ?? 'aim'
  const idx = (p: Phase) => beats.findIndex((b) => b.id === p)
  const past = (p: Phase) => idx(p) >= 0 && phase >= idx(p)
  const P = (n: number) => Math.round(n * u)
  const box = (x: number, y: number, w: number, h: number): CSSProperties => ({
    left: P(x),
    top: P(y),
    width: P(w),
    height: P(h),
  })
  const inapp = variant.startsWith('inapp')
  const android = variant === 'android' || variant === 'inapp-android'
  const { t1, t2, t3 } = targets(variant)

  // o que está na tela
  const home = !inapp && past('fly')
  const sheetUp = (id === 'sheet' || id === 'tap2') && true
  const confirm = id === 'confirm' || id === 'tap3'
  const browserOpen = inapp && past('open')
  const banner = inapp && past('hint')

  // dedo
  const off: Pt = { x: 74, y: 142 }
  const tgt: Pt =
    id === 'aim' || id === 'tap1'
      ? t1
      : id === 'sheet' || id === 'tap2'
        ? t2
        : (id === 'confirm' && !inapp) || id === 'hint' || id === 'tap3'
          ? t3
          : off
  const down = id === 'tap1' || id === 'tap2' || id === 'tap3'
  const fingerOn = tgt !== off

  return (
    <div
      className={`inst-phone${android ? ' is-android' : ''}`}
      style={{ width: P(72), height: P(136), ['--u' as string]: `${u}px` }}
      aria-hidden="true"
    >
      <div className="inst-phone-body" />
      <span className="inst-phone-speaker" style={box(30, 3, 12, 1)} />
      <div className="inst-screen" style={box(OX, OY, SW, SH)}>
        {/* app (navegador ou app de mensagem): some como app minimizando quando o 13 vai para a tela de início */}
        <motion.div
          className="inst-app"
          initial={false}
          animate={home ? { scale: 0.82, opacity: 0 } : { scale: 1, opacity: 1 }}
          transition={home ? { duration: 0.22, ease: [0.4, 0, 0.2, 1] } : SOFT}
        >
          <Page P={P} box={box} top={android || inapp ? 18 : 8} />
          {/* barras do navegador */}
          {!inapp && !android && <IosBar box={box} u={u} ios26={variant === 'ios26'} lit={id === 'tap1'} />}
          {android && !inapp && <AndroidBar box={box} u={u} lit={id === 'tap1'} />}
          {inapp && !browserOpen && <InAppBar box={box} u={u} android={android} lit={id === 'tap1'} />}
          {browserOpen &&
            (android ? (
              <AndroidBar box={box} u={u} lit={false} />
            ) : (
              <IosBar box={box} u={u} ios26={false} lit={false} />
            ))}

          {/* folha de compartilhar do iOS: sobe com mola, e cresce (layout) para a tela de Adicionar */}
          <AnimatePresence>
            {!inapp && !android && (sheetUp || confirm) && (
              <motion.div
                key="ios-sheet"
                layout
                className="inst-sys"
                style={confirm ? box(0, 6, SW, SH - 6) : box(0, 44, SW, SH - 44)}
                initial={{ y: P(80) }}
                animate={{ y: 0 }}
                exit={{ y: P(90), transition: OUT }}
                transition={{ ...SHEET_UP, layout: SPRING }}
              >
                {confirm ? (
                  <IosConfirm P={P} box={box} lit={id === 'tap3'} />
                ) : (
                  <IosShare P={P} box={box} u={u} lit={id === 'tap2'} />
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* menu ⋮ do Android e ⋯ do app de mensagem: cai do canto com mola */}
          <AnimatePresence>
            {(android || inapp) && sheetUp && (
              <motion.div
                key="menu"
                className="inst-menu"
                style={box(20, 8, 44, inapp ? 34 : 44)}
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ opacity: 0, transition: OUT }}
                transition={SPRING}
              >
                <Menu P={P} box={box} u={u} inapp={inapp} android={android} lit={id === 'tap2'} />
              </motion.div>
            )}
          </AnimatePresence>

          {/* confirmar do Android */}
          <AnimatePresence>
            {android && !inapp && confirm && (
              <motion.div
                key="and-confirm"
                className="inst-dialog"
                style={box(6, 44, 54, 38)}
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ opacity: 0, transition: OUT }}
                transition={SPRING}
              >
                <AndroidConfirm P={P} box={box} lit={id === 'tap3'} />
              </motion.div>
            )}
          </AnimatePresence>

          {/* app de mensagem → navegador: o jogo mostra o banner de instalar */}
          <AnimatePresence>
            {banner && (
              <motion.div
                key="mini-banner"
                className="inst-mini"
                style={box(4, android ? 19 : 8, 58, 14)}
                initial={{ y: -P(20), opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ opacity: 0, transition: OUT }}
                transition={SPRING}
              >
                <MiniIcon P={P} x={2} y={2} s={10} />
                <span className="inst-txt" style={{ ...box(15, 2, 22, 4) }}>
                  NÍVEL 13
                </span>
                <span className="inst-bar" style={box(15, 8, 18, 2)} />
                <span
                  className={`inst-pill${id === 'tap3' || id === 'land' ? ' is-lit' : ''}`}
                  style={box(38, 3, 18, 8)}
                />
              </motion.div>
            )}
          </AnimatePresence>
          {inapp && id === 'land' && <Sparkles P={P} at={{ x: 54, y: android ? 17 : 6 }} />}
          {inapp && id === 'open' && (
            <motion.div
              className="inst-compass"
              style={box(26, 50, 14, 14)}
              initial={{ scale: 0.4, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={SPRING}
            >
              <Sprite rows={COMPASS} px={u * 2} />
            </motion.div>
          )}
        </motion.div>

        {/* tela de início */}
        <AnimatePresence>
          {home && (
            <motion.div
              key="home"
              className="inst-home"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.12, ease: steps(2) } }}
              transition={{ duration: 0.16, ease: steps(4) }}
            >
              <span className="inst-home-sky" style={box(0, 0, SW, 70)} />
              <span className="inst-home-dock" style={box(2, 100, SW - 4, 17)} />
              {TILE_COLORS.map((c, k) => (
                <motion.span
                  key={c}
                  className="inst-tile"
                  style={{ ...box(COLS[k % 4] as number, ROWS[Math.floor(k / 4)] as number, 12, 12), background: c }}
                  initial={{ scale: 0.3, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ ...SPRING, delay: 0.02 + k * 0.018 }}
                >
                  <span className="inst-tile-name" style={box(2, 13, 8, 1)} />
                </motion.span>
              ))}
              {COLS.map((x, k) => (
                <span
                  key={x}
                  className="inst-tile"
                  style={{ ...box(x, 102, 12, 12), background: TILE_COLORS[(k * 5 + 3) % 12] }}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* o 13 voando: de onde estava na tela de Adicionar até a vaga 13 da grade */}
        {!inapp && (confirm || home) && (
          <FlyingIcon P={P} id={id} reduced={reduced} from={android ? { x: 10, y: 50 } : { x: 6, y: 22 }} />
        )}
        {!inapp && id === 'land' && <Sparkles P={P} at={{ x: SLOT.x + 10, y: SLOT.y - 3 }} second />}

        <StatusBar box={box} u={u} light={home} />

        {/* toque: anel pixel que abre em 4 degraus */}
        <AnimatePresence>
          {down && (
            <motion.span
              key={`ring-${id}`}
              className="inst-ring"
              style={box(tgt.x - 4, tgt.y - 4, 8, 8)}
              initial={{ scale: 0.4, opacity: 1 }}
              animate={{ scale: 1.6, opacity: 0 }}
              transition={{ duration: 0.36, ease: steps(4) }}
            />
          )}
        </AnimatePresence>
      </div>

      {/* dedo: fora da tela para poder entrar pela borda do aparelho */}
      <motion.div
        className="inst-finger"
        style={{ left: 0, top: 0 }}
        initial={false}
        animate={{
          x: P(OX + tgt.x - FINGER_TIP.x - 0.5),
          y: P(OY + tgt.y + (down ? 1 : 0)),
          scale: down ? 0.92 : 1,
          opacity: fingerOn ? 1 : 0,
        }}
        transition={{
          x: SOFT,
          y: down ? { duration: 0.06, ease: steps(1) } : SOFT,
          scale: { duration: 0.06, ease: steps(1) },
          opacity: { duration: 0.16, ease: steps(3) },
        }}
      >
        <Sprite rows={FINGER} px={u} />
      </motion.div>
    </div>
  )
}

type BoxFn = (x: number, y: number, w: number, h: number) => CSSProperties

function StatusBar({ box, u, light }: { box: BoxFn; u: number; light: boolean }) {
  return (
    <div className={`inst-status${light ? ' is-home' : ''}`} style={box(0, 0, SW, 6)}>
      <span className="inst-txt inst-clock" style={box(4, 1, 14, 4)}>
        13:13
      </span>
      <span className="inst-battery" style={box(55, 1, 7, 5)}>
        <Sprite rows={BATTERY} px={u} />
      </span>
    </div>
  )
}

/** A página do jogo no navegador: o 13 e o menu, em miniatura. */
function Page({ P, box, top }: { P: (n: number) => number; box: BoxFn; top: number }) {
  return (
    <div className="inst-page" style={box(0, 0, SW, SH)}>
      <span className="inst-txt inst-page-title" style={box(6, top + 4, 40, 4)}>
        NÍVEL 13
      </span>
      <MiniIcon P={P} x={21} y={top + 13} s={24} />
      <span className="inst-bar" style={box(10, top + 42, 46, 2)} />
      <span className="inst-bar" style={box(14, top + 47, 38, 2)} />
      <span className="inst-page-cta" style={box(12, top + 54, 42, 8)} />
      <span className="inst-bar is-dim" style={box(12, top + 66, 30, 2)} />
      <span className="inst-bar is-dim" style={box(12, top + 71, 36, 2)} />
    </div>
  )
}

function IosBar({ box, u, ios26, lit }: { box: BoxFn; u: number; ios26: boolean; lit: boolean }) {
  if (ios26)
    return (
      <div className="inst-chrome" style={box(0, 104, SW, 16)}>
        <span className="inst-urlpill" style={box(4, 4, 48, 8)} />
        <span className={`inst-glyph${lit ? ' is-lit' : ''}`} style={box(55, 6, 8, 5)}>
          <Sprite rows={MEATBALL} px={u} className="inst-c" />
        </span>
      </div>
    )
  return (
    <div className="inst-chrome" style={box(0, 100, SW, 20)}>
      <span className="inst-urlpill" style={box(4, 2, 58, 7)} />
      <span className="inst-tool" style={box(5, 13, 4, 4)} />
      <span className="inst-tool" style={box(17, 13, 4, 4)} />
      <span className={`inst-glyph${lit ? ' is-lit' : ''}`} style={box(29, 11, 9, 9)}>
        <Sprite rows={SHARE} px={u} className="inst-c" />
      </span>
      <span className="inst-tool" style={box(44, 13, 4, 4)} />
      <span className="inst-tool" style={box(56, 13, 4, 4)} />
    </div>
  )
}

function AndroidBar({ box, u, lit }: { box: BoxFn; u: number; lit: boolean }) {
  return (
    <div className="inst-chrome is-top" style={box(0, 6, SW, 11)}>
      <span className="inst-urlpill" style={box(4, 2, 48, 7)} />
      <span className={`inst-glyph${lit ? ' is-lit' : ''}`} style={box(56, 1, 6, 9)}>
        <Sprite rows={KEBAB} px={u} className="inst-c" />
      </span>
    </div>
  )
}

function InAppBar({ box, u, android, lit }: { box: BoxFn; u: number; android: boolean; lit: boolean }) {
  return (
    <div className="inst-chrome is-top is-inapp" style={box(0, 6, SW, 11)}>
      <span className="inst-txt" style={box(4, 3, 5, 4)}>
        ✕
      </span>
      <span className="inst-bar" style={box(20, 3, 26, 2)} />
      <span className="inst-bar is-dim" style={box(24, 6, 18, 1)} />
      <span className={`inst-glyph${lit ? ' is-lit' : ''}`} style={box(android ? 56 : 54, 1, android ? 6 : 9, 9)}>
        <Sprite rows={android ? KEBAB : MEATBALL} px={u} className="inst-c" />
      </span>
    </div>
  )
}

function IosShare({ P, box, u, lit }: { P: (n: number) => number; box: BoxFn; u: number; lit: boolean }) {
  const apps = ['var(--green)', 'var(--blue-1)', 'var(--ember)', 'var(--haze)', 'var(--stone-2)']
  return (
    <>
      <span className="inst-grab" style={box(28, 1, 10, 1)} />
      <MiniIcon P={P} x={4} y={4} s={9} />
      <span className="inst-txt" style={box(16, 4, 30, 4)}>
        NÍVEL 13
      </span>
      <span className="inst-bar is-dim" style={box(16, 10, 24, 1)} />
      {apps.map((c, k) => (
        <motion.span
          key={c}
          className="inst-tile"
          style={{ ...box(4 + k * 12, 16, 9, 9), background: c }}
          initial={{ scale: 0.4, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ ...SPRING, delay: 0.08 + k * 0.03 }}
        />
      ))}
      <Row box={box} y={29} />
      <Row box={box} y={39} lit={lit} label="TELA DE INÍCIO" glyph={<Sprite rows={ADD} px={u} className="inst-c" />} />
      <Row box={box} y={49} />
      <Row box={box} y={59} />
    </>
  )
}

function Row({
  box,
  y,
  lit,
  label,
  glyph,
  w = SW - 8,
  x = 4,
}: {
  box: BoxFn
  y: number
  lit?: boolean
  label?: string
  glyph?: ReactNode
  w?: number
  x?: number
}) {
  return (
    <span className={`inst-row${lit ? ' is-lit' : ''}${label ? ' is-key' : ''}`} style={box(x, y, w, 9)}>
      {label ? (
        <>
          <span className="inst-txt" style={box(lit ? 5 : 3, 2.5, w - 14, 4)}>
            {lit ? '▶' : ''}
            {label}
          </span>
          {glyph && (
            <span className="inst-row-glyph" style={box(w - 10, 1, 7, 7)}>
              {glyph}
            </span>
          )}
        </>
      ) : (
        <span className="inst-bar is-dim" style={box(3, 4, Math.round(w * 0.45), 1)} />
      )}
    </span>
  )
}

function IosConfirm({ P, box, lit }: { P: (n: number) => number; box: BoxFn; lit: boolean }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.12, ease: steps(3) }}>
      <span className="inst-txt is-dim" style={box(4, 4, 24, 4)}>
        CANCELAR
      </span>
      <span className={`inst-txt inst-add${lit ? ' is-lit' : ''}`} style={box(40, 3, 24, 6)}>
        ADICIONAR
      </span>
      <MiniIcon P={P} x={6} y={16} s={12} />
      <span className="inst-txt" style={box(22, 18, 30, 4)}>
        NÍVEL 13
      </span>
      <span className="inst-bar is-dim" style={box(22, 24, 36, 1)} />
      <span className="inst-bar is-dim" style={box(6, 34, 50, 1)} />
      <span className="inst-bar is-dim" style={box(6, 38, 40, 1)} />
      <span className="inst-row" style={box(4, 44, SW - 8, 9)}>
        <span className="inst-bar" style={box(3, 4, 24, 1)} />
        <span className="inst-toggle" style={box(SW - 20, 2, 9, 5)} />
      </span>
    </motion.div>
  )
}

function Menu({
  box,
  u,
  inapp,
  android,
  lit,
}: {
  P: (n: number) => number
  box: BoxFn
  u: number
  inapp: boolean
  android: boolean
  lit: boolean
}) {
  const rows = inapp ? 3 : 4
  const key = inapp ? 1 : 2
  return (
    <>
      {Array.from({ length: rows }, (_, k) => {
        const y = 2 + k * (inapp ? 10 : 10)
        return k === key ? (
          <Row
            key={y}
            box={box}
            x={1}
            y={y}
            w={42}
            lit={lit}
            label={inapp ? (android ? 'CHROME' : 'SAFARI') : 'INSTALAR'}
            glyph={<Sprite rows={inapp ? COMPASS : ADD} px={u} className="inst-c" />}
          />
        ) : (
          <motion.span
            key={y}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.04 + k * 0.03, duration: 0.1, ease: steps(2) }}
          >
            <Row box={box} x={1} y={y} w={42} />
          </motion.span>
        )
      })}
    </>
  )
}

function AndroidConfirm({ P, box, lit }: { P: (n: number) => number; box: BoxFn; lit: boolean }) {
  return (
    <>
      <span className="inst-txt" style={box(4, 3, 40, 4)}>
        INSTALAR APP?
      </span>
      <MiniIcon P={P} x={4} y={6} s={12} hidden />
      <span className="inst-txt" style={box(20, 12, 30, 4)}>
        NÍVEL 13
      </span>
      <span className="inst-bar is-dim" style={box(20, 18, 26, 1)} />
      <span className="inst-txt is-dim" style={box(6, 29, 22, 4)}>
        CANCELAR
      </span>
      <span className={`inst-txt inst-add${lit ? ' is-lit' : ''}`} style={box(32, 27, 20, 8)}>
        INSTALAR
      </span>
    </>
  )
}

function MiniIcon({
  P,
  x,
  y,
  s,
  hidden,
}: {
  P: (n: number) => number
  x: number
  y: number
  s: number
  hidden?: boolean
}) {
  const src = useIconSrc()
  return (
    <img
      className="inst-mini-icon"
      src={src}
      alt=""
      draggable={false}
      style={{ left: P(x), top: P(y), width: P(s), height: P(s), visibility: hidden ? 'hidden' : undefined }}
    />
  )
}

/** O 13 voa em arco, cresce no meio do voo, cai com squash e quica. */
function FlyingIcon({
  P,
  id,
  from,
  reduced,
}: {
  P: (n: number) => number
  id: Phase
  from: Pt
  reduced: boolean
}) {
  const src = useIconSrc()
  const flying = id === 'fly' || id === 'land'
  const landed = id === 'land'
  const at = flying ? SLOT : from
  return (
    <motion.div
      className="inst-fly"
      style={{ left: 0, top: 0, width: P(12), height: P(12) }}
      initial={false}
      animate={
        flying && !landed && !reduced
          ? {
              x: [P(from.x), P(26), P(SLOT.x)],
              y: [P(from.y), P(6), P(SLOT.y)],
              scale: [1, 1.35, 1],
            }
          : { x: P(at.x), y: P(at.y), scale: 1 }
      }
      transition={
        flying && !landed
          ? { duration: 0.5, times: [0, 0.38, 1], ease: [0.3, 0, 0.6, 1] }
          : { duration: 0 }
      }
    >
      <motion.img
        src={src}
        alt=""
        draggable={false}
        className="inst-fly-img"
        style={{ originY: 1 }}
        initial={false}
        animate={
          landed && !reduced
            ? { scaleX: [1, 1.28, 0.9, 1.05, 1], scaleY: [1, 0.72, 1.12, 0.96, 1] }
            : { scaleX: 1, scaleY: 1 }
        }
        transition={{ duration: 0.46, times: [0, 0.18, 0.45, 0.72, 1], ease: 'easeOut' }}
      />
      {landed && (
        <motion.span
          className="inst-fly-name"
          style={{ top: P(13), width: P(12), height: P(1) }}
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ delay: 0.2, duration: 0.16, ease: steps(4) }}
        />
      )}
    </motion.div>
  )
}

/** Brilho de 4 pontas, com um segundo brilho atrasado. */
function Sparkles({ P, at, second }: { P: (n: number) => number; at: Pt; second?: boolean }) {
  const u = P(1)
  return (
    <>
      <Sparkle x={P(at.x)} y={P(at.y)} px={u} delay={0.18} />
      {second && <Sparkle x={P(at.x - 13)} y={P(at.y + 11)} px={u} delay={0.36} />}
    </>
  )
}
