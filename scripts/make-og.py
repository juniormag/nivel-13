#!/usr/bin/env python3
"""Compõe public/og.png (1200×630, prévia do link no WhatsApp) em pixel nativo.

Entrada: um still da cena do título gerado por renderHeroStill (src/scene) em 1560×630, que sai
ampliado ×2. Para gerar o still com o dev server rodando (pnpm dev):
    node scripts/og-still.cjs /tmp/still-1560.png
Depois:
    python3 scripts/make-og.py /tmp/still-1560.png            (escreve public/og.png)
    python3 scripts/make-og.py /tmp/still-1560.png --out X.png

A composição é feita na grade lógica (600×315): recorte com o 13 à direita do centro, painel
escuro pontilhado atrás do texto (nada mais claro que night atrás de interface), título em
Silkscreen sem antialias, CTA em faixa vermelha com ▶ e rodapé com o rótulo de IA e o responsável
(o texto exato de CONFIG.aiLabel e responsavelText() com VITE_RESPONSAVEL). Sai ×2 com vizinho
mais próximo. Só cores de src/lib/palette.ts.
"""

from __future__ import annotations

import argparse
import pathlib
import re

from PIL import Image, ImageDraw, ImageFont

ROOT = pathlib.Path(__file__).resolve().parent.parent
FONT = ROOT / 'node_modules/@fontsource/silkscreen/files'

# Texto legal: o mesmo que o site mostra (src/config.ts) com VITE_RESPONSAVEL da Vercel.
RESPONSAVEL = 'a definir'


def load_palette():
    src = (ROOT / 'src/lib/palette.ts').read_text()
    block = src.split('export const PALETTE = {', 1)[1].split('}', 1)[0]
    return {k: tuple(int(h[i:i + 2], 16) for i in (0, 2, 4)) for k, h in re.findall(r'(\w+):\s*0x([0-9a-fA-F]{6})', block)}


def ai_label():
    src = (ROOT / 'src/config.ts').read_text()
    return re.search(r"aiLabel:\s*'([^']+)'", src).group(1)


PAL = load_palette()
BAYER4 = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]


def bayer(x, y):
    return (BAYER4[y & 3][x & 3] + 0.5) / 16


def text_mask(txt, size, bold=True):
    """Máscara 1-bit do texto (Silkscreen em múltiplo de 8 = pixels inteiros)."""
    ft = ImageFont.truetype(str(FONT / f'silkscreen-latin-{700 if bold else 400}-normal.woff'), size)
    l, t, r, b = ImageDraw.Draw(Image.new('1', (1, 1))).textbbox((0, 0), txt, font=ft)
    im = Image.new('1', (r - l + 2, b - t + 2), 0)
    d = ImageDraw.Draw(im)
    d.fontmode = '1'
    d.text((-l, -t), txt, font=ft, fill=1)
    return im


def stamp(px, W, H, m, x0, y0, color, outline='void', shadow='blood0', sh=1):
    """Texto com sombra de sh px para baixo e contorno de 1 px (vizinhança 8 nos cantos)."""
    w, h = m.size
    mp = m.load()
    on = {(x, y) for y in range(h) for x in range(w) if mp[x, y]}
    if shadow:
        for x, y in on:
            for k in range(1, sh + 1):
                X, Y = x0 + x, y0 + y + k + 1
                if 0 <= X < W and 0 <= Y < H:
                    px[X, Y] = PAL[shadow]
    if outline:
        for x, y in on:
            for dx in (-1, 0, 1):
                for dy in (-1, 0, 1):
                    if (x + dx, y + dy) not in on:
                        X, Y = x0 + x + dx, y0 + y + dy
                        if 0 <= X < W and 0 <= Y < H:
                            px[X, Y] = PAL[outline]
    for x, y in on:
        c = color(x, y) if callable(color) else color
        px[x0 + x, y0 + y] = PAL[c]


def compose(still: Image.Image) -> Image.Image:
    s = still.convert('RGB')
    # o still sai ×2: volta para a grade lógica sem perda (pega 1 de cada 2)
    s = s.resize((s.width // 2, s.height // 2), Image.NEAREST)
    W, H = 600, 315
    im = s.crop((0, 0, W, H))
    px = im.load()

    # painel escuro atrás do texto: pontilhado void/night que some para a direita e para baixo
    for y in range(H):
        for x in range(W):
            fx = 1.0 if x < 230 else max(0.0, 1 - (x - 230) / 50)
            fy = 1.0 if 100 <= y <= 250 else max(0.0, 1 - min(abs(y - 100), abs(y - 250)) / 14)
            k = fx * fy
            if k > 0 and bayer(x, y) < k * 0.92:
                px[x, y] = PAL['void'] if bayer(x + 1, y + 2) < 0.6 else PAL['night']

    # título
    # uma máscara só para manter a linha de base; o '13' é colorido pela coluna
    m1 = text_mask('NÍVEL 13', 32)
    ft = ImageFont.truetype(str(FONT / 'silkscreen-latin-700-normal.woff'), 32)
    cut = round(ImageDraw.Draw(Image.new('1', (1, 1))).textlength('NÍVEL ', font=ft))
    top = m1.size[1] - 32  # altura do acento acima das maiúsculas

    def title(x, y):
        yy = y - top
        if x >= cut - 2:
            return 'redHot' if yy < 6 else 'red' if yy < 18 else 'crimson'
        return 'sparkle' if yy < 6 else 'stoneHi' if yy < 18 else 'stone3'

    x0, y0 = 22, 108
    stamp(px, W, H, m1, x0, y0 - top, title, sh=2)
    m2 = text_mask('A VIRADA', 24)
    stamp(px, W, H, m2, x0 + 2, y0 + 44, lambda x, y: 'goldHi' if y < 5 else 'emberBright' if y < 13 else 'ember', sh=2)

    # CTA: faixa vermelha com ▶ (o menu do HUD)
    cta = text_mask('JOGUE EM 1 MINUTO', 16)
    bx, by = x0 - 2, y0 + 92
    bw, bh = cta.size[0] + 34, cta.size[1] + 12
    for y in range(by, by + bh):
        for x in range(bx, bx + bw):
            k = 'crimson'
            if y == by:
                k = 'redHot'
            elif y == by + 1:
                k = 'red'
            elif y >= by + bh - 2:
                k = 'crimsonDeep'
            px[x, y] = PAL[k]
    for x in range(bx - 1, bx + bw + 1):
        px[x, by - 1] = PAL['void']
        px[x, by + bh] = PAL['void']
    for y in range(by, by + bh):
        px[bx - 1, y] = PAL['void']
        px[bx + bw, y] = PAL['void']
    # ▶ de 7 px
    tx, ty = bx + 8, by + bh // 2
    for i in range(6):
        for j in range(-5 + i, 6 - i):
            px[tx + i, ty + j] = PAL['white'] if i < 5 else PAL['goldHi']
    stamp(px, W, H, cta, bx + 22, by + 6, 'white', outline=None, shadow='crimsonDeep', sh=1)

    # rodapé legal: faixa void e texto Silkscreen 8 (1 px de fonte = 1 px lógico)
    foot = f'{ai_label()} · Responsável: {RESPONSAVEL}'
    fm = text_mask(foot, 8, bold=False)
    fy0 = H - fm.size[1] - 5
    for y in range(fy0 - 6, H):
        for x in range(W):
            if y >= fy0 - 3 or bayer(x, y) < (y - (fy0 - 6)) / 3:
                px[x, y] = PAL['void']
    fx0 = (W - fm.size[0]) // 2
    stamp(px, W, H, fm, fx0, fy0, 'stone3', outline=None, shadow=None)
    assert fm.size[0] <= W - 8, f'rodapé largo demais: {fm.size[0]}'
    return im.resize((W * 2, H * 2), Image.NEAREST)


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('still')
    ap.add_argument('--out', default=str(ROOT / 'public/og.png'))
    a = ap.parse_args()
    out = compose(Image.open(a.still))
    out.save(a.out, optimize=True)
    print('og em', a.out, out.size)
