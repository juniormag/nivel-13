// Texturas pixel: sprites em texto (src/lib/sprites.ts) viram Texture com filtro nearest.
import { Texture, TextureSource } from 'pixi.js'
import { sprite } from '../lib/sprites'

TextureSource.defaultOptions.scaleMode = 'nearest'

const cache = new Map<string, Texture>()

export function tex(name: string, tint?: Record<string, string>): Texture {
  const key = tint ? `${name}|${JSON.stringify(tint)}` : name
  let t = cache.get(key)
  if (!t) {
    t = Texture.from(sprite(name, tint))
    t.source.scaleMode = 'nearest'
    cache.set(key, t)
  }
  return t
}

export function texFromCanvas(key: string, draw: () => HTMLCanvasElement): Texture {
  let t = cache.get(key)
  if (!t) {
    t = Texture.from(draw())
    t.source.scaleMode = 'nearest'
    cache.set(key, t)
  }
  return t
}

let white: Texture | null = null
/** 1×1 branco para retângulos e partículas tingidas */
export function px(): Texture {
  if (!white) {
    const c = document.createElement('canvas')
    c.width = 1
    c.height = 1
    const g = c.getContext('2d')
    if (g) {
      g.fillStyle = '#fff'
      g.fillRect(0, 0, 1, 1)
    }
    white = Texture.from(c)
    white.source.scaleMode = 'nearest'
  }
  return white
}
