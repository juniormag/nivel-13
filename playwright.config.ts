// e2e de fumaça. Sobe o jogo (4313) e a API local (8787), ou reaproveita os que já estiverem rodando.
// Chromium próprio: PW_CHROMIUM=/caminho/do/chrome pnpm e2e
// Outro alvo (preview, deploy): E2E_BASE_URL=https://... pnpm e2e (não sobe o servidor do jogo)
import { defineConfig, devices } from '@playwright/test'

const env = (globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env ?? {}
const baseURL = env.E2E_BASE_URL || 'http://localhost:4313'

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 60_000,
  expect: { timeout: 15_000 },
  retries: env.CI ? 1 : 0,
  reporter: env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'mobile',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 390, height: 844 },
        hasTouch: true,
        isMobile: false,
        launchOptions: {
          executablePath: env.PW_CHROMIUM || undefined,
          args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
        },
      },
    },
  ],
  webServer: [
    ...(env.E2E_BASE_URL
      ? []
      : [{ command: 'pnpm dev', url: 'http://localhost:4313', reuseExistingServer: true, timeout: 120_000 }]),
    {
      command: 'node server/dev-api.mjs',
      url: 'http://localhost:8787/api/health',
      reuseExistingServer: true,
      timeout: 30_000,
      env: { DB_FILE: ':memory:' },
    },
  ],
})
