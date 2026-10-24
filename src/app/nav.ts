// Navegação entre telas (estado simples + histórico do navegador para o botão voltar do Android).
// O histórico espelha as telas: cada entrada guarda { screen, i }. Fase e resultado trocam a entrada
// um do outro (não empilham), então voltar de uma fase leva ao mapa e voltar do mapa leva ao início.
// Voltar com a fase rodando só pausa: um gesto de borda sem querer não joga a partida fora.
import { useEffect, useRef } from 'react'
import { create } from 'zustand'
import { usePlay } from '../state/play'

export type Screen =
  | 'title'
  | 'onboard'
  | 'map'
  | 'play'
  | 'result'
  | 'final'
  | 'daily'
  | 'placar'
  | 'colecao'
  | 'votar'
  | 'sobre'
  | 'chuta'
  | 'papo'
  | 'duelo'
  | 'grupo'
  | 'plano'
  | 'tio'
  | 'onde'

export interface NavState {
  screen: Screen
  params: Record<string, unknown>
  /** `replace`: troca a tela atual no histórico em vez de empilhar (ex.: onboarding não volta) */
  go(screen: Screen, params?: Record<string, unknown>, opts?: { replace?: boolean }): void
}

type Entry = { screen: Screen; i: number; overlay?: boolean }
const inGame = (s: Screen) => s === 'play' || s === 'result'

// telas por posição no histórico desta aba (stack[i] = tela da entrada i)
const stack: Screen[] = ['title']
let idx = 0

function write(kind: 'push' | 'replace', e: Entry) {
  try {
    if (kind === 'push') history.pushState(e, '')
    else history.replaceState(e, '')
  } catch {
    /* histórico indisponível (iframe sandbox): segue só com o estado */
  }
}

/** Marca a entrada atual do histórico como a tela inicial (chamado uma vez no boot). */
export function initHistory(screen: Screen = 'title') {
  stack.length = 0
  stack.push(screen)
  idx = 0
  write('replace', { screen, i: 0 })
}

export const useNav = create<NavState>((set, get) => ({
  screen: 'title',
  params: {},
  go(screen, params = {}, opts = {}) {
    const cur = get().screen
    if (inGame(cur) || opts.replace) {
      // saindo de fase/resultado para a tela de trás (ex.: mapa): volta no histórico em vez de duplicar
      if (inGame(cur) && !inGame(screen) && idx > 0 && stack[idx - 1] === screen) {
        idx--
        set({ screen, params })
        try {
          history.back()
        } catch {
          /* ignora */
        }
        return
      }
      stack[idx] = screen
      stack.length = idx + 1
      write('replace', { screen, i: idx })
    } else {
      idx++
      stack.length = idx
      stack.push(screen)
      write('push', { screen, i: idx })
    }
    set({ screen, params })
  },
}))

// folhas e diálogos abertos (o último fecha primeiro com o voltar)
const overlays: (() => void)[] = []
let pendingPop = 0

/** Voltar do Android fecha a folha/diálogo aberto em vez de sair da tela embaixo dela. */
export function useBackClose(open: boolean, onClose: () => void) {
  const close = useRef(onClose)
  close.current = onClose
  useEffect(() => {
    if (!open) return
    const cur = useNav.getState().screen
    const fn = () => close.current()
    if (pendingPop) {
      // remontou no mesmo instante (StrictMode, troca de folha): reaproveita a entrada que já existe
      clearTimeout(pendingPop)
      pendingPop = 0
    } else {
      idx++
      stack.length = idx
      stack.push(cur)
      write('push', { screen: cur, i: idx, overlay: true })
    }
    overlays.push(fn)
    return () => {
      const k = overlays.indexOf(fn)
      if (k < 0) return // já fechou pelo voltar
      overlays.splice(k, 1)
      // fechou pelo botão: tira do histórico a entrada que a folha criou (depois do quadro, para não
      // brigar com uma remontagem imediata)
      pendingPop = window.setTimeout(() => {
        pendingPop = 0
        if (useNav.getState().screen !== cur || !(history.state as Entry | null)?.overlay) return
        idx--
        try {
          history.back()
        } catch {
          /* ignora */
        }
      }, 0)
    }
  }, [open])
}

export const go = (screen: Screen, params?: Record<string, unknown>, opts?: { replace?: boolean }) =>
  useNav.getState().go(screen, params, opts)

addEventListener('popstate', (e) => {
  const st = (e.state as Partial<Entry> | null) ?? {}
  const i = typeof st.i === 'number' ? st.i : 0
  const target: Screen = st.screen ?? 'title'
  const cur = useNav.getState().screen
  // já estamos nessa tela (go() voltou o histórico por conta própria)
  if (i === idx && target === cur) return
  // voltar com uma folha aberta: fecha só a folha
  if (overlays.length && i < idx) {
    idx = i
    overlays.pop()?.()
    return
  }
  // voltar durante a fase: pausa e recoloca a entrada da fase; um segundo voltar (com a pausa aberta) sai
  if (cur === 'play' && i < idx && usePlay.getState().phase === 'run') {
    write('push', { screen: 'play', i: idx })
    dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    return
  }
  idx = i
  stack.length = Math.max(stack.length, i + 1)
  // entrada velha de fase/resultado (avançar no histórico): abre o mapa, nunca uma fase sem parâmetros
  const screen = inGame(target) ? 'map' : target
  stack[i] = screen
  useNav.setState({ screen, params: {} })
})
