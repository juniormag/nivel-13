// GET /c/:n · página mínima com OG para o preview do WhatsApp, que logo manda a pessoa para o jogo
// (/?c=n&d=…&g=…&s=…). A imagem é estática: /og/c-{n}.png quando existe, senão /og.png.
import type { Hono } from 'hono'
import { type AppEnv, dateOfNumber, dayBR, type Env, escapeHtml, ipOk, normCode } from './core.ts'

const AI_LABEL = 'Conteúdo produzido com uso de inteligência artificial'
const SURFACE = /^[a-z0-9_]{1,16}$/
const REF = /^[a-z0-9]{6,16}$/

const fmtInt = (n: number) => n.toLocaleString('pt-BR')

/** Existe /og/c-{n}.png no site? Guarda a resposta por 10 min em memória. */
const ogSeen = new Map<string, { ok: boolean; at: number }>()
async function ogExists(url: string) {
  const hit = ogSeen.get(url)
  if (hit && Date.now() - hit.at < 600_000) return hit.ok
  let ok = false
  try {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), 1500)
    const res = await fetch(url, { method: 'HEAD', signal: ctrl.signal })
    clearTimeout(t)
    ok = res.ok && (res.headers.get('content-type') ?? '').startsWith('image/')
  } catch {
    ok = false
  }
  ogSeen.set(url, { ok, at: Date.now() })
  return ok
}

async function title(env: Env, n: number, d: string, g: string, allowLookup: boolean) {
  const base = `Chuta Aí #${n}: 5 números do Brasil. Quanto você chuta?`
  if (!allowLookup) return base
  if (d) {
    const r = await env.DB.prepare(
      'SELECT d.total AS total, p.name AS name FROM duelo d LEFT JOIN players p ON p.id = d.owner WHERE d.code = ?',
    )
      .bind(d)
      .first<{ total: number; name: string | null }>()
    if (r) return `${r.name || 'Alguém'} fez ${fmtInt(r.total)} no Chuta Aí #${n}. Tira-teima?`
  }
  if (g) {
    const r = await env.DB.prepare('SELECT nome FROM grupo WHERE code = ?').bind(g).first<{ nome: string }>()
    if (r) return `Chuta Aí #${n} · Placar do Grupo ${r.nome}`
  }
  return base
}

export function ogRoutes(app: Hono<AppEnv>) {
  app.get('/c/:n', async (c) => {
    const env = c.env
    const site = (env.SITE_URL ?? '').replace(/\/$/, '')
    const raw = c.req.param('n')
    const n = /^\d{1,4}$/.test(raw) ? Number(raw) : 0
    // só números já publicados (até amanhã)
    if (n < 1 || dateOfNumber(n) > dayBR(1)) return c.redirect(`${site}/`, 302)

    const q = new URLSearchParams()
    q.set('c', String(n))
    const d = normCode(c.req.query('d'))
    const g = normCode(c.req.query('g'))
    const s = c.req.query('s') ?? ''
    const v = c.req.query('v') ?? ''
    const r = c.req.query('r') ?? ''
    if (d) q.set('d', d)
    if (g) q.set('g', g)
    if (SURFACE.test(s)) q.set('s', s)
    if (v === 'a' || v === 'b') q.set('v', v)
    if (REF.test(r)) q.set('r', r)
    const target = `${site}/?${q.toString()}`

    // leitura por código conta no mesmo limite anti-varredura; estourou, cai no título genérico
    const lookup = !!(d || g) && (await ipOk(c, 'code', 60))
    const ogTitle = await title(env, n, d, g, lookup)
    const responsavel = env.RESPONSAVEL?.trim() || '(preencher RESPONSAVEL)'
    const desc = `Propaganda eleitoral · ${responsavel} · ${AI_LABEL}`
    const specific = `${site}/og/c-${n}.png`
    const image = site && (await ogExists(specific)) ? specific : `${site}/og.png`
    const self = new URL(c.req.url)
    const pageUrl = site ? `${site}${self.pathname}${self.search}` : c.req.url

    const e = escapeHtml
    const html = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${e(ogTitle)}</title>
<meta name="description" content="${e(desc)}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Nível 13">
<meta property="og:title" content="${e(ogTitle)}">
<meta property="og:description" content="${e(desc)}">
<meta property="og:url" content="${e(pageUrl)}">
<meta property="og:image" content="${e(image)}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:locale" content="pt_BR">
<meta name="twitter:card" content="summary_large_image">
<meta name="robots" content="noindex">
<style>body{background:#0a0a0f;color:#f4efe6;font:16px system-ui,sans-serif;display:grid;place-items:center;min-height:100vh;margin:0}a{color:#ffd166}</style>
</head>
<body>
<p><a href="${e(target)}">Abrir o Chuta Aí #${n}</a></p>
<script>location.replace(${JSON.stringify(target).replace(/</g, '\\u003c')})</script>
</body>
</html>`
    c.header('cache-control', 'public, max-age=300')
    return c.html(html)
  })
}
