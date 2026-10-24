// Ganchos pequenos da interface.
import { useEffect, useRef, useState } from 'react'
import { type Sfx, sfx } from '../audio/audio'
import { prefersReduced } from './motion'

/**
 * Número que sobe até o alvo em vez de pular (regra 33): 300 a 600 ms com ease-out.
 * `from` define o ponto de partida na primeira montagem.
 */
export function useCountUp(
  target: number,
  opts: { from?: number; ms?: number; tick?: Sfx | boolean | null; done?: Sfx | null } = {},
) {
  const { from = target, ms = 520, done = null } = opts
  // true continua valendo (som 'tick'), como na primeira versão deste gancho
  const tick: Sfx | null = opts.tick === true ? 'tick' : opts.tick || null
  const [v, setV] = useState(prefersReduced() ? target : from)
  const cur = useRef(v)
  useEffect(() => {
    const start = cur.current
    if (start === target || prefersReduced()) {
      cur.current = target
      setV(target)
      return
    }
    const dur = Math.min(600, Math.max(300, ms))
    const t0 = performance.now()
    let raf = 0
    let lastTick = 0
    const step = (now: number) => {
      const k = Math.min(1, (now - t0) / dur)
      const e = 1 - (1 - k) ** 3
      const val = Math.round(start + (target - start) * e)
      cur.current = val
      setV(val)
      if (tick && now - lastTick > 90 && k < 1) {
        lastTick = now
        sfx(tick)
      }
      if (k < 1) raf = requestAnimationFrame(step)
      else if (done) sfx(done)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [target, ms, tick, done])
  return v
}

/** Valor que muda a cada `ms` (relógios e contagens regressivas). */
export function useNow(ms = 30000) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), ms)
    return () => clearInterval(id)
  }, [ms])
  return now
}

/** true quando a tela está em celular de pé (para trocar layout em JS quando CSS não basta). */
export function useMedia(query: string) {
  const [m, setM] = useState(() => typeof matchMedia === 'function' && matchMedia(query).matches)
  useEffect(() => {
    const mq = matchMedia(query)
    const on = () => setM(mq.matches)
    on()
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [query])
  return m
}

export const fmt = (n: number) => n.toLocaleString('pt-BR')
