// Fumaça: abre o título, entra na fase 1, vê a introdução, joga uns toques e não deixa erro no console.
import { expect, type Page, test } from '@playwright/test'

// Ruído de ambiente headless (GPU por software), não do jogo.
const IGNORE = [/GPU stall due to ReadPixels/i, /WebGL.*(context lost|CONTEXT_LOST)/i, /swiftshader/i]

function watchErrors(page: Page) {
  const errors: string[] = []
  page.on('console', (m) => {
    if (m.type() === 'error' && !IGNORE.some((r) => r.test(m.text()))) errors.push(`console: ${m.text()}`)
  })
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`))
  return errors
}

// Botões que levam adiante a partir do título/cadastro até a fase 1 (os textos das telas podem mudar).
const FORWARD = /jogar|começar|comecar|bora|continuar|entrar|fase 1|iniciar|pular/i

async function reachLevel1Intro(page: Page) {
  const intro = page.getByRole('dialog').filter({ hasText: /fase 1 de 13/i })
  for (let step = 0; step < 8; step++) {
    if (await intro.isVisible().catch(() => false)) return intro
    const btn = page.getByRole('button', { name: FORWARD }).first()
    if (await btn.isVisible().catch(() => false)) {
      await btn.click()
    } else {
      await page.waitForTimeout(400)
    }
    await page.waitForTimeout(300)
  }
  await expect(intro).toBeVisible()
  return intro
}

test('título abre, fase 1 começa e aceita toques sem erro no console', async ({ page }) => {
  const errors = watchErrors(page)
  await page.addInitScript(() => {
    try {
      localStorage.clear()
    } catch {}
  })

  await page.goto('/')
  await expect(page).toHaveTitle(/Nível 13/i)
  // em dev, erro de compilação aparece como overlay do Vite: falha com a mensagem dele
  const overlay = page.locator('vite-error-overlay')
  if (await overlay.count()) throw new Error(`Vite: ${await overlay.locator('.message').innerText()}`)
  await expect(page.getByRole('button', { name: FORWARD }).first()).toBeVisible()

  const intro = await reachLevel1Intro(page)
  await expect(intro.getByRole('heading', { level: 2 })).toBeVisible()
  await intro.getByRole('button', { name: /começar/i }).click()

  // contagem regressiva e partida
  const canvas = page.locator('canvas.play-canvas')
  await expect(canvas).toBeVisible()
  await page.waitForTimeout(2000)
  const box = await canvas.boundingBox()
  expect(box).not.toBeNull()
  const points = [
    [0.3, 0.4],
    [0.6, 0.5],
    [0.5, 0.6],
    [0.4, 0.45],
    [0.7, 0.55],
  ] as const
  if (box) {
    const at = ([fx, fy]: readonly [number, number]) =>
      [box.x + box.width * fx, box.y + box.height * fy] as const
    // toques e um traço (a fase 1 é pintar o mapa)
    for (const p of points) {
      await page.mouse.click(...at(p))
      await page.waitForTimeout(150)
    }
    await page.mouse.move(...at([0.25, 0.4]))
    await page.mouse.down()
    for (let i = 1; i <= 12; i++) await page.mouse.move(...at([0.25 + i * 0.04, 0.4 + i * 0.015]))
    await page.mouse.up()
  }
  // a jogada precisa contar: o placar da fase sai do zero
  await expect
    .poll(async () => (await page.getByLabel('Pontos').innerText()).replace(/\D/g, ''))
    .not.toBe('0')
  await page.screenshot({ path: 'test-results/smoke-fase1.png' })

  expect(errors, errors.join('\n')).toEqual([])
})
