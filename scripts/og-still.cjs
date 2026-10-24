// Gera o still da cena do título (renderHeroStill) para scripts/make-og.py. Requer pnpm dev em :4313.
// Uso: node scripts/og-still.cjs /tmp/still-1560.png  (Chromium do Playwright; defina CHROME se precisar)
const { chromium } = require('@playwright/test')
const fs = require('node:fs')
;(async () => {
  const b = await chromium.launch({
    executablePath: process.env.CHROME || undefined,
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  })
  const p = await b.newPage({ viewport: { width: 1200, height: 630 } })
  p.on('console', (m) => console.log('console:', m.text()))
  await p.goto('http://localhost:4313/', { waitUntil: 'networkidle' })
  const [w, h, opts] = JSON.parse(process.argv[3] ?? '[1560,630,{"progress":1}]')
  const url = await p.evaluate(
    async ([w, h, opts]) => {
      const m = await import('/src/scene/index.ts')
      const c = await m.renderHeroStill(w, h, opts)
      return c.toDataURL('image/png')
    },
    [w, h, opts],
  )
  fs.writeFileSync(process.argv[2], Buffer.from(url.split(',')[1], 'base64'))
  await b.close()
})()
