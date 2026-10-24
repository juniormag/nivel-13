type Child = Node | string | number | null | undefined | false
type Attrs = Record<string, unknown> & { class?: string; style?: string }

/** Criador de elementos mínimo. `on*` vira listener; `aria-*`, `data-*` e o resto viram atributos. */
export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Attrs | null = null,
  ...children: Child[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag)
  if (attrs) {
    for (const [k, v] of Object.entries(attrs)) {
      if (v === undefined || v === null || v === false) continue
      if (k.startsWith('on') && typeof v === 'function') {
        el.addEventListener(k.slice(2).toLowerCase(), v as EventListener)
      } else if (k === 'html') {
        el.innerHTML = String(v)
      } else if (k in el && k !== 'style' && k !== 'class' && !k.includes('-')) {
        ;(el as unknown as Record<string, unknown>)[k] = v
      } else {
        el.setAttribute(k === 'class' ? 'class' : k, v === true ? '' : String(v))
      }
    }
  }
  for (const c of children) {
    if (c === null || c === undefined || c === false) continue
    el.append(c instanceof Node ? c : document.createTextNode(String(c)))
  }
  return el
}

export function announce(text: string) {
  const live = document.getElementById('live')
  if (!live) return
  live.textContent = ''
  requestAnimationFrame(() => {
    live.textContent = text
  })
}

let toastTimer = 0
export function toast(text: string) {
  document.querySelector('.toast')?.remove()
  const t = h('div', { class: 'toast px-frame px-frame--gold', role: 'status' }, text)
  document.body.append(t)
  clearTimeout(toastTimer)
  toastTimer = window.setTimeout(() => t.remove(), 2200)
}

export const fmtInt = (n: number) => Math.round(n).toLocaleString('pt-BR')
export const fmtBRL = (n: number) =>
  n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 })

export const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches
