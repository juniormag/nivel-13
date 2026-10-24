#!/usr/bin/env python3
"""Gera os ícones de app do Nível 13 a partir de uma definição em código.

Uso:  python3 scripts/make-icons.py            (escreve em public/)
      python3 scripts/make-icons.py --out DIR  (escreve em DIR, para testar)
      python3 scripts/make-icons.py --variants DIR  (pranchas de teste: com coroa, com bandeira)

Pixel art nativa: cada tamanho é desenhado numa grade lógica pequena, só com as 32 cores de
src/lib/palette.ts, e ampliado por inteiro com vizinho mais próximo. Tamanho que não é múltiplo
da grade ganha uma grade própria (180 = 60 × 3), nunca escala fracionada.

O "13" segue src/scene/shape13.ts: o 1 com bandeira inclinada para a esquerda e pé só à esquerda,
o 3 quadrado com chanfros, lábios à esquerda e cintura à direita. Três quartos leve: a extrusão
vai para a direita e para baixo (câmera baixa vendo a lateral direita e a face de baixo).

Requer Pillow e numpy.
"""

from __future__ import annotations

import argparse
import itertools
import math
import pathlib
import re

import numpy as np
from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parent.parent

# ---------------------------------------------------------------- paleta (fonte única: palette.ts)


def load_palette() -> dict[str, tuple[int, int, int]]:
    src = (ROOT / 'src/lib/palette.ts').read_text()
    block = src.split('export const PALETTE = {', 1)[1].split('}', 1)[0]
    pal = {}
    for name, hx in re.findall(r'(\w+):\s*0x([0-9a-fA-F]{6})', block):
        v = int(hx, 16)
        pal[name] = ((v >> 16) & 255, (v >> 8) & 255, v & 255)
    assert len(pal) == 32, f'paleta com {len(pal)} cores'
    return pal


PAL = load_palette()

BAYER4 = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]


def bayer(x: int, y: int) -> float:
    return (BAYER4[y & 3][x & 3] + 0.5) / 16


class Grid:
    """Grade lógica: cada célula guarda uma chave da paleta ou None (transparente)."""

    def __init__(self, w: int, h: int):
        self.w, self.h = w, h
        self.c: list[list[str | None]] = [[None] * w for _ in range(h)]

    def set(self, x: int, y: int, k: str | None):
        if 0 <= x < self.w and 0 <= y < self.h:
            assert k is None or k in PAL, k
            self.c[y][x] = k

    def get(self, x: int, y: int):
        if 0 <= x < self.w and 0 <= y < self.h:
            return self.c[y][x]
        return None

    def image(self, scale: int = 1, opaque: bool = False) -> Image.Image:
        im = Image.new('RGBA', (self.w, self.h), (0, 0, 0, 0))
        px = im.load()
        for y in range(self.h):
            for x in range(self.w):
                k = self.c[y][x]
                if k is not None:
                    px[x, y] = (*PAL[k], 255)
                elif opaque:
                    px[x, y] = (*PAL['void'], 255)
        if scale != 1:
            im = im.resize((self.w * scale, self.h * scale), Image.NEAREST)
        if opaque:
            im = im.convert('RGB')
        return im


# ---------------------------------------------------------------- geometria do 13


def poly_mask(w: int, h: int, pts: list[tuple[float, float]], ox: int = 0, oy: int = 0) -> np.ndarray:
    """Pixel dentro se o centro dele está dentro do polígono (par-ímpar). Vértices inteiros e
    arestas a 0°, 45° ou 90° dão degraus limpos."""
    m = np.zeros((h, w), bool)
    P = [(x + ox, y + oy) for x, y in pts]
    n = len(P)
    for yy in range(h):
        cy = yy + 0.5
        xs = []
        for i in range(n):
            ax, ay = P[i]
            bx, by = P[(i + 1) % n]
            if (ay > cy) != (by > cy):
                xs.append(ax + (cy - ay) * (bx - ax) / (by - ay))
        xs.sort()
        for a, b in zip(xs[0::2], xs[1::2]):
            for xx in range(w):
                if a <= xx + 0.5 < b:
                    m[yy, xx] = True
    return m


def glyph_one(p: dict) -> list[tuple[int, int]]:
    """O 1 (y para baixo, topo = 0). fl = alcance da bandeira à esquerda do fuste."""
    fl, s1, H = p['fl'], p['s1'], p['H1']
    st, fd, fb = p['st'], p['fd'], p['fb']  # degrau no topo, queda da bandeira, base da bandeira
    fw, fh, cf, c1 = p['fw'], p['fh'], p['cf'], p['c1']
    pts = [
        (fl, 0),
        (fl + s1 - c1, 0),
        (fl + s1, c1),
        (fl + s1, H),
    ]
    if fw > 0:
        pts += [(fl - fw, H), (fl - fw, H - fh + cf), (fl - fw + cf, H - fh), (fl, H - fh)]
    else:
        pts += [(fl, H)]
    pts += [(fl, fb), (0, fb), (0, st + fd), (fl, st)]
    return pts


def glyph_three(p: dict) -> list[tuple[int, int]]:
    """O 3 quadrado de shape13 (y para baixo, topo = 0)."""
    W, H, iu = p['W'], p['H3'], p['iu']
    Wu = W - iu
    tt, tb = p['tt'], p['tb']
    ym0, ym1 = p['ym0'], p['ym1']
    sp, spu = p['sp'], p['spu']
    m0, cm = p['m0'], p['cm']
    lw, lh = p['lw'], p['lh']
    ctl, ctr, cbr, cbl = p['ctl'], p['ctr'], p['cbr'], p['cbl']
    yw, wn, wv = p['yw'], p['wn'], p['wv']  # cintura: começo, fundo, trecho reto
    pts = [
        (ctl, 0),
        (Wu - ctr, 0),
        (Wu, ctr),
        (Wu, yw),
        (Wu - wn, yw + wn),
        (Wu - wn, yw + wn + wv),
    ]
    back = W - (Wu - wn)
    pts += [
        (W, yw + wn + wv + back),
        (W, H - cbr),
        (W - cbr, H),
        (cbl, H),
        (0, H - cbl),
        (0, H - tb - lh),
        (lw, H - tb - lh),
        (lw, H - tb),
        (W - sp, H - tb),
        (W - sp, ym1),
        (m0, ym1),
        (m0, ym0 + cm),
        (m0 + cm, ym0),
        (Wu - spu, ym0),
        (Wu - spu, tt),
        (lw, tt),
        (lw, tt + lh),
        (0, tt + lh),
        (0, ctl),
    ]
    return pts


def shifts(dx: int, dy: int) -> list[tuple[int, int]]:
    n = max(abs(dx), abs(dy))
    return [(round(i * dx / n), round(i * dy / n)) for i in range(1, n + 1)]


def shift(m: np.ndarray, sx: int, sy: int) -> np.ndarray:
    out = np.zeros_like(m)
    h, w = m.shape
    ys, xs = slice(max(0, sy), h), slice(max(0, sx), w)
    yd, xd = slice(0, h - max(0, sy)), slice(0, w - max(0, sx))
    out[ys, xs] = m[yd, xd]
    return out


def edt_outside(sil: np.ndarray) -> np.ndarray:
    """Distância euclidiana de cada pixel de fora até o pixel mais próximo da silhueta."""
    h, w = sil.shape
    ys, xs = np.nonzero(sil)
    gy, gx = np.mgrid[0:h, 0:w]
    d = np.full((h, w), 1e9)
    for y, x in zip(ys, xs):
        d = np.minimum(d, (gx - x) ** 2 + (gy - y) ** 2)
    d = np.sqrt(d)
    d[sil] = 0
    return d


# ---------------------------------------------------------------- variantes (uma por grade)

# Parâmetros em pixels lógicos. g = tamanho da grade; o = origem do 1 (canto de cima à esquerda da
# frente); gap = vão entre o 1 e o 3; rise = quanto o 3 sobe acima do 1.
V64 = dict(
    g=64, ox=7, oy=12, gap=4, rise=2,
    fl=6, s1=10, H1=38, st=2, fd=6, fb=14, fw=4, fh=7, cf=2, c1=2,
    W=26, H3=40, iu=1, tt=10, tb=10, ym0=17, ym1=24, sp=10, spu=9, m0=9, cm=2,
    lw=5, lh=3, ctl=2, ctr=5, cbr=5, cbl=1, yw=14, wn=3, wv=2,
    dx=5, dy=3,
    cracks=True, vines=True, ribbon=True, eclipse=(9.5, 9.5, 6), spark=[(56, 8, 3), (60, 30, 1)],
    plate='rounded', radius=11,
)

# 180 = 60 × 3 (apple-touch-icon: sem transparência, o iOS arredonda)
V60 = dict(V64, g=60, ox=6, oy=11, H1=36, H3=38, ym0=16, ym1=23, s1=9, sp=9, spu=9, W=25,
           eclipse=(9.5, 9.5, 6), spark=[(53, 7, 3), (56, 28, 1)], plate='full')

# Maskable: o 13 inteiro dentro do círculo de 80% (raio 25,6 px lógicos do centro).
VMASK = dict(
    g=64, ox=14, oy=17, gap=3, rise=1,
    fl=4, s1=7, H1=28, st=1, fd=4, fb=10, fw=3, fh=5, cf=1, c1=1,
    W=19, H3=29, iu=1, tt=7, tb=7, ym0=12, ym1=17, sp=7, spu=7, m0=6, cm=1,
    lw=4, lh=2, ctl=1, ctr=4, cbr=4, cbl=1, yw=10, wn=2, wv=1,
    dx=4, dy=2,
    cracks=True, vines=True, ribbon=True, eclipse=(15.5, 14.5, 4), spark=[(47, 14, 2)],
    plate='full',
)

# favicon-32
V32 = dict(
    g=32, ox=2, oy=6, gap=2, rise=1,
    fl=3, s1=5, H1=19, st=1, fd=3, fb=7, fw=2, fh=4, cf=1, c1=1,
    W=13, H3=20, iu=0, tt=5, tb=5, ym0=8, ym1=12, sp=5, spu=5, m0=4, cm=1,
    lw=3, lh=1, ctl=1, ctr=3, cbr=3, cbl=0, yw=7, wn=1, wv=0,
    dx=3, dy=2,
    cracks=False, vines=False, ribbon=False, eclipse=None, spark=[],
    plate='rounded', radius=6,
)

# favicon.svg (16)
V16 = dict(
    g=16, ox=1, oy=3, gap=2, rise=0,
    fl=1, s1=3, H1=10, st=0, fd=1, fb=3, fw=0, fh=0, cf=0, c1=0,
    W=6, H3=10, iu=0, tt=2, tb=2, ym0=4, ym1=6, sp=2, spu=2, m0=2, cm=0,
    lw=0, lh=0, ctl=0, ctr=1, cbr=1, cbl=0, yw=4, wn=0, wv=0,
    dx=1, dy=0,
    cracks=False, vines=False, ribbon=False, eclipse=None, spark=[],
    plate='rounded', radius=3, halo=False,
)


def glyph_masks(v: dict):
    g = v['g']
    # base do 1 e do 3 na mesma linha; o 3 é H3 - H1 px mais alto
    base = v['oy'] + v['H3']
    one_top = base - v['H1']
    three_top = base - v['H3']
    one = poly_mask(g, g, glyph_one(v), v['ox'], one_top)
    x3 = v['ox'] + v['fl'] + v['s1'] + v['gap']
    three = poly_mask(g, g, glyph_three(v), x3, three_top)
    return one, three, x3, one_top, three_top, base


# ---------------------------------------------------------------- pintura


def paint_background(G: Grid, v: dict):
    """Céu night com vinheta void nos cantos, clarão dusk em volta da lua e brasa no horizonte."""
    g = G.w
    r = v.get('radius', 0) if v['plate'] == 'rounded' else 0
    ecl = v.get('eclipse')
    for y in range(g):
        for x in range(g):
            if r and not in_rounded(x, y, g, r):
                continue
            vx, vy = (x + 0.5) / g - 0.5, (y + 0.5) / g - 0.45
            vig = math.hypot(vx, vy)
            k = 'night'
            if vig > 0.52 and bayer(x, y) < (vig - 0.52) / 0.12:
                k = 'void'
            if ecl:
                d = math.hypot(x + 0.5 - ecl[0], y + 0.5 - ecl[1]) - ecl[2]
                if 0 < d < 6 and bayer(x, y) < (6 - d) / 6 * 0.75:
                    k = 'dusk'
            # brasa no horizonte: faixas chapadas com 2 linhas de pontilhado entre elas
            yb = g - y  # linhas a partir de baixo
            hb = max(2, round(g * 0.12))
            if yb <= hb:
                k = 'blood0'
                if yb > hb - 2 and bayer(x, y) < 0.5:
                    k = 'night'
            if yb <= 2:
                k = 'blood1' if bayer(x, y) < 0.5 + 0.25 * (2 - yb) else 'blood0'
            G.set(x, y, k)


def in_rounded(x: int, y: int, g: int, r: int) -> bool:
    # canto de pixel: círculo de raio r nos quatro cantos, testado pelo centro do pixel
    cx = min(max(x + 0.5, r), g - r)
    cy = min(max(y + 0.5, r), g - r)
    return (x + 0.5 - cx) ** 2 + (y + 0.5 - cy) ** 2 <= r * r + 0.25


def paint_eclipse(G: Grid, cx: float, cy: float, r: float):
    """Lua em eclipse atrás do 13: disco void, crescente red-hot grosso embaixo à direita afinando
    até um fio crimson em cima à esquerda, e coroa pontilhada para fora do lado aceso."""
    lx, ly = 0.62, 0.78  # direção do lado aceso (embaixo à direita)
    for y in range(G.h):
        for x in range(G.w):
            if G.get(x, y) is None:
                continue
            dx, dy = x + 0.5 - cx, y + 0.5 - cy
            d = math.hypot(dx, dy)
            if d > r + 4.5:
                continue
            a = (dx * lx + dy * ly) / (d + 1e-6)  # -1..1, 1 = lado aceso
            if d < r - 0.5:
                th = 2.6 * max(0.0, a) ** 1.6  # crescente para dentro
                if d > r - 0.5 - th:
                    G.set(x, y, 'redHot' if a > 0.75 else 'red' if a > 0.45 else 'crimson')
                else:
                    G.set(x, y, 'void')
            elif d < r + 0.5:
                G.set(x, y, 'emberBright' if a > 0.9 else 'ember' if a > 0.7 else 'redHot' if a > 0.3
                      else 'crimson' if a > -0.35 else 'crimsonDeep')
            else:
                k = (r + 4.5 - d) / 4.0 * (0.45 + 0.55 * a)
                if k > 0 and bayer(x, y) < k:
                    G.set(x, y, 'crimsonDeep' if k > 0.55 else 'blood1')


def cavities(sil: np.ndarray) -> np.ndarray:
    """Pixels de fora cercados pela silhueta em 3 ou 4 direções (os miolos do 3). Ficam escuros,
    sem halo, para a contraforma ler como vazio."""
    h, w = sil.shape
    cav = np.zeros_like(sil)
    for y in range(h):
        row = sil[y]
        for x in range(w):
            if sil[y, x]:
                continue
            hits = int(row[:x].any()) + int(row[x + 1:].any()) + int(sil[:y, x].any()) + int(sil[y + 1:, x].any())
            if hits >= 4 or (hits == 3 and row[x + 1:].any() and sil[:y, x].any() and sil[y + 1:, x].any()):
                cav[y, x] = True
    return cav


def paint_halo(G: Grid, sil: np.ndarray, energy: tuple[float, float], ring: bool = True):
    """Contorno escuro de 1 px (vizinhança 4) e brilho vermelho fino em volta: um anel no lado da
    energia e um pontilhado ralo (o '40% + 15%' em cores da paleta). Miolos ficam escuros."""
    d = edt_outside(sil)
    cav = cavities(sil)
    h, w = sil.shape
    ys, xs = np.nonzero(sil)
    mx, my = xs.mean(), ys.mean()
    for y in range(h):
        for x in range(w):
            if sil[y, x] or G.get(x, y) is None:
                continue
            dd = d[y, x]
            if cav[y, x]:
                G.set(x, y, 'void' if dd <= 1.0 else 'night' if bayer(x, y) < 0.5 else 'void')
                continue
            ax, ay = x - mx, y - my
            n = math.hypot(ax, ay) + 1e-6
            side = (ax * energy[0] + ay * energy[1]) / n  # 1 = lado da energia
            if dd <= 1.0:
                G.set(x, y, 'void')
            elif not ring:
                continue
            elif dd <= 2.0:
                G.set(x, y, 'crimson' if side > 0.3 else 'crimsonDeep' if side > -0.3 else 'blood1')
            elif dd <= 3.2 and side > 0.3 and bayer(x, y) < 0.25:
                G.set(x, y, 'blood1')


def paint_glyph(G: Grid, front: np.ndarray, v: dict, seed: int = 13):
    """Extrusão vermelha (lateral clara, face de baixo escura, granito), aro red-hot na borda de
    trás e frente de pedra osso com chanfro de luz em cima à esquerda."""
    import random

    rnd = random.Random(seed)
    sh = shifts(v['dx'], v['dy'])
    n = len(sh)
    ext_depth = np.zeros(front.shape, int)  # 0 = não é extrusão
    for i in range(n, 0, -1):
        m = shift(front, *sh[i - 1])
        ext_depth[m & ~front] = i
    ext = ext_depth > 0
    sil = front | ext
    h, w = front.shape

    def F(x, y):
        return 0 <= x < w and 0 <= y < h and front[y, x]

    def S(x, y):
        return 0 <= x < w and 0 <= y < h and sil[y, x]

    for y in range(h):
        for x in range(w):
            if not ext[y, x]:
                continue
            i = ext_depth[y, x]
            # orientação: lateral (R) se a frente que gerou o pixel está à esquerda, face de
            # baixo (B) se está acima, chanfro (D) se as duas
            left_src = F(x - 1, y) or any(F(x - 1 - a, y - b) for a, b in sh[:i - 1])
            up_src = F(x, y - 1) or any(F(x - a, y - 1 - b) for a, b in sh[:i - 1])
            back_edge = not S(x + 1, y) or not S(x, y + 1)
            if up_src and not left_src:
                face = 'B'
            elif left_src and not up_src:
                face = 'R'
            else:
                face = 'D'
            if face == 'R':
                k = 'red' if i == 1 else 'crimsonDeep' if i == n else 'crimson'
                if k == 'crimson':
                    r = rnd.random()
                    k = 'red' if r < 0.10 else 'crimsonDeep' if r < 0.17 else k
            elif face == 'B':
                k = 'crimson' if i == 1 else 'blood1' if i == n else 'crimsonDeep'
                if k == 'crimsonDeep' and rnd.random() < 0.12:
                    k = 'blood1'
            else:
                k = 'red' if i <= 2 else 'crimson'
            if back_edge and not S(x + 1, y):
                k = 'redHot'  # aro: a energia mora atrás e à direita
            elif back_edge and not S(x, y + 1):
                k = 'crimson' if face != 'B' else 'crimsonDeep'
            G.set(x, y, k)

    # frente de pedra osso: luz de cima à esquerda, divisa diagonal entre stoneHi e stone3
    ys, xs = np.nonzero(front)
    top, bot = ys.min(), ys.max()
    left, right = xs.min(), xs.max()
    grain = random.Random(seed + 1)
    for y in range(h):
        for x in range(w):
            if not front[y, x]:
                continue
            t = (y - top) / max(1, bot - top)
            u = (x - left) / max(1, right - left)
            k = 'stoneHi' if t + 0.3 * u < 0.78 else 'stone3'
            if v.get('cracks') and grain.random() < 0.035:
                k = 'stone3' if k == 'stoneHi' else 'stone2'
            if not F(x - 1, y) or not F(x, y - 1):
                k = 'sparkle' if k == 'stoneHi' else 'stoneHi'
            elif not F(x + 1, y) or not F(x, y + 1):
                k = 'stone2' if k == 'stone3' else 'stone3'
            G.set(x, y, k)
    return sil


def line(x0, y0, x1, y1):
    pts = []
    dx, dy = abs(x1 - x0), -abs(y1 - y0)
    sx, sy = (1 if x0 < x1 else -1), (1 if y0 < y1 else -1)
    err = dx + dy
    while True:
        pts.append((x0, y0))
        if x0 == x1 and y0 == y1:
            break
        e2 = 2 * err
        if e2 >= dy:
            err += dy
            x0 += sx
        if e2 <= dx:
            err += dx
            y0 += sy
    return pts


def paint_cracks(G: Grid, front: np.ndarray, segs, ox: int, oy: int):
    """Emendas e rachaduras: traço stone1/stone2 com 1 px de luz embaixo (pedra quebrada)."""
    for seg in segs:
        pts = []
        for (a, b), (c, d) in itertools.pairwise(seg):
            pts += line(a + ox, b + oy, c + ox, d + oy)
        for j, (x, y) in enumerate(pts):
            if 0 <= y < front.shape[0] and 0 <= x < front.shape[1] and front[y, x]:
                deep = j % 5 not in (0,)
                G.set(x, y, 'stone1' if deep else 'stone2')
                below = y + 1 < front.shape[0] and front[y + 1, x] and (x, y + 1) not in pts
                if below and G.get(x, y + 1) in ('stone3', 'stone2'):
                    G.set(x, y + 1, 'stoneHi')


LEAF = {
    # cacho no topo: v=vine1 g=green L=leafHi d=vine0
    'tuft': ['..gL...', '.gggg.g', 'dvgvggv', '.d.v.d.'],
    'tuft_s': ['.gL', 'ggv', 'd.d'],
    # cacho que pende pela lateral
    'drape': ['gLg.', 'vggv', '.vg.', '.v..', '.g..', '.v..', 'gv..', 'd...'],
    'drape_s': ['gL', 'vg', '.v', '.g', '.d'],
}
LEAF_K = {'v': 'vine1', 'g': 'green', 'L': 'leafHi', 'd': 'vine0'}


def paint_vines(G: Grid, front: np.ndarray, ext: np.ndarray, spots, seed=7):
    """Mata crescendo: cachos de 3 tons + 1 px de leafHi (verde ≤ 4%)."""
    for kind, x, y in spots:
        for j, row in enumerate(LEAF[kind]):
            for i, ch in enumerate(row):
                if ch in LEAF_K:
                    G.set(x + i, y + j, LEAF_K[ch])


def ellipse_pts(cx, cy, rx, ry, rot, t0, t1, steps=900):
    out = []
    c, s = math.cos(rot), math.sin(rot)
    for i in range(steps + 1):
        t = t0 + (t1 - t0) * i / steps
        ex, ey = rx * math.cos(t), ry * math.sin(t)
        x, y = cx + ex * c - ey * s, cy + ex * s + ey * c
        p = (math.floor(x), math.floor(y))
        if not out or out[-1][0] != p:
            out.append((p, t, math.sin(t)))
    # tira cantos em L (linha de pixel limpa)
    clean = []
    for j, item in enumerate(out):
        if 0 < j < len(out) - 1:
            a, b = out[j - 1][0], out[j + 1][0]
            if abs(a[0] - b[0]) == 1 and abs(a[1] - b[1]) == 1:
                continue
        clean.append(item)
    return clean


def paint_ribbon(G: Grid, spec, front_half: bool, sil: np.ndarray | None):
    """Fita de energia: elipse inclinada subindo à direita, de cauda crimson a cabeça red-hot com
    núcleo branco. Traço de 1 px sem cantos em L; a metade de trás vai antes do 13, a da frente
    depois. Poucas trocas de cor (degradê em blocos longos, senão vira tracejado)."""
    cx, cy, rx, ry, rot, t0, t1 = spec
    pts = ellipse_pts(cx, cy, rx, ry, rot, t0, t1)
    N = len(pts)
    for j, ((x, y), t, sn) in enumerate(pts):
        if (sn > 0) != front_half:
            continue
        u = j / max(1, N - 1)
        if u < 0.3:
            k = 'crimsonDeep'
        elif u < 0.55:
            k = 'crimson'
        elif u < 0.72:
            k = 'red'
        elif u < 0.93:
            k = 'redHot'
        else:
            k = 'emberBright'
        if j >= N - 2:
            k = 'white'
        G.set(x, y, k)
        # brilho de 1 px acima da parte quente (halo do traço), sem engrossar o núcleo
        if 0.72 <= u < 0.99 and G.get(x, y - 1) not in ('stoneHi', 'stone3', 'sparkle', 'stone2'):
            G.set(x, y - 1, 'crimson')


def paint_sparkle(G: Grid, x: int, y: int, L: int):
    """Brilho de 4 pontas: núcleo branco, braços goldHi -> gold."""
    G.set(x, y, 'white')
    for i in range(1, L + 1):
        k = 'goldHi' if i == 1 else 'gold' if i < L else 'gold1'
        for ddx, ddy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            G.set(x + ddx * i, y + ddy * i, k)


FLAG = [
    # 10×7 + mastro, para o topo do 1 (teste)
    'pVVVVVVVVV',
    'pVVVYYVVVV',
    'pVVYBBYVVV',
    'pVYBBBBYVV',
    'pVVYBBYVVV',
    'pVVVYYVVVv',
    'pvvvvvvvvv',
    'p.........',
    'p.........',
]


def paint_flag(G: Grid, x: int, y: int):
    fmap = {'p': 'stone2', 'V': 'green', 'v': 'vine1', 'Y': 'gold', 'B': 'blue1'}
    for j, row in enumerate(FLAG):
        for i, ch in enumerate(row):
            if ch in fmap:
                G.set(x + i, y + j, fmap[ch])


CROWN = [
    # 9×6, para cima do 3 (teste)
    '.g..g..g.',
    'gGg.G.gGg',
    'gGGgGgGGg',
    'oGGGGGGGo',
    'oHhHhHhHo',
    '.ooooooo.',
]


def paint_crown(G: Grid, x: int, y: int):
    cmap = {'g': 'goldHi', 'G': 'gold', 'o': 'gold0', 'H': 'gold1', 'h': 'goldHi'}
    for j, row in enumerate(CROWN):
        for i, ch in enumerate(row):
            if ch in cmap:
                G.set(x + i, y + j, cmap[ch])


def render(v: dict, crown=False, flag=False, plain=False) -> Grid:
    g = v['g']
    G = Grid(g, g)
    paint_background(G, v)
    one, three, x3, one_top, three_top, _base = glyph_masks(v)
    front = one | three
    # silhueta completa (para o halo) antes de pintar
    ext = np.zeros_like(front)
    for s in shifts(v['dx'], v['dy']):
        ext |= shift(front, *s)
    sil = front | ext
    if not plain and v.get('eclipse'):
        paint_eclipse(G, *v['eclipse'])
    rib = ribbon_spec(v) if (v.get('ribbon') and not plain) else None
    if rib:
        paint_ribbon(G, rib, False, None)
    paint_halo(G, sil, (0.6, -0.8), ring=v.get('halo', True))
    sil = paint_glyph(G, front, v)
    if v.get('cracks') and not plain:
        paint_cracks(G, front, cracks_for(v, x3, one_top, three_top), 0, 0)
    if v.get('vines') and not plain:
        paint_vines(G, front, sil & ~front, vines_for(v, x3, one_top, three_top))
    if rib:
        paint_ribbon(G, rib, True, sil)
    if not plain:
        for s in v.get('spark', []):
            paint_sparkle(G, *s)
    if crown:
        paint_crown(G, x3 + v['W'] // 2 - 4, three_top - 8)
    if flag:
        paint_flag(G, v['ox'] + v['fl'] + 1, one_top - 9)
    return G


def ribbon_spec(v: dict):
    """Órbita inclinada subindo à direita: entra pela esquerda atrás, passa na frente do pé do 13 e
    termina com a cabeça acesa à direita, por trás do 3."""
    k = v['g'] / 64
    if v is VMASK:
        return (32, 45, 24, 5, -0.22, 5.3, 0.62)
    return (32 * k, 51 * k, 30 * k, 6 * k, -0.22, 5.3, 0.62)


def cracks_for(v: dict, x3, one_top, three_top):
    """Emendas de laje (como em shape13) e duas rachaduras ramificadas. Coordenadas em pixels."""
    a = v['ox'] + v['fl']  # x do fuste do 1
    s1, W, H3 = v['s1'], v['W'], v['H3']
    if v['g'] >= 60 and v is not VMASK:
        return [
            # 1: emenda descendo à direita no terço de baixo, emenda subindo no meio
            [(a, one_top + 25), (a + s1 - 1, one_top + 28)],
            [(a, one_top + 16), (a + 3, one_top + 15), (a + s1 - 1, one_top + 13)],
            # rachadura que nasce na emenda e desce
            [(a + 5, one_top + 27), (a + 4, one_top + 30), (a + 5, one_top + 33)],
            # 3: emenda vertical no braço de cima, rachadura que ramifica
            [(x3 + 12, three_top), (x3 + 13, three_top + 3), (x3 + 13, three_top + v['tt'] - 1)],
            # 3: emenda da cintura (gomo de cima / de baixo)
            [(x3 + W - v['sp'], three_top + v['ym1'] - 1), (x3 + W - 1, three_top + v['ym1'] + 2)],
            # 3: braço de baixo
            [(x3 + 8, three_top + H3 - v['tb']), (x3 + 9, three_top + H3 - 6), (x3 + 8, three_top + H3 - 1)],
        ]
    return [
        [(a, one_top + 18), (a + s1 - 1, one_top + 20)],
        [(x3 + 9, three_top), (x3 + 10, three_top + 3)],
        [(x3 + W - v['sp'], three_top + v['ym1']), (x3 + W - 1, three_top + v['ym1'] + 2)],
    ]


def vines_for(v: dict, x3, one_top, three_top):
    a = v['ox'] + v['fl']
    s1 = v['s1']
    if v is VMASK:
        return [('tuft_s', a + s1 - 3, one_top - 2), ('drape_s', x3 + v['W'] - 1, three_top + v['ym0'] - 2)]
    return [
        ('tuft', a + s1 - 5, one_top - 3),
        ('drape', x3 + v['W'] - 2, three_top + v['ym0'] - 3),
    ]


def svg_rects(G: Grid) -> str:
    """SVG de retângulos: junta corridas horizontais da mesma cor."""
    parts = []
    by = {}
    for y in range(G.h):
        x = 0
        while x < G.w:
            k = G.get(x, y)
            if k is None:
                x += 1
                continue
            x1 = x
            while x1 + 1 < G.w and G.get(x1 + 1, y) == k:
                x1 += 1
            by.setdefault(k, []).append(f'M{x} {y}h{x1 - x + 1}v1h-{x1 - x + 1}z')
            x = x1 + 1
    for k, ds in by.items():
        r, g_, b = PAL[k]
        parts.append(f'<path fill="#{r:02x}{g_:02x}{b:02x}" d="{"".join(ds)}"/>')
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {G.w} {G.h}" '
            f'shape-rendering="crispEdges">{"".join(parts)}</svg>\n')


def mono_svg(v: dict) -> str:
    """13 em uma cor só (fundo transparente), na geometria da zona segura: frente cheia, lateral
    cheia e 1 px vazado entre as duas para o volume ler sem cor."""
    one, three, *_ = glyph_masks(v)
    front = one | three
    sh = shifts(v['dx'], v['dy'])
    sil = front.copy()
    for s_ in sh:
        sil |= shift(front, *s_)
    first = shift(front, *sh[0]) & ~front
    G = Grid(v['g'], v['g'])
    for y in range(G.h):
        for x in range(G.w):
            if sil[y, x] and not first[y, x]:
                G.set(x, y, 'void')
    return svg_rects(G)


def build(out: pathlib.Path):
    out.mkdir(parents=True, exist_ok=True)
    (out / 'install').mkdir(exist_ok=True)
    g64 = render(V64)
    g64.image(8).save(out / 'icon-512.png', optimize=True)
    g64.image(3).save(out / 'icon-192.png', optimize=True)
    g64.image(1).save(out / 'install/app-icon-64.png', optimize=True)
    render(VMASK).image(8, opaque=True).save(out / 'icon-maskable-512.png', optimize=True)
    render(V60).image(3, opaque=True).save(out / 'apple-touch-icon.png', optimize=True)
    render(V32).image(1).save(out / 'favicon-32.png', optimize=True)
    g16 = render(V16)
    (out / 'favicon.svg').write_text(svg_rects(g16))
    (out / 'icon-mono.svg').write_text(mono_svg(VMASK))
    return g64


def variants(out: pathlib.Path):
    out.mkdir(parents=True, exist_ok=True)
    render(V64, crown=True).image(8).save(out / 'v-crown-512.png')
    render(V64, plain=True).image(8).save(out / 'v-plain-512.png')
    render(dict(V64, eclipse=None), flag=True).image(8).save(out / 'v-flag-512.png')
    render(dict(V64, eclipse=None), flag=True, crown=True).image(8).save(out / 'v-flagcrown-512.png')
    render(V16).image(1).save(out / 'favicon-16.png')
    render(V64).image(1).save(out / 'logical-64.png')


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('--out', default=str(ROOT / 'public'))
    ap.add_argument('--variants')
    a = ap.parse_args()
    build(pathlib.Path(a.out))
    if a.variants:
        variants(pathlib.Path(a.variants))
    print('ícones gerados em', a.out)
