// Ambiente mínimo de navegador para os módulos do jogo rodarem em Node (sem jsdom).
const g = globalThis as Record<string, unknown>

if (!('location' in g) || !g.location) {
  g.location = new URL('http://localhost:4313/')
}

class MemoryStorage {
  private m = new Map<string, string>()
  get length() {
    return this.m.size
  }
  clear() {
    this.m.clear()
  }
  getItem(k: string) {
    return this.m.get(k) ?? null
  }
  key(i: number) {
    return [...this.m.keys()][i] ?? null
  }
  removeItem(k: string) {
    this.m.delete(k)
  }
  setItem(k: string, v: string) {
    this.m.set(k, String(v))
  }
}

let hasStorage = false
try {
  hasStorage = typeof g.localStorage === 'object' && g.localStorage !== null
} catch {
  hasStorage = false
}
if (!hasStorage) {
  Object.defineProperty(g, 'localStorage', { value: new MemoryStorage(), configurable: true, writable: true })
}
